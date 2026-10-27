"""
BuildBharat ERP - Step 6 End-to-End Pilot Integration Test Suite
Verifies the complete decoupled multi-department workflow from registration to settlement.
"""

import pytest
from fastapi.testclient import TestClient
from ostaad_boq.app import app

client = TestClient(app)

def test_complete_e2e_pilot_lifecycle():
    # -------------------------------------------------------------
    # 1. New User Registration & Tenant Onboarding
    # -------------------------------------------------------------
    import uuid
    unique_id = uuid.uuid4().hex[:6]
    reg_payload = {
        "full_name": "Vikram Malhotra",
        "email": f"vikram.pm.{unique_id}@lt.com",
        "password": "Password@2026",
        "role": "OPERATIONS",
        "phone": "+91 98200 99881",
        "company_name": "Larsen & Toubro Western Hub"
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    assert reg_data["success"] is True
    assert "token" in reg_data
    assert reg_data["user"]["full_name"] == "Vikram Malhotra"
    assert reg_data["user"]["role"] == "OPERATIONS"

    # -------------------------------------------------------------
    # 2. Authentication Gateway & Session Validation
    # -------------------------------------------------------------
    login_resp = client.post("/api/v1/auth/login", json={
        "email": reg_payload["email"],
        "password": reg_payload["password"]
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token is not None

    me_resp = client.get(f"/api/v1/auth/me?token={token}")
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == reg_payload["email"]

    # Demo accounts verification
    demo_resp = client.get("/api/v1/auth/demo-accounts")
    assert demo_resp.status_code == 200
    assert len(demo_resp.json()) >= 4

    # -------------------------------------------------------------
    # 3. Operations: BOQ Inspection, Line Items & Baseline Approval
    # -------------------------------------------------------------
    # Fetch items
    boq_resp = client.get("/api/v1/erp/boq/items/proj-demo-101")
    assert boq_resp.status_code == 200
    items = boq_resp.json()
    assert len(items) > 0

    # Add a custom BOQ item
    new_item_payload = {
        "project_id": "proj-demo-101",
        "wbs_code": "03.02.01",
        "description": "Reinforced concrete M30 in retaining wall footings",
        "unit": "Cum",
        "quantity": 120.0,
        "unit_rate": 6800.0
    }
    add_resp = client.post("/api/v1/erp/boq/item", json=new_item_payload)
    assert add_resp.status_code == 200
    created_item_id = add_resp.json()["id"]

    # Verify All BOQ Items (Approve Final BOQ)
    verify_resp = client.post("/api/v1/erp/boq/verify-all", json={
        "project_id": "proj-demo-101",
        "verified_by_user_id": "user-pm-01"
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "success"

    # -------------------------------------------------------------
    # 4. IS 456 Material Requirements Decomposition
    # -------------------------------------------------------------
    decomp_resp = client.post("/api/v1/erp/procurement/decompose", json={
        "project_id": "proj-demo-101"
    })
    assert decomp_resp.status_code == 200
    assert decomp_resp.json()["status"] == "success"
    assert len(decomp_resp.json()["decomposed_materials"]) > 0

    # -------------------------------------------------------------
    # 5. Vendor Quotation & Bill Proposal Submission to Finance
    # -------------------------------------------------------------
    vendors_resp = client.get("/api/v1/erp/vendors")
    assert vendors_resp.status_code == 200
    vendors = vendors_resp.json()
    assert len(vendors) > 0
    selected_vendor_id = vendors[0]["id"]

    rec_payload = {
        "manager_user_id": "user-pm-01",
        "manager_notes": "Lowest evaluated landed quote with 24h batch plant delivery SLA.",
        "vendor_id": selected_vendor_id
    }
    rec_resp = client.post("/api/v1/erp/procurement/recommend", json=rec_payload)
    assert rec_resp.status_code == 200, f"Recommend error: {rec_resp.text}"
    po_data = rec_resp.json()
    po_id = po_data["po_id"]
    po_number = po_data["po_number"]
    assert po_data["finance_approval_status"] == "PENDING_FINANCE_APPROVAL"
    assert po_data["is_dispatched_to_vendor"] is False

    # Verify Finance sees it in pending queue
    pending_resp = client.get("/api/v1/erp/finance/pending")
    assert pending_resp.status_code == 200
    pending_list = pending_resp.json()
    assert any(p["id"] == po_id for p in pending_list)

    # -------------------------------------------------------------
    # 6. Finance Approval Decision Gate (Advance % + Bank UTR)
    # -------------------------------------------------------------
    fin_approve_payload = {
        "po_id": po_id,
        "finance_user_id": "user-fin-01",
        "payment_structure": "PART_BY_PART",
        "advance_percentage": 25.0,
        "notes": "Finance committee vetted commercial terms."
    }
    fin_app_resp = client.post("/api/v1/erp/finance/approve", json=fin_approve_payload)
    assert fin_app_resp.status_code == 200
    assert fin_app_resp.json()["status"] == "success"

    # Disburse advance payment
    advance_pay_payload = {
        "po_id": po_id,
        "stage_type": "ADVANCE",
        "amount_inr": 79520.0,
        "payment_method": "NEFT_RTGS",
        "transaction_ref": "HDFCR52026102700889900",
        "bank_name": "HDFC Corporate Bank"
    }
    adv_resp = client.post("/api/v1/erp/finance/payment", json=advance_pay_payload)
    assert adv_resp.status_code == 200
    assert adv_resp.json()["status"] == "success"

    # -------------------------------------------------------------
    # 7. Site Storekeeper Physical Delivery Inward (GRN)
    # -------------------------------------------------------------
    # Verify Store sees active dispatched PO
    store_pos_resp = client.get("/api/v1/erp/stores/pos/proj-demo-101")
    assert store_pos_resp.status_code == 200
    store_pos = store_pos_resp.json()
    target_store_po = next((p for p in store_pos if p["id"] == po_id), None)
    assert target_store_po is not None

    # Log Physical GRN
    grn_payload = {
        "po_id": po_id,
        "storekeeper_id": "user-store-01",
        "challan_number": "CHAL-2026-STEP6-01",
        "truck_number": "MH-04-AZ-9988",
        "received_quantity": 700.0,
        "damaged_quantity": 4.0,
        "challan_photo_url": "https://s3.ap-south-1.amazonaws.com/erp-docs/chal-step6.jpg"
    }
    grn_resp = client.post("/api/v1/erp/stores/grn", json=grn_payload)
    assert grn_resp.status_code == 200
    grn_data = grn_resp.json()
    assert grn_data["status"] == "success"
    assert grn_data["net_accepted_quantity"] == 696.0

    # -------------------------------------------------------------
    # 8. Two-Way Match Reconciliation & Order Settlement
    # -------------------------------------------------------------
    recon_payload = {
        "purchase_order_id": po_id,
        "invoice_number": "UTCL-TAX-INV-STEP6",
        "invoiced_quantity": 696.0,
        "invoiced_unit_rate": 454.40,
        "finance_user_id": "user-fin-01"
    }
    recon_resp = client.post("/api/v1/erp/reconciliation/invoice", json=recon_payload)
    assert recon_resp.status_code == 200
    recon_data = recon_resp.json()
    assert recon_data["status"] == "success"
    approved_payable = recon_data["data"]["approved_payable_amount"]
    balance_due = round(max(0.0, approved_payable - 79520.0), 2)

    # Final settlement disbursement
    settle_payload = {
        "po_id": po_id,
        "finance_user_id": "user-fin-01",
        "amount": balance_due,
        "payment_method": "NEFT_RTGS",
        "transaction_ref": "SBINR52026102700112233",
        "bank_name": "State Bank of India"
    }
    settle_resp = client.post("/api/v1/erp/reconciliation/settle", json=settle_payload)
    assert settle_resp.status_code == 200
    assert settle_resp.json()["data"]["is_fully_settled"] is True

    # -------------------------------------------------------------
    # 9. Corporate Admin & Live Warehouse Sync Audit
    # -------------------------------------------------------------
    users_resp = client.get("/api/v1/erp/users")
    assert users_resp.status_code == 200
    all_users = users_resp.json()
    assert len(all_users) >= 5

    report_resp = client.get("/api/v1/erp/reports/procurement/proj-demo-101")
    assert report_resp.status_code == 200
    rep = report_resp.json()["report"]
    assert len(rep["godown_inventory"]) > 0
