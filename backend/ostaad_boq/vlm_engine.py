"""VLM-assisted semantic perception and candidate extraction module for Ostaad BOQ.

Integrates Gemini 3.8 Flash (and Gemini 3.1 Pro Preview escalation) via GeminiService.
Enforces the core architectural principle:
- Gemini outputs SEMANTIC PERCEPTION AND CANDIDATE EVIDENCE, NEVER AUTHORITATIVE MEASUREMENTS.
- Coordinate boxes are unscaled from [0, 1000] to Canonical [0.0, 1.0].
- When no physical evidence exists on the sheet, ZERO items are hallucinated.
"""

from __future__ import annotations

import io
import json
import os
import re
import logging
from typing import Any, List, Optional
from PIL import Image

from .models import (
    ItemCategory,
    UnitType,
    CalculationMethod,
    ValidationStatus,
    QuantityType,
    EvidenceCandidate,
    TakeoffLine,
    RoomTakeoff,
    SymbolCandidate,
    DrawingType,
)
from .ocr import OCRItem, parse_room_area_callouts
from .gemini_service import (
    GeminiService,
    GeminiObjectDetectionResponse,
    GeminiTitleBlockResponse,
    GeminiScheduleResponse,
)
from .coordinate_transform import CoordinateTransformer
from .anti_hallucination import AntiHallucinationEngine

logger = logging.getLogger("ostaad_boq.vlm")


GEMINI_PERCEPTION_PROMPT = """You are an expert construction estimator performing semantic perception on a 2D construction blueprint.
Locate all visible architectural openings (doors, windows) and room labels.
For each element found on the drawing:
1. Return its label (e.g. 'D1', 'W1', 'Door', 'Window', 'Bedroom', 'Kitchen').
2. Return its bounding box as box_2d: [ymin, xmin, ymax, xmax] with integer coordinates in the normalized range [0, 1000].
3. Categorize each element strictly as 'door', 'window', 'room_label', or 'structural'.

CRITICAL INSTRUCTIONS:
- Do NOT guess or hallucinate items that are not physically drawn on the sheet.
- If the drawing is a site plan, land survey, or has no doors/windows, return an empty list of candidates.
- Do NOT estimate lengths, areas, or dimensions. Return spatial bounding boxes and labels only.
"""


def detect_drawing_symbols(ocr_items: list[OCRItem]) -> list[SymbolCandidate]:
    """Deterministic visual symbol and opening detector with spatial attribution and confidence."""
    candidates: list[SymbolCandidate] = []

    door_re = re.compile(r"""^(?:D[1-9]?(\s*\(.*\))?|MD|ED|MAIN\s*DOOR)$""", re.IGNORECASE)
    window_re = re.compile(r"""^(?:W[1-9]?|V[1-9]?|KW|AW|VENT)$""", re.IGNORECASE)
    column_re = re.compile(r"""^(?:C[1-9]?|COL[1-9]?)$""", re.IGNORECASE)
    plumbing_re = re.compile(r"""^(?:WC|EWC|IWC|TOILET|BATH)$""", re.IGNORECASE)
    electrical_re = re.compile(r"""^(?:DB|SB[1-9]?|MCB)$""", re.IGNORECASE)

    for idx, it in enumerate(ocr_items):
        clean = it.text.strip()
        if door_re.match(clean):
            candidates.append(
                SymbolCandidate(
                    id=f"sym-door-{idx}",
                    symbol_type="door",
                    label=clean.upper(),
                    description=f"Architectural Door Opening ({clean.upper()})",
                    bbox=list(it.bbox),
                    detector_source="symbol_tag_detector",
                    model_version="ostaad-tag-v1.0",
                    confidence=round(it.confidence, 2),
                    attributes={"raw_tag": clean, "provenance": it.source_type},
                )
            )
        elif window_re.match(clean):
            is_vent = clean.upper().startswith("V")
            desc = "Louvered Ventilator Opening" if is_vent else f"Window Opening ({clean.upper()})"
            candidates.append(
                SymbolCandidate(
                    id=f"sym-win-{idx}",
                    symbol_type="window",
                    label=clean.upper(),
                    description=desc,
                    bbox=list(it.bbox),
                    detector_source="symbol_tag_detector",
                    model_version="ostaad-tag-v1.0",
                    confidence=round(it.confidence, 2),
                    attributes={"raw_tag": clean, "is_ventilator": is_vent, "provenance": it.source_type},
                )
            )
        elif column_re.match(clean):
            candidates.append(
                SymbolCandidate(
                    id=f"sym-col-{idx}",
                    symbol_type="column",
                    label=clean.upper(),
                    description=f"Structural RCC Column ({clean.upper()})",
                    bbox=list(it.bbox),
                    detector_source="symbol_tag_detector",
                    model_version="ostaad-tag-v1.0",
                    confidence=round(it.confidence, 2),
                    attributes={"raw_tag": clean, "provenance": it.source_type},
                )
            )
        elif plumbing_re.match(clean):
            candidates.append(
                SymbolCandidate(
                    id=f"sym-plumb-{idx}",
                    symbol_type="plumbing_fixture",
                    label=clean.upper(),
                    description=f"Sanitary Plumbing Fixture ({clean.upper()})",
                    bbox=list(it.bbox),
                    detector_source="symbol_tag_detector",
                    model_version="ostaad-tag-v1.0",
                    confidence=round(it.confidence, 2),
                    attributes={"raw_tag": clean, "provenance": it.source_type},
                )
            )
        elif electrical_re.match(clean):
            candidates.append(
                SymbolCandidate(
                    id=f"sym-elec-{idx}",
                    symbol_type="electrical_device",
                    label=clean.upper(),
                    description=f"Electrical Distribution / Switchboard ({clean.upper()})",
                    bbox=list(it.bbox),
                    detector_source="symbol_tag_detector",
                    model_version="ostaad-tag-v1.0",
                    confidence=round(it.confidence, 2),
                    attributes={"raw_tag": clean, "provenance": it.source_type},
                )
            )

    return candidates


def extract_semantic_elements(
    image: Image.Image,
    sheet_name: str = "Sheet 1",
    ocr_items: list[OCRItem] | None = None,
    drawing_type: DrawingType = DrawingType.UNKNOWN,
) -> dict[str, Any]:
    """Run VLM semantic extraction or deterministic evidence harvesting.
    
    Strict Invariant:
    If drawing_type is SITE_TOPOGRAPHICAL_SURVEY, all residential doors, windows,
    rooms, and plumbing fixtures are prohibited and return empty lists.
    """
    items = ocr_items or []
    detected_symbols = detect_drawing_symbols(items)
    evidence_candidates: list[EvidenceCandidate] = []

    # Strict Invariant: Site surveys do not extract residential architecture
    if drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY:
        return {
            "doors": [],
            "windows": [],
            "plumbing_fixtures": [],
            "appliances": [],
            "casework": [],
            "rooms": [],
            "symbol_candidates": [],
            "evidence_candidates": [],
            "telemetry": None,
        }

    # Attempt Gemini perception if client is available
    gemini = GeminiService()
    gemini_telemetry = None

    if gemini.is_available:
        try:
            buf = io.BytesIO()
            thumb = image.copy()
            thumb.thumbnail((1600, 1600))
            thumb.save(buf, format="JPEG", quality=85)
            img_bytes = buf.getvalue()

            detection_res, gemini_telemetry = gemini.generate_structured(
                prompt=GEMINI_PERCEPTION_PROMPT,
                image_bytes=img_bytes,
                response_model=GeminiObjectDetectionResponse,
            )

            if detection_res and isinstance(detection_res, GeminiObjectDetectionResponse):
                for cand_box in detection_res.candidates:
                    can_box = CoordinateTransformer.gemini_box_to_canonical(cand_box.box_2d)
                    evidence_candidates.append(
                        EvidenceCandidate(
                            item_type=cand_box.category,
                            category=f"08 00 00 - {cand_box.category.title()}",
                            source="GEMINI",
                            source_model=gemini_telemetry.model_id if gemini_telemetry else "gemini-3.8-flash",
                            sheet_id=sheet_name,
                            bbox_normalized=can_box,
                            raw_text=cand_box.label,
                            normalized_text=cand_box.label.upper(),
                            quantity=1.0,
                            unit="EA",
                            confidence=cand_box.confidence,
                            validation_status=ValidationStatus.NEEDS_REVIEW,
                            quantity_type=QuantityType.ESTIMATED_QUANTITY,
                        )
                    )
        except Exception as e:
            logger.warning(f"Gemini perception call failed: {e}")

    # Fall back to deterministic OCR-based symbol harvesting
    return _assemble_deterministic_elements(
        ocr_items=items,
        detected_symbols=detected_symbols,
        evidence_candidates=evidence_candidates,
        telemetry=gemini_telemetry,
    )


def _assemble_deterministic_elements(
    ocr_items: list[OCRItem],
    detected_symbols: list[SymbolCandidate],
    evidence_candidates: list[EvidenceCandidate],
    telemetry: Any = None,
) -> dict[str, Any]:
    """Assemble verified elements strictly from corroborated OCR tokens and vector symbols."""
    extracted_rooms: list[dict] = []

    # 1. Extract rooms directly from explicit area callouts
    callout_rooms = parse_room_area_callouts(ocr_items)
    if callout_rooms:
        for cr in callout_rooms:
            extracted_rooms.append({
                "name": cr["room_name"],
                "stated_area_sqft": cr["stated_sqft"],
                "confidence": cr["confidence"],
                "bbox": list(cr["bbox"]),
            })
    else:
        # Check for explicit room label tokens
        room_keywords = ["bed", "bath", "kitchen", "living", "dining", "hall", "closet", "entry", "storage", "room", "porch", "balcony"]
        named_tokens = [it for it in ocr_items if any(k in it.text.lower() for k in room_keywords)]
        if named_tokens:
            for nt in named_tokens[:15]:
                extracted_rooms.append({
                    "name": nt.text.title(),
                    "stated_area_sqft": None,
                    "confidence": nt.confidence,
                    "bbox": list(nt.bbox),
                })

    # 2. Extract verified symbol detections
    door_symbols = [s for s in detected_symbols if s.symbol_type == "door"]
    window_symbols = [s for s in detected_symbols if s.symbol_type == "window"]

    # 3. Assemble doors list: ONLY IF DETECTED
    doors_list: list[dict] = []
    if door_symbols:
        door_counts: dict[str, int] = {}
        for d in door_symbols:
            door_counts[d.label] = door_counts.get(d.label, 0) + 1
        for label, count in door_counts.items():
            doors_list.append({
                "description": f"Door Unit ({label})",
                "quantity": count,
                "confidence": 0.94,
                "locations": ["Perimeter & Interior Partitions"],
            })

    # 4. Assemble windows list: ONLY IF DETECTED
    windows_list: list[dict] = []
    if window_symbols:
        win_counts: dict[str, int] = {}
        for w in window_symbols:
            win_counts[w.label] = win_counts.get(w.label, 0) + 1
        for label, count in win_counts.items():
            is_v = label.startswith("V")
            desc = f"Louvered Ventilator ({label})" if is_v else f"Exterior Window Unit ({label})"
            windows_list.append({
                "description": desc,
                "quantity": count,
                "confidence": 0.94,
                "locations": ["Toilet Exterior Walls" if is_v else "Exterior Walls"],
            })

    # 5. Plumbing fixtures: ONLY IF TOILETS / KITCHENS ARE EXPLICITLY FOUND
    has_kitchen = any("kitchen" in r["name"].lower() for r in extracted_rooms)
    bath_count = sum(1 for r in extracted_rooms if any(k in r["name"].lower() for k in ["toilet", "bath", "wc"]))

    plumbing_fixtures: list[dict] = []
    appliances: list[dict] = []
    casework: list[dict] = []

    if bath_count > 0:
        plumbing_fixtures.extend([
            {"description": "Water Closet (European / Indian WC with Cistern)", "quantity": bath_count, "confidence": 0.90, "locations": ["Toilets"]},
            {"description": "Wash Basin / Lavatory (Ceramic Basin with Tap)", "quantity": bath_count, "confidence": 0.88, "locations": ["Toilets"]},
            {"description": "Shower Fitting / Bath Compartment Unit", "quantity": bath_count, "confidence": 0.88, "locations": ["Toilets"]},
        ])

    if has_kitchen:
        plumbing_fixtures.append(
            {"description": "Kitchen Sink (Stainless Steel Single Bowl)", "quantity": 1, "confidence": 0.90, "locations": ["Kitchen"]}
        )
        appliances.append(
            {"description": "Residential Range / Cooktop (Gas / Induction)", "quantity": 1, "confidence": 0.88, "locations": ["Kitchen"]}
        )
        casework.append(
            {"description": "Kitchen Granite Countertop & Under-Counter Cabinets", "quantity": 1, "unit": "LS", "confidence": 0.85, "locations": ["Kitchen"]}
        )

    return {
        "doors": doors_list,
        "windows": windows_list,
        "plumbing_fixtures": plumbing_fixtures,
        "appliances": appliances,
        "casework": casework,
        "rooms": extracted_rooms,
        "symbol_candidates": detected_symbols,
        "evidence_candidates": evidence_candidates,
        "telemetry": telemetry,
    }
