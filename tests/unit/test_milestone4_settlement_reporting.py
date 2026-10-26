"""
Unit Tests for BuildBharat ERP - Milestone 4: Two-Way Match Settlement Engine & Operational Reporting
"""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ostaad_boq.erp_core.database.session import Base
from ostaad_boq.erp_core.database.models import (
    Tenant, User, UserRole, Project, ProjectStatus, BOQItemModel,
    Vendor, RFQPackageModel, VendorBidModel, PurchaseOrderModel,
    FinanceApprovalStatus, PaymentStructure, PaymentStageType, PaymentMethod,
    PaymentTransactionModel, GoodsReceiptNoteModel, SiteInventoryModel,
    VendorInvoiceModel, InvoiceReconciliationStatus
)
from ostaad_boq.erp_core.procurement.settlement_service import (
    reconcile_vendor_invoice, execute_final_po_settlement,
    generate_project_procurement_report, generate_financial_expenditure_report,
    generate_vendor_ledger_report
)

@pytest.fixture
def db_session():
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_setup(db_session):
    tenant = Tenant(company_name="BuildBharat Infra", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    finance_user = User(tenant_id=tenant.id, email="cfo@buildbharat.in", full_name="Chief Financial Officer", role=UserRole.FINANCE)
    manager_user = User(tenant_id=tenant.id, email="pm@buildbharat.in", full_name="Project Manager", role=UserRole.OPERATIONS)
    store_user = User(tenant_id=tenant.id, email="store@buildbharat.in", full_name="Site Storekeeper", role=UserRole.SITE_STORE)
    db_session.add_all([finance_user, manager_user, store_user])

    project = Project(
        tenant_id=tenant.id, project_name="Apex Commercial Tower", district="Mumbai Suburban",
        state="Maharashtra", contract_value_inr=5000000.0, status=ProjectStatus.PLANNING
    )
    db_session.add(project)

    vendor = Vendor(
        tenant_id=tenant.id, vendor_name="Ultratech Cement Ltd",
        gstin="27AAACU1234F1Z5", phone="9876543210", city="Mumbai", category="Cement"
    )
    db_session.add(vendor)
    db_session.commit()

    rfq = RFQPackageModel(
        project_id=project.id, rfq_code="RFQ-APEX-001",
        material_name="OPC 53 Cement", required_quantity=1000.0, uom="BAG",
        expires_at=datetime.utcnow()
    )
    db_session.add(rfq)
    db_session.commit()

    bid = VendorBidModel(
        rfq_id=rfq.id, vendor_id=vendor.id,
        base_unit_rate=350.0, freight_unit_rate=15.625, gst_percentage=28.0,
        landed_cost_per_unit=468.0
    )
    db_session.add(bid)
    db_session.commit()

    # Pre-approved and dispatched PO
    po = PurchaseOrderModel(
        project_id=project.id, rfq_id=rfq.id, vendor_id=vendor.id,
        selected_bid_id=bid.id, po_number="PO-APEX-001",
        material_name="OPC 53 Cement", quantity=1000.0, uom="BAG",
        landed_unit_rate=468.0, total_landed_amount_inr=468000.0,
        manager_recommended_by_id=manager_user.id,
        finance_approval_status=FinanceApprovalStatus.APPROVED,
        finance_approver_id=finance_user.id,
        payment_structure=PaymentStructure.PART_BY_PART,
        advance_percentage=20.0,
        is_dispatched_to_vendor=True
    )
    db_session.add(po)
    db_session.commit()

    # Advance payment recorded: 20% of 468000 = 93600
    adv_txn = PaymentTransactionModel(
        purchase_order_id=po.id, stage_type=PaymentStageType.ADVANCE,
        amount_inr=93600.0, payment_method=PaymentMethod.NEFT_RTGS,
        transaction_ref="UTR-ADV-998877", bank_name="HDFC Bank",
        recorded_by_user_id=finance_user.id
    )
    db_session.add(adv_txn)

    # GRN 1: 600 bags received, 0 damaged
    grn1 = GoodsReceiptNoteModel(
        purchase_order_id=po.id, challan_number="CH-001",
        truck_number="MH-04-AB-1234", received_quantity=600.0, damaged_quantity=0.0,
        challan_photo_url="https://s3.ap-south-1.amazonaws.com/erp/ch-001.jpg",
        storekeeper_id=store_user.id
    )
    # GRN 2: 400 bags received, 10 damaged (net 390 bags accepted)
    grn2 = GoodsReceiptNoteModel(
        purchase_order_id=po.id, challan_number="CH-002",
        truck_number="MH-04-CD-5678", received_quantity=400.0, damaged_quantity=10.0,
        challan_photo_url="https://s3.ap-south-1.amazonaws.com/erp/ch-002.jpg",
        storekeeper_id=store_user.id
    )
    # Inventory record
    inventory = SiteInventoryModel(
        project_id=project.id, material_name="OPC 53 Cement",
        current_stock=990.0, uom="BAG"
    )
    db_session.add_all([grn1, grn2, inventory])
    db_session.commit()

    return {
        "tenant": tenant,
        "finance_user": finance_user,
        "manager_user": manager_user,
        "store_user": store_user,
        "project": project,
        "vendor": vendor,
        "po": po
    }

def test_reconcile_invoice_role_enforcement(db_session, test_setup):
    """Operations / Site Store cannot execute financial reconciliation."""
    po = test_setup["po"]
    manager_user = test_setup["manager_user"]
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-001",
        "invoiced_quantity": 990.0,
        "invoiced_unit_rate": 468.0
    }
    with pytest.raises(PermissionError) as exc:
        reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=manager_user.id)
    assert "not authorized" in str(exc.value)

def test_reconcile_invoice_matched(db_session, test_setup):
    """When invoice rate and quantity match PO contract and physical net GRN."""
    po = test_setup["po"]
    finance_user = test_setup["finance_user"]
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-001",
        "invoiced_quantity": 990.0,  # 600 + (400 - 10) = 990 net GRN
        "invoiced_unit_rate": 468.0
    }
    res = reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=finance_user.id)
    assert res["reconciliation_status"] == InvoiceReconciliationStatus.MATCHED.value
    assert res["approved_payable_quantity"] == 990.0
    assert res["approved_unit_rate"] == 468.0
    assert res["approved_payable_amount"] == 990.0 * 468.0
    assert "matches" in res["variance_notes"].lower()

def test_reconcile_invoice_rate_discrepancy(db_session, test_setup):
    """If vendor invoices at higher rate than contracted PO landed rate, cap at contracted rate."""
    po = test_setup["po"]
    finance_user = test_setup["finance_user"]
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-002",
        "invoiced_quantity": 990.0,
        "invoiced_unit_rate": 490.0  # Claiming 490 instead of 468 contracted
    }
    res = reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=finance_user.id)
    assert res["reconciliation_status"] == InvoiceReconciliationStatus.RATE_DISCREPANCY.value
    assert res["approved_unit_rate"] == 468.0
    assert res["approved_payable_amount"] == 990.0 * 468.0
    assert "exceeds contracted landed rate" in res["variance_notes"]

def test_reconcile_invoice_quantity_discrepancy(db_session, test_setup):
    """If vendor invoices for 1000 bags but only 990 net bags arrived, cap at physical 990."""
    po = test_setup["po"]
    finance_user = test_setup["finance_user"]
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-003",
        "invoiced_quantity": 1000.0,  # Claiming 1000 but 10 damaged on site
        "invoiced_unit_rate": 468.0
    }
    res = reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=finance_user.id)
    assert res["reconciliation_status"] == InvoiceReconciliationStatus.QUANTITY_DISCREPANCY.value
    assert res["approved_payable_quantity"] == 990.0
    assert res["approved_payable_amount"] == 990.0 * 468.0
    assert "exceeds physical site store net received" in res["variance_notes"]

def test_final_po_settlement_success(db_session, test_setup):
    """Execute final settlement payment, verify UTR, and check PO transitions to FULLY_SETTLED."""
    po = test_setup["po"]
    finance_user = test_setup["finance_user"]

    # Step 1: Reconcile invoice
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-001",
        "invoiced_quantity": 990.0,
        "invoiced_unit_rate": 468.0
    }
    reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=finance_user.id)

    # Total approved: 990 * 468 = 463320. Advance already paid: 93600. Balance due: 369720
    settlement_payment = {
        "amount": 369720.0,
        "payment_method": "NEFT_RTGS",
        "transaction_ref": "UTR-FINAL-11223344",
        "bank_name": "State Bank of India"
    }

    res = execute_final_po_settlement(db_session, po.id, settlement_payment, finance_user_id=finance_user.id)
    assert res["is_fully_settled"] is True
    assert res["remaining_balance_inr"] == 0.0
    assert res["transaction_ref"] == "UTR-FINAL-11223344"

    # Verify PO in DB
    refreshed_po = db_session.query(PurchaseOrderModel).filter(PurchaseOrderModel.id == po.id).first()
    assert refreshed_po.is_fully_settled is True
    assert refreshed_po.settled_at is not None

def test_final_po_settlement_overpayment_rejected(db_session, test_setup):
    """Attempting to pay more than approved balance due raises ValueError."""
    po = test_setup["po"]
    finance_user = test_setup["finance_user"]

    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "INV-2026-001",
        "invoiced_quantity": 990.0,
        "invoiced_unit_rate": 468.0
    }
    reconcile_vendor_invoice(db_session, invoice_data, finance_user_id=finance_user.id)

    # Due is 369720. Attempting to disburse 400000
    settlement_payment = {
        "amount": 400000.0,
        "payment_method": "NEFT_RTGS",
        "transaction_ref": "UTR-OVER-999",
        "bank_name": "State Bank of India"
    }
    with pytest.raises(ValueError) as exc:
        execute_final_po_settlement(db_session, po.id, settlement_payment, finance_user_id=finance_user.id)
    assert "exceeds outstanding balance due" in str(exc.value)

def test_project_procurement_report(db_session, test_setup):
    """Generate operational procurement report for project."""
    project = test_setup["project"]
    report = generate_project_procurement_report(db_session, project.id)
    assert report["project_name"] == "Apex Commercial Tower"
    assert report["total_pos_issued"] == 1
    assert report["total_committed_inr"] == 468000.0
    assert len(report["godown_inventory"]) == 1
    assert report["godown_inventory"][0]["current_stock"] == 990.0

def test_financial_expenditure_and_vendor_ledger(db_session, test_setup):
    """Verify executive financial outflow and vendor commercial ledger."""
    project = test_setup["project"]
    vendor = test_setup["vendor"]

    # 1. Financial Expenditure Report
    fin_rep = generate_financial_expenditure_report(db_session, project.id)
    assert fin_rep["total_committed_budget_inr"] == 468000.0
    assert fin_rep["advance_disbursed_inr"] == 93600.0
    assert fin_rep["total_cash_outflow_inr"] == 93600.0
    assert fin_rep["outstanding_payables_inr"] == 468000.0 - 93600.0

    # 2. Vendor Ledger
    ledger = generate_vendor_ledger_report(db_session, vendor.id)
    assert ledger["vendor_name"] == "Ultratech Cement Ltd"
    assert ledger["gstin"] == "27AAACU1234F1Z5"
    assert ledger["total_contracted_value_inr"] == 468000.0
    assert ledger["total_paid_value_inr"] == 93600.0
    assert len(ledger["payment_transactions"]) == 1
    assert ledger["payment_transactions"][0]["transaction_ref"] == "UTR-ADV-998877"
