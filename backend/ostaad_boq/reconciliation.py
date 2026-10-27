"""Reconciliation, validation, and BOQ assembly module for Ostaad Engine.

Reconciles OCR callouts, visual detections, schedule tables, and geometric measurements.
Flags discrepancies explicitly and separates directly measured items from derived material estimates.
"""

from __future__ import annotations

from typing import Any
from .models import (
    BOQReport,
    CalculationMethod,
    ClassificationResult,
    GeometricFeature,
    ItemCategory,
    LinearRun,
    ReconciliationFlag,
    RoomTakeoff,
    ScaleCalibration,
    TakeoffLine,
    UnitType,
)
from .ocr import OCRItem
from .evidence_graph import build_evidence_graph, audit_and_fuse_evidence
from .schedules import extract_schedules_and_legends, reconcile_schedules_with_takeoff
from .classification_engine import classify_boq_lines
from .derived_materials import calculate_architectural_derived_materials
from .audit_trail import audit_and_enrich_report
from .pricing_engine import price_boq_report







def assemble_and_reconcile_boq(
    sheet_name: str,
    scale: ScaleCalibration,
    semantic_data: dict[str, Any],
    ocr_items: list[OCRItem],
    linear_runs: list[LinearRun],
    room_polygons: list[dict],
    classification: ClassificationResult | None = None,
    geometric_features: list[GeometricFeature] | None = None,
) -> BOQReport:
    """Fuse all perception and geometric streams into a reconciled, audited BOQ report."""
    lines: list[TakeoffLine] = []
    rooms: list[RoomTakeoff] = []
    flags: list[ReconciliationFlag] = []


    # 1. Scale audit flag if scale is unresolved or estimated
    if not scale.scale_known:
        flags.append(
            ReconciliationFlag(
                id="flag-scale-unresolved",
                severity="discrepancy",
                category="Scale Calibration",
                subject="Drawing scale is unresolved",
                details="No explicit dimension lines or scale strings could be verified. Lengths and areas are reported in normalized units.",
                recommendation="Set the scale manually in the calibration panel or upload a sheet with title block scale callouts.",
            )
        )
    elif scale.confidence < 0.8:
        flags.append(
            ReconciliationFlag(
                id="flag-scale-estimated",
                severity="warning",
                category="Scale Calibration",
                subject="Scale inferred proportionally from footprint",
                details=f"Estimated {scale.pixels_per_unit:.1f} px/ft ({scale.notes}).",
                recommendation="Verify against an on-site dimension or title block scale.",
            )
        )

    # 2. Openings: Doors
    doors = semantic_data.get("doors", [])
    for idx, d in enumerate(doors):
        qty = float(d.get("quantity", 1))
        conf = float(d.get("confidence", 0.90))
        lines.append(
            TakeoffLine(
                id=f"door-{idx + 1}",
                item_description=d.get("description", "Interior Single Swing Door"),
                category=ItemCategory.OPENINGS_DOORS.value,
                quantity=qty,
                unit=UnitType.EA,
                confidence=conf,
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.COUNTED,
                assumptions="Standard 3'-0\" x 6'-8\" frame rough opening unless specified",
                is_measured=True,
                needs_review=(conf < 0.85),
                review_reasons=["Confidence below 85%"] if conf < 0.85 else [],
            )
        )

    # 3. Openings: Windows
    windows = semantic_data.get("windows", [])
    for idx, w in enumerate(windows):
        qty = float(w.get("quantity", 1))
        conf = float(w.get("confidence", 0.90))
        lines.append(
            TakeoffLine(
                id=f"win-{idx + 1}",
                item_description=w.get("description", "Exterior Window Unit"),
                category=ItemCategory.OPENINGS_WINDOWS.value,
                quantity=qty,
                unit=UnitType.EA,
                confidence=conf,
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.COUNTED,
                assumptions="Perimeter exterior wall window openings",
                is_measured=True,
                needs_review=(conf < 0.85),
                review_reasons=["Confidence below 85%"] if conf < 0.85 else [],
            )
        )

    # 4. Plumbing Fixtures
    plumb = semantic_data.get("plumbing_fixtures", [])
    for idx, p in enumerate(plumb):
        qty = float(p.get("quantity", 1))
        conf = float(p.get("confidence", 0.92))
        lines.append(
            TakeoffLine(
                id=f"plumb-{idx + 1}",
                item_description=p.get("description", "Plumbing Fixture"),
                category=ItemCategory.PLUMBING_FIXTURES.value,
                quantity=qty,
                unit=UnitType.EA,
                confidence=conf,
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.COUNTED,
                assumptions="Includes rough-in connections and fixture trim",
                is_measured=True,
                needs_review=(conf < 0.85),
            )
        )

    # 5. Appliances & Casework
    for idx, a in enumerate(semantic_data.get("appliances", [])):
        lines.append(
            TakeoffLine(
                id=f"app-{idx + 1}",
                item_description=a.get("description", "Residential Appliance"),
                category=ItemCategory.APPLIANCES.value,
                quantity=float(a.get("quantity", 1)),
                unit=UnitType.EA,
                confidence=float(a.get("confidence", 0.90)),
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.COUNTED,
                is_measured=True,
            )
        )

    for idx, c in enumerate(semantic_data.get("casework", [])):
        lines.append(
            TakeoffLine(
                id=f"case-{idx + 1}",
                item_description=c.get("description", "Casework / Cabinets"),
                category=ItemCategory.CASEWORK.value,
                quantity=float(c.get("quantity", 1)),
                unit=UnitType.EA,
                confidence=float(c.get("confidence", 0.88)),
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.COUNTED,
                assumptions="Lump sum allowance for kitchen cabinetry layout",
                is_measured=True,
            )
        )

    # 6. Room Reconciliation & Area Takeoff
    raw_rooms = semantic_data.get("rooms", [])
    total_stated_sqft = 0.0

    for idx, r in enumerate(raw_rooms):
        name = r.get("name", f"Room {idx + 1}")
        stated = float(r.get("stated_area_sqft", 0)) if r.get("stated_area_sqft") else None
        if stated:
            total_stated_sqft += stated

        # Match with geometric polygons if available
        matched_poly = room_polygons[idx] if idx < len(room_polygons) else None
        measured = matched_poly.get("measured_sqft") if matched_poly else None
        perimeter = matched_poly.get("perimeter_lf") if matched_poly else None

        discrepancy = None
        needs_review = False
        if stated and measured and measured > 0:
            discrepancy = round(abs(stated - measured) / stated * 100, 1)
            if discrepancy > 25.0:
                needs_review = True
                flags.append(
                    ReconciliationFlag(
                        id=f"flag-room-{idx + 1}",
                        severity="warning",
                        category="Room Area Discrepancy",
                        item_id=f"room-{idx + 1}",
                        subject=f"{name}: Area Variance ({discrepancy}%)",
                        details=f"Stated on drawing: {stated:.0f} sq ft vs. Polygon measured: {measured:.0f} sq ft.",
                        recommendation="Verify whether stated square footage represents gross vs. net interior dimensions.",
                    )
                )

        rooms.append(
            RoomTakeoff(
                id=f"room-{idx + 1}",
                name=name,
                stated_area_sqft=stated,
                measured_area_sqft=measured,
                perimeter_lf=perimeter,
                bounding_box=r.get("bbox"),
                confidence=float(r.get("confidence", 0.95)),
                discrepancy_pct=discrepancy,
                needs_review=needs_review,
            )
        )

    # 7. Derived Material Quantities (clearly flagged as is_measured=False)
    door_count = len([s for s in semantic_data.get("symbol_candidates", []) if s.symbol_type == "door"]) or len(semantic_data.get("doors", []))
    window_count = len([s for s in semantic_data.get("symbol_candidates", []) if s.symbol_type == "window"]) or len(semantic_data.get("windows", []))

    derived_lines = calculate_architectural_derived_materials(
        linear_runs=linear_runs,
        rooms=rooms,
        door_count=door_count,
        window_count=window_count,
        scale=scale,
        sheet_name=sheet_name,
    )
    lines.extend(derived_lines)


    symbol_candidates = semantic_data.get("symbol_candidates", [])
    geo_features = geometric_features or []

    # Stage 7: Build multi-modal evidence graph & corroborate lines
    evidence_graph = build_evidence_graph(
        sheet_name=sheet_name,
        ocr_items=ocr_items,
        geometric_features=geo_features,
        symbol_candidates=symbol_candidates,
        takeoff_lines=lines,
        classification=classification,
    )
    audited_lines, audit_flags = audit_and_fuse_evidence(evidence_graph, lines, classification)
    flags.extend(audit_flags)

    # Stage 8: Extract schedules & legends, then cross-reference
    schedules, legend_items = extract_schedules_and_legends(ocr_items, classification)
    sched_flags = reconcile_schedules_with_takeoff(schedules, symbol_candidates, audited_lines)
    flags.extend(sched_flags)

    # Stage 9: CSI MasterFormat & NRM Standardized Classification
    classify_boq_lines(audited_lines)

    report = BOQReport(
        project_name="Architectural Floor Plan Takeoff",
        sheet_name=sheet_name,
        scale=scale,
        classification=classification or ClassificationResult(),
        lines=audited_lines,
        rooms=rooms,
        linear_runs=linear_runs,
        geometric_features=geo_features,
        symbol_candidates=symbol_candidates,
        schedules=schedules,
        legend_items=legend_items,
        reconciliation_flags=flags,
        evidence_graph=evidence_graph,
        metadata={"total_conditioned_sqft": total_stated_sqft},
    )

    # Stage 11: Audit trail, spatial bounding boxes, and confidence breakdown
    report = audit_and_enrich_report(report)

    # Stage 12: Cost Estimation & Pricing Engine
    currency = "INR" if (scale and scale.unit in ["m", "metre", "meter"]) else "USD"
    return price_boq_report(report, currency=currency)





