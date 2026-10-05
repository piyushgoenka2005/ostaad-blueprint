"""Main orchestrator for Ostaad Blueprint-to-BOQ Engine.

Connects Ingestion -> OCR -> Scale Calibration -> OpenCV Geometry ->
VLM Semantic Extraction -> Reconciliation & BOQ Assembly.
"""

from __future__ import annotations

import time
from typing import Any
from .models import BOQReport
from .ingest import ingest_blueprint, IngestedSheet
from .ocr import OCREngine, parse_room_area_callouts
from .scale import calibrate_scale
from .geometry import extract_wall_measurements
from .vlm_engine import extract_semantic_elements
from .reconciliation import assemble_and_reconcile_boq


class OstaadBOQEngine:
    """Independent, commercially viable Blueprint-to-BOQ Takeoff Engine."""

    def __init__(self) -> None:
        self.ocr_engine = OCREngine()

    def process(self, file_bytes: bytes, filename: str) -> BOQReport:
        """Run the complete end-to-end takeoff pipeline on a blueprint file."""
        t0 = time.time()

        # Step 1: Ingestion & Resolution Normalization
        sheets = ingest_blueprint(file_bytes, filename)
        if not sheets:
            raise ValueError(f"No valid sheets found in {filename}")

        primary_sheet = sheets[0]

        # Step 2: Text & Annotation OCR
        ocr_items = self.ocr_engine.extract_text(primary_sheet)

        # Step 3: Reliable Scale Calibration (Never silent guess)
        scale = calibrate_scale(
            ocr_items,
            primary_sheet.width_px,
            primary_sheet.height_px,
            primary_sheet.dpi,
        )

        # Step 4: OpenCV Deterministic Geometry (Wall lengths LF, Room polygons SF)
        linear_runs, room_polygons = extract_wall_measurements(primary_sheet.image, scale)

        # Step 5: VLM Semantic Blueprint Extraction (Doors, Windows, Fixtures, Schedules)
        semantic_data = extract_semantic_elements(primary_sheet.image, primary_sheet.sheet_name, ocr_items=ocr_items)

        # Step 6: Enrich rooms with explicit OCR callouts if present
        stated_rooms = parse_room_area_callouts(ocr_items)
        if stated_rooms and "rooms" in semantic_data:
            # Cross-reference stated rooms from OCR
            for sr in stated_rooms:
                matched = False
                for r in semantic_data["rooms"]:
                    if sr["room_name"].lower() in r["name"].lower() or r["name"].lower() in sr["room_name"].lower():
                        r["stated_area_sqft"] = sr["stated_sqft"]
                        r["bbox"] = sr["bbox"]
                        matched = True
                        break
                if not matched:
                    semantic_data["rooms"].append({
                        "name": sr["room_name"],
                        "stated_area_sqft": sr["stated_sqft"],
                        "confidence": sr["confidence"],
                        "bbox": sr["bbox"],
                    })

        # Step 7: Reconciliation & BOQ Assembly
        report = assemble_and_reconcile_boq(
            sheet_name=primary_sheet.sheet_name,
            scale=scale,
            semantic_data=semantic_data,
            ocr_items=ocr_items,
            linear_runs=linear_runs,
            room_polygons=room_polygons,
        )

        elapsed = round(time.time() - t0, 2)
        report.metadata["processing_time_sec"] = elapsed
        report.metadata["ocr_token_count"] = len(ocr_items)
        report.metadata["image_dimensions"] = f"{primary_sheet.width_px}x{primary_sheet.height_px}"

        return report
