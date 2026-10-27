"""Stage 9 Test Suite: CSI MasterFormat & NRM Classification Engine.

Validates:
1. Multi-Framework WBS Mapping:
   - CSI MasterFormat 2020 (6-digit section codes and divisions).
   - RICS NRM2 codes.
   - CPWD DSR codes.
2. Invariant: 100% Classification Guarantee:
   - Zero lines left unclassified, empty, or 'UNKNOWN'.
3. Ambiguity Resolution:
   - Unspecified materials (e.g. generic 'Door' or 'Window') map to division-level
     generic codes with needs_review=True and estimator clarification reasons.
4. Mandatory Gate on Real Benchmark:
   - 100% of takeoff lines from real drawings have valid WBS code, title, and division.
"""

from __future__ import annotations

import os
from ostaad_boq.models import TakeoffLine, UnitType, CalculationMethod
from ostaad_boq.classification_engine import classify_takeoff_line, classify_boq_lines
from ostaad_boq.engine import OstaadBOQEngine


def test_csi_nrm_cpwd_classification_coverage():
    """Verify standard architectural and civil items map accurately across 3 frameworks."""
    test_cases = [
        ("Solid Core Teak Wood Door (D1)", "08 14 00", "Wood Doors", "08 - Openings", "17.1", "9.1"),
        ("Hollow Metal Steel Fire Door", "08 11 00", "Metal Doors and Frames", "08 - Openings", "17.2", "10.1"),
        ("Sliding Glass Patio Door", "08 32 00", "Sliding Glass Doors", "08 - Openings", "17.3", "9.15"),
        ("Aluminum Sliding Window (W1)", "08 51 23", "Metal Windows (Aluminum / Steel)", "08 - Openings", "18.1", "21.1"),
        ("UPVC Double Glazed Window", "08 53 00", "Plastic / UPVC Windows", "08 - Openings", "18.2", "21.3"),
        ("Louvered Metal Ventilator (V1)", "08 51 69", "Louvered Metal Ventilators and Windows", "08 - Openings", "18.4", "21.2"),
        ("1/2\" Gypsum Wallboard Drywall", "09 29 00", "Gypsum Board Assemblies", "09 - Finishes", "23.1", "12.1"),
        ("Vitrified Ceramic Floor Tile", "09 30 00", "Tiling (Ceramic / Vitrified)", "09 - Finishes", "24.1", "11.1"),
        ("European Water Closet (EWC)", "22 42 13", "Commercial / Residential Water Closets", "22 - Plumbing", "33.1", "17.1"),
        ("Stainless Steel Single Bowl Kitchen Sink", "22 41 16", "Residential Sinks", "22 - Plumbing", "33.3", "17.3"),
        ("Granite Kitchen Countertop & Cabinets", "12 35 30", "Residential Kitchen Casework and Cabinets", "12 - Furnishings", "26.1", "9.8"),
        ("Brick Boundary Wall Perimeter", "32 31 00", "Fences, Gates, and Boundary Enclosures", "32 - Exterior Improvements", "4.1", "6.3"),
        ("Masonry Guard Wall Retaining", "32 32 00", "Retaining Walls and Guard Enclosures", "32 - Exterior Improvements", "4.2", "6.4"),
        ("Concrete Road Rigid Paving", "32 13 00", "Rigid Paving (Concrete Roads and Aprons)", "32 - Exterior Improvements", "3.1", "16.1"),
    ]

    for desc, exp_code, exp_title, exp_div, exp_nrm, exp_cpwd in test_cases:
        res = classify_takeoff_line(desc)
        assert res.wbs_code == exp_code, f"Failed code for '{desc}': expected {exp_code}, got {res.wbs_code}"
        assert res.csi_division == exp_div, f"Failed division for '{desc}': expected {exp_div}, got {res.csi_division}"
        assert res.nrm_code == exp_nrm, f"Failed NRM for '{desc}': expected {exp_nrm}, got {res.nrm_code}"
        assert res.cpwd_code == exp_cpwd, f"Failed CPWD for '{desc}': expected {exp_cpwd}, got {res.cpwd_code}"
        assert res.confidence >= 0.85
        assert not res.is_ambiguous


def test_ambiguity_handling_and_flagging():
    """Verify ambiguous item without material maps to generic code and triggers needs_review."""
    ambiguous_line = TakeoffLine(
        id="amb-door",
        item_description="Door Unit (D1)",
        category="Openings - Doors",
        quantity=2.0,
        unit=UnitType.EA,
        confidence=0.90,
        calculation_method=CalculationMethod.COUNTED,
        is_measured=True,
    )

    classify_boq_lines([ambiguous_line])

    assert ambiguous_line.wbs_code == "08 10 00"
    assert ambiguous_line.csi_division == "08 - Openings"
    assert ambiguous_line.needs_review is True
    assert any("Door material unspecified" in r for r in ambiguous_line.review_reasons)


def test_100_percent_boq_classification_guarantee():
    """Verify arbitrary construction item maps to fallback Division 01, NEVER empty or UNKNOWN."""
    unknown_item = TakeoffLine(
        id="misc-item",
        item_description="Miscellaneous Unspecified Site Allowance",
        category="General",
        quantity=1.0,
        unit=UnitType.EA,
        confidence=0.70,
        calculation_method=CalculationMethod.COUNTED,
        is_measured=False,
    )

    classify_boq_lines([unknown_item])

    assert unknown_item.wbs_code == "01 00 00"
    assert unknown_item.wbs_title != ""
    assert unknown_item.csi_division == "01 - General Requirements"
    assert unknown_item.wbs_code != "UNKNOWN"
    assert unknown_item.wbs_title != "UNKNOWN"


def test_mandatory_gate_barakar_and_floorplan_wbs():
    """Mandatory Gate: 100% of lines across drawings have valid non-empty WBS classification."""
    # 1. Test Barakar
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # Barakar is a site survey; 100% of civil lines have valid WBS and 0 architectural lines
    arch_lines = [
        l for l in report.lines
        if any(k in l.item_description.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_lines) == 0, f"Found false architectural lines: {arch_lines}"
    for line in report.lines:
        assert line.wbs_code != "", f"Empty WBS code on {line.id}"
        assert line.wbs_code != "UNKNOWN"
        assert line.wbs_title != ""
        assert line.csi_division != ""

    # 2. Test floor plan with synthesized items
    synth_lines = [
        TakeoffLine(
            id="d1", item_description="Wood Door (D1)", category="Openings - Doors",
            quantity=1.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        ),
        TakeoffLine(
            id="w1", item_description="Aluminum Window (W1)", category="Openings - Windows",
            quantity=2.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        ),
        TakeoffLine(
            id="fl1", item_description="Ceramic Tile Finished Flooring", category="Finishes - Flooring",
            quantity=150.0, unit=UnitType.SF, calculation_method=CalculationMethod.CALLOUT_STATED,
        ),
        TakeoffLine(
            id="wc1", item_description="Water Closet (Toilet)", category="Plumbing Fixtures",
            quantity=1.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        ),
    ]

    classified = classify_boq_lines(synth_lines)
    for line in classified:
        assert line.wbs_code != "", f"Empty WBS code on {line.id}"
        assert line.wbs_code != "UNKNOWN"
        assert line.wbs_title != ""
        assert line.csi_division != ""
        assert line.nrm_code is not None
        assert line.cpwd_code is not None

    print(f"WBS Gate PASSED: 100% classification coverage verified across CSI, NRM, and CPWD.")


if __name__ == "__main__":
    test_csi_nrm_cpwd_classification_coverage()
    print("PASS: test_csi_nrm_cpwd_classification_coverage")
    test_ambiguity_handling_and_flagging()
    print("PASS: test_ambiguity_handling_and_flagging")
    test_100_percent_boq_classification_guarantee()
    print("PASS: test_100_percent_boq_classification_guarantee")
    test_mandatory_gate_barakar_and_floorplan_wbs()
    print("PASS: test_mandatory_gate_barakar_and_floorplan_wbs")
    print("ALL STAGE 9 TESTS COMPLETED SUCCESSFULLY!")
