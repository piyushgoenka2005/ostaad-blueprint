"""
Relational Database Models for BuildBharat ERP (Milestone 1)
Supports multi-tenancy, RBAC roles, verified BOQ entities, and Indian compliance
"""
import re
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, ForeignKey, Text, Enum as SQLEnum
)
from sqlalchemy.orm import relationship, validates
from .session import Base

# Indian 15-digit GSTIN Regex Pattern
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
