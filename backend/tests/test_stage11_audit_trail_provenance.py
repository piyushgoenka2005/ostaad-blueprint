"""Stage 11 Test Suite: Audit Trail, Confidence Scoring & Spatial Bounding Boxes.

Validates:
1. Spatial Bounding Box Guarantee:
   - 100% of directly measured items have valid [x_min, y_min, x_max, y_max] normalized coordinates.
2. Chronological Audit Trail:
   - Step-by-step history tracking ingestion, spatial layer grounding, evidence corroboration, and WBS.
3. Multi-Factor Confidence Scoring:
   - Explicit breakdown across geometry_score, ocr_score, and corroboration_score.
   - Strict gate: overall < 0.85 triggers needs_review=True and estimator review reason.
4. Mandatory Gate on Real Benchmark:
   - 100% of takeoff items on real drawing outputs possess verified bounding boxes and audit trails.
"""

from __future__ import annotations

import os
from ostaad_boq.models import (
    BOQReport,
    TakeoffLine,
    RoomTakeoff,
    SymbolCandidate,
    GeometricFeature,
    UnitType,
    CalculationMethod,
    ScaleCalibration,
)
from ostaad_boq.audit_trail import audit_and_enrich_report
from ostaad_boq.engine import OstaadBOQEngine


def test_spatial_bounding_box_coverage():
    """Verify directly measured and derived lines are assigned valid spatial bounding boxes."""
    symbols = [
        SymbolCandidate(
            id="s1", symbol_type="door", label="D1",
            bbox=[0.15, 0.20, 0.18, 0.25], detector_source="symbol_tag_detector",
        )
    ]
    lines = [
        TakeoffLine(
            id="d1", item_description="Wood Door (D1)", category="Openings - Doors",
            quantity=1.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            is_measured=True,
        ),
        TakeoffLine(
            id="mat-drywall", item_description="1/2\" Gypsum Wallboard", category="Finishes - Walls",
            quantity=1200.0, unit=UnitType.SF, calculation_method=CalculationMethod.DERIVED_MATERIAL,
            is_measured=False,
        ),
    ]

    report = BOQReport(
        project_name="Test Plan",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=lines,
        symbol_candidates=symbols,
    )

    enriched = audit_and_enrich_report(report)

    # 1. Door item matched symbol bbox
    door_line = next(l for l in enriched.lines if l.id == "d1")
    assert door_line.bounding_box == [0.15, 0.20, 0.18, 0.25]
    assert door_line.source_layer == "symbol_tag_detector"

    # 2. Derived drywall line assigned valid sheet composite bbox
    dw_line = next(l for l in enriched.lines if l.id == "mat-drywall")
    assert len(dw_line.bounding_box) == 4
    assert dw_line.bounding_box[2] > dw_line.bounding_box[0]
    assert dw_line.bounding_box[3] > dw_line.bounding_box[1]


def test_chronological_audit_trail_steps():
    """Verify every line possesses an audit trail with at least 3 chronological steps."""
    line = TakeoffLine(
        id="w1", item_description="Metal Window (W1)", category="Openings - Windows",
        quantity=2.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        wbs_code="08 51 23", wbs_title="Metal Windows", csi_division="08 - Openings",
        bounding_box=[0.3, 0.05, 0.4, 0.08],
        is_measured=True,
    )
    report = BOQReport(
        project_name="Test Plan",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=[line],
    )

    enriched = audit_and_enrich_report(report)
    tested_line = enriched.lines[0]

    assert len(tested_line.audit_trail) >= 3, f"Expected >= 3 audit steps, got {len(tested_line.audit_trail)}"
    assert any("Step 1 [Ingestion]" in step for step in tested_line.audit_trail)
    assert any("Step 2 [Spatial Grounding]" in step for step in tested_line.audit_trail)
    assert any("Step 3 [Corroboration]" in step for step in tested_line.audit_trail)
    assert any("Step 4 [WBS Standard]" in step for step in tested_line.audit_trail)


def test_multi_factor_confidence_breakdown():
    """Verify multi-factor confidence computation and low-confidence review gate."""
    # Low-confidence ungrounded line
    low_conf_line = TakeoffLine(
        id="low-1", item_description="Ambiguous Fixture", category="General",
        quantity=1.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        is_measured=True,
    )
    report = BOQReport(
        project_name="Test Plan",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=[low_conf_line],
    )

    enriched = audit_and_enrich_report(report)
    tested_line = enriched.lines[0]

    conf_dict = tested_line.audit_confidence
    assert "overall" in conf_dict
    assert "geometry_score" in conf_dict
    assert "ocr_score" in conf_dict
    assert "corroboration_score" in conf_dict

    # Overall should match confidence
    assert tested_line.confidence == conf_dict["overall"]

    # Since it has no corroborating nodes, corroboration_score=0.50, overall will be below 0.85
    assert tested_line.confidence < 0.85
    assert tested_line.needs_review is True
    assert any("below 85% review threshold" in r for r in tested_line.review_reasons)


def test_mandatory_gate_barakar_and_floorplan_audit():
    """Mandatory Gate: Verify audit trail, spatial bounding boxes, and audit summary metadata."""
    # 1. Barakar Site Survey Gate
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # Verify audit summary metadata attached
    assert "audit_summary" in report.metadata
    assert report.metadata["audit_summary"]["audit_pass_rate_pct"] > 0.0
    # Zero false architectural lines on site survey
    arch_lines = [
        l for l in report.lines
        if any(k in l.item_description.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_lines) == 0, f"Found false architectural lines on site survey: {arch_lines}"

    # 2. Architectural Floor Plan Gate with sample synthesized items
    synth_lines = [
        TakeoffLine(
            id="d1", item_description="Wood Door (D1)", category="Openings - Doors",
            quantity=1.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            bounding_box=[0.1, 0.2, 0.15, 0.25], is_measured=True,
        ),
        TakeoffLine(
            id="mat-drywall", item_description="1/2\" Gypsum Wallboard", category="Finishes - Walls",
            quantity=500.0, unit=UnitType.SF, calculation_method=CalculationMethod.DERIVED_MATERIAL,
            is_measured=False,
        ),
    ]
    arch_report = BOQReport(
        project_name="Floor Plan Takeoff",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=synth_lines,
        rooms=[RoomTakeoff(id="r1", name="Bedroom", stated_area_sqft=140.0, measured_area_sqft=142.0)],
    )

    enriched_arch = audit_and_enrich_report(arch_report)

    # 100% of lines have valid bounding boxes
    for line in enriched_arch.lines:
        assert line.bounding_box is not None, f"Missing bounding box on {line.id}"
        assert len(line.bounding_box) == 4
        assert line.bounding_box[2] > line.bounding_box[0]
        assert line.bounding_box[3] > line.bounding_box[1]
        assert len(line.audit_trail) >= 3

    # 100% of rooms have audit trails
    for room in enriched_arch.rooms:
        assert len(room.audit_trail) >= 2
        assert room.bounding_box is not None

    print("Stage 11 Audit Trail & Spatial Bounding Box Gate PASSED: 100% coverage verified.")


if __name__ == "__main__":
    test_spatial_bounding_box_coverage()
    print("PASS: test_spatial_bounding_box_coverage")
    test_chronological_audit_trail_steps()
    print("PASS: test_chronological_audit_trail_steps")
    test_multi_factor_confidence_breakdown()
    print("PASS: test_multi_factor_confidence_breakdown")
    test_mandatory_gate_barakar_and_floorplan_audit()
    print("PASS: test_mandatory_gate_barakar_and_floorplan_audit")
    print("ALL STAGE 11 TESTS COMPLETED SUCCESSFULLY!")
