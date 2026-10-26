"""
Unit Tests for BuildBharat ERP Milestone 2: Procurement, Vendor RFQ & Manager Recommendation Gate
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ostaad_boq.erp_core.database.session import Base
from ostaad_boq.erp_core.database.models import (
    Tenant, User, UserRole, Project, ProjectStatus, BOQItemModel, MaterialRequirementModel,
    Vendor, RFQPackageModel, VendorBidModel, PurchaseOrderModel,
    RFQStatus, FinanceApprovalStatus
)
from ostaad_boq.erp_core.procurement.procurement_service import (
    decompose_verified_boq_to_materials,
    create_rfq_package,
    generate_vendor_magic_link,
    submit_vendor_bid,
    get_comparative_statement,
    manager_recommend_vendor,
    ProcurementError
)

@pytest.fixture
def db_session():
    """Isolated in-memory SQLite session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_material_decomposition_blocked_if_boq_unverified(db_session):
    tenant = Tenant(company_name="Godrej Infra", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    project = Project(tenant_id=tenant.id, project_name="Tower A", district="Thane", state="Maharashtra")
    db_session.add(project)
    db_session.commit()

    # Unverified BOQ item
    item = BOQItemModel(
        project_id=project.id,
        wbs_code="1.01",
        description="M20 Grade Reinforced Concrete",
        unit="CUM",
        quantity=50.0,
        is_verified=False,
    )
    db_session.add(item)
    db_session.commit()

    with pytest.raises(ProcurementError, match="BOQ items are unverified"):
        decompose_verified_boq_to_materials(db_session, project.id)

def test_material_decomposition_generates_is456_requirements(db_session):
    tenant = Tenant(company_name="Godrej Infra", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    eng = User(tenant_id=tenant.id, email="eng@godrej.com", full_name="Arun Verma", role=UserRole.OPERATIONS)
    project = Project(tenant_id=tenant.id, project_name="Tower B", district="Thane", state="Maharashtra")
    db_session.add_all([eng, project])
    db_session.commit()

    # Verified Concrete item
    item1 = BOQItemModel(
        project_id=project.id,
        wbs_code="2.01",
        description="M20 Grade RCC Slab Concrete",
        unit="CUM",
        quantity=50.0,
        is_verified=True,
        verified_by_user_id=eng.id,
    )
    # Verified Brickwork item
    item2 = BOQItemModel(
        project_id=project.id,
        wbs_code="3.01",
        description="Modular Brickwork in 1:6 cement mortar",
        unit="CUM",
        quantity=20.0,
        is_verified=True,
        verified_by_user_id=eng.id,
    )
    db_session.add_all([item1, item2])
    db_session.commit()

    materials = decompose_verified_boq_to_materials(db_session, project.id)
    assert len(materials) == 5  # 3 from concrete (cement, sand, agg) + 2 from brickwork (bricks, mortar cement)

    # Check cement bags calculation for 50 CUM concrete (50 * 1.54 / 5.5 * 1440 / 50 = ~403.2 -> 404 bags)
    cement_req = db_session.query(MaterialRequirementModel).filter(
        MaterialRequirementModel.project_id == project.id,
        MaterialRequirementModel.material_name.contains("OPC 53 Cement")
    ).first()
    assert cement_req is not None
    assert cement_req.required_quantity == 404
    assert cement_req.unit == "BAG"

    # Check bricks count for 20 CUM brickwork (20 * 500 = 10,000 bricks)
    brick_req = db_session.query(MaterialRequirementModel).filter(
        MaterialRequirementModel.project_id == project.id,
        MaterialRequirementModel.material_name.contains("Modular Bricks")
    ).first()
    assert brick_req is not None
    assert brick_req.required_quantity == 10000
    assert brick_req.unit == "NOS"

def test_rfq_package_creation_and_magic_link(db_session):
    tenant = Tenant(company_name="Tata Projects", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    project = Project(tenant_id=tenant.id, project_name="Metro Station", district="Nagpur", state="Maharashtra")
    vendor = Vendor(
        tenant_id=tenant.id,
        vendor_name="Ultratech Cement Depot",
        gstin="27ABCDE9999F1Z1",
        phone="9876543210",
        city="Nagpur",
        category="Cement",
    )
    db_session.add_all([project, vendor])
    db_session.commit()

    rfq = create_rfq_package(
        db_session,
        project_id=project.id,
        material_name="OPC 53 Grade Cement",
        required_quantity=500.0,
        uom="BAG",
        expiry_hours=72,
    )
    assert rfq.rfq_code.startswith("RFQ-")
    assert rfq.status == RFQStatus.DISPATCHED
    assert rfq.expires_at > datetime.utcnow()

    # Generate magic link
    link = generate_vendor_magic_link(rfq.id, vendor.id)
    assert "rfq=" in link
    assert "vendor=" in link
    assert "token=" in link

def test_vendor_bidding_and_l1_ranking(db_session):
    tenant = Tenant(company_name="Shapoorji Infra", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    project = Project(tenant_id=tenant.id, project_name="Bridge Pier", district="Pune", state="Maharashtra")
    db_session.add(project)
    db_session.commit()

    rfq = create_rfq_package(db_session, project.id, "OPC 53 Cement", 1000.0, "BAG")

    # 3 Vendors
    v1 = Vendor(tenant_id=tenant.id, vendor_name="Dealer Alpha", gstin="27AAA1111A1Z1", phone="911", city="Pune", category="Cement")
    v2 = Vendor(tenant_id=tenant.id, vendor_name="Dealer Beta", gstin="27BBB2222B1Z2", phone="922", city="Pune", category="Cement")
    v3 = Vendor(tenant_id=tenant.id, vendor_name="Dealer Gamma", gstin="27CCC3333C1Z3", phone="933", city="Pune", category="Cement")
    db_session.add_all([v1, v2, v3])
    db_session.commit()

    # Dealer Alpha: 370 + 10 freight + 28% GST = (380) * 1.28 = 486.40
    submit_vendor_bid(db_session, rfq.id, v1.id, base_unit_rate=370.0, freight_unit_rate=10.0, gst_percentage=28.0)
    # Dealer Beta: 350 + 10 freight + 28% GST = (360) * 1.28 = 460.80 (Lowest: L1)
    submit_vendor_bid(db_session, rfq.id, v2.id, base_unit_rate=350.0, freight_unit_rate=10.0, gst_percentage=28.0)
    # Dealer Gamma: 380 + 15 freight + 28% GST = (395) * 1.28 = 505.60
    submit_vendor_bid(db_session, rfq.id, v3.id, base_unit_rate=380.0, freight_unit_rate=15.0, gst_percentage=28.0)

    # Comparative evaluation
    comp = get_comparative_statement(db_session, rfq.id)
    assert len(comp) == 3
    assert comp[0]["rank"] == "L1"
    assert comp[0]["vendor_name"] == "Dealer Beta"
    assert comp[0]["landed_rate"] == 460.80
    assert comp[0]["total_order_value_inr"] == 460800.0

    assert comp[1]["rank"] == "L2"
    assert comp[1]["vendor_name"] == "Dealer Alpha"

def test_manager_recommendation_routes_to_finance_approval_gate(db_session):
    tenant = Tenant(company_name="Shapoorji Infra", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    manager = User(tenant_id=tenant.id, email="pm@shapoorji.com", full_name="Sunil Joshi", role=UserRole.OPERATIONS)
    project = Project(tenant_id=tenant.id, project_name="Site A", district="Mumbai", state="Maharashtra")
    vendor = Vendor(tenant_id=tenant.id, vendor_name="Best Steel", gstin="27SSS1111S1Z1", phone="999", city="Mumbai", category="Steel")
    db_session.add_all([manager, project, vendor])
    db_session.commit()

    rfq = create_rfq_package(db_session, project.id, "Fe 550D TMT Steel", 10.0, "MT")
    bid = submit_vendor_bid(db_session, rfq.id, vendor.id, base_unit_rate=52000.0, freight_unit_rate=1000.0, gst_percentage=18.0)

    # Manager selects vendor
    po = manager_recommend_vendor(
        db_session,
        rfq_id=rfq.id,
        bid_id=bid.id,
        manager_user_id=manager.id,
        notes="Lowest quote with certified primary steel.",
    )

    # MANDATORY GATE ASSERTIONS
    assert po.po_number.startswith("PO-")
    assert po.finance_approval_status == FinanceApprovalStatus.PENDING_FINANCE_APPROVAL
    assert po.is_dispatched_to_vendor is False
    assert po.total_landed_amount_inr == 625400.0  # 10 * ((52000 + 1000) * 1.18 = 62540) = 625,400.0

def test_non_manager_cannot_recommend_vendor(db_session):
    tenant = Tenant(company_name="L&T", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    labor_user = User(tenant_id=tenant.id, email="labor@lt.com", full_name="Ramu", role=UserRole.LABOUR)
    project = Project(tenant_id=tenant.id, project_name="Site B", district="Pune", state="Maharashtra")
    vendor = Vendor(tenant_id=tenant.id, vendor_name="Vendor X", gstin="27XXX1111X1Z1", phone="888", city="Pune", category="Bricks")
    db_session.add_all([labor_user, project, vendor])
    db_session.commit()

    rfq = create_rfq_package(db_session, project.id, "Red Bricks", 5000.0, "NOS")
    bid = submit_vendor_bid(db_session, rfq.id, vendor.id, base_unit_rate=8.5, freight_unit_rate=0.5, gst_percentage=5.0)

    with pytest.raises(ProcurementError, match="lacks authority"):
        manager_recommend_vendor(db_session, rfq.id, bid.id, labor_user.id)
