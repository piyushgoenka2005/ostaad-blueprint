"""
Procurement & Vendor Bidding Service (Milestone 2)
Implements:
1. Indian Standard Material Decomposition (IS 456 / IS 1200) from verified BOQ
2. Dynamic Vendor RFQs & Landed Cost Calculation
3. L1 / L2 / L3 Comparative Statement
4. Manager Vendor Recommendation Gate (Routes to Finance Approval)
"""
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from ..database.models import (
    Project, BOQItemModel, MaterialRequirementModel, Vendor,
    RFQPackageModel, VendorBidModel, PurchaseOrderModel,
    RFQStatus, FinanceApprovalStatus, User, UserRole
)
from ..database.verification_service import can_dispatch_procurement, VerificationGateError
from ..materials.dry_mix_calculator import calculate_concrete_materials, calculate_brickwork_materials

class ProcurementError(Exception):
    pass

def decompose_verified_boq_to_materials(db: Session, project_id: str) -> List[MaterialRequirementModel]:
    """
    Decomposes verified BOQ civil items into raw material requirements using IS formulas:
    - Concrete (CUM) -> OPC 53 Cement (Bags), Sand (Brass), Aggregates (Brass)
    - Brickwork (CUM) -> Modular Bricks (Nos), Cement (Bags), Sand (Brass)
    Enforces gate: Fails if unverified items exist.
    """
    can_proceed, unverified = can_dispatch_procurement(db, project_id)
    if not can_proceed:
        raise ProcurementError(
            f"Cannot decompose materials for project '{project_id}'. {len(unverified)} BOQ items are unverified."
        )

    boq_items = db.query(BOQItemModel).filter(BOQItemModel.project_id == project_id).all()
    created_materials = []

    for item in boq_items:
        desc_lower = item.description.lower()
        # 1. Concrete Decomposition
        if "concrete" in desc_lower or "rcc" in desc_lower or "pcc" in desc_lower:
            grade = "M20"
            if "m25" in desc_lower:
                grade = "M25"
            elif "m15" in desc_lower or "pcc" in desc_lower:
                grade = "M15"

            decomp = calculate_concrete_materials(item.quantity, grade=grade)
            
            # Cement
            cement_req = MaterialRequirementModel(
                project_id=project_id,
                material_name=f"OPC 53 Cement ({item.wbs_code})",
                required_quantity=decomp["cement_bags"],
                unit="BAG",
                status="DRAFT"
            )
            # Sand
            sand_req = MaterialRequirementModel(
                project_id=project_id,
                material_name=f"Coarse Sand ({item.wbs_code})",
                required_quantity=decomp["sand_brass"],
                unit="BRASS",
                status="DRAFT"
            )
            # Aggregates
            agg_req = MaterialRequirementModel(
                project_id=project_id,
                material_name=f"20mm Coarse Aggregate ({item.wbs_code})",
                required_quantity=decomp["aggregate_brass"],
                unit="BRASS",
                status="DRAFT"
            )
            db.add_all([cement_req, sand_req, agg_req])
            created_materials.extend([cement_req, sand_req, agg_req])

        # 2. Brickwork Decomposition
        elif "brick" in desc_lower or "masonry" in desc_lower:
            decomp = calculate_brickwork_materials(item.quantity, mortar_ratio="1:6")
            brick_req = MaterialRequirementModel(
                project_id=project_id,
                material_name=f"Standard Modular Bricks ({item.wbs_code})",
                required_quantity=decomp["bricks_count"],
                unit="NOS",
                status="DRAFT"
            )
            mortar_cement = MaterialRequirementModel(
                project_id=project_id,
                material_name=f"OPC 43 Cement (Masonry {item.wbs_code})",
                required_quantity=decomp["cement_bags"],
                unit="BAG",
                status="DRAFT"
            )
            db.add_all([brick_req, mortar_cement])
            created_materials.extend([brick_req, mortar_cement])

    db.commit()
    return created_materials

def create_rfq_package(
    db: Session,
    project_id: str,
    material_name: str,
    required_quantity: float,
    uom: str,
    expiry_hours: int = 72
) -> RFQPackageModel:
    """
    Creates and dispatches an RFQ package for suppliers.
    """
    rfq_count = db.query(RFQPackageModel).filter_by(project_id=project_id).count()
    rfq_code = f"RFQ-{project_id[:6].upper()}-{rfq_count + 1:03d}"
    expires_at = datetime.utcnow() + timedelta(hours=expiry_hours)

    rfq = RFQPackageModel(
        project_id=project_id,
        rfq_code=rfq_code,
        material_name=material_name,
        required_quantity=required_quantity,
        uom=uom,
        status=RFQStatus.DISPATCHED,
        expires_at=expires_at,
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq

def generate_vendor_magic_link(rfq_id: str, vendor_id: str, base_url: str = "https://buildbharat.in/rfq") -> str:
    """
    Generates a secure anti-tamper bidding URL for WhatsApp / SMS dispatch.
    """
    payload = f"{rfq_id}:{vendor_id}:buildbharat_secret_salt"
    token = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"{base_url}?rfq={rfq_id}&vendor={vendor_id}&token={token}"

def submit_vendor_bid(
    db: Session,
    rfq_id: str,
    vendor_id: str,
    base_unit_rate: float,
    freight_unit_rate: float = 0.0,
    gst_percentage: float = 18.0
) -> VendorBidModel:
    """
    Records a live quotation submitted by a vendor via WhatsApp/Web link.
    Calculates landed cost: (Base Rate + Freight) * (1 + GST%).
    """
    rfq = db.query(RFQPackageModel).filter_by(id=rfq_id).first()
    if not rfq:
        raise ProcurementError(f"RFQ '{rfq_id}' not found.")
    
    if datetime.utcnow() > rfq.expires_at:
        raise ProcurementError(f"RFQ '{rfq.rfq_code}' has expired.")

    vendor = db.query(Vendor).filter_by(id=vendor_id).first()
    if not vendor:
        raise ProcurementError(f"Vendor '{vendor_id}' not found.")

    landed = round((base_unit_rate + freight_unit_rate) * (1.0 + (gst_percentage / 100.0)), 2)

    bid = VendorBidModel(
        rfq_id=rfq_id,
        vendor_id=vendor_id,
        base_unit_rate=base_unit_rate,
        freight_unit_rate=freight_unit_rate,
        gst_percentage=gst_percentage,
        landed_cost_per_unit=landed,
    )
    db.add(bid)
    rfq.status = RFQStatus.BIDS_RECEIVED
    db.commit()
    db.refresh(bid)
    return bid

def get_comparative_statement(db: Session, rfq_id: str) -> List[Dict[str, Any]]:
    """
    Generates an automated L1, L2, L3 comparative evaluation statement.
    Sorted strictly in ascending order of landed unit cost.
    """
    rfq = db.query(RFQPackageModel).filter_by(id=rfq_id).first()
    if not rfq:
        raise ProcurementError(f"RFQ '{rfq_id}' not found.")

    bids = db.query(VendorBidModel).filter_by(rfq_id=rfq_id).all()
    sorted_bids = sorted(bids, key=lambda b: b.landed_cost_per_unit)

    results = []
    for rank, bid in enumerate(sorted_bids, start=1):
        total_order_val = round(bid.landed_cost_per_unit * rfq.required_quantity, 2)
        results.append({
            "rank": f"L{rank}",
            "bid_id": bid.id,
            "vendor_id": bid.vendor.id,
            "vendor_name": bid.vendor.vendor_name,
            "city": bid.vendor.city,
            "base_rate": bid.base_unit_rate,
            "freight": bid.freight_unit_rate,
            "gst_pct": bid.gst_percentage,
            "landed_rate": bid.landed_cost_per_unit,
            "total_order_value_inr": total_order_val,
        })
    return results

def manager_recommend_vendor(
    db: Session,
    rfq_id: str,
    bid_id: str,
    manager_user_id: str,
    notes: str = ""
) -> PurchaseOrderModel:
    """
    Project Manager reviews comparative statement and selects the preferred vendor.
    MANDATORY GATE: Creates PO in PENDING_FINANCE_APPROVAL status.
    The order is NOT dispatched to the vendor until Finance approves it.
    """
    manager = db.query(User).filter_by(id=manager_user_id).first()
    if not manager:
        raise ProcurementError(f"User '{manager_user_id}' not found.")
    if manager.role not in [UserRole.OPERATIONS, UserRole.ADMIN, UserRole.SUPERADMIN]:
        raise ProcurementError(f"User role '{manager.role}' lacks authority to recommend procurement orders.")

    rfq = db.query(RFQPackageModel).filter_by(id=rfq_id).first()
    if not rfq:
        raise ProcurementError("RFQ not found.")

    bid = db.query(VendorBidModel).filter_by(id=bid_id).first()
    if not bid or bid.rfq_id != rfq_id:
        raise ProcurementError("Invalid bid selection for this RFQ.")

    total_amount = round(bid.landed_cost_per_unit * rfq.required_quantity, 2)
    po_count = db.query(PurchaseOrderModel).filter_by(project_id=rfq.project_id).count()
    po_number = f"PO-{rfq.project_id[:6].upper()}-{po_count + 1:04d}"

    po = PurchaseOrderModel(
        project_id=rfq.project_id,
        rfq_id=rfq_id,
        vendor_id=bid.vendor_id,
        selected_bid_id=bid.id,
        po_number=po_number,
        material_name=rfq.material_name,
        quantity=rfq.required_quantity,
        uom=rfq.uom,
        landed_unit_rate=bid.landed_cost_per_unit,
        total_landed_amount_inr=total_amount,
        manager_recommended_by_id=manager_user_id,
        manager_notes=notes,
        finance_approval_status=FinanceApprovalStatus.PENDING_FINANCE_APPROVAL,
        is_dispatched_to_vendor=False,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po
