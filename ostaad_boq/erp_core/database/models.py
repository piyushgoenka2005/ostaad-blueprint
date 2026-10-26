"""
Relational Database Models for BuildBharat ERP (Milestones 1 & 2)
Supports multi-tenancy, RBAC roles, verified BOQ entities, vendor RFQs, bidding, and financial approval gates
"""
import re
import uuid
from datetime import datetime, timedelta
from enum import Enum
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
)
from sqlalchemy.orm import relationship, validates
from .session import Base

GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"

class UserRole(str, Enum):
    OPERATIONS = "OPERATIONS"
    FINANCE = "FINANCE"
    SITE_STORE = "SITE_STORE"
    LABOUR = "LABOUR"
    ADMIN = "ADMIN"
    SUPERADMIN = "SUPERADMIN"

class ProjectStatus(str, Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"

class RFQStatus(str, Enum):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    BIDS_RECEIVED = "BIDS_RECEIVED"
    CLOSED = "CLOSED"

class FinanceApprovalStatus(str, Enum):
    PENDING_FINANCE_APPROVAL = "PENDING_FINANCE_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class PaymentStructure(str, Enum):
    ADVANCE_ONLY = "ADVANCE_ONLY"
    PART_BY_PART = "PART_BY_PART"
    ON_DELIVERY_CREDIT = "ON_DELIVERY_CREDIT"

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String(200), nullable=False)
    gstin = Column(String(15), nullable=False, unique=True)
    pan_number = Column(String(10), nullable=True)
    state_code = Column(String(2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="tenant", cascade="all, delete-orphan")
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    vendors = relationship("Vendor", back_populates="tenant", cascade="all, delete-orphan")

    @validates("gstin")
    def validate_gstin(self, key, gstin_value):
        gstin_clean = gstin_value.strip().upper()
        if not re.match(GSTIN_REGEX, gstin_clean):
            raise ValueError(f"Invalid Indian GSTIN format: '{gstin_value}'. Must be 15 alphanumeric characters matching BIS/GST standards.")
        return gstin_clean

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    full_name = Column(String(150), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.OPERATIONS, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    project_name = Column(String(200), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    contract_value_inr = Column(Float, default=0.0)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="projects")
    boq_items = relationship("BOQItemModel", back_populates="project", cascade="all, delete-orphan")
    material_requirements = relationship("MaterialRequirementModel", back_populates="project", cascade="all, delete-orphan")
    rfq_packages = relationship("RFQPackageModel", back_populates="project", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrderModel", back_populates="project", cascade="all, delete-orphan")

class BOQItemModel(Base):
    __tablename__ = "boq_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    wbs_code = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_rate = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
    verified_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="boq_items")
    verifier = relationship("User")

class MaterialRequirementModel(Base):
    __tablename__ = "material_requirements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    material_name = Column(String(150), nullable=False)  # e.g. 'OPC 53 Cement', 'Fe 550D TMT Steel'
    required_quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    status = Column(String(50), default="DRAFT")         # DRAFT, RFQ_SENT, PO_APPROVED
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="material_requirements")

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    vendor_name = Column(String(200), nullable=False)
    gstin = Column(String(15), nullable=False)
    phone = Column(String(20), nullable=False)
    city = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)       # Cement, Steel, Bricks, Aggregates
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="vendors")
    bids = relationship("VendorBidModel", back_populates="vendor")
    purchase_orders = relationship("PurchaseOrderModel", back_populates="vendor")

class RFQPackageModel(Base):
    __tablename__ = "rfq_packages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    rfq_code = Column(String(50), nullable=False, unique=True)
    material_name = Column(String(150), nullable=False)
    required_quantity = Column(Float, nullable=False)
    uom = Column(String(20), nullable=False)
    status = Column(SQLEnum(RFQStatus), default=RFQStatus.DRAFT, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="rfq_packages")
    bids = relationship("VendorBidModel", back_populates="rfq", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrderModel", back_populates="rfq")

class VendorBidModel(Base):
    __tablename__ = "vendor_bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rfq_id = Column(String(36), ForeignKey("rfq_packages.id"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=False)
    base_unit_rate = Column(Float, nullable=False)
    freight_unit_rate = Column(Float, default=0.0)
    gst_percentage = Column(Float, default=18.0)
    landed_cost_per_unit = Column(Float, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    rfq = relationship("RFQPackageModel", back_populates="bids")
    vendor = relationship("Vendor", back_populates="bids")

class PurchaseOrderModel(Base):
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    rfq_id = Column(String(36), ForeignKey("rfq_packages.id"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("vendors.id"), nullable=False)
    selected_bid_id = Column(String(36), ForeignKey("vendor_bids.id"), nullable=False)
    po_number = Column(String(50), nullable=False, unique=True)
    material_name = Column(String(150), nullable=False)
    quantity = Column(Float, nullable=False)
    uom = Column(String(20), nullable=False)
    landed_unit_rate = Column(Float, nullable=False)
    total_landed_amount_inr = Column(Float, nullable=False)
    
    # Manager Recommendation
    manager_recommended_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    manager_notes = Column(Text, nullable=True)

    # Mandatory Finance Approval Gate
    finance_approval_status = Column(SQLEnum(FinanceApprovalStatus), default=FinanceApprovalStatus.PENDING_FINANCE_APPROVAL, nullable=False)
    finance_approver_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    finance_rejection_reason = Column(Text, nullable=True)
    payment_structure = Column(SQLEnum(PaymentStructure), nullable=True)
    advance_percentage = Column(Float, default=0.0)

    # Dispatch Lock
    is_dispatched_to_vendor = Column(Boolean, default=False)
    dispatched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="purchase_orders")
    rfq = relationship("RFQPackageModel", back_populates="purchase_orders")
    vendor = relationship("Vendor", back_populates="purchase_orders")
    manager = relationship("User", foreign_keys=[manager_recommended_by_id])
    finance_approver = relationship("User", foreign_keys=[finance_approver_id])
