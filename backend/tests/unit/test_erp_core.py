"""
Unit Test Suite for BuildBharat ERP Core Modules
Validates modules extracted & adapted from OpenConstructionERP, cad2data, and OpenTakeoff
"""
import pytest
from ostaad_boq.erp_core.boq.units import CivilUnit, standardize_unit
from ostaad_boq.erp_core.boq.quantity_formula import evaluate_formula
from ostaad_boq.erp_core.boq.wbs_tree import HierarchicalBOQ, BOQSection, BOQPosition
from ostaad_boq.erp_core.boq.validators import validate_boq_integrity
from ostaad_boq.erp_core.materials.dry_mix_calculator import calculate_concrete_materials, calculate_brickwork_materials
from ostaad_boq.erp_core.materials.packaging import calculate_packaged_units
from ostaad_boq.erp_core.procurement.rfq_engine import RFQPackage, VendorBid
from ostaad_boq.erp_core.procurement.finance_gate import PurchaseOrderProposal, PaymentMode, FinanceApprovalStatus
from ostaad_boq.erp_core.stores.grn_service import SiteGodownStock
from ostaad_boq.erp_core.cad_converters.cad_adapter import parse_cad_element_to_boq

def test_units_standardization():
    assert standardize_unit("m3") == CivilUnit.CUM
    assert standardize_unit("cum") == CivilUnit.CUM
    assert standardize_unit("sqm") == CivilUnit.SQM
    assert standardize_unit("bags") == CivilUnit.BAG
    assert standardize_unit("ton") == CivilUnit.MT
    assert standardize_unit("brass") == CivilUnit.BRASS

def test_safe_quantity_formula_evaluator():
    assert evaluate_formula("10.5 * 4.0 * 0.15") == 6.3
    assert evaluate_formula("(4.5 + 3.5) * 2 * 3.0") == 48.0
    assert evaluate_formula("100 / 4") == 25.0
    with pytest.raises(ValueError):
        evaluate_formula("__import__('os').system('ls')")

def test_hierarchical_wbs_tree_and_subtotals():
    boq = HierarchicalBOQ(project_id="PROJ-01", project_name="Barakar Residential G+3")
    sec1 = BOQSection(section_id="SEC-01", wbs_code="1.00", title="Earthwork & Excavation")
    pos1 = BOQPosition(
        item_id="POS-01",
        wbs_code="1.01",
        description="Foundation Trench Excavation",
        unit=CivilUnit.CUM,
        quantity=120.0,
        unit_rate=250.0,
        is_verified=True,
    )
    sec1.add_position(pos1)

    sec2 = BOQSection(section_id="SEC-02", wbs_code="2.00", title="Concrete & RCC Works")
    pos2 = BOQPosition(
        item_id="POS-02",
        wbs_code="2.01",
        description="M20 Grade Plinth Beam Concrete",
        unit=CivilUnit.CUM,
        quantity=50.0,
        unit_rate=4500.0,
        is_verified=True,
    )
    sec2.add_position(pos2)

    boq.add_section(sec1)
    boq.add_section(sec2)

    assert sec1.subtotal == 30000.0
    assert sec2.subtotal == 225000.0
    assert boq.grand_total == 255000.0

def test_boq_integrity_validation():
    boq = HierarchicalBOQ(project_id="PROJ-02", project_name="Test Project")
    sec = BOQSection(section_id="SEC-01", wbs_code="1.00", title="Masonry")
    # Invalid position: zero quantity and not verified
    pos = BOQPosition(
        item_id="POS-01",
        wbs_code="1.01",
        description="AAC Block Masonry",
        unit=CivilUnit.CUM,
        quantity=0.0,
        unit_rate=3200.0,
        is_verified=False,
    )
    sec.add_position(pos)
    boq.add_section(sec)

    errors = validate_boq_integrity(boq)
    assert any(e["level"] == "ERROR" and "Quantity must be greater than zero" in e["msg"] for e in errors)
    assert any(e["level"] == "WARNING" and "pending manual engineer verification" in e["msg"] for e in errors)

def test_indian_concrete_materials_math():
    # 10 m^3 of M20 grade concrete
    res = calculate_concrete_materials(10.0, grade="M20")
    assert res["wet_volume_cum"] == 10.0
    assert res["dry_volume_cum"] == 15.4
    assert res["cement_bags"] == 81  # ~80.66 rounded up
    assert res["sand_cum"] > 0
    assert res["aggregate_cum"] > 0

def test_packaging_roundup():
    # 92.5 sqm tiles, box coverage 1.44 sqm, 5% waste
    boxes = calculate_packaged_units(measured_quantity=92.5, coverage_per_unit=1.44, waste_percentage=5.0)
    assert isinstance(boxes, int)
    assert boxes == 68  # (92.5 * 1.05 = 97.125) / 1.44 = 67.44 -> 68

def test_rfq_comparative_statement_l1_ranking():
    rfq = RFQPackage(
        rfq_id="RFQ-101",
        project_id="PROJ-01",
        material_name="OPC 53 Cement",
        required_quantity=500.0,
        uom="BAG",
    )
    # Dealer A: 375 base, 10 freight, 28% GST -> (385) * 1.28 = 492.80
    rfq.add_bid(VendorBid("B1", "V1", "Dealer A", 375.0, 10.0, 28.0))
    # Dealer B: 350 base, 10 freight, 28% GST -> (360) * 1.28 = 460.80 (Lowest: L1)
    rfq.add_bid(VendorBid("B2", "V2", "Dealer B", 350.0, 10.0, 28.0))
    # Dealer C: 380 base, 15 freight, 28% GST -> (395) * 1.28 = 505.60
    rfq.add_bid(VendorBid("B3", "V3", "Dealer C", 380.0, 15.0, 28.0))

    comp = rfq.get_comparative_statement()
    assert comp[0]["rank"] == "L1"
    assert comp[0]["vendor_name"] == "Dealer B"
    assert comp[0]["landed_rate"] == 460.80
    assert comp[0]["total_order_value"] == 230400.0
    assert comp[1]["rank"] == "L2"
    assert comp[1]["vendor_name"] == "Dealer A"

def test_mandatory_finance_approval_gate():
    proposal = PurchaseOrderProposal(
        po_id="PO-001",
        project_id="PROJ-01",
        rfq_id="RFQ-101",
        vendor_id="V2",
        vendor_name="Dealer B",
        material_name="OPC 53 Cement",
        quantity=500.0,
        landed_unit_rate=460.80,
        manager_recommended=True,
        manager_notes="L1 bidder with prompt delivery timeline.",
    )
    # Initial status must be PENDING
    assert proposal.status == FinanceApprovalStatus.PENDING

    # Finance approves with Part-by-Part payment (30% advance, 70% balance)
    proposal.finance_approve(
        approver_name="Ramesh Sharma (Finance Head)",
        payment_mode=PaymentMode.PART_BY_PART,
        advance_pct=30.0,
        notes="Approved within budget allocation.",
    )
    assert proposal.status == FinanceApprovalStatus.APPROVED
    assert proposal.total_amount == 230400.0
    assert proposal.advance_amount == 69120.0
    assert proposal.balance_amount == 161280.0
    assert proposal.payment_mode == PaymentMode.PART_BY_PART

def test_site_godown_stock_service():
    godown = SiteGodownStock(project_id="PROJ-01")
    godown.receive_material("OPC 53 Cement", 500.0)
    assert godown.get_balance("OPC 53 Cement") == 500.0

    godown.issue_material("OPC 53 Cement", 150.0)
    assert godown.get_balance("OPC 53 Cement") == 350.0

    with pytest.raises(ValueError):
        godown.issue_material("OPC 53 Cement", 400.0)  # Exceeds available stock

def test_cad_adapter_mapping():
    cad_row = {
        "ElementId": "REVIT-WALL-9821",
        "Category": "Walls",
        "Level": "First Floor",
        "Volume_m3": 8.45,
        "Area_m2": 42.25,
    }
    pos = parse_cad_element_to_boq(cad_row)
    assert pos.quantity == 8.45
    assert pos.unit == CivilUnit.CUM
    assert "Walls Concrete Work" in pos.description
    assert pos.is_verified is False
