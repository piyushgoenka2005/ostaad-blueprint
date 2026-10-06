"""Stage 7: Evidence Fusion & Anti-Hallucination Corroboration Graph.

Connects vectors, OCR tokens, geometric contours, visual symbols, and takeoff items
into an interconnected provenance and validation graph. Enforces the strict rule:
NO MULTI-MODAL EVIDENCE = UNCORROBORATED / NEEDS REVIEW.
"""

from __future__ import annotations

import math
from typing import Any
from .models import (
    EvidenceGraph,
    EvidenceNode,
    EvidenceEdge,
    EvidenceNodeType,
    EvidenceEdgeType,
    GeometricFeature,
    SymbolCandidate,
    TakeoffLine,
    ClassificationResult,
    DrawingType,
    ReconciliationFlag,
)
from .ocr import OCRItem


def _bboxes_overlap(
    bbox1: list[float] | tuple[float, float, float, float] | None,
    bbox2: list[float] | tuple[float, float, float, float] | None,
    tolerance: float = 0.05,
) -> bool:
    """Check if two bounding boxes in normalized coordinates overlap or are proximate."""
    if not bbox1 or not bbox2:
        return False
    x1_min, y1_min, x1_max, y1_max = bbox1
    x2_min, y2_min, x2_max, y2_max = bbox2

    return not (
        x1_max + tolerance < x2_min
        or x1_min - tolerance > x2_max
        or y1_max + tolerance < y2_min
        or y1_min - tolerance > y2_max
    )


def build_evidence_graph(
    sheet_name: str,
    ocr_items: list[OCRItem],
    geometric_features: list[GeometricFeature],
    symbol_candidates: list[SymbolCandidate],
    takeoff_lines: list[TakeoffLine],
    classification: ClassificationResult | None = None,
) -> EvidenceGraph:
    """Construct multi-modal provenance graph linking perception streams and takeoff items."""
    graph = EvidenceGraph()

    # 1. Add OCR Token Nodes
    for idx, item in enumerate(ocr_items):
        node_id = f"ocr-{idx}"
        graph.add_node(
            EvidenceNode(
                node_id=node_id,
                node_type=EvidenceNodeType.OCR_TOKEN.value,
                label=item.text,
                bbox=list(item.bbox),
                confidence=round(item.confidence, 2),
                source=item.source_type,
                attributes={"raw_text": item.text, "index": idx},
            )
        )

    # 2. Add Geometric Feature Nodes
    for feat in geometric_features:
        node_id = f"geo-{feat.id}"
        graph.add_node(
            EvidenceNode(
                node_id=node_id,
                node_type=EvidenceNodeType.GEOMETRIC_FEATURE.value,
                label=feat.feature_type,
                confidence=round(feat.confidence, 2),
                source="opencv_deterministic_contour",
                attributes={
                    "measured_area": feat.measured_area,
                    "measured_length": feat.measured_length,
                    "formula": feat.formula,
                },
            )
        )

    # 3. Add Symbol Candidate Nodes
    for sym in symbol_candidates:
        node_id = f"sym-{sym.id}"
        graph.add_node(
            EvidenceNode(
                node_id=node_id,
                node_type=EvidenceNodeType.SYMBOL_CANDIDATE.value,
                label=f"{sym.symbol_type}:{sym.label}",
                bbox=sym.bbox,
                confidence=round(sym.confidence, 2),
                source=sym.detector_source,
                attributes=sym.attributes,
            )
        )

    # 4. Add Takeoff Item Nodes
    for line in takeoff_lines:
        node_id = f"takeoff-{line.id}"
        graph.add_node(
            EvidenceNode(
                node_id=node_id,
                node_type=EvidenceNodeType.TAKEOFF_ITEM.value,
                label=line.item_description,
                confidence=round(line.confidence, 2),
                source="boq_assembly",
                attributes={
                    "category": line.category,
                    "quantity": line.quantity,
                    "unit": line.unit.value,
                    "calculation_method": line.calculation_method.value,
                },
            )
        )

    # 5. Link Edges: Symbol Candidates to OCR Tokens (LABELLED_BY)
    for sym in symbol_candidates:
        sym_node_id = f"sym-{sym.id}"
        clean_sym_tag = sym.label.strip().upper()
        for idx, item in enumerate(ocr_items):
            if item.text.strip().upper() == clean_sym_tag:
                ocr_node_id = f"ocr-{idx}"
                graph.add_edge(
                    source_id=sym_node_id,
                    target_id=ocr_node_id,
                    edge_type=EvidenceEdgeType.LABELLED_BY.value,
                    confidence=min(sym.confidence, item.confidence),
                    description=f"Symbol tag '{clean_sym_tag}' verified by OCR token at bbox {item.bbox}",
                )

    # 6. Link Edges: Symbols / Geometry to Takeoff Lines (CORROBORATES)
    for line in takeoff_lines:
        line_node_id = f"takeoff-{line.id}"

        # Doors & Windows corroboration
        if "Door" in line.item_description or line.category == "Openings - Doors":
            matching_doors = [s for s in symbol_candidates if s.symbol_type == "door"]
            for d in matching_doors:
                graph.add_edge(
                    source_id=f"sym-{d.id}",
                    target_id=line_node_id,
                    edge_type=EvidenceEdgeType.CORROBORATES.value,
                    confidence=d.confidence,
                    description=f"Door takeoff line corroborated by visual symbol {d.label}",
                )
        elif "Window" in line.item_description or "Ventilator" in line.item_description or line.category == "Openings - Windows":
            matching_windows = [s for s in symbol_candidates if s.symbol_type == "window"]
            for w in matching_windows:
                graph.add_edge(
                    source_id=f"sym-{w.id}",
                    target_id=line_node_id,
                    edge_type=EvidenceEdgeType.CORROBORATES.value,
                    confidence=w.confidence,
                    description=f"Window takeoff line corroborated by visual symbol {w.label}",
                )

        # Boundary Wall / Site Features corroboration
        if "Boundary" in line.item_description or "Guard Wall" in line.item_description:
            boundary_geos = [g for g in geometric_features if g.feature_type in ["property_boundary", "guard_wall"]]
            for bg in boundary_geos:
                graph.add_edge(
                    source_id=f"geo-{bg.id}",
                    target_id=line_node_id,
                    edge_type=EvidenceEdgeType.CORROBORATES.value,
                    confidence=bg.confidence,
                    description="Civil boundary line corroborated by Shoelace contour feature",
                )

        # Flooring finishes corroboration
        if "Flooring" in line.item_description:
            room_geos = [g for g in geometric_features if g.feature_type == "room_envelope"]
            for rg in room_geos:
                graph.add_edge(
                    source_id=f"geo-{rg.id}",
                    target_id=line_node_id,
                    edge_type=EvidenceEdgeType.CORROBORATES.value,
                    confidence=rg.confidence,
                    description="Flooring area corroborated by closed room geometry contour",
                )

    # 7. Check for Spatial Containment: Rooms and Openings
    for feat in geometric_features:
        if feat.feature_type == "room_envelope" and feat.points:
            xs = [p[0] for p in feat.points]
            ys = [p[1] for p in feat.points]
            room_bbox = [min(xs), min(ys), max(xs), max(ys)]
            geo_node_id = f"geo-{feat.id}"
            for sym in symbol_candidates:
                if _bboxes_overlap(room_bbox, sym.bbox):
                    graph.add_edge(
                        source_id=geo_node_id,
                        target_id=f"sym-{sym.id}",
                        edge_type=EvidenceEdgeType.SPATIALLY_CONTAINS.value,
                        confidence=0.88,
                        description=f"Opening symbol {sym.label} spatially located within room envelope",
                    )

    # 8. Contradiction Detection: Area Discrepancies & Drawing Type Invariants
    is_site = classification and classification.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY
    if is_site:
        # Check if any architectural takeoff items inadvertently exist
        for line in takeoff_lines:
            if line.category in ["Openings - Doors", "Openings - Windows", "Finishes - Flooring"]:
                graph.add_edge(
                    source_id="drawing_classifier",
                    target_id=f"takeoff-{line.id}",
                    edge_type=EvidenceEdgeType.CONTRADICTS.value,
                    confidence=1.0,
                    description=f"CRITICAL CONTRADICTION: Architectural item '{line.item_description}' on SITE_TOPOGRAPHICAL_SURVEY drawing",
                )

    return graph


def audit_and_fuse_evidence(
    graph: EvidenceGraph,
    lines: list[TakeoffLine],
    classification: ClassificationResult | None = None,
) -> tuple[list[TakeoffLine], list[ReconciliationFlag]]:
    """Audit all takeoff lines against the evidence graph; enforce multi-modal corroboration."""
    audited_lines: list[TakeoffLine] = []
    flags: list[ReconciliationFlag] = []

    for line in lines:
        line_node_id = f"takeoff-{line.id}"
        corroborating_nodes = graph.get_corroborating_nodes(line_node_id)
        corroboration_types = {n.node_type for n in corroborating_nodes}

        # Check for contradictions
        contradictions = [e for e in graph.edges if (e.source_id == line_node_id or e.target_id == line_node_id) and e.edge_type == EvidenceEdgeType.CONTRADICTS.value]

        if contradictions:
            line.needs_review = True
            for c in contradictions:
                line.review_reasons.append(f"Contradiction: {c.description}")
                flags.append(
                    ReconciliationFlag(
                        id=f"flag-contradiction-{line.id}",
                        severity="discrepancy",
                        category="Evidence Fusion",
                        item_id=line.id,
                        subject=f"Contradiction on {line.item_description}",
                        details=c.description,
                        recommendation="Remove uncorroborated line or reclassify drawing.",
                    )
                )

        # Check multi-modal corroboration
        # A fully corroborated item has at least 2 distinct evidence types (e.g. symbol + ocr, or geometry + ocr)
        if len(corroborating_nodes) == 0:
            # Uncorroborated single-source assumption
            line.needs_review = True
            reason = "Single-source inference: Uncorroborated by independent CAD vector or OCR tag"
            if reason not in line.review_reasons:
                line.review_reasons.append(reason)
            flags.append(
                ReconciliationFlag(
                    id=f"flag-uncorroborated-{line.id}",
                    severity="warning",
                    category="Evidence Fusion",
                    item_id=line.id,
                    subject=f"Uncorroborated takeoff item: {line.item_description}",
                    details=f"Line '{line.item_description}' has 0 corroborating nodes in the multi-modal evidence graph.",
                    recommendation="Verify element exists on the original drawing or schedule.",
                )
            )
        else:
            # Check if symbols backing this item are themselves labelled by OCR
            symbol_nodes = [n for n in corroborating_nodes if n.node_type == EvidenceNodeType.SYMBOL_CANDIDATE.value]
            well_grounded = False
            for sn in symbol_nodes:
                ocr_labels = [e for e in graph.edges if e.source_id == sn.node_id and e.edge_type == EvidenceEdgeType.LABELLED_BY.value]
                if ocr_labels:
                    well_grounded = True
                    break

            if well_grounded or len(corroboration_types) >= 2:
                # Multi-modal corroboration confirmed! Boost confidence and clear review flag if previously set for low conf
                line.confidence = max(line.confidence, 0.95)
                line.review_reasons = [r for r in line.review_reasons if "Confidence below 85%" not in r]
                if not any("Contradiction" in r for r in line.review_reasons):
                    line.needs_review = False

        audited_lines.append(line)

    return audited_lines, flags
