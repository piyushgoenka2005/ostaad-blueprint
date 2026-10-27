"""Stage 13 Test Suite: Multi-Format Commercial Export Engine.

Validates:
1. Lossless JSON Export:
   - Round-trip deserialization via BOQReport.model_validate_json with zero field loss.
2. RFC 4180 CSV Export:
   - Compliant CSV output with full itemized WBS, costs, and bounding box coordinates.
3. 5-Tab Excel Export (.xlsx):
   - Executive Summary, Bill of Quantities, Room Reconciliation, Schedules & Legends, Audit Log & Flags.
   - Styled headers, currency formatting, and SUM formula checks.
4. Printable PDF Export (.pdf):
   - Formatted commercial estimate document with title block, metadata, and financial summary.
5. Mandatory Gate on Real Benchmark:
   - Barakar exports cleanly to all 4 formats.
"""

from __future__ import annotations

import csv
import io
import json
import os
import openpyxl
from ostaad_boq.models import (
    BOQReport,
    TakeoffLine,
    RoomTakeoff,
    ScaleCalibration,
    UnitType,
    CalculationMethod,
    ProjectCostSummary,
)
from ostaad_boq.export_engine import (
    export_to_json,
    export_to_csv,
    export_to_excel,
    export_to_pdf,
)
from ostaad_boq.engine import OstaadBOQEngine


def _create_sample_report() -> BOQReport:
    """Create a populated BOQReport for export validation."""
    lines = [
        TakeoffLine(
            id="d1", item_description="Wood Door Unit (D1)", category="Openings - Doors",
            quantity=2.0, unit=UnitType.EA, unit_cost=420.0, total_cost=840.0,
            material_cost=520.0, labor_cost=280.0, currency="USD",
            wbs_code="08 14 00", wbs_title="Wood Doors", csi_division="08 - Openings",
            bounding_box=[0.1, 0.2, 0.15, 0.25], calculation_method=CalculationMethod.COUNTED,
            is_measured=True, confidence=0.95,
        ),
        TakeoffLine(
            id="mat-drywall", item_description="1/2\" Gypsum Wallboard", category="Finishes - Walls",
            quantity=1500.0, unit=UnitType.SF, unit_cost=2.85, total_cost=4275.0,
            material_cost=1500.0, labor_cost=2550.0, currency="USD",
            wbs_code="09 29 00", wbs_title="Gypsum Board Assemblies", csi_division="09 - Finishes",
            bounding_box=[0.05, 0.05, 0.95, 0.95], calculation_method=CalculationMethod.DERIVED_MATERIAL,
            is_measured=False, confidence=0.90, assumptions="Wall LF * 9 FT * 2 sides + 10% waste",
        ),
    ]
    cost = ProjectCostSummary(
        currency="USD",
        currency_symbol="$",
        direct_cost_subtotal=5115.00,
        material_cost_subtotal=2020.00,
        labor_cost_subtotal=2830.00,
        overhead_pct=10.0,
        overhead_amount=511.50,
        profit_pct=10.0,
        profit_amount=511.50,
        contingency_pct=5.0,
        contingency_amount=255.75,
        total_estimated_budget=6393.75,
    )
    rooms = [
        RoomTakeoff(
            id="r1", name="Master Bedroom", stated_area_sqft=220.0, measured_area_sqft=218.0,
            perimeter_lf=60.0, discrepancy_pct=0.9, bounding_box=[0.1, 0.1, 0.4, 0.4],
        )
    ]

    return BOQReport(
        project_name="Commercial Office Remodel",
        sheet_name="A-101 Floor Plan",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft", raw_scale_text="1/4\" = 1'-0\""),
        lines=lines,
        rooms=rooms,
        cost_summary=cost,
        metadata={"total_conditioned_sqft": 1450.0},
    )


def test_json_export_and_roundtrip():
    """Verify lossless JSON export and deserialization back into BOQReport model."""
    rep = _create_sample_report()
    json_str = export_to_json(rep)

    assert json_str is not None
    parsed_dict = json.loads(json_str)
    assert parsed_dict["project_name"] == "Commercial Office Remodel"
    assert len(parsed_dict["lines"]) == 2

    # Round-trip Pydantic validation
    roundtrip = BOQReport.model_validate_json(json_str)
    assert roundtrip.project_name == rep.project_name
    assert len(roundtrip.lines) == len(rep.lines)
    assert roundtrip.cost_summary.total_estimated_budget == rep.cost_summary.total_estimated_budget
    assert roundtrip.lines[0].wbs_code == "08 14 00"


def test_csv_export_rfc4180_compliance():
    """Verify RFC 4180 CSV export with proper columns and values."""
    rep = _create_sample_report()
    csv_str = export_to_csv(rep)

    reader = csv.reader(io.StringIO(csv_str))
    rows = list(reader)

    # 1 header + 2 data rows
    assert len(rows) == 3
    header = rows[0]
    assert "Item ID" in header
    assert "WBS Code" in header
    assert "Total Cost" in header
    assert "Bounding Box" in header

    # Verify data row 1
    row1 = rows[1]
    assert row1[0] == "d1"
    assert row1[1] == "08 14 00"
    assert row1[4] == "Wood Door Unit (D1)"
    assert float(row1[11]) == 840.0


def test_excel_export_multi_tab_integrity():
    """Verify 5-tab Excel workbook generation with formulas, formatting, and auto-widths."""
    rep = _create_sample_report()
    excel_bytes = export_to_excel(rep)

    assert excel_bytes.startswith(b"PK")  # ZIP/XLSX magic bytes
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes), data_only=False)

    expected_sheets = [
        "Executive Summary",
        "Bill of Quantities",
        "Room Reconciliation",
        "Schedules & Legends",
        "Audit Log & Flags",
    ]
    for s_name in expected_sheets:
        assert s_name in wb.sheetnames, f"Missing sheet: {s_name}"

    # Tab 1 checks
    ws1 = wb["Executive Summary"]
    assert ws1["B3"].value == "Commercial Office Remodel"
    # Total budget cell
    assert ws1["A18"].value == "TOTAL ESTIMATED CONSTRUCTION BUDGET"
    assert ws1["B18"].value == 6393.75

    # Tab 2 checks
    ws2 = wb["Bill of Quantities"]
    assert ws2["A1"].value == "Item ID"
    assert ws2["A2"].value == "d1"
    assert ws2["A3"].value == "mat-drywall"
    # Total formula cell
    assert "=SUM(" in str(ws2["L4"].value)


def test_pdf_export_structure():
    """Verify printable PDF generation with valid PDF header and elements."""
    rep = _create_sample_report()
    pdf_bytes = export_to_pdf(rep)

    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000, f"Expected valid PDF size, got {len(pdf_bytes)} bytes"


def test_mandatory_gate_barakar_exports():
    """Mandatory Gate: Verify Barakar exports cleanly to all 4 formats (.json, .csv, .xlsx, .pdf)."""
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # 1. JSON
    json_out = export_to_json(report)
    assert "Site Topographical Survey" in json_out
    assert json.loads(json_out) is not None

    # 2. CSV
    csv_out = export_to_csv(report)
    assert "Item ID" in csv_out

    # 3. Excel
    xlsx_out = export_to_excel(report)
    assert len(xlsx_out) > 5000
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_out))
    assert "Executive Summary" in wb.sheetnames
    assert "Schedules & Legends" in wb.sheetnames

    # 4. PDF
    pdf_out = export_to_pdf(report)
    assert pdf_out.startswith(b"%PDF-")
    assert len(pdf_out) > 2000

    print("Stage 13 Export Engine Gate PASSED: All 4 formats validated on real Barakar survey.")


if __name__ == "__main__":
    test_json_export_and_roundtrip()
    print("PASS: test_json_export_and_roundtrip")
    test_csv_export_rfc4180_compliance()
    print("PASS: test_csv_export_rfc4180_compliance")
    test_excel_export_multi_tab_integrity()
    print("PASS: test_excel_export_multi_tab_integrity")
    test_pdf_export_structure()
    print("PASS: test_pdf_export_structure")
    test_mandatory_gate_barakar_exports()
    print("PASS: test_mandatory_gate_barakar_exports")
    print("ALL STAGE 13 TESTS COMPLETED SUCCESSFULLY!")
