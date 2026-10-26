"""
Unit Tests for BuildBharat ERP Milestone 3:
Finance Approval Gate, Payment Scheduling, Manual UTR Recording & Site Store GRN Delivery
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ostaad_boq.erp_core.database.session import Base
from ostaad_boq.erp_core.database.models import (
    Tenant, User, UserRole, Project, Vendor, RFQPackageModel, VendorBidModel, PurchaseOrderModel,
    PaymentTransactionModel, GoodsReceiptNoteModel, SiteInventoryModel,
    FinanceApprovalStatus, PaymentStructure, PaymentStageType, PaymentMethod
)
from ostaad_boq.erp_core.procurement.finance_approval_service import (
    finance_approve_po, finance_reject_po, record_po_payment,
    receive_goods_at_site, get_po_financial_summary, FinanceError, StoreError
)

@pytest.fixture
def db_session():
    """Isolated in-memory SQLite session for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def seeded_po(db_session):
    """Seed project, vendor, RFQ, bid, and pending PO."""
    tenant = Tenant(company_name="L&T Construction", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    manager = User(tenant_id=tenant.id, email="pm@lt.com", full_name="Rajesh Gupta", role=UserRole.OPERATIONS)
    finance_user = User(tenant_id=tenant.id, email="cfo@lt.com", full_name="Suresh Nair", role=UserRole.FINANCE)
    storekeeper = User(tenant_id=tenant.id, email="store@lt.com", full_name="Dinesh Kumar", role=UserRole.SITE_STORE)
    project = Project(tenant_id=tenant.id, project_name="Navi Mumbai Airport Terminal", district="Raigad", state="Maharashtra")
    vendor = Vendor(tenant_id=tenant.id, vendor_name="Ambuja Cements Ltd", gstin="27AAA0000A1Z1", phone="9820011111", city="Mumbai", category="Cement")

    db_session.add_all([manager, finance_user, storekeeper, project, vendor])
    db_session.commit()

    rfq = RFQPackageModel(
        project_id=project.id,
        rfq_code="RFQ-NMA-001",
        material_name="OPC 53 Cement",
        required_quantity=500.0,
        uom="BAG",
        expires_at=datetime.utcnow(),
    )
    db_session.add(rfq)
    db_session.commit()

    bid = VendorBidModel(
        rfq_id=rfq.id,
        vendor_id=vendor.id,
        base_unit_rate=350.0,
        freight_unit_rate=10.0,
        gst_percentage=28.0,
        landed_cost_per_unit=460.80,  # 360 * 1.28
    )
    db_session.add(bid)
    db_session.commit()

    po = PurchaseOrderModel(
        project_id=project.id,
        rfq_id=rfq.id,
        vendor_id=vendor.id,
        selected_bid_id=bid.id,
        po_number="PO-NMA-0001",
        material_name="OPC 53 Cement",
        quantity=500.0,
        uom="BAG",
        landed_unit_rate=460.80,
        total_landed_amount_inr=230400.0,  # 500 * 460.80
        manager_recommended_by_id=manager.id,
        manager_notes="L1 bidder with confirmed 48h delivery.",
        finance_approval_status=FinanceApprovalStatus.PENDING_FINANCE_APPROVAL,
        is_dispatched_to_vendor=False,
    )
    db_session.add(po)
    db_session.commit()

    return {
        "tenant": tenant,
        "manager": manager,
        "finance_user": finance_user,
        "storekeeper": storekeeper,
        "project": project,
        "vendor": vendor,
        "po": po,
    }

def test_unauthorized_user_cannot_finance_approve_po(db_session, seeded_po):
    po = seeded_po["po"]
    manager = seeded_po["manager"]  # Operations cannot give final finance approval

    with pytest.raises(FinanceError, match="lacks financial authority"):
        finance_approve_po(
            db_session,
            po_id=po.id,
            finance_user_id=manager.id,
            payment_mode=PaymentStructure.PART_BY_PART,
            advance_percentage=30.0,
        )

def test_finance_approval_unlocks_po_dispatch(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]

    approved_po = finance_approve_po(
        db_session,
        po_id=po.id,
        finance_user_id=finance_user.id,
        payment_mode=PaymentStructure.PART_BY_PART,
        advance_percentage=30.0,
        notes="Budget verified against terminal foundation package.",
    )

    assert approved_po.finance_approval_status == FinanceApprovalStatus.APPROVED
    assert approved_po.is_dispatched_to_vendor is True
    assert approved_po.dispatched_at is not None
    assert approved_po.payment_structure == PaymentStructure.PART_BY_PART
    assert approved_po.advance_percentage == 30.0

def test_finance_rejection_keeps_po_locked(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]

    rejected_po = finance_reject_po(
        db_session,
        po_id=po.id,
        finance_user_id=finance_user.id,
        reason="Budget exhausted for cement this month. Defer to next cycle.",
    )

    assert rejected_po.finance_approval_status == FinanceApprovalStatus.REJECTED
    assert rejected_po.is_dispatched_to_vendor is False
    assert "Budget exhausted" in rejected_po.finance_rejection_reason

def test_advance_payment_recording_with_utr(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]

    # First approve
    finance_approve_po(db_session, po.id, finance_user.id, PaymentStructure.PART_BY_PART, advance_percentage=30.0)

    # Record 30% advance: 230,400 * 0.30 = 69,120.0
    txn = record_po_payment(
        db_session,
        po_id=po.id,
        finance_user_id=finance_user.id,
        stage_type=PaymentStageType.ADVANCE,
        amount_inr=69120.0,
        payment_method=PaymentMethod.NEFT_RTGS,
        transaction_ref="HDFCR92026102600123456",
        bank_name="HDFC Bank Current A/C",
    )

    assert txn.amount_inr == 69120.0
    assert txn.transaction_ref == "HDFCR92026102600123456"

    summary = get_po_financial_summary(db_session, po.id)
    assert summary["total_paid_inr"] == 69120.0
    assert summary["balance_payable_inr"] == 161280.0
    assert summary["is_fully_paid"] is False

def test_payment_exceeding_po_value_rejected(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]
    finance_approve_po(db_session, po.id, finance_user.id, PaymentStructure.ADVANCE_ONLY, advance_percentage=100.0)

    # Attempting to record ₹300,000 for a ₹230,400 order
    with pytest.raises(FinanceError, match="exceed total PO amount"):
        record_po_payment(
            db_session,
            po_id=po.id,
            finance_user_id=finance_user.id,
            stage_type=PaymentStageType.ADVANCE,
            amount_inr=300000.0,
            payment_method=PaymentMethod.NEFT_RTGS,
            transaction_ref="UTR-OVERPAY-99",
            bank_name="SBI",
        )

def test_site_goods_receipt_note_increments_godown_stock(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]
    storekeeper = seeded_po["storekeeper"]

    # Must be approved and dispatched before site can receive
    finance_approve_po(db_session, po.id, finance_user.id, PaymentStructure.PART_BY_PART, advance_percentage=30.0)

    # Storekeeper receives full delivery of 500 bags
    grn = receive_goods_at_site(
        db_session,
        po_id=po.id,
        storekeeper_user_id=storekeeper.id,
        challan_number="CH-2026-9812",
        truck_number="MH-04-AB-1234",
        received_qty=500.0,
        challan_photo_url="https://s3.ap-south-1.amazonaws.com/lt-site/challans/CH-9812.jpg",
    )

    assert grn.received_quantity == 500.0
    assert grn.truck_number == "MH-04-AB-1234"

    # Verify Godown stock incremented
    stock = db_session.query(SiteInventoryModel).filter_by(
        project_id=po.project_id,
        material_name="OPC 53 Cement"
    ).first()
    assert stock is not None
    assert stock.current_stock == 500.0

def test_over_delivery_tolerance_check(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]
    storekeeper = seeded_po["storekeeper"]
    finance_approve_po(db_session, po.id, finance_user.id, PaymentStructure.ON_DELIVERY_CREDIT)

    # PO is for 500 bags. Allowable limit is 500 * 1.05 = 525 bags.
    # Attempting to receive 550 bags should fail!
    with pytest.raises(StoreError, match="Over-delivery limit exceeded"):
        receive_goods_at_site(
            db_session,
            po_id=po.id,
            storekeeper_user_id=storekeeper.id,
            challan_number="CH-9999",
            truck_number="MH-04-XX-9999",
            received_qty=550.0,
            challan_photo_url="https://challan.jpg",
        )

def test_full_po_financial_and_delivery_summary(db_session, seeded_po):
    po = seeded_po["po"]
    finance_user = seeded_po["finance_user"]
    storekeeper = seeded_po["storekeeper"]

    finance_approve_po(db_session, po.id, finance_user.id, PaymentStructure.PART_BY_PART, advance_percentage=30.0)

    # Pay 30% advance
    record_po_payment(db_session, po.id, finance_user.id, PaymentStageType.ADVANCE, 69120.0, PaymentMethod.NEFT_RTGS, "UTR-001", "HDFC")
    # Receive 500 bags
    receive_goods_at_site(db_session, po.id, storekeeper.id, "CH-01", "MH-01", 500.0, "https://pic.jpg")
    # Pay remaining 70% balance
    record_po_payment(db_session, po.id, finance_user.id, PaymentStageType.FINAL_BALANCE, 161280.0, PaymentMethod.NEFT_RTGS, "UTR-002", "HDFC")

    summary = get_po_financial_summary(db_session, po.id)
    assert summary["is_fully_paid"] is True
    assert summary["is_fully_received"] is True
    assert summary["total_paid_inr"] == 230400.0
    assert summary["balance_payable_inr"] == 0.0
    assert summary["pending_delivery_quantity"] == 0.0
