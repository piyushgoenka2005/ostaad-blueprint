"""Unit tests for Phase 5 & 6: VLM Engine Refactor & Invariant Protection."""

import pytest
from PIL import Image
from ostaad_boq.models import DrawingType, ValidationStatus
from ostaad_boq.ocr import OCRItem
from ostaad_boq.vlm_engine import extract_semantic_elements, detect_drawing_symbols


def test_site_survey_drawing_type_returns_strictly_zero_architectural_items():
    """Verify that calling extract_semantic_elements with SITE_TOPOGRAPHICAL_SURVEY returns 0 items."""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    ocr_items = [
        OCRItem(text="TOTAL PREMISES AREA = 10907.80 SQ.M.", confidence=0.98, bbox=(0.1, 0.1, 0.5, 0.15)),
        OCRItem(text="SCALE 1:250", confidence=0.95, bbox=(0.6, 0.1, 0.8, 0.15)),
        OCRItem(text="BOUNDARY WALL", confidence=0.92, bbox=(0.2, 0.5, 0.4, 0.55)),
    ]

    res = extract_semantic_elements(
        image=img,
        sheet_name="Barakar Site Survey",
        ocr_items=ocr_items,
        drawing_type=DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
    )

    assert len(res["doors"]) == 0
    assert len(res["windows"]) == 0
    assert len(res["plumbing_fixtures"]) == 0
    assert len(res["appliances"]) == 0
    assert len(res["casework"]) == 0
    assert len(res["rooms"]) == 0
    assert len(res["symbol_candidates"]) == 0
    assert len(res["evidence_candidates"]) == 0


def test_architectural_drawing_detects_real_symbol_tags():
    """Verify that architectural floor plans extract explicit door and window tags."""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    ocr_items = [
        OCRItem(text="D1", confidence=0.95, bbox=(0.1, 0.2, 0.15, 0.25)),
        OCRItem(text="D1", confidence=0.95, bbox=(0.3, 0.4, 0.35, 0.45)),
        OCRItem(text="W1", confidence=0.95, bbox=(0.7, 0.8, 0.75, 0.85)),
        OCRItem(text="BEDROOM 1", confidence=0.90, bbox=(0.2, 0.2, 0.3, 0.25)),
    ]

    res = extract_semantic_elements(
        image=img,
        sheet_name="Floor Plan Sheet",
        ocr_items=ocr_items,
        drawing_type=DrawingType.ARCHITECTURAL_FLOOR_PLAN,
    )

    # Must extract D1 (count 2) and W1 (count 1)
    assert len(res["doors"]) == 1
    assert res["doors"][0]["quantity"] == 2
    assert "D1" in res["doors"][0]["description"]

    assert len(res["windows"]) == 1
    assert res["windows"][0]["quantity"] == 1
    assert "W1" in res["windows"][0]["description"]

    # Must extract 1 bedroom
    assert len(res["rooms"]) == 1
    assert "Bedroom 1" in res["rooms"][0]["name"]
