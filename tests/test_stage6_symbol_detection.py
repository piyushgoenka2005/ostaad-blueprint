"""Stage 6 Test Suite: Object Detection + VLM Semantic Layer.

Validates:
1. Targeted perception & symbol identification schema:
   - Door, window, column, plumbing fixture, electrical device detection.
   - Bounding boxes [x_min, y_min, x_max, y_max], detector source, model version, confidence scores.
2. Invariant: NO EVIDENCE = NO QUANTITY:
   - Elimination of all hardcoded fallback fabrications (or True, or 2, or 6, or 450.0).
   - If no openings or fixtures are in evidence, zero quantities must be emitted.
3. Mandatory Evaluation Gate on Barakar:
   - Exactly zero false architectural doors, windows, toilets, or fixtures detected on site survey.
4. Architectural Plan Real Tag Extraction:
   - Extraction of door (D/D1), window (W/W1), ventilator (V/V1) tags with full spatial attribution on floor plans.
"""

from __future__ import annotations

import os
from PIL import Image
from ostaad_boq.models import DrawingType, ScaleCalibration, SymbolCandidate
from ostaad_boq.ocr import OCRItem, OCREngine
from ostaad_boq.vlm_engine import detect_drawing_symbols, extract_semantic_elements
from ostaad_boq.engine import OstaadBOQEngine
from ostaad_boq.ingest import ingest_blueprint


def test_symbol_candidate_schema_and_spatial_attribution():
    """Verify symbol detector outputs SymbolCandidate with full attribution and bbox."""
    synthetic_ocr = [
        OCRItem(text="D1", confidence=0.96, bbox=(120.0, 300.0, 150.0, 330.0), source_type="vector_tag"),
        OCRItem(text="D2", confidence=0.94, bbox=(220.0, 310.0, 250.0, 340.0), source_type="vector_tag"),
        OCRItem(text="W1", confidence=0.95, bbox=(50.0, 10.0, 110.0, 40.0), source_type="vector_tag"),
        OCRItem(text="V1", confidence=0.91, bbox=(350.0, 15.0, 380.0, 45.0), source_type="vector_tag"),
        OCRItem(text="C1", confidence=0.97, bbox=(20.0, 20.0, 40.0, 40.0), source_type="vector_tag"),
        OCRItem(text="WC", confidence=0.93, bbox=(360.0, 120.0, 390.0, 150.0), source_type="raster_ocr"),
        OCRItem(text="DB", confidence=0.92, bbox=(10.0, 180.0, 30.0, 200.0), source_type="raster_ocr"),
    ]

    candidates = detect_drawing_symbols(synthetic_ocr)
    assert len(candidates) == 7, f"Expected 7 symbol candidates, got {len(candidates)}"

    by_type = {c.symbol_type: c for c in candidates}
    assert "door" in by_type
    assert "window" in by_type
    assert "column" in by_type
    assert "plumbing_fixture" in by_type
    assert "electrical_device" in by_type

    # Verify attribution metadata
    for c in candidates:
        assert isinstance(c, SymbolCandidate)
        assert len(c.bbox) == 4, "Bounding box must be 4 elements [x_min, y_min, x_max, y_max]"
        assert c.bbox[2] > c.bbox[0] and c.bbox[3] > c.bbox[1], "BBox dimensions must be positive"
        assert c.detector_source == "symbol_tag_detector"
        assert c.model_version == "ostaad-tag-v1.0"
        assert 0.0 < c.confidence <= 1.0
        assert c.label != ""
        assert "provenance" in c.attributes


def test_no_evidence_no_quantity_guardrail():
    """Verify drawing with no opening/fixture evidence yields ZERO quantities (no fabrications)."""
    blank_img = Image.new("L", (800, 600), color=255)
    non_arch_ocr = [
        OCRItem(text="BENCHMARK", confidence=0.98, bbox=(10, 10, 50, 20)),
        OCRItem(text="DATUM LEVEL 100.00", confidence=0.95, bbox=(10, 30, 80, 40)),
        OCRItem(text="BOUNDARY WALL", confidence=0.97, bbox=(100, 100, 200, 120)),
        OCRItem(text="PROPOSED DRAIN", confidence=0.90, bbox=(150, 150, 250, 170)),
    ]

    semantic_res = extract_semantic_elements(blank_img, sheet_name="NonArch", ocr_items=non_arch_ocr)

    # Invariant: NO EVIDENCE = NO QUANTITY
    assert len(semantic_res["doors"]) == 0, f"VIOLATION: Fabricated doors found: {semantic_res['doors']}"
    assert len(semantic_res["windows"]) == 0, f"VIOLATION: Fabricated windows found: {semantic_res['windows']}"
    assert len(semantic_res["plumbing_fixtures"]) == 0, f"VIOLATION: Fabricated plumbing found: {semantic_res['plumbing_fixtures']}"
    assert len(semantic_res["appliances"]) == 0, f"VIOLATION: Fabricated appliances found: {semantic_res['appliances']}"
    assert len(semantic_res["casework"]) == 0, f"VIOLATION: Fabricated casework found: {semantic_res['casework']}"
    assert len(semantic_res["rooms"]) == 0, f"VIOLATION: Fabricated rooms found: {semantic_res['rooms']}"
    assert len(semantic_res["symbol_candidates"]) == 0, f"VIOLATION: False symbol candidates found: {semantic_res['symbol_candidates']}"


def test_mandatory_gate_barakar_zero_false_symbols():
    """Mandatory Gate: Barakar site survey must have ZERO false architectural doors, windows, or toilets."""
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # 1. Barakar must have zero architectural symbol candidates
    arch_symbols = [
        s for s in report.symbol_candidates
        if s.symbol_type in ["door", "window", "plumbing_fixture"]
    ]
    assert len(arch_symbols) == 0, f"VIOLATION: Detected {len(arch_symbols)} false architectural symbols on Barakar: {arch_symbols}"

    # 2. Barakar must have zero door, window, or plumbing takeoff lines
    arch_categories = [
        "Openings - Doors",
        "Openings - Windows",
        "Plumbing Fixtures",
        "Appliances",
        "Casework & Millwork",
    ]
    false_lines = [l for l in report.lines if l.category in arch_categories]
    assert len(false_lines) == 0, f"VIOLATION: Detected {len(false_lines)} false architectural takeoff lines on Barakar: {false_lines}"

    print(f"Barakar Gate PASSED: 0 false architectural symbols, 0 false openings/fixtures.")


def test_architectural_floorplan_tag_extraction():
    """Verify architectural floor plan extracts real door/window/room tags when present."""
    # Test on synthetic architectural room with door and window tags
    img = Image.new("L", (600, 500), color=255)
    ocr_items = [
        OCRItem(text="BED ROOM", confidence=0.98, bbox=(150.0, 100.0, 250.0, 130.0), source_type="vector_text"),
        OCRItem(text="D1", confidence=0.95, bbox=(120.0, 220.0, 145.0, 245.0), source_type="vector_tag"),
        OCRItem(text="W1", confidence=0.93, bbox=(180.0, 50.0, 210.0, 75.0), source_type="vector_tag"),
        OCRItem(text="W2", confidence=0.92, bbox=(220.0, 50.0, 250.0, 75.0), source_type="vector_tag"),
    ]

    semantic = extract_semantic_elements(img, "FloorPlan", ocr_items=ocr_items)

    assert len(semantic["doors"]) == 1
    assert semantic["doors"][0]["quantity"] == 1
    assert "D1" in semantic["doors"][0]["description"]

    assert len(semantic["windows"]) == 2
    win_descriptions = [w["description"] for w in semantic["windows"]]
    assert any("W1" in d for d in win_descriptions)
    assert any("W2" in d for d in win_descriptions)

    # Verify symbol candidates list
    assert len(semantic["symbol_candidates"]) == 3
    for s in semantic["symbol_candidates"]:
        assert s.detector_source == "symbol_tag_detector"
        assert s.confidence > 0.90


if __name__ == "__main__":
    test_symbol_candidate_schema_and_spatial_attribution()
    print("PASS: test_symbol_candidate_schema_and_spatial_attribution")
    test_no_evidence_no_quantity_guardrail()
    print("PASS: test_no_evidence_no_quantity_guardrail")
    test_mandatory_gate_barakar_zero_false_symbols()
    print("PASS: test_mandatory_gate_barakar_zero_false_symbols")
    test_architectural_floorplan_tag_extraction()
    print("PASS: test_architectural_floorplan_tag_extraction")
    print("ALL STAGE 6 TESTS COMPLETED SUCCESSFULLY!")
