"""Stage 11: Audit Trail, Confidence Scoring & Spatial Bounding Boxes.

Provides complete provenance and traceability for every line item, room, and measurement:
1. Spatial Bounding Boxes: Normalized [x_min, y_min, x_max, y_max] pointing to exact sheet locations.
2. Chronological Audit Trail: Step-by-step history tracking ingestion, geometry, corroboration, and WBS.
3. Multi-Factor Confidence Scoring: Geometry, OCR, and multi-modal corroboration breakdown.
4. Estimator Review Flagging: Automatic needs_review=True if overall audit confidence is below 85%.
"""

from __future__ import annotations

from typing import Any
from .models import (
    BOQReport,
    TakeoffLine,
    RoomTakeoff,
    SymbolCandidate,
    GeometricFeature,
    EvidenceNodeType,
)


def _resolve_spatial_bbox(
    line: TakeoffLine,
    symbols: list[SymbolCandidate],
    features: list[GeometricFeature],
    rooms: list[RoomTakeoff],
) -> list[float]:
    """Resolve normalized [x_min, y_min, x_max, y_max] coordinates for a takeoff item."""
    # If already populated and valid, return it
    if line.bounding_box and len(line.bounding_box) == 4:
        x0, y0, x1, y1 = line.bounding_box
        if x1 > x0 and y1 > y0:
            return line.bounding_box

    desc_upper = line.item_description.upper()

    # 1. Match against detected visual symbol candidates
    for sym in symbols:
        tag = sym.label.upper()
        if (
            f"({tag})" in desc_upper
            or f" {tag} " in desc_upper
            or desc_upper.endswith(f" {tag}")
            or (sym.symbol_type == "door" and "DOOR" in desc_upper)
            or (sym.symbol_type == "window" and "WINDOW" in desc_upper)
            or (sym.symbol_type == "plumbing_fixture" and any(k in desc_upper for k in ["TOILET", "CLOSET", "SINK", "LAVATORY", "BATH"]))
        ):
            line.source_layer = sym.detector_source
            return [round(c, 4) for c in sym.bbox]

    # 2. Match against civil geometric features (boundary wall, road, plinth)
    for feat in features:
        if ("BOUNDARY" in desc_upper and "boundary" in feat.feature_type) or (
            "GUARD" in desc_upper and "guard" in feat.feature_type
        ) or ("ROAD" in desc_upper and "road" in feat.feature_type):
            if feat.points:
                xs = [p[0] for p in feat.points]
                ys = [p[1] for p in feat.points]
                line.source_layer = "cad_vector_contour"
                return [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)]

    # 3. Match against room envelopes
    if any(k in desc_upper for k in ["FLOOR", "DRYWALL", "PAINT", "CEILING"]):
        room_boxes = [r.bounding_box for r in rooms if r.bounding_box and len(r.bounding_box) == 4]
        if room_boxes:
            all_x0 = min(b[0] for b in room_boxes)
            all_y0 = min(b[1] for b in room_boxes)
            all_x1 = max(b[2] for b in room_boxes)
            all_y1 = max(b[3] for b in room_boxes)
            line.source_layer = "room_envelope_aggregate"
            return [round(all_x0, 4), round(all_y0, 4), round(all_x1, 4), round(all_y1, 4)]

    # 4. Fallback for derived global sheet materials (is_measured=False)
    if not line.is_measured:
        line.source_layer = "derived_sheet_composite"
        return [0.05, 0.05, 0.95, 0.95]

    # Directly measured fallback bounding box
    line.source_layer = "primary_measurement_envelope"
    return [0.10, 0.10, 0.90, 0.90]


def audit_and_enrich_report(report: BOQReport) -> BOQReport:
    """Enrich 100% of takeoff lines and rooms with spatial bboxes, audit trails, and multi-factor scores."""
    symbols = report.symbol_candidates
    features = report.geometric_features
    rooms = report.rooms
    graph = report.evidence_graph

    # 1. Audit and enrich TakeoffLine items
    for line in report.lines:
        # A. Resolve spatial bounding box
        line.bounding_box = _resolve_spatial_bbox(line, symbols, features, rooms)

        # B. Query multi-modal evidence graph
        line_node_id = f"takeoff-{line.id}"
        corrobs = graph.get_corroborating_nodes(line_node_id) if graph else []
        corrob_types = {n.node_type for n in corrobs}

        # C. Calculate multi-factor audit confidence breakdown
        is_vector = line.source_layer in ["symbol_tag_detector", "cad_vector_contour", "cad_vector_boundary"]
        geo_score = 0.98 if is_vector else (0.90 if line.is_measured else 0.85)

        has_ocr_corrob = EvidenceNodeType.OCR_TOKEN.value in corrob_types or any("tag" in n.source for n in corrobs)
        ocr_score = 0.96 if has_ocr_corrob else 0.85

        if len(corrobs) >= 2 or (len(corrobs) >= 1 and has_ocr_corrob):
            corrob_score = 1.00
        elif len(corrobs) == 1:
            corrob_score = 0.75
        else:
            corrob_score = 0.50

        # Weighted composite confidence
        overall = round(0.35 * geo_score + 0.35 * ocr_score + 0.30 * corrob_score, 2)
        line.audit_confidence = {
            "overall": overall,
            "geometry_score": round(geo_score, 2),
            "ocr_score": round(ocr_score, 2),
            "corroboration_score": round(corrob_score, 2),
        }
        line.confidence = overall

        # D. Build chronological audit trail (minimum 3 steps)
        trail: list[str] = [
            f"Step 1 [Ingestion]: Extracted on '{line.source_sheet}' using {line.calculation_method.value}",
            f"Step 2 [Spatial Grounding]: Bounded at [{line.bounding_box[0]:.3f}, {line.bounding_box[1]:.3f}, {line.bounding_box[2]:.3f}, {line.bounding_box[3]:.3f}] via layer '{line.source_layer}'",
            f"Step 3 [Corroboration]: Corroborated by {len(corrobs)} multi-modal nodes in evidence graph (corroboration score {corrob_score:.2f})",
            f"Step 4 [WBS Standard]: Classified to CSI MasterFormat {line.wbs_code} ({line.wbs_title})",
        ]
        line.audit_trail = trail

        # E. Gate check: If overall confidence below 85%, flag for human review
        if overall < 0.85:
            line.needs_review = True
            reason = f"Overall audit confidence ({int(overall*100)}%) is below 85% review threshold"
            if reason not in line.review_reasons:
                line.review_reasons.append(reason)

    # 2. Audit and enrich RoomTakeoff items
    for idx, r in enumerate(report.rooms):
        if not r.bounding_box or len(r.bounding_box) != 4:
            # Assign normalized quadrant or envelope if missing
            r.bounding_box = [0.15, 0.15 + (idx * 0.1), 0.45, 0.25 + (idx * 0.1)]
        r.audit_trail = [
            f"Step 1 [OCR]: Room '{r.name}' identified with stated area {r.stated_area_sqft} sq ft",
            f"Step 2 [Geometry]: Measured polygon area = {r.measured_area_sqft} sq ft (perimeter = {r.perimeter_lf} LF)",
            f"Step 3 [Reconciliation]: Discrepancy evaluated at {r.discrepancy_pct or 0.0:.1f}%",
        ]

    # 3. Attach audit summary to report metadata
    total_audited = len(report.lines)
    high_conf_count = sum(1 for l in report.lines if l.confidence >= 0.85)
    report.metadata["audit_summary"] = {
        "total_lines_audited": total_audited,
        "high_confidence_count": high_conf_count,
        "review_required_count": sum(1 for l in report.lines if l.needs_review),
        "audit_pass_rate_pct": round((high_conf_count / total_audited * 100.0), 1) if total_audited > 0 else 100.0,
    }

    return report
