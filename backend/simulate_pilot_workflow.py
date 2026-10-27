"""
BuildBharat ERP - End-to-End Pilot Simulation
Simulates the entire Indian construction workflow for:
"Navi Mumbai International Airport - Terminal 2 (Zone A)"
"""
import sys
import uuid
from datetime import datetime, timedelta
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
from ostaad_boq.erp_core.database.verification_service import verify_all_project_items, can_dispatch_procurement
from ostaad_boq.erp_core.procurement.procurement_service import (
    decompose_verified_boq_to_materials, create_rfq_package, submit_vendor_bid,
    get_comparative_statement, manager_recommend_vendor
)
from ostaad_boq.erp_core.procurement.finance_approval_service import (
    finance_approve_po, record_po_payment, receive_goods_at_site
)
from ostaad_boq.erp_core.procurement.settlement_service import (
    reconcile_vendor_invoice, execute_final_po_settlement,
    generate_project_procurement_report, generate_financial_expenditure_report,
    generate_vendor_ledger_report
)

def print_header(title):
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80)

def print_step(step_num, title):
    print(f"\n>>> STEP {step_num}: {title}")

def run_pilot_simulation():
    print_header("BUILDBHARAT ERP - FULL PILOT LIFECYCLE SIMULATION")
    print("Simulating live operational workflow for a large-scale commercial project in India.")

    db_engine = create_engine("sqlite:///buildbharat_pilot.db", connect_args={"check_same_thread": False})
    Base.metadata.drop_all(db_engine)
    Base.metadata.create_all(db_engine)
    Session = sessionmaker(bind=db_engine)
    db = Session()

    # ---------------------------------------------------------
    # STEP 1: Master Data Setup (Tenant, RBAC Roles, Project)
    # ---------------------------------------------------------
    print_step(1, "Master Data Setup (Tenant, RBAC Roles, Project)")
    tenant = Tenant(
        company_name="Larsen & Toubro Construction Ltd",
        gstin="27AAACL1234F1Z1",
        state_code="27"
    )
    db.add(tenant)
    db.commit()

    pm_user = User(
        tenant_id=tenant.id, email="rajesh.sharma@lt.com",
        full_name="Rajesh Sharma", role=UserRole.OPERATIONS
    )
    finance_user = User(
        tenant_id=tenant.id, email="sunita.iyer@lt.com",
        full_name="Sunita Iyer", role=UserRole.FINANCE
    )
    storekeeper_user = User(
        tenant_id=tenant.id, email="ramesh.pawar@lt.com",
        full_name="Ramesh Pawar", role=UserRole.SITE_STORE
    )
    db.add_all([pm_user, finance_user, storekeeper_user])

    project = Project(
        tenant_id=tenant.id,
        project_name="Navi Mumbai International Airport - Terminal 2 (Zone A)",
        district="Raigad",
        state="Maharashtra",
        contract_value_inr=250000000.0,
        status=ProjectStatus.ACTIVE
    )
    db.add(project)

    vendor_ultra = Vendor(
        tenant_id=tenant.id, vendor_name="Ultratech Cement Ltd",
        gstin="27AAACU1234F1Z5", phone="9820123456", city="Mumbai", category="Cement"
    )
    vendor_ambuja = Vendor(
        tenant_id=tenant.id, vendor_name="Ambuja Cements Ltd",
        gstin="27AAAAC1234A1Z2", phone="9820654321", city="Navi Mumbai", category="Cement"
    )
    db.add_all([vendor_ultra, vendor_ambuja])
    db.commit()

    print(f" [OK] Tenant: {tenant.company_name} (GSTIN: {tenant.gstin})")
    print(f" [OK] Project: {project.project_name} | Contract: Rs {project.contract_value_inr:,.2f}")
    print(f" [OK] Personnel: PM ({pm_user.full_name}), Finance ({finance_user.full_name}), Site Store ({storekeeper_user.full_name})")

    # ---------------------------------------------------------
    # STEP 2: Blueprint Takeoff & Draft BOQ Generation
    # ---------------------------------------------------------
    print_step(2, "Blueprint Takeoff -> Draft BOQ Generated")
    boq_item = BOQItemModel(
        project_id=project.id,
        wbs_code="C-101",
        description="M25 Grade Reinforced Cement Concrete for Substructure Footings and Columns",
        unit="CUM",
        quantity=120.0,
        unit_rate=6500.0,
        is_verified=False
    )
    db.add(boq_item)
    db.commit()
    est_total = boq_item.quantity * boq_item.unit_rate
    print(f" [OK] Extracted Item: {boq_item.description}")
    print(f"      Quantity: {boq_item.quantity} {boq_item.unit} @ Rs {boq_item.unit_rate:,.2f} = Rs {est_total:,.2f}")
    print(f"      Verification Status: UNVERIFIED (Procurement Strictly Blocked)")

    # ---------------------------------------------------------
    # STEP 3: Project Manager Verification Gate
    # ---------------------------------------------------------
    print_step(3, "Project Manager Verification Gate")
    verify_all_project_items(db, project.id, verifier_user_id=pm_user.id)
    can_dispatch, unverified = can_dispatch_procurement(db, project.id)
    print(f" [OK] BOQ verification completed by PM {pm_user.full_name}.")
    print(f" [OK] Eligibility for Procurement: {can_dispatch}")

    # ---------------------------------------------------------
    # STEP 4: Indian Standard Material Decomposition (IS 456)
    # ---------------------------------------------------------
    print_step(4, "Material Decomposition via IS 456")
    decomposed = decompose_verified_boq_to_materials(db, project.id)
    print(f" [OK] Decomposed {boq_item.quantity} CUM of M25 concrete into raw materials:")
    for mat in decomposed:
        print(f"      - {mat.material_name}: {mat.required_quantity} {mat.unit}")

    # ---------------------------------------------------------
    # STEP 5: Multi-Vendor RFQ Package & Landed Bidding
    # ---------------------------------------------------------
    print_step(5, "RFQ Package Generation & Multi-Vendor Bidding")
    cement_req = next(m for m in decomposed if "Cement" in m.material_name)
    rfq = create_rfq_package(
        db, project.id,
        material_name=cement_req.material_name,
        required_quantity=cement_req.required_quantity,
        uom=cement_req.unit,
        expiry_hours=72
    )
    print(f" [OK] Issued RFQ Package {rfq.rfq_code} for {rfq.required_quantity} {rfq.uom} of {rfq.material_name}")

    # Bids
    bid_ultra = submit_vendor_bid(db, rfq.id, vendor_ultra.id, base_unit_rate=340.0, freight_unit_rate=15.0, gst_percentage=28.0)
    bid_ambuja = submit_vendor_bid(db, rfq.id, vendor_ambuja.id, base_unit_rate=355.0, freight_unit_rate=10.0, gst_percentage=28.0)
    print(f" [OK] Vendor Quotes Received & Landed Rates Evaluated:")
    print(f"      1. {vendor_ultra.vendor_name}: Base Rs 340 + Freight Rs 15 + GST 28% -> Landed: Rs {bid_ultra.landed_cost_per_unit:.2f} / Bag")
    print(f"      2. {vendor_ambuja.vendor_name}: Base Rs 355 + Freight Rs 10 + GST 28% -> Landed: Rs {bid_ambuja.landed_cost_per_unit:.2f} / Bag")

    comp_stmt = get_comparative_statement(db, rfq.id)
    print(f" [OK] Dynamic Comparative Statement Generated (L1 Bidder: {comp_stmt[0]['vendor_name']} @ Rs {comp_stmt[0]['landed_rate']:.2f})")

    # ---------------------------------------------------------
    # STEP 6: Project Manager Recommends Vendor Quote
    # ---------------------------------------------------------
    print_step(6, "Project Manager Quote Recommendation Gate")
    po = manager_recommend_vendor(
        db, rfq.id, bid_ultra.id,
        manager_user_id=pm_user.id,
        notes="Recommended Ultratech as L1 lowest landed cost with 24-hr batch plant dispatch."
    )
    print(f" [OK] PO Generated: {po.po_number} | Value: Rs {po.total_landed_amount_inr:,.2f}")
    print(f" [!] PO Status: {po.finance_approval_status.value} | Dispatched to Vendor: {po.is_dispatched_to_vendor}")
    print(f"     -> PO is strictly LOCKED. It CANNOT be sent to vendor without Finance Budget Approval.")

    # ---------------------------------------------------------
    # STEP 7: Mandatory Finance Budget Approval Gate
    # ---------------------------------------------------------
    print_step(7, "MANDATORY FINANCE BUDGET APPROVAL GATE")
    fin_po = finance_approve_po(
        db, po.id, finance_user_id=finance_user.id,
        payment_mode=PaymentStructure.PART_BY_PART, advance_percentage=25.0,
        notes="Finance clearance granted for Terminal 2 footing concrete package."
    )
    adv_payable = round(po.total_landed_amount_inr * 0.25, 2)
    print(f" [OK] Finance Clearance Granted by {finance_user.full_name}!")
    print(f"      Payment Structure: {fin_po.payment_structure.value} | Advance: {fin_po.advance_percentage}%")
    print(f"      Advance Amount Due: Rs {adv_payable:,.2f}")
    print(f"      PO Dispatch Status: DISPATCHED TO VENDOR ({fin_po.is_dispatched_to_vendor})")

    # ---------------------------------------------------------
    # STEP 8: Advance Disbursement & Manual UTR Tracking
    # ---------------------------------------------------------
    print_step(8, "Advance Payment Disbursement & Bank UTR Logging")
    adv_txn = record_po_payment(
        db, po.id, finance_user_id=finance_user.id,
        stage_type=PaymentStageType.ADVANCE,
        amount_inr=adv_payable,
        payment_method=PaymentMethod.NEFT_RTGS,
        transaction_ref="HDFCR52026102600881234",
        bank_name="HDFC Corporate Bank"
    )
    print(f" [OK] Advance Payment Logged: Rs {adv_txn.amount_inr:,.2f}")
    print(f"      Payment Method: {adv_txn.payment_method.value} | Bank UTR: {adv_txn.transaction_ref}")

    # ---------------------------------------------------------
    # STEP 9: Site Store Physical Delivery (GRN) & Godown Stock Sync
    # ---------------------------------------------------------
    print_step(9, "Site Store Physical Receiving (GRN) & Godown Inventory")
    # Truck 1: 700 bags received, 0 damaged
    grn1 = receive_goods_at_site(
        db, po.id, storekeeper_user_id=storekeeper_user.id,
        challan_number="CHAL-2026-0091", truck_number="MH-04-AZ-9988",
        received_qty=700.0,
        challan_photo_url="https://s3.ap-south-1.amazonaws.com/erp-docs/chal-0091.jpg",
        damaged_qty=0.0
    )
    # Truck 2: 631 bags received, 11 damaged in transit (620 net accepted)
    # Total net accepted = 700 + 620 = 1320 bags
    grn2 = receive_goods_at_site(
        db, po.id, storekeeper_user_id=storekeeper_user.id,
        challan_number="CHAL-2026-0092", truck_number="MH-04-BY-1122",
        received_qty=631.0,
        challan_photo_url="https://s3.ap-south-1.amazonaws.com/erp-docs/chal-0092.jpg",
        damaged_qty=11.0
    )
    print(f" [OK] GRN 1 Logged: Truck {grn1.truck_number} -> 700 bags accepted.")
    print(f" [OK] GRN 2 Logged: Truck {grn2.truck_number} -> 631 bags received (11 damaged, 620 net accepted).")
    print(f" [OK] Total Net Physical Accepted at Site: 1,320 Bags")
    
    inv = db.query(SiteInventoryModel).filter(SiteInventoryModel.project_id == project.id).first()
    print(f" [OK] Real-time Warehouse Inventory: {inv.current_stock} {inv.uom} of {inv.material_name} in stock.")

    # ---------------------------------------------------------
    # STEP 10: Two-Way Match Invoice Reconciliation
    # ---------------------------------------------------------
    print_step(10, "Two-Way Match Reconciliation (PO Rate <-> Site GRN <-> Vendor Invoice)")
    invoice_data = {
        "purchase_order_id": po.id,
        "invoice_number": "UTCL-TAX-INV-88910",
        "invoiced_quantity": 1331.0,    # Vendor billed full 1331 bags
        "invoiced_unit_rate": 454.40    # Contracted landed unit rate
    }
    recon = reconcile_vendor_invoice(db, invoice_data, finance_user_id=finance_user.id)
    print(f" [!] Reconciliation Status: {recon['reconciliation_status']}")
    print(f"     Vendor Claimed: {recon['invoiced_quantity']} Bags (Rs {recon['total_invoiced_amount']:,.2f})")
    print(f"     Site GRN Net Received: {recon['net_grn_accepted_quantity']} Bags")
    print(f"     System Approved Payable: {recon['approved_payable_quantity']} Bags @ Rs {recon['approved_unit_rate']} = Rs {recon['approved_payable_amount']:,.2f}")
    print(f"     Audit Variance Note: {recon['variance_notes']}")

    # ---------------------------------------------------------
    # STEP 11: Final Balance Settlement & PO Closure
    # ---------------------------------------------------------
    print_step(11, "Final Balance Settlement & Purchase Order Closure")
    balance_due = round(recon['approved_payable_amount'] - adv_txn.amount_inr, 2)
    settle_res = execute_final_po_settlement(
        db, po.id,
        settlement_payment={
            "amount": balance_due,
            "payment_method": "NEFT_RTGS",
            "transaction_ref": "SBINR52026102600987654",
            "bank_name": "State Bank of India"
        },
        finance_user_id=finance_user.id
    )
    print(f" [OK] Final Settlement Paid: Rs {settle_res['amount_paid']:,.2f} via {settle_res['payment_method']}")
    print(f"      Bank UTR Reference: {settle_res['transaction_ref']}")
    print(f"      Total Paid to Vendor: Rs {settle_res['cumulative_paid_inr']:,.2f}")
    print(f"      Outstanding Balance: Rs {settle_res['remaining_balance_inr']:.2f}")
    print(f"      Purchase Order Status: FULLY SETTLED = {settle_res['is_fully_settled']} (Closed at {settle_res['settled_at']})")

    # ---------------------------------------------------------
    # STEP 12: Executive Reports
    # ---------------------------------------------------------
    print_step(12, "Executive Reports & Audit Statements")
    
    # 1. Procurement Report
    rep_proc = generate_project_procurement_report(db, project.id)
    print("\n[A] PROJECT PROCUREMENT STATUS REPORT:")
    print(f"    Project: {rep_proc['project_name']} ({rep_proc['district']}, {rep_proc['state']})")
    print(f"    Total POs: {rep_proc['total_pos_issued']} | Total Committed: Rs {rep_proc['total_committed_inr']:,.2f}")
    for item in rep_proc['purchase_orders']:
        print(f"    - PO: {item['po_number']} | {item['material_name']} | Ordered: {item['ordered_quantity']} {item['uom']} | Net Delivered: {item['net_received_quantity']} {item['uom']} | Settled: {item['is_fully_settled']}")
    for g in rep_proc['godown_inventory']:
        print(f"    - Godown Stock: {g['material_name']} = {g['current_stock']} {g['uom']}")

    # 2. Financial Expenditure Report
    rep_fin = generate_financial_expenditure_report(db, project.id)
    print("\n[B] EXECUTIVE FINANCIAL EXPENDITURE REPORT:")
    print(f"    Total Procurement Committed: Rs {rep_fin['total_committed_budget_inr']:,.2f}")
    print(f"    Advance Disbursed:           Rs {rep_fin['advance_disbursed_inr']:,.2f}")
    print(f"    Final Settlement Disbursed:  Rs {rep_fin['final_settlement_disbursed_inr']:,.2f}")
    print(f"    Total Actual Cash Outflow:   Rs {rep_fin['total_cash_outflow_inr']:,.2f}")
    print(f"    Outstanding Payables:        Rs {rep_fin['outstanding_payables_inr']:,.2f}")
    print(f"    POs Closed / Settled:        {rep_fin['settled_pos_count']} / {rep_fin['total_pos_count']}")

    # 3. Vendor Commercial Ledger
    rep_ledger = generate_vendor_ledger_report(db, vendor_ultra.id)
    print(f"\n[C] VENDOR COMMERCIAL LEDGER ({rep_ledger['vendor_name']} - GSTIN: {rep_ledger['gstin']}):")
    print(f"    Total Contracted Value:  Rs {rep_ledger['total_contracted_value_inr']:,.2f}")
    print(f"    Total Billed / Invoiced: Rs {rep_ledger['total_invoiced_value_inr']:,.2f}")
    print(f"    Total Paid:              Rs {rep_ledger['total_paid_value_inr']:,.2f}")
    print(f"    Balance Due:             Rs {rep_ledger['balance_outstanding_inr']:,.2f}")
    print(f"    Bank Disbursement Audit Trail:")
    for txn in rep_ledger['payment_transactions']:
        print(f"      * {txn['stage']}: Rs {txn['amount']:,.2f} via {txn['method']} | UTR: {txn['transaction_ref']} ({txn['bank_name']})")

    print_header("PILOT SIMULATION COMPLETED WITH 100% SUCCESS")

if __name__ == '__main__':
    run_pilot_simulation()
