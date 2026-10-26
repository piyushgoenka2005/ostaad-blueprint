"""
Mandatory Finance Budget Clearance Gate & Payment Structure Engine
Enforces: Manager Recommendation -> Finance Approval Gate -> Vendor PO
"""
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any

class PaymentMode(str, Enum):
    ADVANCE_ONLY = "ADVANCE_ONLY"
    PART_BY_PART = "PART_BY_PART"
    ON_DELIVERY_CREDIT = "ON_DELIVERY_CREDIT"

class FinanceApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

@dataclass
class PurchaseOrderProposal:
    po_id: str
    project_id: str
    rfq_id: str
    vendor_id: str
    vendor_name: str
    material_name: str
    quantity: float
    landed_unit_rate: float
    manager_recommended: bool = True
    manager_notes: str = ""
    status: FinanceApprovalStatus = FinanceApprovalStatus.PENDING
    finance_approver: Optional[str] = None
    finance_notes: Optional[str] = None
    payment_mode: Optional[PaymentMode] = None
    advance_percentage: float = 0.0

    @property
    def total_amount(self) -> float:
        return round(self.quantity * self.landed_unit_rate, 2)

    @property
    def advance_amount(self) -> float:
        return round(self.total_amount * (self.advance_percentage / 100.0), 2)

    @property
    def balance_amount(self) -> float:
        return round(self.total_amount - self.advance_amount, 2)

    def finance_approve(self, approver_name: str, payment_mode: PaymentMode, advance_pct: float = 0.0, notes: str = "") -> None:
        self.status = FinanceApprovalStatus.APPROVED
        self.finance_approver = approver_name
        self.payment_mode = payment_mode
        self.advance_percentage = advance_pct
        self.finance_notes = notes

    def finance_reject(self, approver_name: str, reason: str) -> None:
        self.status = FinanceApprovalStatus.REJECTED
        self.finance_approver = approver_name
        self.finance_notes = reason
