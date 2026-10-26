"""
Manual Payment Tracking (UTR, Cheque, RTGS)
"""
from dataclasses import dataclass
from datetime import date
from typing import Optional

@dataclass
class PaymentEntry:
    entry_id: str
    po_id: str
    payment_stage: str     # ADVANCE, MILESTONE_1, FINAL_BALANCE
    amount_inr: float
    payment_method: str    # NEFT_RTGS, CHEQUE, UPI
    transaction_ref: str   # Bank UTR / Cheque No
    bank_name: str
    payment_date: str
    recorded_by: str
