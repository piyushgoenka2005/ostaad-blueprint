"""Export module for Ostaad Blueprint-to-BOQ Engine.

Generates industry-standard XLSX (using openpyxl) and CSV exports with
full audit trails, CSI MasterFormat groupings, and uncertainty flags.
"""

from __future__ import annotations

import csv
import io
from .models import BOQReport


def export_to_csv(report: BOQReport) -> str:
    """Generate a clean, structured CSV representation of the BOQ report."""
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Header Information
    writer.writerow(["Project", report.project_name])
    writer.writerow(["Sheet", report.sheet_name])
    writer.writerow([
        "Scale",
        report.scale.raw_scale_text or (f"{report.scale.pixels_per_unit} px/{report.scale.unit}" if report.scale.scale_known else "Unresolved"),
    ])
    writer.writerow([])

    # 2. Main BOQ Items
    writer.writerow([
        "Item ID",
        "CSI Category",
        "Description",
        "Quantity",
        "Unit",
        "Confidence",
        "Method",
        "Measured vs Estimated",
        "Needs Review",
        "Assumptions / Notes",
    ])
    for item in report.lines:
        writer.writerow([
            item.id,
            item.category,
            item.item_description,
            item.quantity,
            item.unit.value,
            f"{int(item.confidence * 100)}%",
            item.calculation_method.value,
            "Directly Measured" if item.is_measured else "Derived Material Estimate",
            "YES" if item.needs_review else "NO",
            item.assumptions,
        ])
    writer.writerow([])

    # 3. Linear Wall Measurements
    if report.linear_runs:
        writer.writerow(["Linear Wall Takeoff"])
        writer.writerow(["ID", "Category / Wall Type", "Quantity", "Unit", "Method", "Notes"])
        for run in report.linear_runs:
            writer.writerow([
                run.id,
                run.label,
                run.length,
                run.unit.value,
                run.calculation_method.value,
                run.notes,
            ])
        writer.writerow([])

    # 4. Room Schedule
    if report.rooms:
        writer.writerow(["Room Schedule & Area Takeoff"])
        writer.writerow(["ID", "Room Name", "Stated Sq Ft", "Measured Sq Ft", "Perimeter LF", "Variance %", "Review Flag"])
        for r in report.rooms:
            writer.writerow([
                r.id,
                r.name,
                r.stated_area_sqft if r.stated_area_sqft is not None else "—",
                r.measured_area_sqft if r.measured_area_sqft is not None else "—",
                r.perimeter_lf if r.perimeter_lf is not None else "—",
                f"{r.discrepancy_pct}%" if r.discrepancy_pct is not None else "—",
                "REVIEW REQUIRED" if r.needs_review else "OK",
            ])
        writer.writerow([])

    # 5. Audit & Reconciliation Flags
    if report.reconciliation_flags:
        writer.writerow(["Reconciliation & Audit Flags"])
        writer.writerow(["Flag ID", "Severity", "Category", "Subject", "Details", "Recommendation"])
        for flag in report.reconciliation_flags:
            writer.writerow([
                flag.id,
                flag.severity.upper(),
                flag.category,
                flag.subject,
                flag.details,
                flag.recommendation,
            ])

    return output.getvalue()


def export_to_xlsx(report: BOQReport) -> bytes:
    """Generate a multi-sheet styled Excel workbook using openpyxl."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Styles
    navy_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    accent_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    flag_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=11, bold=True)
    title_font = Font(name="Calibri", size=14, bold=True, color="1F4E79")
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    # -------------------------------------------------------------
    # SHEET 1: Bill of Quantities (BOQ)
    # -------------------------------------------------------------
    ws_boq = wb.create_sheet(title="Bill of Quantities")
    ws_boq.views.sheetView[0].showGridLines = True

    # Title block
    ws_boq["A1"] = "OSTAAD BLUEPRINT-TO-BOQ TAKEOFF"
    ws_boq["A1"].font = title_font
    ws_boq["A2"] = f"Sheet: {report.sheet_name} | Scale: {report.scale.raw_scale_text or 'Calibrated'}"
    ws_boq["A2"].font = Font(name="Calibri", size=10, italic=True)

    headers = [
        "Item ID", "CSI Division", "Item Description", "Qty", "Unit",
        "Confidence", "Method", "Type", "Review ⚠", "Assumptions / Source"
    ]
    for col_idx, h in enumerate(headers, start=1):
        cell = ws_boq.cell(row=4, column=col_idx, value=h)
        cell.fill = navy_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center" if col_idx in (4, 5, 6, 9) else "left")

    row_idx = 5
    for item in report.lines:
        ws_boq.cell(row=row_idx, column=1, value=item.id).border = thin_border
        ws_boq.cell(row=row_idx, column=2, value=item.category).border = thin_border
        ws_boq.cell(row=row_idx, column=3, value=item.item_description).border = thin_border
        c_qty = ws_boq.cell(row=row_idx, column=4, value=item.quantity)
        c_qty.border = thin_border
        c_qty.alignment = Alignment(horizontal="right")
        c_unit = ws_boq.cell(row=row_idx, column=5, value=item.unit.value)
        c_unit.border = thin_border
        c_unit.alignment = Alignment(horizontal="center")
        c_conf = ws_boq.cell(row=row_idx, column=6, value=f"{int(item.confidence * 100)}%")
        c_conf.border = thin_border
        c_conf.alignment = Alignment(horizontal="center")
        ws_boq.cell(row=row_idx, column=7, value=item.calculation_method.value).border = thin_border
        ws_boq.cell(row=row_idx, column=8, value="Measured" if item.is_measured else "Estimated").border = thin_border
        c_rev = ws_boq.cell(row=row_idx, column=9, value="REVIEW" if item.needs_review else "OK")
        c_rev.border = thin_border
        c_rev.alignment = Alignment(horizontal="center")
        if item.needs_review:
            c_rev.fill = flag_fill
        ws_boq.cell(row=row_idx, column=10, value=item.assumptions).border = thin_border
        row_idx += 1

    # Auto-adjust column widths
    for col in ws_boq.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_boq.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # -------------------------------------------------------------
    # SHEET 2: Room Schedule & Area Takeoff
    # -------------------------------------------------------------
    ws_rooms = wb.create_sheet(title="Room Schedule")
    ws_rooms.views.sheetView[0].showGridLines = True
    ws_rooms["A1"] = "ROOM SPATIAL TAKEOFF & RECONCILIATION"
    ws_rooms["A1"].font = title_font

    r_headers = ["Room ID", "Room Name", "Stated Sq Ft", "Measured Sq Ft", "Perimeter LF", "Variance %", "Audit Status"]
    for col_idx, h in enumerate(r_headers, start=1):
        cell = ws_rooms.cell(row=3, column=col_idx, value=h)
        cell.fill = navy_fill
        cell.font = header_font

    row_idx = 4
    for r in report.rooms:
        ws_rooms.cell(row=row_idx, column=1, value=r.id).border = thin_border
        ws_rooms.cell(row=row_idx, column=2, value=r.name).border = thin_border
        ws_rooms.cell(row=row_idx, column=3, value=r.stated_area_sqft).border = thin_border
        ws_rooms.cell(row=row_idx, column=4, value=r.measured_area_sqft).border = thin_border
        ws_rooms.cell(row=row_idx, column=5, value=r.perimeter_lf).border = thin_border
        ws_rooms.cell(row=row_idx, column=6, value=f"{r.discrepancy_pct}%" if r.discrepancy_pct else "—").border = thin_border
        status_cell = ws_rooms.cell(row=row_idx, column=7, value="FLAGGED" if r.needs_review else "VERIFIED")
        status_cell.border = thin_border
        if r.needs_review:
            status_cell.fill = flag_fill
        row_idx += 1

    for col in ws_rooms.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_rooms.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # -------------------------------------------------------------
    # SHEET 3: Audit Flags
    # -------------------------------------------------------------
    if report.reconciliation_flags:
        ws_flags = wb.create_sheet(title="Audit & Discrepancies")
        ws_flags.views.sheetView[0].showGridLines = True
        ws_flags["A1"] = "RECONCILIATION & DISCREPANCY AUDIT"
        ws_flags["A1"].font = title_font

        f_headers = ["Flag ID", "Severity", "Category", "Discrepancy Subject", "Details", "Action Recommended"]
        for col_idx, h in enumerate(f_headers, start=1):
            cell = ws_flags.cell(row=3, column=col_idx, value=h)
            cell.fill = navy_fill
            cell.font = header_font

        row_idx = 4
        for f in report.reconciliation_flags:
            ws_flags.cell(row=row_idx, column=1, value=f.id).border = thin_border
            ws_flags.cell(row=row_idx, column=2, value=f.severity.upper()).border = thin_border
            ws_flags.cell(row=row_idx, column=3, value=f.category).border = thin_border
            ws_flags.cell(row=row_idx, column=4, value=f.subject).border = thin_border
            ws_flags.cell(row=row_idx, column=5, value=f.details).border = thin_border
            ws_flags.cell(row=row_idx, column=6, value=f.recommendation).border = thin_border
            row_idx += 1

        for col in ws_flags.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws_flags.column_dimensions[col_letter].width = max(max_len + 3, 14)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
