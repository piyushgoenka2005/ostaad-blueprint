"""
BuildBharat ERP - Milestone 4: Two-Way Match Settlement Engine & Operational Reporting
Enforces:
1. Two-Way Match (PO Landed Rate <-> Site Store Physical GRN Accepted Qty <-> Vendor Final Invoice)
2. Final Balance Settlement with UTR / Cheque Recording
3. Purchase Order Closure (FULLY_SETTLED)
4. Operational & Financial Executive Reporting (Procurement Status, Cash Flow Outflow, Vendor Ledgers)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from ..database.models import (
    User, UserRole, Project, PurchaseOrderModel, VendorInvoiceModel,
    InvoiceReconciliationStatus, GoodsReceiptNoteModel, PaymentTransactionModel,
    PaymentStageType, PaymentMethod, FinanceApprovalStatus, SiteInventoryModel, Vendor, BOQItemModel
)

def _verify_finance_role(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise PermissionError(f"User {user_id} not found")
    allowed_roles = {UserRole.FINANCE, UserRole.ADMIN, UserRole.SUPERADMIN}
    if user.role not in allowed_roles:
        raise PermissionError(f"User role {user.role.value} is not authorized for finance settlement actions")
    return user

def reconcile_vendor_invoice(db: Session, invoice_data: Dict[str, Any], finance_user_id: str) -> Dict[str, Any]:
    """
    Performs 2-way matching between PO contract, Site Store physical GRNs, and Vendor Invoice.
    Caps approved unit rate at PO landed rate.
    Caps approved payable quantity at physical net accepted GRN.
    """
    _verify_finance_role(db, finance_user_id)
    po_id = invoice_data["purchase_order_id"]
    po = db.query(PurchaseOrderModel).filter(PurchaseOrderModel.id == po_id).first()
    if not po:
        raise ValueError(f"Purchase order {po_id} not found")

    if po.finance_approval_status != FinanceApprovalStatus.APPROVED or not po.is_dispatched_to_vendor:
        raise ValueError(f"PO {po.po_number} is not approved by finance or dispatched to vendor")

    # 1. Calculate physical net accepted quantity from Site Store GRNs
    total_net_grn = sum((grn.received_quantity - (grn.damaged_quantity or 0.0)) for grn in po.goods_receipts)
    
    invoiced_qty = float(invoice_data["invoiced_quantity"])
    invoiced_rate = float(invoice_data["invoiced_unit_rate"])
    total_invoiced_amt = round(invoiced_qty * invoiced_rate, 2)
    
    reconciliation_status = InvoiceReconciliationStatus.MATCHED
    notes = []

    # 2. Check Unit Rate
    if invoiced_rate > po.landed_unit_rate + 0.001:
        reconciliation_status = InvoiceReconciliationStatus.RATE_DISCREPANCY
        approved_rate = po.landed_unit_rate
        notes.append(f"Invoiced rate Rs {invoiced_rate} exceeds contracted landed rate Rs {po.landed_unit_rate}. Capped at contracted rate.")
    else:
        approved_rate = invoiced_rate

    # 3. Check Quantity against physical Site Store GRNs
    if invoiced_qty > total_net_grn + 0.001:
        reconciliation_status = InvoiceReconciliationStatus.QUANTITY_DISCREPANCY
        approved_qty = total_net_grn
        notes.append(f"Invoiced quantity {invoiced_qty} exceeds physical site store net received {total_net_grn}. Capped at physical goods received.")
    else:
        approved_qty = invoiced_qty

    approved_payable = round(approved_qty * approved_rate, 2)
    variance_note_str = " | ".join(notes) if notes else "Invoice matches contracted rate and physical site store GRN."

    invoice = VendorInvoiceModel(
        purchase_order_id=po.id,
        invoice_number=invoice_data["invoice_number"],
        invoice_date=invoice_data.get("invoice_date", datetime.utcnow()),
        invoiced_quantity=invoiced_qty,
        invoiced_unit_rate=invoiced_rate,
        total_invoiced_amount=total_invoiced_amt,
        verified_payable_quantity=approved_qty,
        approved_payable_amount=approved_payable,
        reconciliation_status=reconciliation_status,
        variance_notes=variance_note_str
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "invoice_id": invoice.id,
        "po_number": po.po_number,
        "invoice_number": invoice.invoice_number,
        "reconciliation_status": invoice.reconciliation_status.value,
        "invoiced_quantity": invoiced_qty,
        "net_grn_accepted_quantity": total_net_grn,
        "approved_payable_quantity": approved_qty,
        "contracted_landed_rate": po.landed_unit_rate,
        "invoiced_unit_rate": invoiced_rate,
        "approved_unit_rate": approved_rate,
        "total_invoiced_amount": total_invoiced_amt,
        "approved_payable_amount": approved_payable,
        "variance_notes": variance_note_str
    }

def execute_final_po_settlement(db: Session, po_id: str, settlement_payment: Dict[str, Any], finance_user_id: str) -> Dict[str, Any]:
    """
    Executes the final settlement payment for a Purchase Order after 2-way reconciliation.
    Records manual UTR/RTGS/Cheque transaction and marks PO as FULLY_SETTLED.
    """
    _verify_finance_role(db, finance_user_id)
    po = db.query(PurchaseOrderModel).filter(PurchaseOrderModel.id == po_id).first()
    if not po:
        raise ValueError(f"Purchase order {po_id} not found")

    if po.is_fully_settled:
        raise ValueError(f"Purchase Order {po.po_number} is already fully settled")

    if po.finance_approval_status != FinanceApprovalStatus.APPROVED:
        raise ValueError(f"Cannot settle PO {po.po_number} without prior Finance budget approval")

    # Determine approved payable amount
    if po.invoices:
        total_approved_payable = sum(inv.approved_payable_amount for inv in po.invoices)
    else:
        # Fallback to physical net GRN * landed unit rate
        total_net_grn = sum((grn.received_quantity - (grn.damaged_quantity or 0.0)) for grn in po.goods_receipts)
        total_approved_payable = round(total_net_grn * po.landed_unit_rate, 2)

    total_paid_so_far = sum(p.amount_inr for p in po.payments)
    balance_due = round(max(0.0, total_approved_payable - total_paid_so_far), 2)

    payment_amount = float(settlement_payment["amount"])
    if payment_amount > balance_due + 0.05:
        raise ValueError(f"Settlement amount Rs {payment_amount} exceeds outstanding balance due Rs {balance_due}")

    payment_method_val = settlement_payment.get("payment_method", PaymentMethod.NEFT_RTGS.value)
    if isinstance(payment_method_val, PaymentMethod):
        payment_method_enum = payment_method_val
    else:
        payment_method_enum = PaymentMethod(payment_method_val)

    txn = PaymentTransactionModel(
        purchase_order_id=po.id,
        stage_type=PaymentStageType.FINAL_BALANCE,
        amount_inr=payment_amount,
        payment_method=payment_method_enum,
        transaction_ref=settlement_payment["transaction_ref"],
        bank_name=settlement_payment["bank_name"],
        recorded_by_user_id=finance_user_id
    )
    db.add(txn)

    # Check if fully paid
    new_total_paid = round(total_paid_so_far + payment_amount, 2)
    if new_total_paid >= total_approved_payable - 0.05:
        po.is_fully_settled = True
        po.settled_at = datetime.utcnow()
        for inv in po.invoices:
            inv.reconciliation_status = InvoiceReconciliationStatus.SETTLED

    db.commit()
    db.refresh(po)

    return {
        "po_id": po.id,
        "po_number": po.po_number,
        "transaction_id": txn.id,
        "stage": PaymentStageType.FINAL_BALANCE.value,
        "payment_method": payment_method_enum.value,
        "transaction_ref": txn.transaction_ref,
        "amount_paid": payment_amount,
        "cumulative_paid_inr": new_total_paid,
        "total_approved_payable_inr": total_approved_payable,
        "remaining_balance_inr": round(max(0.0, total_approved_payable - new_total_paid), 2),
        "is_fully_settled": po.is_fully_settled,
        "settled_at": po.settled_at.isoformat() if po.settled_at else None
    }

def generate_project_procurement_report(db: Session, project_id: str) -> Dict[str, Any]:
    """
    Operational Procurement & Delivery Status Report for a Project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    boq_items = db.query(BOQItemModel).filter(BOQItemModel.project_id == project_id).all()
    purchase_orders = db.query(PurchaseOrderModel).filter(PurchaseOrderModel.project_id == project_id).all()
    inventory = db.query(SiteInventoryModel).filter(SiteInventoryModel.project_id == project_id).all()

    total_committed_val = sum(po.total_landed_amount_inr for po in purchase_orders)
    total_disbursed_val = sum(sum(p.amount_inr for p in po.payments) for po in purchase_orders)

    po_summary = []
    for po in purchase_orders:
        net_grn = sum((grn.received_quantity - (grn.damaged_quantity or 0.0)) for grn in po.goods_receipts)
        total_paid = sum(p.amount_inr for p in po.payments)
        po_summary.append({
            "po_number": po.po_number,
            "material_name": po.material_name,
            "ordered_quantity": po.quantity,
            "uom": po.uom,
            "unit_rate": po.landed_unit_rate,
            "total_landed_amount": po.total_landed_amount_inr,
            "net_received_quantity": net_grn,
            "pending_delivery_quantity": max(0.0, round(po.quantity - net_grn, 3)),
            "paid_amount": total_paid,
            "is_dispatched": po.is_dispatched_to_vendor,
            "is_fully_settled": po.is_fully_settled
        })

    godown_stock = [{
        "material_name": item.material_name,
        "current_stock": item.current_stock,
        "uom": item.uom,
        "last_updated": item.last_updated.isoformat() if item.last_updated else None
    } for item in inventory]

    return {
        "project_id": project.id,
        "project_name": project.project_name,
        "district": project.district,
        "state": project.state,
        "boq_items_count": len(boq_items),
        "total_pos_issued": len(purchase_orders),
        "total_committed_inr": total_committed_val,
        "total_disbursed_inr": total_disbursed_val,
        "purchase_orders": po_summary,
        "godown_inventory": godown_stock
    }

def generate_financial_expenditure_report(db: Session, project_id: str) -> Dict[str, Any]:
    """
    Executive Financial Cash Outflow & Accounts Payable Report.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    purchase_orders = db.query(PurchaseOrderModel).filter(PurchaseOrderModel.project_id == project_id).all()
    
    total_committed = sum(po.total_landed_amount_inr for po in purchase_orders)
    total_advance_paid = 0.0
    total_part_payment_paid = 0.0
    total_final_balance_paid = 0.0

    for po in purchase_orders:
        for p in po.payments:
            if p.stage_type == PaymentStageType.ADVANCE:
                total_advance_paid += p.amount_inr
            elif p.stage_type in (PaymentStageType.PART_PAYMENT_1, PaymentStageType.PART_PAYMENT_2):
                total_part_payment_paid += p.amount_inr
            elif p.stage_type == PaymentStageType.FINAL_BALANCE:
                total_final_balance_paid += p.amount_inr

    total_actual_cash_outflow = round(total_advance_paid + total_part_payment_paid + total_final_balance_paid, 2)
    outstanding_liability = round(max(0.0, total_committed - total_actual_cash_outflow), 2)
    settled_pos_count = sum(1 for po in purchase_orders if po.is_fully_settled)

    return {
        "project_id": project.id,
        "project_name": project.project_name,
        "contract_value_inr": project.contract_value_inr,
        "total_pos_count": len(purchase_orders),
        "settled_pos_count": settled_pos_count,
        "active_pos_count": len(purchase_orders) - settled_pos_count,
        "total_committed_budget_inr": total_committed,
        "advance_disbursed_inr": round(total_advance_paid, 2),
        "part_payments_disbursed_inr": round(total_part_payment_paid, 2),
        "final_settlement_disbursed_inr": round(total_final_balance_paid, 2),
        "total_cash_outflow_inr": total_actual_cash_outflow,
        "outstanding_payables_inr": outstanding_liability
    }

def generate_vendor_ledger_report(db: Session, vendor_id: str) -> Dict[str, Any]:
    """
    Vendor Commercial Ledger: Tracks contracted POs, invoices, payments, and balances due.
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise ValueError(f"Vendor {vendor_id} not found")

    pos = db.query(PurchaseOrderModel).filter(PurchaseOrderModel.vendor_id == vendor_id).all()
    total_contracted_val = sum(po.total_landed_amount_inr for po in pos)
    
    all_payments = []
    total_paid_inr = 0.0
    for po in pos:
        for p in po.payments:
            total_paid_inr += p.amount_inr
            all_payments.append({
                "po_number": po.po_number,
                "stage": p.stage_type.value,
                "amount": p.amount_inr,
                "method": p.payment_method.value,
                "transaction_ref": p.transaction_ref,
                "bank_name": p.bank_name,
                "paid_date": p.paid_date.isoformat() if p.paid_date else None
            })

    total_invoiced_val = sum(sum(inv.total_invoiced_amount for inv in po.invoices) for po in pos)

    return {
        "vendor_id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "gstin": vendor.gstin,
        "city": vendor.city,
        "category": vendor.category,
        "total_pos_count": len(pos),
        "total_contracted_value_inr": total_contracted_val,
        "total_invoiced_value_inr": round(total_invoiced_val, 2),
        "total_paid_value_inr": round(total_paid_inr, 2),
        "balance_outstanding_inr": round(max(0.0, total_contracted_val - total_paid_inr), 2),
        "payment_transactions": all_payments
    }
