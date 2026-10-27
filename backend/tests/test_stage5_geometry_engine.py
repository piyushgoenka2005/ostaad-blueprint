"""Stage 5 Test Suite: Deterministic Geometry Engine.

Validates:
1. Strict Decoupling Invariants:
   - SITE AREA != BUILDING FLOOR AREA
   - SITE GEOMETRY != ROOM GEOMETRY
   - Polygons from site surveys NEVER become interior rooms or bedrooms.
2. Architectural geometry extraction: Wall linear runs & room envelopes with formulas.
3. Civil / Site geometry extraction: Property boundary contours, perimeter walls, plinth footprints.
4. Mandatory Evaluation Gate on Barakar:
   - Extract site boundary and guard wall geometry without generating interior rooms, living spaces, or bedrooms.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw
from ostaad_boq.models import DrawingType, ScaleCalibration, UnitType
from ostaad_boq.geometry import extract_drawing_geometry, extract_wall_measurements
from ostaad_boq.ingest import ingest_blueprint
from ostaad_boq.scale import calibrate_scale
from ostaad_boq.ocr import OCREngine
from ostaad_boq.engine import OstaadBOQEngine


def test_architectural_floorplan_geometry():
    """Verify architectural floor plan generates walls and room envelopes."""
    img = Image.new("L", (500, 400), color=255)
    draw = ImageDraw.Draw(img)
    # Outer rectangular bearing walls
    draw.rectangle([30, 30, 470, 370], outline=0, width=8)
    # Interior dividing partition
    draw.line([250, 30, 250, 370], fill=0, width=6)

    scale = ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft", confidence=1.0)
    runs, rooms, features = extract_drawing_geometry(img, scale, DrawingType.ARCHITECTURAL_FLOOR_PLAN)

    assert len(runs) == 2, "Expected exterior and interior wall linear runs"
    assert runs[0].length > 0
    assert runs[0].unit == UnitType.LF
    assert len(rooms) >= 1, "Expected room envelope candidates"
    assert any(f.feature_type == "room_envelope" for f in features)
    assert any("Shoelace" in f.formula for f in features)


def test_site_survey_strict_room_exclusion_invariant():
    """STRICT INVARIANT: Polygons from site surveys NEVER become interior rooms."""
    img = Image.new("L", (500, 400), color=255)
    draw = ImageDraw.Draw(img)
    # Outer property boundary and inner sheds
    draw.rectangle([30, 30, 470, 370], outline=0, width=5)
    draw.rectangle([100, 100, 180, 180], outline=0, width=4)

    scale = ScaleCalibration(scale_known=True, pixels_per_unit=20.0, unit="metre", confidence=1.0)
    runs, rooms, features = extract_drawing_geometry(img, scale, DrawingType.SITE_TOPOGRAPHICAL_SURVEY)

    # STRICT INVARIANT ASSERTION
    assert len(rooms) == 0, f"VIOLATION: Site survey produced {len(rooms)} interior rooms!"
    assert any(f.feature_type == "property_boundary" for f in features)
    assert any(r.id == "site-boundary-wall" for r in runs)
    assert runs[0].unit == UnitType.M


def test_barakar_mandatory_geometry_gate():
    """MANDATORY EVALUATION GATE:
    Barakar site geometry extracted without generating interior rooms, living spaces, or bedrooms.
    """
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    assert os.path.exists(pdf_path)

    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    sheet = ingest_blueprint(file_bytes, "barakar.pdf")[0]
    ocr = OCREngine()
    items = ocr.extract_text(sheet)
    scale = calibrate_scale(items, sheet.width_px, sheet.height_px, sheet.dpi)

    runs, rooms, features = extract_drawing_geometry(
        sheet, scale, DrawingType.SITE_TOPOGRAPHICAL_SURVEY
    )

    print("\nBarakar Extracted Site Geometry:")
    print("Linear Runs:", [(r.label, r.length, r.unit) for r in runs])
    print("Rooms count (MUST BE 0):", len(rooms))
    print("Geometric Features:", [(f.feature_type, f.measured_area, f.area_unit, f.formula[:35]) for f in features])

    # 1. Strict anti-hallucination gate
    assert len(rooms) == 0, f"MANDATORY GATE FAILED: Hallucinated {len(rooms)} rooms on Barakar survey!"

    # 2. Boundary and civil feature assertions
    assert len(runs) >= 1, "Expected boundary wall linear run"
    boundary_run = next(r for r in runs if "Boundary" in r.label)
    assert boundary_run.unit == UnitType.M
    assert boundary_run.length > 100.0, f"Expected realistic boundary perimeter (>100m), got {boundary_run.length}m"

    # 3. Geometric Feature assertions
    assert len(features) >= 1
    boundary_feat = next(f for f in features if f.feature_type == "property_boundary")
    assert boundary_feat.area_unit == UnitType.SQM
    assert boundary_feat.measured_area is not None and boundary_feat.measured_area > 1000.0
    assert "Shoelace" in boundary_feat.formula or "Green" in boundary_feat.formula


def test_barakar_end_to_end_engine_decoupled_takeoff():
    """Verify that OstaadBOQEngine end-to-end takeoff on Barakar extracts site geometry with zero false rooms."""
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    engine = OstaadBOQEngine()
    report = engine.process(file_bytes, "barakar.pdf")

    # Invariants on final report
    assert report.classification.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY
    arch_lines = [
        l for l in report.lines
        if any(k in l.item_description.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_lines) == 0, f"Engine produced {len(arch_lines)} false residential lines!"
    assert len(report.linear_runs) >= 1, "Expected civil site boundary runs"
    assert len(report.geometric_features) >= 1, "Expected structured site geometric features"
    assert any(f.feature_type == "property_boundary" for f in report.geometric_features)


if __name__ == "__main__":
    tests = [
        test_architectural_floorplan_geometry,
        test_site_survey_strict_room_exclusion_invariant,
        test_barakar_mandatory_geometry_gate,
        test_barakar_end_to_end_engine_decoupled_takeoff,
    ]
    passed = 0
    failed = 0
    print(f"Running {len(tests)} Stage 5 Geometry Engine Tests...")
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
