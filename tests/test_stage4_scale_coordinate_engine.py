"""Stage 4 Test Suite: Scale & Coordinate Engine.

Validates:
1. CoordinateTransformEngine measurement API (metric, imperial, and normalized unresolved).
2. Zero dimensional quantities emitted when scale is unresolved (UnitType.NORM / NORM_SQ, needs_review=True).
3. Multi-scale conflict detection generating NEEDS_REVIEW.
4. Scale priority hierarchy: Title block callout > Dimension constraint reconciliation.
5. Mandatory Evaluation Gate on Barakar:
   - Evaluates to scale = 1:250
   - Unit = metre
   - Deterministic pixels_per_unit calculation at drawing DPI.
"""

from __future__ import annotations

import os
from ostaad_boq.models import ScaleCalibration, UnitType
from ostaad_boq.scale import CoordinateTransformEngine, calibrate_scale
from ostaad_boq.ocr import OCRItem, OCREngine
from ostaad_boq.ingest import ingest_blueprint


def test_coordinate_transform_metric():
    """Verify metric coordinate and dimension transformations."""
    # 1:100 scale at 150 DPI => (1000/100) * (150/25.4) = 59.055 px/m
    scale = ScaleCalibration(
        scale_known=True,
        pixels_per_unit=59.06,
        unit="metre",
        raw_scale_text="1:100",
        confidence=0.95,
    )
    engine = CoordinateTransformEngine(scale)

    # 1. Linear length measurement
    qty, unit, needs_review = engine.measure_length(295.3)
    assert abs(qty - 5.0) < 0.05, f"Expected ~5.0m, got {qty}"
    assert unit == UnitType.M
    assert needs_review is False

    # 2. Area measurement
    area_qty, area_unit, area_review = engine.measure_area(59.06 * 59.06 * 20.0)
    assert abs(area_qty - 20.0) < 0.1, f"Expected ~20.0 sqm, got {area_qty}"
    assert area_unit == UnitType.SQM
    assert area_review is False

    # 3. Real world coordinate mapping
    rx, ry = engine.pixel_to_real_coords(59.06 * 10, 59.06 * 4)
    assert abs(rx - 10.0) < 0.05
    assert abs(ry - 4.0) < 0.05


def test_coordinate_transform_imperial():
    """Verify imperial coordinate and dimension transformations."""
    # 15 px per foot
    scale = ScaleCalibration(
        scale_known=True,
        pixels_per_unit=15.0,
        unit="ft",
        raw_scale_text="1/4\" = 1'-0\"",
        confidence=0.95,
    )
    engine = CoordinateTransformEngine(scale)

    qty, unit, needs_review = engine.measure_length(150.0)
    assert qty == 10.0
    assert unit == UnitType.LF
    assert needs_review is False

    area_qty, area_unit, area_review = engine.measure_area(15.0 * 15.0 * 120.0)
    assert area_qty == 120.0
    assert area_unit == UnitType.SF
    assert area_review is False


def test_zero_dimensional_quantities_when_scale_unresolved():
    """Rule: Zero dimensional quantities emitted if scale is unresolved."""
    unresolved_scale = ScaleCalibration(
        scale_known=False,
        pixels_per_unit=1.0,
        unit="norm",
        method="unresolved",
        confidence=0.0,
        needs_review=True,
    )
    engine = CoordinateTransformEngine(unresolved_scale)

    # Must return NORM, never fabricate feet or meters
    qty, unit, needs_review = engine.measure_length(350.0)
    assert unit == UnitType.NORM
    assert needs_review is True
    assert qty == 350.0

    area_qty, area_unit, area_review = engine.measure_area(5000.0)
    assert area_unit == UnitType.NORM_SQ
    assert area_review is True
    assert area_qty == 5000.0


def test_multi_scale_conflict_detection():
    """Verify multi-scale conflict detection generates NEEDS_REVIEW."""
    conflicting_tokens = [
        OCRItem(text="DETAIL VIEW A (SCALE 1:20)", confidence=0.92, bbox=(0.1, 0.1, 0.3, 0.15)),
        OCRItem(text="MAIN FLOOR PLAN (SCALE 1:100)", confidence=0.92, bbox=(0.5, 0.5, 0.7, 0.55)),
    ]
    scale = calibrate_scale(conflicting_tokens, 1000, 800)

    assert scale.scale_known is False
    assert scale.has_conflict is True
    assert scale.method == "multi_scale_conflict"
    assert scale.unit == "norm"
    assert scale.needs_review is True
    assert "1:20" in scale.conflicting_scales
    assert "1:100" in scale.conflicting_scales


def test_barakar_mandatory_scale_coordinate_gate():
    """MANDATORY EVALUATION GATE: Barakar drawing must evaluate to scale = 1:250, unit = metre."""
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    assert os.path.exists(pdf_path)

    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    sheet = ingest_blueprint(file_bytes, "barakar.pdf")[0]
    ocr = OCREngine()
    items = ocr.extract_text(sheet)

    scale = calibrate_scale(items, sheet.width_px, sheet.height_px, sheet.dpi)
    print("\nBarakar Gate Scale Evaluation:", scale)

    # Mandatory Gate Assertions
    assert scale.scale_known is True
    assert scale.unit == "metre", f"Expected unit 'metre', got '{scale.unit}'"
    assert scale.raw_scale_text == "1:250", f"Expected '1:250', got '{scale.raw_scale_text}'"
    assert scale.confidence >= 0.95
    # 150 DPI: (1000/250) * (150/25.4) = 23.62 px/m
    assert abs(scale.pixels_per_unit - 23.62) < 0.2

    # Verify measurement engine transforms with Barakar scale
    engine = CoordinateTransformEngine(scale)
    # Suppose a property boundary line is 2362 pixels long on this sheet:
    real_m, unit, review = engine.measure_length(2362.2)
    assert abs(real_m - 100.0) < 0.1, f"Expected 100.0m for 2362.2px, got {real_m}"
    assert unit == UnitType.M
    assert review is False


if __name__ == "__main__":
    tests = [
        test_coordinate_transform_metric,
        test_coordinate_transform_imperial,
        test_zero_dimensional_quantities_when_scale_unresolved,
        test_multi_scale_conflict_detection,
        test_barakar_mandatory_scale_coordinate_gate,
    ]
    passed = 0
    failed = 0
    print(f"Running {len(tests)} Stage 4 Scale & Coordinate Tests...")
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
