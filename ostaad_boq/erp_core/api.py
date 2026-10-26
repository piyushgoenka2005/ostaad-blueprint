"""
BuildBharat ERP - Complete REST API Endpoints (FastAPI)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database.session import get_db
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

erp_router = APIRouter(prefix="/api/v1/erp", tags=["BuildBharat ERP Core"])

# ==================== Pydantic Schemas ====================

class VerifyBOQItemRequest(BaseModel):
    item_id: str
    verified_by_user_id: str

class VerifyAllBOQRequest(BaseModel):
    project_id: str
    verified_by_user_id: str

class DecomposeMaterialRequest(BaseModel):
    project_id: str

class CreateRFQRequest(BaseModel):
    project_id: str
    material_name: str
    required_quantity: float
    uom: str
    expires_in_hours: int = 72

class SubmitBidRequest(BaseModel):
    rfq_id: str
    vendor_id: str
    base_unit_rate: float
    freight_unit_rate: float = 0.0
    gst_percentage: float = 18.0

class ManagerRecommendRequest(BaseModel):
    rfq_id: str
    selected_bid_id: str
    manager_user_id: str
    manager_notes: Optional[str] = "Recommended lowest landed quote"

class FinanceApproveRequest(BaseModel):
    po_id: str
    finance_user_id: str
    payment_structure: str = Field("PART_BY_PART", description="ADVANCE_ONLY or PART_BY_PART")
    advance_percentage: float = Field(20.0, description="Percentage of advance (0 - 100)")
    notes: Optional[str] = ""

class FinanceRejectRequest(BaseModel):
    po_id: str
    finance_user_id: str
    rejection_reason: str

class RecordPaymentRequest(BaseModel):
    po_id: str
    finance_user_id: str
    stage_type: str = Field("ADVANCE", description="ADVANCE, PART_PAYMENT_1, PART_PAYMENT_2, FINAL_BALANCE")
    amount_inr: float
    payment_method: str = Field("NEFT_RTGS", description="NEFT_RTGS, CHEQUE, UPI, CASH")
    transaction_ref: str = Field(..., description="Bank UTR or Cheque Number")
    bank_name: str

class SiteGRNRequest(BaseModel):
    po_id: str
    storekeeper_id: str
    challan_number: str
    truck_number: str
    received_quantity: float
    damaged_quantity: float = 0.0
    challan_photo_url: str

class ReconcileInvoiceRequest(BaseModel):
    purchase_order_id: str
    invoice_number: str
    invoiced_quantity: float
    invoiced_unit_rate: float
    finance_user_id: str

class FinalSettlementRequest(BaseModel):
    po_id: str
    finance_user_id: str
    amount: float
    payment_method: str = "NEFT_RTGS"
    transaction_ref: str
    bank_name: str

# ==================== 1. BOQ Verification Endpoints ====================

@erp_router.post("/boq/verify")
def api_verify_boq_item(req: VerifyBOQItemRequest, db: Session = Depends(get_db)):
    """Project Manager signs off on a specific BOQ item."""
    try:
        item = verify_boq_item(db, req.item_id, req.verified_by_user_id)
        return {"status": "success", "item_id": item.id, "is_verified": item.is_verified}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@erp_router.post("/boq/verify-all")
def api_verify_all_boq(req: VerifyAllBOQRequest, db: Session = Depends(get_db)):
    """Bulk signoff of all draft BOQ items in a project."""
    try:
        count = verify_all_project_items(db, req.project_id, req.verified_by_user_id)
        return {"status": "success", "verified_items_count": count}
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
