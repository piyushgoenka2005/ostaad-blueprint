"""
BuildBharat ERP - Automatic Demo Seeding & Table Initialization
Seeds initial realistic Master Data (Tenant, Users with RBAC, Project, BOQ Item, Vendors)
so Swagger UI (/docs) is immediately testable out-of-the-box.
"""
from sqlalchemy.orm import Session
from .session import engine, Base, SessionLocal
from .models import Tenant, User, UserRole, Project, ProjectStatus, BOQItemModel, Vendor

def init_db_and_seed():
    # 1. Create all tables if not exist
    Base.metadata.create_all(bind=engine)

    # 2. Seed initial demo data
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter_by(id="tenant-demo-1").first()
        if not tenant:
            tenant = Tenant(
                id="tenant-demo-1",
                company_name="Larsen & Toubro Construction Ltd",
                gstin="27AAACL1234F1Z1",
                state_code="27"
            )
            db.add(tenant)
            db.commit()

        if not db.query(User).filter_by(id="user-pm-01").first():
            db.add(User(
                id="user-pm-01",
                tenant_id=tenant.id,
                email="rajesh.pm@lt.com",
                full_name="Rajesh Sharma (Project Manager)",
                role=UserRole.OPERATIONS
            ))

        if not db.query(User).filter_by(id="user-fin-01").first():
            db.add(User(
                id="user-fin-01",
                tenant_id=tenant.id,
                email="sunita.finance@lt.com",
                full_name="Sunita Iyer (Head of Finance)",
                role=UserRole.FINANCE
            ))

        if not db.query(User).filter_by(id="user-store-01").first():
            db.add(User(
                id="user-store-01",
                tenant_id=tenant.id,
                email="ramesh.store@lt.com",
                full_name="Ramesh Pawar (Site Storekeeper)",
                role=UserRole.SITE_STORE
            ))

        project = db.query(Project).filter_by(id="proj-demo-101").first()
        if not project:
            project = Project(
                id="proj-demo-101",
                tenant_id=tenant.id,
                project_name="Navi Mumbai International Airport - Terminal 2",
                district="Raigad",
                state="Maharashtra",
                contract_value_inr=250000000.0,
                status=ProjectStatus.ACTIVE
            )
            db.add(project)

        if not db.query(Vendor).filter_by(id="vendor-ultra-01").first():
            db.add(Vendor(
                id="vendor-ultra-01",
                tenant_id=tenant.id,
                vendor_name="Ultratech Cement Ltd",
                gstin="27AAACU1234F1Z5",
                phone="9820123456",
                city="Mumbai",
                category="Cement"
            ))

        if not db.query(Vendor).filter_by(id="vendor-ambuja-01").first():
            db.add(Vendor(
                id="vendor-ambuja-01",
                tenant_id=tenant.id,
                vendor_name="Ambuja Cements Ltd",
                gstin="27AAAAC1234A1Z2",
                phone="9820654321",
                city="Navi Mumbai",
                category="Cement"
            ))

        if not db.query(BOQItemModel).filter_by(id="boq-item-101").first():
            db.add(BOQItemModel(
                id="boq-item-101",
                project_id="proj-demo-101",
                wbs_code="C-101",
                description="M25 Grade Reinforced Cement Concrete for Substructure Footings and Columns",
                unit="CUM",
                quantity=120.0,
                unit_rate=6500.0,
                is_verified=False
            ))

        db.commit()
    finally:
        db.close()
