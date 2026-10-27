"""
BuildBharat ERP - Complete REST API Endpoints (FastAPI)
Includes automatic database table initialization, pre-seeded realistic master data,
and smart Swagger pre-filled defaults.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database.session import get_db
from .database.seed import init_db_and_seed
from .database.models import (
    User, UserRole, Project, ProjectStatus, BOQItemModel, MaterialRequirementModel,
    Vendor, RFQPackageModel, VendorBidModel, PurchaseOrderModel,
    PaymentStageType, PaymentMethod, PaymentTransactionModel,
    GoodsReceiptNoteModel, SiteInventoryModel,
    InvoiceReconciliationStatus, VendorInvoiceModel,
    RFQStatus, FinanceApprovalStatus, PaymentStructure
)
from .database.verification_service import verify_boq_item, verify_all_project_items, can_dispatch_procurement
from .procurement.procurement_service import (
    decompose_verified_boq_to_materials, create_rfq_package, submit_vendor_bid,
    get_comparative_statement, manager_recommend_vendor
)
from .procurement.finance_approval_service import (
    finance_approve_po, finance_reject_po, record_po_payment,
    receive_goods_at_site, get_po_financial_summary
)
from .procurement.settlement_service import (
    reconcile_vendor_invoice, execute_final_po_settlement,
    generate_project_procurement_report, generate_financial_expenditure_report,
    generate_vendor_ledger_report
)

# Automatically initialize database schema and realistic test data on import
init_db_and_seed()


class UpdateBOQItemRequest(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_rate: Optional[float] = None

class CreateBOQItemRequest(BaseModel):
    project_id: str = "proj-demo-101"
    wbs_code: str = "GEN-001"
    description: str
    unit: str = "NOS"
    quantity: float = 1.0
    unit_rate: float = 0.0

erp_router = APIRouter(prefix="/api/v1/erp", tags=["BuildBharat ERP Core"])

# ==================== Pydantic Schemas with Realistic Defaults ====================

class VerifyBOQItemRequest(BaseModel):
    item_id: str = Field("boq-item-101", description="BOQ item ID to verify")
    verified_by_user_id: str = Field("user-pm-01", description="Project Manager user ID")

class VerifyAllBOQRequest(BaseModel):
    project_id: str = Field("proj-demo-101", description="Project ID for bulk verification")
    verified_by_user_id: str = Field("user-pm-01", description="Project Manager user ID")

class DecomposeMaterialRequest(BaseModel):
    project_id: str = Field("proj-demo-101", description="Project ID to decompose")

class CreateRFQRequest(BaseModel):
    project_id: str = Field("proj-demo-101", description="Project ID")
    material_name: str = Field("OPC 53 Cement (C-101)", description="Material package name")
    required_quantity: float = Field(1331.0, description="Quantity required")
    uom: str = Field("BAG", description="Unit of measurement")
    expires_in_hours: int = Field(72, description="RFQ validity in hours")

class SubmitBidRequest(BaseModel):
    rfq_id: str = Field(..., description="Target RFQ package ID")
    vendor_id: str = Field("vendor-ultra-01", description="Bidding vendor ID")
    base_unit_rate: float = Field(340.0, description="Base rate per unit excluding taxes")
    freight_unit_rate: float = Field(15.0, description="Freight per unit to project site")
    gst_percentage: float = Field(28.0, description="GST % (e.g. 28% for cement, 18% for steel)")

class ManagerRecommendRequest(BaseModel):
    rfq_id: str = Field(..., description="RFQ package ID")
    selected_bid_id: str = Field(..., description="Selected winning vendor bid ID")
    manager_user_id: str = Field("user-pm-01", description="Project Manager ID")
    manager_notes: Optional[str] = Field("Recommended L1 lowest landed quote with confirmed 24h batch plant dispatch", description="Technical recommendation note")

class FinanceApproveRequest(BaseModel):
    po_id: str = Field(..., description="Target Purchase Order ID")
    finance_user_id: str = Field("user-fin-01", description="Finance Approver ID")
    payment_structure: str = Field("PART_BY_PART", description="ADVANCE_ONLY or PART_BY_PART")
    advance_percentage: float = Field(25.0, description="Percentage of advance (0 - 100)")
    notes: Optional[str] = Field("Finance clearance granted for Terminal 2 footing package", description="Approval remarks")

class FinanceRejectRequest(BaseModel):
    po_id: str = Field(..., description="Target Purchase Order ID")
    finance_user_id: str = Field("user-fin-01", description="Finance Approver ID")
    rejection_reason: str = Field(..., description="Reason for audit budget rejection")

class RecordPaymentRequest(BaseModel):
    po_id: str = Field(..., description="Target Purchase Order ID")
    finance_user_id: str = Field("user-fin-01", description="Finance user ID")
    stage_type: str = Field("ADVANCE", description="ADVANCE, PART_PAYMENT_1, PART_PAYMENT_2, FINAL_BALANCE")
    amount_inr: float = Field(..., description="Amount disbursed in INR")
    payment_method: str = Field("NEFT_RTGS", description="NEFT_RTGS, CHEQUE, UPI, CASH")
    transaction_ref: str = Field("HDFCR52026102600881234", description="Bank UTR or Cheque Number")
    bank_name: str = Field("HDFC Corporate Bank", description="Originating Bank Name")

class SiteGRNRequest(BaseModel):
    po_id: str = Field(..., description="Target Purchase Order ID")
    storekeeper_id: str = Field("user-store-01", description="Site Storekeeper user ID")
    challan_number: str = Field("CHAL-2026-0091", description="Transporter Delivery Challan Number")
    truck_number: str = Field("MH-04-AZ-9988", description="Commercial Truck Vehicle Registration")
    received_quantity: float = Field(700.0, description="Gross quantity delivered")
    damaged_quantity: float = Field(0.0, description="Quantity rejected / damaged in transit")
    challan_photo_url: str = Field("https://s3.ap-south-1.amazonaws.com/erp-docs/chal-0091.jpg", description="Photo proof URL of physical challan")

class ReconcileInvoiceRequest(BaseModel):
    purchase_order_id: str = Field(..., description="Target Purchase Order ID")
    invoice_number: str = Field("UTCL-TAX-INV-88910", description="Vendor Tax Invoice Number")
    invoiced_quantity: float = Field(700.0, description="Quantity claimed on tax invoice")
    invoiced_unit_rate: float = Field(454.40, description="Unit rate claimed on invoice")
    finance_user_id: str = Field("user-fin-01", description="Finance Auditor ID")

class FinalSettlementRequest(BaseModel):
    po_id: str = Field(..., description="Target Purchase Order ID")
    finance_user_id: str = Field("user-fin-01", description="Finance user ID")
    amount: float = Field(..., description="Settlement amount in INR")
    payment_method: str = Field("NEFT_RTGS", description="NEFT_RTGS or CHEQUE")
    transaction_ref: str = Field("SBINR52026102600987654", description="Bank UTR / RTGS reference")
    bank_name: str = Field("State Bank of India", description="Disbursing Bank Name")

# ==================== 0. Demo Helpers ====================

@erp_router.get("/demo-ids")
def api_get_demo_ids():
    """Returns valid seeded master IDs to copy-paste into Swagger UI."""
    return {
        "tenant_id": "tenant-demo-1",
        "company_name": "Larsen & Toubro Construction Ltd",
        "users": {
            "project_manager": {"id": "user-pm-01", "name": "Rajesh Sharma", "role": "OPERATIONS"},
            "head_of_finance": {"id": "user-fin-01", "name": "Sunita Iyer", "role": "FINANCE"},
            "site_storekeeper": {"id": "user-store-01", "name": "Ramesh Pawar", "role": "SITE_STORE"}
        },
        "project": {"id": "proj-demo-101", "name": "Navi Mumbai International Airport - Terminal 2"},
        "draft_boq_item": {"id": "boq-item-101", "description": "M25 RCC Footings (120 CUM)"},
        "vendors": [
            {"id": "vendor-ultra-01", "name": "Ultratech Cement Ltd"},
            {"id": "vendor-ambuja-01", "name": "Ambuja Cements Ltd"}
        ]
    }

# ==================== 1. BOQ Verification Endpoints ====================

@erp_router.post("/boq/verify")
def api_verify_boq_item(req: VerifyBOQItemRequest, db: Session = Depends(get_db)):
    """Project Manager signs off on a specific BOQ item."""
    try:
        item = verify_boq_item(db, req.item_id, req.verified_by_user_id)
        return {
            "status": "success",
            "message": f"BOQ Item '{item.wbs_code}' verified successfully by Project Manager.",
            "item_id": item.id,
            "wbs_code": item.wbs_code,
            "description": item.description,
            "quantity": item.quantity,
            "unit": item.unit,
            "is_verified": item.is_verified,
            "verified_by_user_id": item.verified_by_user_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/boq/verify-all")
def api_verify_all_boq(req: VerifyAllBOQRequest, db: Session = Depends(get_db)):
    """Bulk signoff of all draft BOQ items in a project."""
    try:
        count = verify_all_project_items(db, req.project_id, req.verified_by_user_id)
        return {"status": "success", "message": f"Successfully verified {count} BOQ item(s).", "verified_items_count": count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.get("/boq/can-dispatch/{project_id}")
def api_can_dispatch(project_id: str, db: Session = Depends(get_db)):
    """Check if all project BOQ items are verified for procurement."""
    try:
        can_proceed, unverified = can_dispatch_procurement(db, project_id)
        return {
            "status": "success",
            "project_id": project_id,
            "can_dispatch_procurement": can_proceed,
            "unverified_items": unverified
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== 2. Procurement & RFQ Endpoints ====================

@erp_router.post("/procurement/decompose")
def api_decompose_material(req: DecomposeMaterialRequest, db: Session = Depends(get_db)):
    """Decompose verified BOQ items into raw materials via Indian Standard IS 456 formulas."""
    try:
        raw_res = decompose_verified_boq_to_materials(db, req.project_id)
        res = [{"id": m.id, "material_name": m.material_name, "quantity": m.required_quantity, "uom": m.unit} for m in raw_res]
        return {"status": "success", "decomposed_materials": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/procurement/rfq")
def api_create_rfq(req: CreateRFQRequest, db: Session = Depends(get_db)):
    """Create an RFQ package with 72h expiry and unique vendor magic tokens."""
    try:
        rfq = create_rfq_package(db, req.project_id, req.material_name, req.required_quantity, req.uom, req.expires_in_hours)
        return {
            "status": "success",
            "rfq_id": rfq.id,
            "rfq_code": rfq.rfq_code,
            "material_name": rfq.material_name,
            "quantity": rfq.required_quantity,
            "uom": rfq.uom,
            "status": rfq.status.value
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/procurement/bids")
def api_submit_bid(req: SubmitBidRequest, db: Session = Depends(get_db)):
    """Vendor submits bid; computes landed cost per unit."""
    try:
        bid = submit_vendor_bid(db, req.rfq_id, req.vendor_id, req.base_unit_rate, req.freight_unit_rate, req.gst_percentage)
        return {
            "status": "success",
            "bid_id": bid.id,
            "base_unit_rate": bid.base_unit_rate,
            "freight_unit_rate": bid.freight_unit_rate,
            "gst_percentage": bid.gst_percentage,
            "landed_cost_per_unit": bid.landed_cost_per_unit
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.get("/procurement/comparative/{rfq_id}")
def api_comparative_statement(rfq_id: str, db: Session = Depends(get_db)):
    """Generate dynamic L1/L2/L3 vendor comparative quote ranking."""
    try:
        res = get_comparative_statement(db, rfq_id)
        return {"status": "success", "comparative_ranking": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/procurement/recommend")
def api_manager_recommend(req: ManagerRecommendRequest, db: Session = Depends(get_db)):
    """Project Manager recommends vendor quote. PO is generated but remains locked until Finance approves."""
    try:
        po = manager_recommend_vendor(db, req.rfq_id, req.selected_bid_id, req.manager_user_id, req.manager_notes)
        return {
            "status": "success",
            "po_id": po.id,
            "po_number": po.po_number,
            "material_name": po.material_name,
            "quantity": po.quantity,
            "uom": po.uom,
            "total_landed_amount_inr": po.total_landed_amount_inr,
            "finance_approval_status": po.finance_approval_status.value,
            "is_dispatched_to_vendor": po.is_dispatched_to_vendor
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== 3. Mandatory Finance Approval Gate ====================

@erp_router.post("/finance/approve")
def api_finance_approve(req: FinanceApproveRequest, db: Session = Depends(get_db)):
    """Finance approves procurement budget, sets payment terms (Advance vs Part-by-Part), and unlocks PO dispatch."""
    try:
        payment_mode_enum = PaymentStructure(req.payment_structure)
        po = finance_approve_po(db, req.po_id, req.finance_user_id, payment_mode_enum, req.advance_percentage, req.notes or "")
        summary = get_po_financial_summary(db, po.id)
        return {"status": "success", "po_summary": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/finance/reject")
def api_finance_reject(req: FinanceRejectRequest, db: Session = Depends(get_db)):
    """Finance rejects proposed PO with audit reason."""
    try:
        po = finance_reject_po(db, req.po_id, req.finance_user_id, req.rejection_reason)
        return {"status": "success", "po_id": po.id, "finance_approval_status": po.finance_approval_status.value, "rejection_reason": po.finance_rejection_reason}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/finance/payment")
def api_record_payment(req: RecordPaymentRequest, db: Session = Depends(get_db)):
    """Record manual bank payment transaction (Bank UTR / RTGS / Cheque Number)."""
    try:
        stage_enum = PaymentStageType(req.stage_type)
        method_enum = PaymentMethod(req.payment_method)
        txn = record_po_payment(db, req.po_id, req.finance_user_id, stage_enum, req.amount_inr, method_enum, req.transaction_ref, req.bank_name)
        return {
            "status": "success",
            "transaction_id": txn.id,
            "stage_type": txn.stage_type.value,
            "amount_inr": txn.amount_inr,
            "payment_method": txn.payment_method.value,
            "transaction_ref": txn.transaction_ref,
            "bank_name": txn.bank_name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== 4. Site Store Physical GRN Delivery ====================

@erp_router.post("/stores/grn")
def api_site_grn(req: SiteGRNRequest, db: Session = Depends(get_db)):
    """Site storekeeper logs incoming delivery against dispatched PO with challan photo and increments warehouse stock."""
    try:
        grn = receive_goods_at_site(
            db, req.po_id, req.storekeeper_id, req.challan_number,
            req.truck_number, req.received_quantity, req.challan_photo_url, req.damaged_quantity
        )
        return {
            "status": "success",
            "grn_id": grn.id,
            "challan_number": grn.challan_number,
            "truck_number": grn.truck_number,
            "received_quantity": grn.received_quantity,
            "damaged_quantity": grn.damaged_quantity,
            "net_accepted_quantity": grn.received_quantity - (grn.damaged_quantity or 0.0)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== 5. Two-Way Match Settlement & Order Closure ====================

@erp_router.post("/reconciliation/invoice")
def api_reconcile_invoice(req: ReconcileInvoiceRequest, db: Session = Depends(get_db)):
    """Two-way matching: PO landed rate <-> Site Store net GRN accepted qty <-> Vendor Invoice."""
    try:
        data = {
            "purchase_order_id": req.purchase_order_id,
            "invoice_number": req.invoice_number,
            "invoiced_quantity": req.invoiced_quantity,
            "invoiced_unit_rate": req.invoiced_unit_rate
        }
        res = reconcile_vendor_invoice(db, data, req.finance_user_id)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/reconciliation/settle")
def api_final_settle(req: FinalSettlementRequest, db: Session = Depends(get_db)):
    """Execute final balance settlement payment (UTR recorded) and mark PO as FULLY_SETTLED."""
    try:
        data = {
            "amount": req.amount,
            "payment_method": req.payment_method,
            "transaction_ref": req.transaction_ref,
            "bank_name": req.bank_name
        }
        res = execute_final_po_settlement(db, req.po_id, data, req.finance_user_id)
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== 6. Operational & Financial Reports ====================

@erp_router.get("/reports/procurement/{project_id}")
def api_report_procurement(project_id: str, db: Session = Depends(get_db)):
    """Project Procurement Status Report: ordered vs delivered materials, commitments & godown inventory."""
    try:
        res = generate_project_procurement_report(db, project_id)
        return {"status": "success", "report": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.get("/reports/expenditure/{project_id}")
def api_report_expenditure(project_id: str, db: Session = Depends(get_db)):
    """Executive Financial Cash Outflow & Accounts Payable Report."""
    try:
        res = generate_financial_expenditure_report(db, project_id)
        return {"status": "success", "report": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.get("/reports/vendor-ledger/{vendor_id}")
def api_report_vendor_ledger(vendor_id: str, db: Session = Depends(get_db)):
    """Vendor Commercial Ledger: issued POs, deliveries, paid amounts with UTR references, and balance due."""
    try:
        res = generate_vendor_ledger_report(db, vendor_id)
        return {"status": "success", "report": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Portal & Multi-Entity Endpoints ====================

@erp_router.get("/users")
def api_list_users(db: Session = Depends(get_db)):
    """List all entity users and roles for department login and profile switching."""
    users = db.query(User).all()
    return [{
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role.value
    } for u in users]

@erp_router.get("/boq/items/{project_id}")
def api_get_project_boq_items(project_id: str, db: Session = Depends(get_db)):
    """Fetch all BOQ items for the Project Manager to review, inspect, and edit."""
    items = db.query(BOQItemModel).filter(BOQItemModel.project_id == project_id).all()
    return [{
        "id": item.id,
        "wbs_code": item.wbs_code,
        "description": item.description,
        "quantity": item.quantity,
        "unit": item.unit,
        "unit_rate": item.unit_rate,
        "total_amount": round(item.quantity * (item.unit_rate or 0.0), 2),
        "is_verified": item.is_verified,
        "verified_by_user_id": item.verified_by_user_id
    } for item in items]

@erp_router.put("/boq/item/{item_id}")
def api_update_boq_item(item_id: str, req: UpdateBOQItemRequest, db: Session = Depends(get_db)):
    """Project Manager edits a BOQ item line (quantity, rate, or description) if takeoff needs correction."""
    item = db.query(BOQItemModel).filter(BOQItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ item not found")
    if req.description is not None:
        item.description = req.description
    if req.quantity is not None:
        item.quantity = req.quantity
    if req.unit is not None:
        item.unit = req.unit
    if req.unit_rate is not None:
        item.unit_rate = req.unit_rate
    db.commit()
    db.refresh(item)
    return {
        "status": "success",
        "message": f"BOQ item '{item.wbs_code}' updated successfully",
        "item": {
            "id": item.id,
            "wbs_code": item.wbs_code,
            "description": item.description,
            "quantity": item.quantity,
            "unit": item.unit,
            "unit_rate": item.unit_rate,
            "total_amount": round(item.quantity * item.unit_rate, 2),
            "is_verified": item.is_verified
        }
    }

@erp_router.post("/boq/item")
def api_create_boq_item(req: CreateBOQItemRequest, db: Session = Depends(get_db)):
    """Project Manager adds a manual BOQ line item to the project."""
    import uuid
    item = BOQItemModel(
        id=f"boq-{uuid.uuid4().hex[:8]}",
        project_id=req.project_id,
        wbs_code=req.wbs_code,
        description=req.description,
        unit=req.unit,
        quantity=req.quantity,
        unit_rate=req.unit_rate,
        is_verified=False
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"status": "success", "item_id": item.id, "wbs_code": item.wbs_code}

@erp_router.delete("/boq/item/{item_id}")
def api_delete_boq_item(item_id: str, db: Session = Depends(get_db)):
    """Project Manager deletes an erroneous BOQ line item."""
    item = db.query(BOQItemModel).filter(BOQItemModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOQ item not found")
    db.delete(item)
    db.commit()
    return {"status": "success", "deleted_item_id": item_id}

@erp_router.get("/vendors")
def api_get_vendors_directory(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns vendor phone directory with phone numbers, cities, and categories for interns/PMs to call."""
    query = db.query(Vendor)
    if category:
        query = query.filter(Vendor.category.ilike(f"%{category}%"))
    vendors = query.all()
    return [{
        "id": v.id,
        "name": v.vendor_name,
        "category": v.category,
        "phone": v.phone,
        "city": v.city,
        "gstin": v.gstin
    } for v in vendors]

@erp_router.get("/finance/pending")
def api_get_finance_pending_pos(db: Session = Depends(get_db)):
    """Returns all Purchase Orders awaiting Finance Department budget clearance."""
    pos = db.query(PurchaseOrderModel).filter(
        PurchaseOrderModel.finance_approval_status == FinanceApprovalStatus.PENDING_FINANCE_APPROVAL
    ).all()
    return [{
        "id": po.id,
        "po_number": po.po_number,
        "material_name": po.material_name,
        "quantity": po.quantity,
        "uom": po.uom,
        "unit_rate": po.landed_unit_rate,
        "total_amount": po.total_landed_amount_inr,
        "vendor_name": po.vendor.vendor_name if po.vendor else "Unknown Vendor",
        "manager_notes": po.manager_notes,
        "status": po.finance_approval_status.value,
        "created_at": po.created_at.isoformat() if po.created_at else None
    } for po in pos]

@erp_router.get("/notifications/pm/{project_id}")
def api_get_pm_notifications(project_id: str, db: Session = Depends(get_db)):
    """Returns rejection notices or approval alerts for the Project Manager."""
    rejected_pos = db.query(PurchaseOrderModel).filter(
        PurchaseOrderModel.project_id == project_id,
        PurchaseOrderModel.finance_approval_status == FinanceApprovalStatus.REJECTED
    ).all()
    approved_pos = db.query(PurchaseOrderModel).filter(
        PurchaseOrderModel.project_id == project_id,
        PurchaseOrderModel.finance_approval_status == FinanceApprovalStatus.APPROVED
    ).all()

    notifications = []
    for po in rejected_pos:
        notifications.append({
            "type": "REJECTED_BY_FINANCE",
            "po_id": po.id,
            "po_number": po.po_number,
            "title": f"Bill Proposal #{po.po_number} Declined by Finance",
            "message": f"Finance rejected PO for {po.material_name} (₹{po.total_landed_amount_inr:,.2f}). Reason: {po.finance_rejection_reason or 'Budget constraint'}",
            "created_at": po.created_at.isoformat() if po.created_at else None
        })
    for po in approved_pos:
        notifications.append({
            "type": "APPROVED_BY_FINANCE",
            "po_id": po.id,
            "po_number": po.po_number,
            "title": f"PO #{po.po_number} Approved & Dispatched",
            "message": f"Finance approved budget for {po.material_name}. Advance {po.advance_percentage}%. PO dispatched to vendor.",
            "created_at": po.dispatched_at.isoformat() if po.dispatched_at else None
        })
    return notifications

@erp_router.get("/stores/pos/{project_id}")
def api_get_stores_dispatched_pos(project_id: str, db: Session = Depends(get_db)):
    """Returns all dispatched POs available for Site Storekeeper physical receiving."""
    pos = db.query(PurchaseOrderModel).filter(
        PurchaseOrderModel.project_id == project_id,
        PurchaseOrderModel.is_dispatched_to_vendor == True
    ).all()
    res = []
    for po in pos:
        net_grn = sum((grn.received_quantity - (grn.damaged_quantity or 0.0)) for grn in po.goods_receipts)
        res.append({
            "id": po.id,
            "po_number": po.po_number,
            "material_name": po.material_name,
            "ordered_quantity": po.quantity,
            "uom": po.uom,
            "net_received_quantity": net_grn,
            "pending_delivery_quantity": max(0.0, round(po.quantity - net_grn, 3)),
            "vendor_name": po.vendor.vendor_name if po.vendor else "Unknown Vendor",
            "is_fully_settled": po.is_fully_settled
        })
    return res
