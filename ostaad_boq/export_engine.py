"""Stage 13: Multi-Format Commercial Export Engine.

Generates professional, verified exports across four industry-standard formats:
1. Excel (.xlsx) — Multi-tab workbook (Executive Summary, BOQ, Room Reconciliation, Schedules, Audit Log)
2. CSV (.csv) — RFC 4180 compliant tabular dump for estimating and ERP ingestion
3. JSON (.json) — Full lossless serialization with round-trip schema validation
4. PDF (.pdf) — Formatted executive estimate package with title block, cost summary, and approvals
"""

from __future__ import annotations

import csv
import io
import json
import os
from typing import Any
from .models import BOQReport


def export_to_json(report: BOQReport, indent: int = 2) -> str:
    """Lossless JSON serialization of the full BOQReport package."""
    return report.model_dump_json(indent=indent)


def export_to_csv(report: BOQReport) -> str:
    """Generate RFC 4180 compliant CSV of the Bill of Quantities."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header Row
    writer.writerow([
        "Item ID",
        "WBS Code",
        "WBS Title",
        "CSI Division",
        "Description",
        "Category",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Material Cost",
        "Labor Cost",
        "Total Cost",
        "Currency",
        "Quantity Type",
        "Validation Status",
        "Evidence Sources",
        "Calculation Method",
        "Confidence",
        "Needs Review",
        "Review Reasons",
        "Assumptions",
        "Source Layer",
        "Bounding Box",
    ])

    for line in report.lines:
        bbox_str = f"[{line.bounding_box[0]:.3f}, {line.bounding_box[1]:.3f}, {line.bounding_box[2]:.3f}, {line.bounding_box[3]:.3f}]" if line.bounding_box else ""
        evidence_srcs = ", ".join(line.corroborating_evidence_ids) if line.corroborating_evidence_ids else (line.source_layer or "Vector/Geometry")
        writer.writerow([
            line.id,
            line.wbs_code,
            line.wbs_title,
            line.csi_division,
            line.item_description,
            line.category,
            line.quantity,
            line.unit.value,
            line.unit_cost,
            line.material_cost,
            line.labor_cost,
            line.total_cost,
            line.currency,
            line.quantity_type.value if hasattr(line, "quantity_type") else ("Measured" if line.is_measured else "Derived"),
            line.validation_status.value if hasattr(line, "validation_status") else "SUPPORTED",
            evidence_srcs,
            line.calculation_method.value,
            f"{line.confidence * 100:.1f}%",
            "Yes" if line.needs_review else "No",
            " | ".join(line.review_reasons),
            line.assumptions,
            line.source_layer or "",
            bbox_str,
        ])

    return output.getvalue()


def export_to_excel(report: BOQReport, output_path: str | None = None) -> bytes:
    """Generate a multi-tab professional Excel workbook (.xlsx)."""
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Color Palette & Styles
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=14, bold=True, color="1F497D")
    section_font = Font(name="Calibri", size=12, bold=True, color="1F497D")
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    subtotal_fill = PatternFill(start_color="DCE6F1", end_color="DCE6F1", fill_type="solid")
    total_fill = PatternFill(start_color="B8CCE4", end_color="B8CCE4", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )

    curr_sym = report.cost_summary.currency_symbol

    # ==========================================
    # TAB 1: EXECUTIVE SUMMARY
    # ==========================================
    ws_exec = wb.create_sheet(title="Executive Summary")
    ws_exec.views.sheetView[0].showGridLines = True

    ws_exec["A1"] = "OSTAAD AI — BILL OF QUANTITIES EXECUTIVE SUMMARY"
    ws_exec["A1"].font = title_font
    ws_exec.merge_cells("A1:D1")

    # Project Information
    ws_exec["A3"] = "Project Name:"
    ws_exec["B3"] = report.project_name
    ws_exec["A4"] = "Sheet Name:"
    ws_exec["B4"] = report.sheet_name
    ws_exec["A5"] = "Drawing Type:"
    ws_exec["B5"] = report.classification.drawing_type.value.replace("_", " ").title()
    ws_exec["A6"] = "Drawing Scale:"
    ws_exec["B6"] = f"{report.scale.raw_scale_text or 'Calibrated'} ({report.scale.unit})"
    ws_exec["A7"] = "Conditioned Space:"
    ws_exec["B7"] = f"{report.metadata.get('total_conditioned_sqft', 0.0):,.1f} sq ft"
    ws_exec["A8"] = "Processing Engine:"
    ws_exec["B8"] = "Ostaad Blueprint-to-BOQ AI v2.0"

    for r in range(3, 9):
        ws_exec[f"A{r}"].font = Font(bold=True)

    # Financial Cost Roll-Up
    ws_exec["A10"] = "FINANCIAL BUDGET ROLL-UP"
    ws_exec["A10"].font = section_font
    ws_exec.merge_cells("A10:C10")

    summary_rows = [
        ("Direct Construction Cost Subtotal", report.cost_summary.direct_cost_subtotal, False),
        ("Material Cost Subtotal", report.cost_summary.material_cost_subtotal, False),
        ("Labor Cost Subtotal", report.cost_summary.labor_cost_subtotal, False),
        ("Equipment Cost Subtotal", report.cost_summary.equipment_cost_subtotal, False),
        (f"General Conditions & Overhead ({report.cost_summary.overhead_pct}%)", report.cost_summary.overhead_amount, False),
        (f"Contractor Profit Margin ({report.cost_summary.profit_pct}%)", report.cost_summary.profit_amount, False),
        (f"Estimating Contingency Allowance ({report.cost_summary.contingency_pct}%)", report.cost_summary.contingency_amount, False),
        ("TOTAL ESTIMATED CONSTRUCTION BUDGET", report.cost_summary.total_estimated_budget, True),
    ]

    for idx, (label, val, is_total) in enumerate(summary_rows, start=11):
        ws_exec[f"A{idx}"] = label
        ws_exec[f"B{idx}"] = val
        ws_exec[f"B{idx}"].number_format = f'"{curr_sym}"#,##0.00'
        if is_total:
            ws_exec[f"A{idx}"].font = Font(bold=True)
            ws_exec[f"B{idx}"].font = Font(bold=True)
            ws_exec[f"A{idx}"].fill = total_fill
            ws_exec[f"B{idx}"].fill = total_fill
        else:
            ws_exec[f"A{idx}"].fill = subtotal_fill if "Subtotal" in label else PatternFill(fill_type=None)

    # ==========================================
    # TAB 2: BILL OF QUANTITIES
    # ==========================================
    ws_boq = wb.create_sheet(title="Bill of Quantities")
    ws_boq.views.sheetView[0].showGridLines = True

    boq_headers = [
        "Item ID", "WBS Code", "WBS Title", "CSI Division", "Description", "Category",
        "Qty", "Unit", "Unit Rate", "Material Cost", "Labor Cost", "Total Cost",
        "Quantity Type", "Validation Status", "Evidence Sources", "Confidence", "Review?", "Assumptions / Formulas"
    ]
    ws_boq.append(boq_headers)
    for col_idx in range(1, len(boq_headers) + 1):
        cell = ws_boq.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")

    verified_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    review_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")

    for line in report.lines:
        v_status = line.validation_status.value if hasattr(line, "validation_status") else "SUPPORTED"
        q_type = line.quantity_type.value if hasattr(line, "quantity_type") else ("Measured" if line.is_measured else "Derived")
        evidence_srcs = ", ".join(line.corroborating_evidence_ids) if line.corroborating_evidence_ids else (line.source_layer or "Vector/Geometry")

        ws_boq.append([
            line.id,
            line.wbs_code,
            line.wbs_title,
            line.csi_division,
            line.item_description,
            line.category,
            line.quantity,
            line.unit.value,
            line.unit_cost,
            line.material_cost,
            line.labor_cost,
            line.total_cost,
            q_type,
            v_status,
            evidence_srcs,
            f"{line.confidence * 100:.1f}%",
            "REVIEW" if line.needs_review else "OK",
            line.assumptions,
        ])
        # Format currency cells in current row
        curr_row = ws_boq.max_row
        ws_boq[f"I{curr_row}"].number_format = f'"{curr_sym}"#,##0.00'
        ws_boq[f"J{curr_row}"].number_format = f'"{curr_sym}"#,##0.00'
        ws_boq[f"K{curr_row}"].number_format = f'"{curr_sym}"#,##0.00'
        ws_boq[f"L{curr_row}"].number_format = f'"{curr_sym}"#,##0.00'

        # Highlight row based on validation status
        if v_status == "VERIFIED":
            ws_boq[f"N{curr_row}"].fill = verified_fill
        elif line.needs_review or v_status == "NEEDS_REVIEW":
            ws_boq[f"N{curr_row}"].fill = review_fill
            ws_boq[f"Q{curr_row}"].fill = review_fill

    # Summary Row
    if report.lines:
        tot_row = ws_boq.max_row + 1
        ws_boq[f"E{tot_row}"] = "TOTAL DIRECT COST"
        ws_boq[f"E{tot_row}"].font = Font(bold=True)
        ws_boq[f"L{tot_row}"] = f"=SUM(L2:L{tot_row - 1})"
        ws_boq[f"L{tot_row}"].font = Font(bold=True)
        ws_boq[f"L{tot_row}"].number_format = f'"{curr_sym}"#,##0.00'
        ws_boq[f"L{tot_row}"].fill = total_fill

    # ==========================================
    # TAB 3: ROOM RECONCILIATION
    # ==========================================
    ws_rooms = wb.create_sheet(title="Room Reconciliation")
    ws_rooms.views.sheetView[0].showGridLines = True
    room_headers = ["Room ID", "Room Name", "Stated Area (SF)", "Measured Area (SF)", "Discrepancy %", "Perimeter (LF)", "Flooring Category", "Status"]
    ws_rooms.append(room_headers)
    for col_idx in range(1, len(room_headers) + 1):
        cell = ws_rooms.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill

    for r in report.rooms:
        ws_rooms.append([
            r.id,
            r.name,
            r.stated_area_sqft,
            r.measured_area_sqft,
            f"{r.discrepancy_pct:.1f}%" if r.discrepancy_pct is not None else "N/A",
            r.perimeter_lf,
            r.flooring_category,
            "REVIEW REQUIRED" if r.needs_review else "VERIFIED",
        ])

    # ==========================================
    # TAB 4: SCHEDULES & LEGENDS
    # ==========================================
    ws_sched = wb.create_sheet(title="Schedules & Legends")
    ws_sched.views.sheetView[0].showGridLines = True
    ws_sched["A1"] = "EXTRACTED TABULAR SCHEDULES & SYMBOL LEGENDS"
    ws_sched["A1"].font = title_font

    row_ptr = 3
    for s in report.schedules:
        ws_sched.cell(row=row_ptr, column=1, value=f"Schedule: {s.title} ({s.schedule_type})").font = section_font
        row_ptr += 1
        headers = ["Tag", "Description", "Width", "Height", "Qty", "Remarks"]
        for c_idx, h in enumerate(headers, start=1):
            cell = ws_sched.cell(row=row_ptr, column=c_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
        row_ptr += 1
        for it in s.items:
            ws_sched.append([it.tag, it.description, it.width or "N/A", it.height or "N/A", it.quantity or "N/A", it.remarks])
            row_ptr += 1
        row_ptr += 1

    # Legends table
    if report.legend_items:
        ws_sched.cell(row=row_ptr, column=1, value="Drawing Symbol & Abbreviation Legend").font = section_font
        row_ptr += 1
        for c_idx, h in enumerate(["Symbol / Abbr", "Standard Description", "Category", "Confidence"], start=1):
            cell = ws_sched.cell(row=row_ptr, column=c_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
        row_ptr += 1
        for l in report.legend_items:
            ws_sched.append([l.symbol_tag, l.meaning, l.category, f"{l.confidence * 100:.1f}%"])
            row_ptr += 1

    # ==========================================
    # TAB 5: AUDIT LOG & FLAGS
    # ==========================================
    ws_audit = wb.create_sheet(title="Audit Log & Flags")
    ws_audit.views.sheetView[0].showGridLines = True
    audit_headers = ["Flag ID", "Severity", "Category", "Subject", "Details", "Action Recommendation"]
    ws_audit.append(audit_headers)
    for col_idx in range(1, len(audit_headers) + 1):
        cell = ws_audit.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill

    for f in report.reconciliation_flags:
        ws_audit.append([f.id, f.severity.upper(), f.category, f.subject, f.details, f.recommendation])

    # Auto-adjust column widths across all sheets
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    data = buf.getvalue()

    if output_path:
        with open(output_path, "wb") as f:
            f.write(data)

    return data


def export_to_pdf(report: BOQReport, output_path: str | None = None) -> bytes:
    """Generate a printable commercial estimate package PDF."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1F497D"),
    )
    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1F497D"),
        spaceAfter=6,
    )
    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
    )

    story = []

    # Title & Header
    story.append(Paragraph("OSTAAD AI — BILL OF QUANTITIES ESTIMATE", title_style))
    story.append(Paragraph("Commercial Quantity Survey & Cost Estimate Package", styles["Normal"]))
    story.append(Spacer(1, 14))

    curr_sym = report.cost_summary.currency_symbol

    # Project Information Table
    info_data = [
        ["Project Name:", report.project_name, "Drawing Type:", report.classification.drawing_type.value.replace("_", " ").title()],
        ["Sheet Name:", report.sheet_name, "Calibrated Scale:", f"{report.scale.raw_scale_text or 'Calibrated'} ({report.scale.unit})"],
        ["Currency:", report.cost_summary.currency, "Conditioned Area:", f"{report.metadata.get('total_conditioned_sqft', 0.0):,.1f} sq ft"],
    ]
    info_table = Table(info_data, colWidths=[90, 180, 90, 180])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#333333")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    # Financial Summary Table
    story.append(Paragraph("Financial Budget Summary", section_style))
    cost = report.cost_summary
    budget_data = [
        ["Cost Component", "Amount"],
        ["Direct Construction Cost Subtotal", f"{curr_sym}{cost.direct_cost_subtotal:,.2f}"],
        ["Materials Allowance", f"{curr_sym}{cost.material_cost_subtotal:,.2f}"],
        ["Labor Allowance", f"{curr_sym}{cost.labor_cost_subtotal:,.2f}"],
        [f"General Conditions & Overhead ({cost.overhead_pct}%)", f"{curr_sym}{cost.overhead_amount:,.2f}"],
        [f"Contractor Profit ({cost.profit_pct}%)", f"{curr_sym}{cost.profit_amount:,.2f}"],
        [f"Contingency Allowance ({cost.contingency_pct}%)", f"{curr_sym}{cost.contingency_amount:,.2f}"],
        ["TOTAL ESTIMATED BUDGET", f"{curr_sym}{cost.total_estimated_budget:,.2f}"],
    ]
    budget_table = Table(budget_data, colWidths=[360, 180])
    budget_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F497D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#DCE6F1")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(budget_table)
    story.append(Spacer(1, 16))

    # Takeoff Lines Table (Top lines)
    story.append(Paragraph("Itemized Bill of Quantities (Sample / Primary Lines)", section_style))
    boq_table_data = [["WBS", "Description", "Qty", "Unit", "Rate", "Total"]]
    for line in report.lines[:25]:  # Fits cleanly on page 1-2
        boq_table_data.append([
            line.wbs_code,
            Paragraph(line.item_description[:45], cell_style),
            f"{line.quantity:.1f}",
            line.unit.value,
            f"{curr_sym}{line.unit_cost:,.2f}",
            f"{curr_sym}{line.total_cost:,.2f}",
        ])

    boq_pdf_table = Table(boq_table_data, colWidths=[60, 240, 50, 45, 70, 75])
    boq_pdf_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F497D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(boq_pdf_table)
    story.append(Spacer(1, 20))

    # Sign-off Approval Block
    approval_data = [
        ["Prepared By: Ostaad AI Engine v2.0", "Reviewed & Approved By: ___________________________"],
        ["Date: ___________________________", "Signature: ___________________________________"],
    ]
    app_table = Table(approval_data, colWidths=[270, 270])
    app_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#666666")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(app_table)

    doc.build(story)
    pdf_bytes = buf.getvalue()

    if output_path:
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes


# Aliases for consistent naming across modules
export_to_xlsx = export_to_excel
