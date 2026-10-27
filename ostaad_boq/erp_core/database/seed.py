"""
BuildBharat ERP - Automatic Demo Seeding & Table Initialization
Seeds realistic Master Data (Tenant, Users with RBAC, Project, Multi-category BOQ Items, Multi-category Vendors)
so the Managing Authority, Finance Department, and Site Storekeeper portals are immediately interactive.
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

        # Users with distinct RBAC roles
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

        if not db.query(User).filter_by(id="admin-01").first():
            db.add(User(
                id="admin-01",
                tenant_id=tenant.id,
                email="admin@buildbharat.in",
                full_name="Aditya Verma (Corporate Admin)",
                role=UserRole.ADMIN
            ))

        # Project
        project = db.query(Project).filter_by(id="proj-demo-101").first()
        if not project:
            project = Project(
                id="proj-demo-101",
                tenant_id=tenant.id,
                project_name="Navi Mumbai International Airport - Terminal 2 (Zone A)",
                district="Raigad",
                state="Maharashtra",
                contract_value_inr=250000000.0,
                status=ProjectStatus.ACTIVE
            )
            db.add(project)

        # Multi-Category Vendors Directory with Contact Phone Numbers
        vendors_data = [
            # Cement Vendors
            ("vendor-ultra-01", "Ultratech Cement Ltd", "27AAACU1234F1Z5", "+91 98201 23456", "Mumbai", "Cement"),
            ("vendor-ambuja-01", "Ambuja Cements Ltd", "27AAAAC1234A1Z2", "+91 98206 54321", "Navi Mumbai", "Cement"),
            ("vendor-acc-01", "ACC Cement Depot", "27AAACA1234K1Z8", "+91 98211 44556", "Thane", "Cement"),
            
            # Steel Vendors
            ("vendor-tata-01", "Tata Tiscon 550D Rebars Ltd", "27AAACT1234M1Z9", "+91 98190 11223", "Pune", "Steel"),
            ("vendor-jsw-01", "JSW Steel Neosteel", "27AAACJ1234F1Z8", "+91 98200 77889", "Mumbai", "Steel"),
            
            # Brick Vendors
            ("vendor-brick-01", "Panvel Standard Clay Bricks Depot", "27AAACB1234P1Z3", "+91 98330 99881", "Panvel", "Bricks"),
            ("vendor-flyash-01", "Maharashtra Flyash Eco Bricks", "27AAACM1234E1Z4", "+91 98110 55667", "Thane", "Bricks"),
            
            # Sand & Aggregates
            ("vendor-sand-01", "Raigad River Sand & Aggregates Quarry", "27AAACR1234Q1Z6", "+91 98212 88990", "Raigad", "Aggregates & Sand"),
        ]

        for v_id, name, gstin, phone, city, cat in vendors_data:
            if not db.query(Vendor).filter_by(id=v_id).first():
                db.add(Vendor(
                    id=v_id,
                    tenant_id=tenant.id,
                    vendor_name=name,
                    gstin=gstin,
                    phone=phone,
                    city=city,
                    category=cat
                ))

        # Sample Initial BOQ Items (Concrete, Steel, Brickwork)
        boq_data = [
            ("boq-item-101", "C-101", "M25 Grade Reinforced Cement Concrete for Substructure Footings & Columns", "CUM", 120.0, 6500.0),
            ("boq-item-102", "S-201", "High-Yield Fe 550D TMT Reinforcement Steel Bars including cutting & bending", "MT", 18.5, 68000.0),
            ("boq-item-103", "B-301", "Standard Modular Red Clay Brick Masonry in Cement Mortar 1:6 in Substructure", "CUM", 45.0, 4800.0),
            ("boq-item-104", "P-401", "20mm Internal Cement Sand Plaster 1:4 with Neeru Finish", "SQM", 380.0, 260.0),
        ]

        for b_id, wbs, desc, uom, qty, rate in boq_data:
            if not db.query(BOQItemModel).filter_by(id=b_id).first():
                db.add(BOQItemModel(
                    id=b_id,
                    project_id="proj-demo-101",
                    wbs_code=wbs,
                    description=desc,
                    unit=uom,
                    quantity=qty,
                    unit_rate=rate,
                    is_verified=False
                ))

        db.commit()
    finally:
        db.close()
