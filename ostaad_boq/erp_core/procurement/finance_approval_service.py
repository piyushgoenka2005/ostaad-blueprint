"""
Finance Approval Gate, Payment Scheduling & Site Store Goods Receiving Service (Milestone 3)
Enforces:
1. Mandatory Finance Clearance Gate (Manager Quote -> Finance Budget Approval -> PO Dispatched)
2. Flexible Payment Terms Engine (Advance vs Part-by-Part Milestones)
3. Manual Payment Logging (Bank UTR / Cheque / RTGS)
4. Site Store Material Inward (GRN Entry, Over-delivery bounds, Godown Stock update)
"""
import uuid
from datetime import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

from ..database.models import (
    PurchaseOrderModel, PaymentTransactionModel, GoodsReceiptNoteModel, SiteInventoryModel,
    FinanceApprovalStatus, PaymentStructure, PaymentStageType, PaymentMethod, User, UserRole
)

class FinanceError(Exception):
    pass

class StoreError(Exception):
    pass

def finance_approve_po(
    db: Session,
    po_id: str,
    finance_user_id: str,
    payment_mode: PaymentStructure,
    advance_percentage: float = 0.0,
    notes: str = ""
) -> PurchaseOrderModel:
    """
    MANDATORY FINANCE CLEARANCE GATE:
    Finance reviews the manager's recommended vendor, verifies project budget,
    sets payment structure (Advance vs Part-by-Part), and releases the PO for vendor dispatch.
    """
    user = db.query(User).filter_by(id=finance_user_id).first()
    if not user:
        raise FinanceError(f"User '{finance_user_id}' not found.")
    if user.role not in [UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise FinanceError(f"User role '{user.role}' lacks financial authority to approve purchase orders.")

    po = db.query(PurchaseOrderModel).filter_by(id=po_id).first()
    if not po:
        raise FinanceError(f"Purchase order '{po_id}' not found.")

    if advance_percentage < 0.0 or advance_percentage > 100.0:
        raise FinanceError("Advance percentage must be between 0% and 100%.")

    po.finance_approval_status = FinanceApprovalStatus.APPROVED
    po.finance_approver_id = finance_user_id
    po.payment_structure = payment_mode
    po.advance_percentage = advance_percentage
    po.is_dispatched_to_vendor = True
    po.dispatched_at = datetime.utcnow()

    db.commit()
    db.refresh(po)
    return po

def finance_reject_po(
    db: Session,
    po_id: str,
    finance_user_id: str,
    reason: str
) -> PurchaseOrderModel:
    """
    Finance rejects purchase order recommendation and returns it to manager with notes.
    """
    user = db.query(User).filter_by(id=finance_user_id).first()
    if not user or user.role not in [UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise FinanceError("Unauthorized user role for financial rejection.")

    po = db.query(PurchaseOrderModel).filter_by(id=po_id).first()
    if not po:
        raise FinanceError(f"Purchase order '{po_id}' not found.")

    po.finance_approval_status = FinanceApprovalStatus.REJECTED
    po.finance_approver_id = finance_user_id
    po.finance_rejection_reason = reason
    po.is_dispatched_to_vendor = False

    db.commit()
    db.refresh(po)
    return po

def record_po_payment(
    db: Session,
    po_id: str,
    finance_user_id: str,
    stage_type: PaymentStageType,
    amount_inr: float,
    payment_method: PaymentMethod,
    transaction_ref: str,
    bank_name: str
) -> PaymentTransactionModel:
    """
    Records a manual financial disbursement (UTR/RTGS/Cheque).
    Validates cumulative payments against PO total value.
    """
    user = db.query(User).filter_by(id=finance_user_id).first()
    if not user or user.role not in [UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise FinanceError("Unauthorized user role for recording payment transactions.")

    po = db.query(PurchaseOrderModel).filter_by(id=po_id).first()
    if not po:
        raise FinanceError(f"Purchase order '{po_id}' not found.")

    if po.finance_approval_status != FinanceApprovalStatus.APPROVED:
        raise FinanceError("Cannot record payment on a purchase order that is not approved by Finance.")

    if amount_inr <= 0:
        raise FinanceError("Payment amount must be greater than zero.")

    # Calculate cumulative payments
    existing_payments = db.query(PaymentTransactionModel).filter_by(purchase_order_id=po_id).all()
    current_paid_sum = sum(p.amount_inr for p in existing_payments)

    if round(current_paid_sum + amount_inr, 2) > po.total_landed_amount_inr:
        raise FinanceError(
            f"Cumulative payments (₹{current_paid_sum + amount_inr:,.2f}) exceed total PO amount (₹{po.total_landed_amount_inr:,.2f})."
        )

    txn = PaymentTransactionModel(
        purchase_order_id=po_id,
        stage_type=stage_type,
        amount_inr=round(amount_inr, 2),
        payment_method=payment_method,
        transaction_ref=transaction_ref.strip(),
        bank_name=bank_name.strip(),
        recorded_by_user_id=finance_user_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn

def receive_goods_at_site(
    db: Session,
    po_id: str,
    storekeeper_user_id: str,
    challan_number: str,
    truck_number: str,
    received_qty: float,
    challan_photo_url: str,
    damaged_qty: float = 0.0
) -> GoodsReceiptNoteModel:
    """
    Site storekeeper logs incoming material delivery on mobile.
    Validates PO status and 5% over-delivery limit, then increments godown stock.
    """
    user = db.query(User).filter_by(id=storekeeper_user_id).first()
    if not user:
        raise StoreError(f"User '{storekeeper_user_id}' not found.")
    if user.role not in [UserRole.SITE_STORE, UserRole.OPERATIONS, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise StoreError(f"User role '{user.role}' lacks authority to record site store goods receipts.")

    po = db.query(PurchaseOrderModel).filter_by(id=po_id).first()
    if not po:
        raise StoreError(f"Purchase order '{po_id}' not found.")

    if not po.is_dispatched_to_vendor:
        raise StoreError("Cannot receive goods for a purchase order that has not been approved and dispatched.")

    if received_qty <= 0:
        raise StoreError("Received quantity must be positive.")

    # Check over-delivery tolerance (maximum 5% excess allowed)
    prior_grns = db.query(GoodsReceiptNoteModel).filter_by(purchase_order_id=po_id).all()
    total_received_so_far = sum(g.received_quantity for g in prior_grns)

    max_allowable = po.quantity * 1.05
    if (total_received_so_far + received_qty) > max_allowable:
        raise StoreError(
            f"Over-delivery limit exceeded! Allowable limit is {max_allowable} {po.uom}, attempted: {total_received_so_far + received_qty} {po.uom}."
        )

    # Save GRN
    grn = GoodsReceiptNoteModel(
        purchase_order_id=po_id,
        challan_number=challan_number.strip(),
        truck_number=truck_number.strip().upper(),
        received_quantity=received_qty,
        damaged_quantity=damaged_qty,
        challan_photo_url=challan_photo_url.strip(),
        storekeeper_id=storekeeper_user_id,
    )
    db.add(grn)

    # Update or create Site Inventory Stock
    net_usable_qty = max(0.0, received_qty - damaged_qty)
    inv = db.query(SiteInventoryModel).filter_by(
        project_id=po.project_id,
        material_name=po.material_name
    ).first()

    if inv:
        inv.current_stock = round(inv.current_stock + net_usable_qty, 3)
        inv.last_updated = datetime.utcnow()
    else:
        inv = SiteInventoryModel(
            project_id=po.project_id,
            material_name=po.material_name,
            current_stock=round(net_usable_qty, 3),
            uom=po.uom,
        )
        db.add(inv)

    db.commit()
    db.refresh(grn)
    return grn

def get_po_financial_summary(db: Session, po_id: str) -> Dict[str, Any]:
    """
    Returns full commercial, payment, and delivery status for a PO.
    """
    po = db.query(PurchaseOrderModel).filter_by(id=po_id).first()
    if not po:
        raise FinanceError("PO not found.")

    payments = db.query(PaymentTransactionModel).filter_by(purchase_order_id=po_id).all()
    total_paid = sum(p.amount_inr for p in payments)
    balance_payable = max(0.0, round(po.total_landed_amount_inr - total_paid, 2))

    grns = db.query(GoodsReceiptNoteModel).filter_by(purchase_order_id=po_id).all()
    total_received = sum(g.received_quantity for g in grns)
    pending_delivery = max(0.0, round(po.quantity - total_received, 3))

    advance_due = round(po.total_landed_amount_inr * (po.advance_percentage / 100.0), 2)

    return {
        "po_number": po.po_number,
        "material_name": po.material_name,
        "total_amount_inr": po.total_landed_amount_inr,
        "status": po.finance_approval_status.value,
        "payment_structure": po.payment_structure.value if po.payment_structure else None,
        "advance_percentage": po.advance_percentage,
        "advance_amount_due": advance_due,
        "total_paid_inr": round(total_paid, 2),
        "balance_payable_inr": balance_payable,
        "ordered_quantity": po.quantity,
        "uom": po.uom,
        "total_received_quantity": round(total_received, 3),
        "pending_delivery_quantity": pending_delivery,
        "is_fully_received": total_received >= po.quantity,
        "is_fully_paid": total_paid >= po.total_landed_amount_inr,
    }
