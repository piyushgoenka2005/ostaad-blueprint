"""Unit and benchmark tests for Drawing Type Classifier (Stage 2).

Validates:
1. Accurate classification of all 10 supported drawing types.
2. Mandatory Gate: Barakar 01.11.2025 PDF classified as SITE_TOPOGRAPHICAL_SURVEY.
3. Anti-hallucination verification: Zero false bedrooms or drywall on site surveys.
"""

from __future__ import annotations

import os
from ostaad_boq.models import DrawingType
from ostaad_boq.classifier import DrawingTypeClassifier
from ostaad_boq.ingest import ingest_blueprint
from ostaad_boq.ocr import OCREngine
from ostaad_boq.engine import OstaadBOQEngine


def test_classify_site_topographical_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "TOPOGRAPHICAL SURVEY OF PREMISES",
        "TOTAL PREMISES AREA = 10907.8046 SQ. M.",
        "BOUNDARY WALL",
        "GUARD WALL",
        "CONCRETE ROAD",
        "BITUMINOUS ROAD",
        "TEMPORARY BENCHMARK (TBM)",
        "SCALE 1:250",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY
    assert res.confidence >= 0.85
    assert any("boundary wall" in e.lower() or "topographical" in e.lower() for e in res.evidence)


def test_classify_architectural_floor_plan_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "GROUND FLOOR PLAN",
        "PROPOSED RESIDENTIAL BUILDING",
        "MASTER BED ROOM 12'-0\" x 14'-0\"",
        "LIVING / DINING 18'-6\" x 12'-0\"",
        "KITCHEN 8'-0\" x 10'-0\"",
        "ATTACHED TOILET 5'-0\" x 8'-0\"",
        "SCALE 1/4\" = 1'-0\"",
        "CARPET AREA = 850 SQ.FT.",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.ARCHITECTURAL_FLOOR_PLAN
    assert res.confidence >= 0.85


def test_classify_structural_drawing_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "FOUNDATION PLAN AND COLUMN LAYOUT",
        "FOOTING DETAILS F1, F2, F3",
        "REBAR SCHEDULE FE 500",
        "CLEAR COVER 50MM FOR FOOTING",
        "LAP LENGTH 50D",
        "SCALE 1:25",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.STRUCTURAL_DRAWING
    assert res.confidence >= 0.85


def test_classify_electrical_drawing_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "ELECTRICAL LIGHTING AND POWER LAYOUT",
        "SINGLE LINE DIAGRAM (SLD)",
        "DISTRIBUTION BOARD DB-GF",
        "SWITCHBOARD LAYOUT",
        "CONDUIT RUNS IN CEILING SLAB",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.ELECTRICAL_DRAWING
    assert res.confidence >= 0.80


def test_classify_plumbing_drawing_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "WATER SUPPLY AND SANITARY DRAINAGE LAYOUT",
        "SOIL AND WASTE PIPE RISER DIAGRAM",
        "INSPECTION CHAMBER (IC-1 TO IC-5)",
        "GULLY TRAP GT DETAILS",
        "110MM UPVC SWR PIPE",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.PLUMBING_DRAWING
    assert res.confidence >= 0.80


def test_classify_hvac_drawing_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "HVAC DUCT LAYOUT PLAN",
        "CHILLED WATER PIPING RUNS",
        "AHU ROOM AIR DISTRIBUTION",
        "DIFFUSER SCHEDULE 350 CFM",
        "SUPPLY AIR DUCT 450x300",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.HVAC_DRAWING
    assert res.confidence >= 0.80


def test_classify_elevation_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "FRONT ELEVATION (NORTH FACING)",
        "SOUTH ELEVATION",
        "TERRACE LEVEL +32'-6\"",
        "PLINTH LEVEL +2'-6\"",
        "ROAD LEVEL +0'-0\"",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.ELEVATION
    assert res.confidence >= 0.80


def test_classify_section_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "CROSS SECTION A-A THROUGH STAIRCASE",
        "SECTIONAL ELEVATION",
        "LINTEL LEVEL +7'-0\"",
        "FLOOR-TO-FLOOR HEIGHT 10'-0\"",
        "HEADROOM 7'-6\"",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.SECTION
    assert res.confidence >= 0.80


def test_classify_schedule_tokens():
    clf = DrawingTypeClassifier()
    tokens = [
        "DOOR & WINDOW SCHEDULE",
        "SCHEDULE OF OPENINGS",
        "D1 1000 X 2100 FLUSH DOOR",
        "W1 1200 X 1200 SLIDING ALUMINIUM WINDOW",
        "LINTEL LEVEL 2100MM",
    ]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.SCHEDULE
    assert res.confidence >= 0.80


def test_classify_unknown_tokens():
    clf = DrawingTypeClassifier()
    tokens = ["RANDOM UNRELATED NOTE 123", "PROJECT CODE XYZ", "REVISION 0"]
    res = clf.classify(text_tokens=tokens)
    assert res.drawing_type == DrawingType.UNKNOWN
    assert res.confidence <= 0.40


def test_barakar_benchmark_gate_classification():
    """MANDATORY EVALUATION GATE: Barakar drawing MUST classify as SITE_TOPOGRAPHICAL_SURVEY."""
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    assert os.path.exists(pdf_path), f"Benchmark drawing not found: {pdf_path}"

    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    sheets = ingest_blueprint(file_bytes, "barakar.pdf")
    assert len(sheets) >= 1
    sheet = sheets[0]

    ocr = OCREngine()
    ocr_items = ocr.extract_text(sheet)
    assert len(ocr_items) >= 40, f"Expected rich OCR text tokens, got {len(ocr_items)}"

    clf = DrawingTypeClassifier()
    res = clf.classify(sheet=sheet, ocr_items=ocr_items)

    print("\nBarakar Classification Gate Result:")
    print("Drawing Type:", res.drawing_type)
    print("Confidence:", res.confidence)
    print("Evidence:", res.evidence)
    print("Reasoning:", res.classification_reasoning)

    # Mandatory Gate Assertions
    assert res.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY, (
        f"MANDATORY GATE FAILED: Expected SITE_TOPOGRAPHICAL_SURVEY, got {res.drawing_type}"
    )
    assert res.confidence >= 0.85, f"Confidence {res.confidence} below gate requirement 0.85"
    assert len(res.evidence) >= 5, "Insufficient domain evidence extracted"


def test_barakar_engine_anti_hallucination():
    """Verify that end-to-end engine blocks residential hallucinated takeoffs on Barakar survey."""
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    engine = OstaadBOQEngine()
    report = engine.process(file_bytes, "barakar.pdf")

    # Anti-hallucination assertions
    assert report.classification.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY
    assert len(report.rooms) == 0, f"Hallucinated {len(report.rooms)} rooms on a site survey!"
    arch_lines = [
        l for l in report.lines
        if any(k in l.item_description.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_lines) == 0, f"Hallucinated {len(arch_lines)} residential takeoff lines on a site survey!"
    assert any(
        f.id == "flag-drawing-type-non-floorplan" for f in report.reconciliation_flags
    ), "Missing drawing classification bypass audit flag"


if __name__ == "__main__":
    tests = [
        test_classify_site_topographical_tokens,
        test_classify_architectural_floor_plan_tokens,
        test_classify_structural_drawing_tokens,
        test_classify_electrical_drawing_tokens,
        test_classify_plumbing_drawing_tokens,
        test_classify_hvac_drawing_tokens,
        test_classify_elevation_tokens,
        test_classify_section_tokens,
        test_classify_schedule_tokens,
        test_classify_unknown_tokens,
        test_barakar_benchmark_gate_classification,
        test_barakar_engine_anti_hallucination,
    ]
    passed = 0
    failed = 0
    print(f"Running {len(tests)} Drawing Classifier Tests...")
    for t in tests:
        name = t.__name__
        try:
            t()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
    print(f"\nResults: {passed} passed, {failed} failed.")
    if failed > 0:
        exit(1)

