"""
Manual Engineer Verification Gate & Procurement Clearance Service
Enforces strict gatekeeping: No unverified BOQ item can proceed to RFQ/procurement.
"""
from datetime import datetime
from typing import Tuple, List, Dict, Any
from sqlalchemy.orm import Session
from .models import BOQItemModel, Project, User, UserRole

class VerificationGateError(Exception):
    pass

def verify_boq_item(db: Session, item_id: str, verifier_user_id: str) -> BOQItemModel:
    """
    Enables designated engineer to verify and sign-off an individual BOQ quantity item.
    """
    user = db.query(User).filter(User.id == verifier_user_id).first()
    if not user:
        raise VerificationGateError(f"Verifier user '{verifier_user_id}' does not exist.")
    if user.role not in [UserRole.OPERATIONS, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise VerificationGateError(f"User role '{user.role}' lacks permission to verify BOQ quantities.")

    item = db.query(BOQItemModel).filter(BOQItemModel.id == item_id).first()
    if not item:
        raise VerificationGateError(f"BOQ Item '{item_id}' not found.")

    item.is_verified = True
    item.verified_by_user_id = verifier_user_id
    item.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item

def verify_all_project_items(db: Session, project_id: str, verifier_user_id: str) -> int:
    """
    Batch verification of all draft BOQ items for a given project.
    """
    user = db.query(User).filter(User.id == verifier_user_id).first()
    if not user or user.role not in [UserRole.OPERATIONS, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise VerificationGateError("Unauthorized user role for BOQ verification.")

    items = db.query(BOQItemModel).filter(
        BOQItemModel.project_id == project_id,
        BOQItemModel.is_verified == False
    ).all()

    count = 0
    now = datetime.utcnow()
    for item in items:
        item.is_verified = True
        item.verified_by_user_id = verifier_user_id
        item.verified_at = now
        count += 1

    db.commit()
    return count

def can_dispatch_procurement(db: Session, project_id: str) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    MANDATORY GATE: Checks whether all BOQ items for the project are verified.
    Returns (True, []) if clear.
    Returns (False, [unverified_items]) if blocked.
    """
    unverified = db.query(BOQItemModel).filter(
        BOQItemModel.project_id == project_id,
        BOQItemModel.is_verified == False
    ).all()

    if not unverified:
        return True, []

    return False, [
        {"item_id": item.id, "wbs_code": item.wbs_code, "description": item.description, "quantity": item.quantity}
        for item in unverified
    ]
