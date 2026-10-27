"""Stage 10 Test Suite: Derived Materials & Secondary Formulas Engine.

Validates:
1. Strict Separation Invariant:
   - Directly measured entities (is_measured=True) vs derived estimates (is_measured=False).
2. Explicit Mathematical Formula Transparency:
   - Full formulas, deduction parameters, and waste factors documented in assumptions.
3. Multi-Unit Architectural Calculations (Imperial & Metric):
   - Drywall SF/SQM, interior wall paint GAL/L, baseboard trim LF/M, framing studs EA.
4. Civil / Site Survey Derived Materials:
   - Boundary wall brick masonry volume (CU.M.) and 2-side plastering (SQM).
5. Anti-Hallucination Isolation Gate:
   - Civil site drawings NEVER derive interior residential drywall, paint, or finishes.
"""

from __future__ import annotations

import os
from ostaad_boq.models import (
    LinearRun,
    RoomTakeoff,
    ScaleCalibration,
    UnitType,
    CalculationMethod,
)
from ostaad_boq.derived_materials import (
    DerivedMaterialConfig,
    calculate_architectural_derived_materials,
    calculate_civil_derived_materials,
)


def test_architectural_derived_materials_formula_transparency():
    """Verify architectural derived items possess full mathematical formulas and is_measured=False."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft", confidence=1.0)
    walls = [LinearRun(id="w1", label="Interior Walls", length=100.0, unit=UnitType.LF)]
    rooms = [RoomTakeoff(id="r1", name="Living Room", stated_area_sqft=200.0)]

    derived = calculate_architectural_derived_materials(
        linear_runs=walls,
        rooms=rooms,
        door_count=2,
        window_count=2,
        scale=scale,
    )

    by_id = {d.id: d for d in derived}
    assert "mat-drywall" in by_id
    assert "mat-paint" in by_id
    assert "mat-baseboard" in by_id
    assert "mat-studs" in by_id
    assert "mat-flooring-waste" in by_id

    # 1. Invariant: is_measured == False
    for d in derived:
        assert d.is_measured is False, f"Derived item {d.id} must have is_measured=False"
        assert d.calculation_method == CalculationMethod.DERIVED_MATERIAL
        assert d.assumptions != "", f"Derived item {d.id} must document mathematical formula"
        assert d.wbs_code != "", f"Derived item {d.id} must have WBS code"
        assert d.csi_division != "", f"Derived item {d.id} must have CSI division"

    # 2. Formula verification
    dw = by_id["mat-drywall"]
    assert "Gross:" in dw.assumptions
    assert "Deduct openings:" in dw.assumptions
    assert "10.0% waste" in dw.assumptions
    assert dw.unit == UnitType.SF

    pt = by_id["mat-paint"]
    assert "coats" in pt.assumptions
    assert "Coverage:" in pt.assumptions
    assert pt.unit == UnitType.GAL

    bb = by_id["mat-baseboard"]
    assert "door widths" in bb.assumptions
    assert "8.0% waste" in bb.assumptions
    assert bb.unit == UnitType.LF


def test_civil_derived_materials_boundary_wall():
    """Verify civil boundary wall derives brickwork volume (CU.M.) and plastering with formulas."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=23.62, unit="metre", confidence=0.96)
    civil_runs = [
        LinearRun(id="b1", label="Site Boundary Wall / Guard Wall Perimeter", length=251.95, unit=UnitType.M)
    ]

    civil_derived = calculate_civil_derived_materials(
        linear_runs=civil_runs,
        geometric_features=[],
        scale=scale,
    )

    assert len(civil_derived) == 2, f"Expected 2 civil derived items, got {len(civil_derived)}"

    by_id = {c.id: c for c in civil_derived}
    assert "mat-civil-brickwork" in by_id
    assert "mat-civil-plaster" in by_id

    # 1. Brickwork volume check
    bw = by_id["mat-civil-brickwork"]
    assert bw.unit == UnitType.CUM
    assert bw.is_measured is False
    assert "251.95 M" in bw.assumptions
    assert "1.80 M" in bw.assumptions
    assert "0.25 M" in bw.assumptions
    assert "5.0% mortar waste" in bw.assumptions
    # 251.95 * 1.8 * 0.25 * 1.05 = 119.05 CU.M.
    assert bw.quantity == 119.05
    assert bw.csi_division == "04 - Masonry"


    # 2. Plastering area check
    pl = by_id["mat-civil-plaster"]
    assert pl.unit == UnitType.SQM
    assert pl.is_measured is False
    assert "2 sides" in pl.assumptions
    assert pl.csi_division == "09 - Finishes"





def test_custom_config_waste_factors():
    """Verify engine dynamically respects custom user waste factors and ceiling heights."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft", confidence=1.0)
    walls = [LinearRun(id="w1", label="Interior Walls", length=50.0, unit=UnitType.LF)]

    custom_cfg = DerivedMaterialConfig(
        ceiling_height_ft=12.0,  # High ceilings
        drywall_waste_pct=15.0,  # 15% waste
    )

    derived = calculate_architectural_derived_materials(
        linear_runs=walls,
        rooms=[],
        door_count=0,
        window_count=0,
        scale=scale,
        config=custom_cfg,
    )

    dw = next(d for d in derived if d.id == "mat-drywall")
    assert "12.0 FT" in dw.assumptions
    assert "15.0% waste" in dw.assumptions
    # 50 LF * 12 FT * 2 sides = 1200 SF + 15% = 1380 SF
    assert dw.quantity == 1380.0


def test_mandatory_gate_barakar_civil_isolation():
    """Mandatory Gate: Civil site survey NEVER derives residential drywall, paint, or living trims."""
    # When civil runs are supplied to civil derivation engine:
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=23.62, unit="metre", confidence=0.96)
    civil_runs = [
        LinearRun(id="b1", label="Site Boundary Wall / Guard Wall Perimeter", length=251.95, unit=UnitType.M)
    ]

    civil_derived = calculate_civil_derived_materials(civil_runs, [], scale=scale)

    # Invariant: ZERO residential drywall, paint, or interior casework
    residential_items = [
        c for c in civil_derived
        if any(kw in c.item_description.lower() for kw in ["drywall", "gypsum", "latex paint", "baseboard", "carpet"])
    ]
    assert len(residential_items) == 0, f"VIOLATION: Found residential items in civil derivation: {residential_items}"

    print("Barakar Civil Isolation Gate PASSED: Zero residential drywall or paint derived.")


if __name__ == "__main__":
    test_architectural_derived_materials_formula_transparency()
    print("PASS: test_architectural_derived_materials_formula_transparency")
    test_civil_derived_materials_boundary_wall()
    print("PASS: test_civil_derived_materials_boundary_wall")
    test_custom_config_waste_factors()
    print("PASS: test_custom_config_waste_factors")
    test_mandatory_gate_barakar_civil_isolation()
    print("PASS: test_mandatory_gate_barakar_civil_isolation")
    print("ALL STAGE 10 TESTS COMPLETED SUCCESSFULLY!")
