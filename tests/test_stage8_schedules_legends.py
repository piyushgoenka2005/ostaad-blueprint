"""Stage 8 Test Suite: Schedule & Legend Extraction Engine.

Validates:
1. Tabular Schedule Extraction:
   - Door, window, and area statement schedules parsed into structured ScheduleTable & ScheduleItem.
2. Legend & Abbreviation Extraction:
   - Civil and architectural symbols/abbreviations mapped to standard terminology.
3. Schedule-Takeoff Cross-Referencing:
   - Flags discrepancies when schedule-stated quantities differ from plan-counted symbols.
   - Updates TakeoffLine.needs_review and review_reasons.
4. Mandatory Evaluation Gate on Barakar:
   - Extracts structured premises area statement (10907.8046 sq.m.) and civil benchmark/boundary legends.
   - Exactly zero false door or window schedules emitted.
"""

from __future__ import annotations

import os
from ostaad_boq.models import (
    DrawingType,
    ClassificationResult,
    ScheduleTable,
    ScheduleItem,
    LegendItem,
    SymbolCandidate,
    TakeoffLine,
    CalculationMethod,
    UnitType,
)
from ostaad_boq.ocr import OCRItem
from ostaad_boq.schedules import extract_schedules_and_legends, reconcile_schedules_with_takeoff
from ostaad_boq.engine import OstaadBOQEngine


def test_architectural_door_window_schedule_extraction():
    """Verify architectural tokens produce structured door and window schedules."""
    ocr_items = [
        OCRItem(text="DOOR SCHEDULE", confidence=0.98, bbox=(10, 10, 100, 25)),
        OCRItem(text="D1", confidence=0.95, bbox=(10, 30, 30, 45)),
        OCRItem(text="D2", confidence=0.94, bbox=(10, 50, 30, 65)),
        OCRItem(text="WINDOW SCHEDULE", confidence=0.98, bbox=(150, 10, 250, 25)),
        OCRItem(text="W1", confidence=0.96, bbox=(150, 30, 170, 45)),
        OCRItem(text="W2", confidence=0.95, bbox=(150, 50, 170, 65)),
    ]

    schedules, legends = extract_schedules_and_legends(ocr_items, classification=None)

    types = {s.schedule_type for s in schedules}
    assert "door_schedule" in types, "Expected door_schedule table"
    assert "window_schedule" in types, "Expected window_schedule table"

    door_table = next(s for s in schedules if s.schedule_type == "door_schedule")
    tags = [it.tag for it in door_table.items]
    assert "D1" in tags
    assert "D2" in tags


def test_schedule_reconciliation_count_mismatch():
    """Verify discrepancy flag when schedule-stated count != plan-counted symbols."""
    # Schedule states D1 = 4 units
    sched = ScheduleTable(
        id="sched-test",
        schedule_type="door_schedule",
        title="Door Schedule",
        headers=["TAG", "QTY"],
        items=[
            ScheduleItem(tag="D1", description="Main Door", quantity=4.0),
        ],
    )

    # But only 3 D1 candidates are on plan
    symbols = [
        SymbolCandidate(id="s1", symbol_type="door", label="D1", bbox=[0.1, 0.1, 0.2, 0.2]),
        SymbolCandidate(id="s2", symbol_type="door", label="D1", bbox=[0.3, 0.1, 0.4, 0.2]),
        SymbolCandidate(id="s3", symbol_type="door", label="D1", bbox=[0.5, 0.1, 0.6, 0.2]),
    ]

    takeoff = [
        TakeoffLine(
            id="door-line-1",
            item_description="Door Unit (D1)",
            category="Openings - Doors",
            quantity=3.0,
            unit=UnitType.EA,
            confidence=0.90,
            calculation_method=CalculationMethod.COUNTED,
            is_measured=True,
        )
    ]

    flags = reconcile_schedules_with_takeoff([sched], symbols, takeoff)

    assert len(flags) == 1, f"Expected 1 discrepancy flag, got {len(flags)}"
    assert flags[0].category == "Schedule Reconciliation"
    assert "Discrepancy" in flags[0].subject
    assert "specifies 4 units of 'D1', but 3 units were counted" in flags[0].details
    assert flags[0].severity == "discrepancy"


    # Takeoff line review status updated
    assert takeoff[0].needs_review is True
    assert any("Schedule mismatch" in r for r in takeoff[0].review_reasons)


def test_civil_legend_and_abbreviation_extraction():
    """Verify civil drawing extracts benchmark/boundary legends and 0 door/window schedules."""
    ocr_items = [
        OCRItem(text="TEMPORARY BENCHMARK (T.B.M.) LEVEL 102.50", confidence=0.97, bbox=(10, 10, 200, 30)),
        OCRItem(text="EXISTING BOUNDARY WALL", confidence=0.95, bbox=(10, 40, 180, 60)),
        OCRItem(text="ELECTRIC POLE (E.P.)", confidence=0.96, bbox=(10, 70, 150, 90)),
        OCRItem(text="PROPOSED CONCRETE ROAD", confidence=0.95, bbox=(10, 100, 180, 120)),
    ]
    classif = ClassificationResult(
        drawing_type=DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
        confidence=0.96,
        classification_reasoning="Site survey",
    )

    schedules, legends = extract_schedules_and_legends(ocr_items, classification=classif)

    # Invariant: 0 door/window schedules
    arch_schedules = [s for s in schedules if s.schedule_type in ["door_schedule", "window_schedule"]]
    assert len(arch_schedules) == 0, f"VIOLATION: Site survey produced {len(arch_schedules)} architectural schedules"

    # Civil legends extracted
    legend_tags = {l.symbol_tag for l in legends}
    assert "TBM" in legend_tags
    assert "BW" in legend_tags
    assert "EP" in legend_tags
    assert "CR" in legend_tags
    for l in legends:
        assert l.category == "civil_notes"
        assert l.confidence >= 0.95


def test_mandatory_gate_barakar_schedules_and_legends():
    """Mandatory Gate: Barakar extracts premises area statement, civil legends, 0 false door/window schedules."""
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # 1. Barakar must have premises area statement table
    area_schedules = [s for s in report.schedules if s.schedule_type == "area_summary"]
    assert len(area_schedules) >= 1, "Expected premises area summary schedule on Barakar"
    area_item = area_schedules[0].items[0]
    assert area_item.quantity == 10907.8046, f"Expected 10907.8046 sq.m., got {area_item.quantity}"

    # 2. Barakar must have civil legends (TBM, Boundary Wall, Guard Wall, Concrete Road)
    civil_legends = [l for l in report.legend_items if l.category == "civil_notes"]
    assert len(civil_legends) >= 3, f"Expected civil legends, got {len(civil_legends)}"
    civil_tags = {l.symbol_tag for l in civil_legends}
    assert "TBM" in civil_tags or "BM" in civil_tags
    assert "BW" in civil_tags or "GW" in civil_tags

    # 3. Barakar must have EXACTLY ZERO door or window schedules
    arch_schedules = [s for s in report.schedules if s.schedule_type in ["door_schedule", "window_schedule"]]
    assert len(arch_schedules) == 0, f"VIOLATION: Found {len(arch_schedules)} architectural schedules on Barakar"

    # 4. Zero architectural takeoff lines
    arch_lines = [
        l for l in report.lines
        if any(k in l.item_description.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_lines) == 0, f"Found false architectural lines: {arch_lines}"

    print(f"Barakar Gate PASSED: Area summary = {area_item.quantity} sq.m., {len(civil_legends)} civil legends, 0 false architectural schedules.")


if __name__ == "__main__":
    test_architectural_door_window_schedule_extraction()
    print("PASS: test_architectural_door_window_schedule_extraction")
    test_schedule_reconciliation_count_mismatch()
    print("PASS: test_schedule_reconciliation_count_mismatch")
    test_civil_legend_and_abbreviation_extraction()
    print("PASS: test_civil_legend_and_abbreviation_extraction")
    test_mandatory_gate_barakar_schedules_and_legends()
    print("PASS: test_mandatory_gate_barakar_schedules_and_legends")
    print("ALL STAGE 8 TESTS COMPLETED SUCCESSFULLY!")
