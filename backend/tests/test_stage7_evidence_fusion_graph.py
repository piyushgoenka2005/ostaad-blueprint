"""Stage 7 Test Suite: Evidence Fusion & Anti-Hallucination Graph.

Validates:
1. Graph Construction & Topology:
   - Node types: VECTOR_PATH, OCR_TOKEN, GEOMETRIC_FEATURE, SYMBOL_CANDIDATE, TAKEOFF_ITEM.
   - Edge types: SPATIALLY_CONTAINS, CO_LOCATED, LABELLED_BY, CORROBORATES, CONTRADICTS.
2. Anti-Hallucination Guardrail:
   - Uncorroborated single-source assumptions are strictly flagged with needs_review=True.
   - Multi-modal corroboration (e.g. symbol + OCR tag) clears review flags and elevates confidence.
3. Contradiction Detection:
   - Contradictory entities (e.g., architectural items on site topographical surveys) are flagged.
4. Mandatory Gate on Barakar:
   - Barakar evidence graph contains real civil features & OCR nodes, but EXACTLY ZERO
     architectural symbol nodes and ZERO architectural takeoff lines.
"""

from __future__ import annotations

import os
from ostaad_boq.models import (
    DrawingType,
    ScaleCalibration,
    TakeoffLine,
    ItemCategory,
    UnitType,
    CalculationMethod,
    GeometricFeature,
    SymbolCandidate,
    EvidenceNodeType,
    EvidenceEdgeType,
    ClassificationResult,
)
from ostaad_boq.ocr import OCRItem
from ostaad_boq.evidence_graph import build_evidence_graph, audit_and_fuse_evidence
from ostaad_boq.engine import OstaadBOQEngine


def test_evidence_graph_schema_and_topology():
    """Verify evidence graph node insertion, edge connectivity, and querying."""
    ocr_items = [
        OCRItem(text="D1", confidence=0.95, bbox=(100.0, 100.0, 130.0, 130.0), source_type="vector_tag"),
        OCRItem(text="BED ROOM 1", confidence=0.98, bbox=(200.0, 200.0, 300.0, 230.0), source_type="vector_text"),
    ]
    geo_features = [
        GeometricFeature(
            id="room-1",
            feature_type="room_envelope",
            points=[(0.1, 0.1), (0.4, 0.1), (0.4, 0.4), (0.1, 0.4)],
            measured_area=140.0,
            area_unit=UnitType.SF,
            confidence=0.95,
        )
    ]
    symbols = [
        SymbolCandidate(
            id="sym-1",
            symbol_type="door",
            label="D1",
            description="Interior Door (D1)",
            bbox=[0.12, 0.25, 0.16, 0.29],
            detector_source="symbol_tag_detector",
            model_version="ostaad-tag-v1.0",
            confidence=0.94,
        )
    ]
    takeoff = [
        TakeoffLine(
            id="door-1",
            item_description="Door Unit (D1)",
            category="Openings - Doors",
            quantity=1.0,
            unit=UnitType.EA,
            confidence=0.90,
            calculation_method=CalculationMethod.COUNTED,
            is_measured=True,
        )
    ]

    graph = build_evidence_graph(
        sheet_name="Test Sheet",
        ocr_items=ocr_items,
        geometric_features=geo_features,
        symbol_candidates=symbols,
        takeoff_lines=takeoff,
    )

    # 1. Verify Nodes
    assert "ocr-0" in graph.nodes
    assert graph.nodes["ocr-0"].node_type == EvidenceNodeType.OCR_TOKEN.value
    assert graph.nodes["ocr-0"].label == "D1"

    assert "geo-room-1" in graph.nodes
    assert graph.nodes["geo-room-1"].node_type == EvidenceNodeType.GEOMETRIC_FEATURE.value

    assert "sym-sym-1" in graph.nodes
    assert graph.nodes["sym-sym-1"].node_type == EvidenceNodeType.SYMBOL_CANDIDATE.value

    assert "takeoff-door-1" in graph.nodes
    assert graph.nodes["takeoff-door-1"].node_type == EvidenceNodeType.TAKEOFF_ITEM.value

    # 2. Verify Edges
    # Edge: Symbol labelled by OCR token
    label_edges = [e for e in graph.edges if e.edge_type == EvidenceEdgeType.LABELLED_BY.value]
    assert len(label_edges) >= 1
    assert label_edges[0].source_id == "sym-sym-1"
    assert label_edges[0].target_id == "ocr-0"

    # Edge: Symbol corroborates Takeoff Line
    corrob_edges = [e for e in graph.edges if e.edge_type == EvidenceEdgeType.CORROBORATES.value]
    assert len(corrob_edges) >= 1

    # Edge: Room spatially contains door symbol
    contain_edges = [e for e in graph.edges if e.edge_type == EvidenceEdgeType.SPATIALLY_CONTAINS.value]
    assert len(contain_edges) >= 1


def test_uncorroborated_single_source_assumptions_flagged():
    """Verify single-source assumptions without corroboration are flagged with needs_review=True."""
    ocr_items = [
        OCRItem(text="NOTE: CONTRACTOR TO VERIFY ALL DIMS", confidence=0.99, bbox=(10, 10, 200, 30)),
    ]
    # An isolated takeoff line created by an ungrounded inference
    unverified_line = TakeoffLine(
        id="orphan-line",
        item_description="Uncorroborated Chandelier Fixture",
        category="Electrical",
        quantity=1.0,
        unit=UnitType.EA,
        confidence=0.60,
        calculation_method=CalculationMethod.DERIVED_MATERIAL,
        is_measured=False,
    )

    graph = build_evidence_graph(
        sheet_name="Test",
        ocr_items=ocr_items,
        geometric_features=[],
        symbol_candidates=[],
        takeoff_lines=[unverified_line],
    )

    audited, flags = audit_and_fuse_evidence(graph, [unverified_line])

    assert len(audited) == 1
    assert audited[0].needs_review is True
    assert any("Single-source inference" in r for r in audited[0].review_reasons)
    assert any(f.item_id == "orphan-line" for f in flags)


def test_multi_modal_corroborated_item_passes():
    """Verify item backed by both visual symbol and OCR tag is verified with high confidence."""
    ocr_items = [
        OCRItem(text="D1", confidence=0.96, bbox=(100.0, 100.0, 130.0, 130.0), source_type="vector_tag"),
    ]
    symbols = [
        SymbolCandidate(
            id="door-c1",
            symbol_type="door",
            label="D1",
            description="Interior Door (D1)",
            bbox=[0.2, 0.2, 0.25, 0.25],
            detector_source="symbol_tag_detector",
            model_version="ostaad-tag-v1.0",
            confidence=0.95,
        )
    ]
    takeoff = [
        TakeoffLine(
            id="door-item-1",
            item_description="Door Unit (D1)",
            category="Openings - Doors",
            quantity=1.0,
            unit=UnitType.EA,
            confidence=0.80,  # Initially modest
            calculation_method=CalculationMethod.COUNTED,
            needs_review=True,
            review_reasons=["Confidence below 85%"],
            is_measured=True,
        )
    ]

    graph = build_evidence_graph(
        sheet_name="Test",
        ocr_items=ocr_items,
        geometric_features=[],
        symbol_candidates=symbols,
        takeoff_lines=takeoff,
    )

    audited, flags = audit_and_fuse_evidence(graph, takeoff)

    assert audited[0].needs_review is False
    assert audited[0].confidence >= 0.95
    assert not any("Confidence below 85%" in r for r in audited[0].review_reasons)


def test_contradiction_detection_flagged():
    """Verify drawing type contradictions (e.g. architectural lines on site survey) are flagged."""
    classif = ClassificationResult(
        drawing_type=DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
        confidence=0.98,
        classification_reasoning="Topographical survey benchmark",
    )
    false_arch_line = TakeoffLine(
        id="false-door",
        item_description="Interior Wood Door",
        category="Openings - Doors",
        quantity=4.0,
        unit=UnitType.EA,
        confidence=0.90,
        calculation_method=CalculationMethod.COUNTED,
        is_measured=True,
    )

    graph = build_evidence_graph(
        sheet_name="Site Sheet",
        ocr_items=[],
        geometric_features=[],
        symbol_candidates=[],
        takeoff_lines=[false_arch_line],
        classification=classif,
    )

    contradictions = graph.find_contradictions()
    assert len(contradictions) >= 1
    assert "CRITICAL CONTRADICTION" in contradictions[0].description

    audited, flags = audit_and_fuse_evidence(graph, [false_arch_line], classification=classif)
    assert audited[0].needs_review is True
    assert any("Contradiction" in r for r in audited[0].review_reasons)


def test_mandatory_gate_barakar_evidence_graph():
    """Mandatory Gate: Barakar evidence graph contains civil features and 0 architectural nodes."""
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    graph = report.evidence_graph
    assert graph is not None, "Report must contain evidence_graph"

    # 1. Barakar must have OCR nodes (e.g., SCALE, TOTAL PREMISES AREA, ROAD)
    ocr_nodes = [n for n in graph.nodes.values() if n.node_type == EvidenceNodeType.OCR_TOKEN.value]
    assert len(ocr_nodes) > 10, f"Expected civil OCR nodes on Barakar, got {len(ocr_nodes)}"

    # 2. Barakar must have GeometricFeature nodes (e.g., property_boundary, building_footprint)
    geo_nodes = [n for n in graph.nodes.values() if n.node_type == EvidenceNodeType.GEOMETRIC_FEATURE.value]
    assert len(geo_nodes) >= 1, f"Expected civil geometric features, got {len(geo_nodes)}"

    # 3. Barakar must have EXACTLY ZERO architectural symbol nodes
    arch_symbol_nodes = [
        n for n in graph.nodes.values()
        if n.node_type == EvidenceNodeType.SYMBOL_CANDIDATE.value
    ]
    assert len(arch_symbol_nodes) == 0, f"VIOLATION: Found {len(arch_symbol_nodes)} symbol nodes on Barakar"

    # 4. Barakar must have EXACTLY ZERO architectural room nodes or architectural takeoff lines
    arch_takeoff_nodes = [
        n for n in graph.nodes.values()
        if n.node_type == EvidenceNodeType.TAKEOFF_ITEM.value
        and any(k in n.label.lower() for k in ["door", "window", "bedroom", "living room", "toilet", "kitchen", "shower"])
    ]
    assert len(arch_takeoff_nodes) == 0, f"VIOLATION: Found {len(arch_takeoff_nodes)} architectural takeoff items on Barakar"

    # 5. Zero contradiction edges
    contradictions = graph.find_contradictions()
    assert len(contradictions) == 0, f"Unexpected contradictions on Barakar: {contradictions}"

    print(f"Barakar Gate PASSED: Evidence graph has {len(ocr_nodes)} OCR nodes, {len(geo_nodes)} civil geo nodes, 0 false architectural nodes.")


if __name__ == "__main__":
    test_evidence_graph_schema_and_topology()
    print("PASS: test_evidence_graph_schema_and_topology")
    test_uncorroborated_single_source_assumptions_flagged()
    print("PASS: test_uncorroborated_single_source_assumptions_flagged")
    test_multi_modal_corroborated_item_passes()
    print("PASS: test_multi_modal_corroborated_item_passes")
    test_contradiction_detection_flagged()
    print("PASS: test_contradiction_detection_flagged")
    test_mandatory_gate_barakar_evidence_graph()
    print("PASS: test_mandatory_gate_barakar_evidence_graph")
    print("ALL STAGE 7 TESTS COMPLETED SUCCESSFULLY!")
