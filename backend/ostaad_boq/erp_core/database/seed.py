"""
BuildBharat ERP - Automatic Demo Seeding & Table Initialization
Seeds realistic Master Data (Tenant, Users with RBAC and secure passwords, Project, Multi-category BOQ Items, Multi-category Vendors)
so the Authentication System, Managing Authority, Finance Department, Site Storekeeper, and Admin portals are immediately interactive.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from .session import engine, Base, SessionLocal
from .models import Tenant, User, UserRole, Project, ProjectStatus, BOQItemModel, Vendor
from ..auth import hash_password

def init_db_and_seed():
    # 1. Create all tables if not exist
    Base.metadata.create_all(bind=engine)

    # 2. Check and apply lightweight schema migration for existing SQLite DBs
    with engine.connect() as conn:
        try:
            # Check if password_hash exists on users table
            res = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in res.fetchall()]
            if "password_hash" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            if "phone" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
            conn.commit()
        except Exception as e:
            # Table might be empty or DB might not be SQLite
            pass

    # 3. Seed initial demo data
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

        # Users with distinct RBAC roles and pre-configured passwords
        demo_users = [
            {
                "id": "user-pm-01",
                "email": "rajesh.pm@lt.com",
                "full_name": "Rajesh Sharma",
                "role": UserRole.OPERATIONS,
                "password": "pm123456",
                "phone": "+91 98201 12233"
            },
            {
                "id": "user-fin-01",
                "email": "sunita.finance@lt.com",
                "full_name": "Sunita Iyer",
                "role": UserRole.FINANCE,
                "password": "fin123456",
                "phone": "+91 98202 33445"
            },
            {
                "id": "user-store-01",
                "email": "ramesh.store@lt.com",
                "full_name": "Ramesh Pawar",
                "role": UserRole.SITE_STORE,
                "password": "store123456",
                "phone": "+91 98203 55667"
            },
            {
                "id": "admin-01",
                "email": "admin@buildbharat.in",
                "full_name": "Aditya Verma",
                "role": UserRole.ADMIN,
                "password": "admin123456",
                "phone": "+91 98200 99887"
            }
        ]

        for u_data in demo_users:
            user = db.query(User).filter_by(email=u_data["email"]).first()
            if not user:
                user = User(
                    id=u_data["id"],
                    tenant_id=tenant.id,
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    password_hash=hash_password(u_data["password"]),
                    phone=u_data["phone"],
                    is_active=True
                )
                db.add(user)
            else:
                # Update password_hash and phone if missing
                if not user.password_hash:
                    user.password_hash = hash_password(u_data["password"])
                if not user.phone:
                    user.phone = u_data["phone"]
                user.role = u_data["role"]
                user.full_name = u_data["full_name"]

        # Demo Project
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

        # Multi-category realistic vendors
        vendors_data = [
            {"id": "vendor-ultra-01", "name": "Ultratech Cement Ltd", "gstin": "27AAACU1234F1Z5", "phone": "9820123456", "city": "Mumbai", "cat": "Cement"},
            {"id": "vendor-ambuja-01", "name": "Ambuja Cements Ltd", "gstin": "27AAAAC1234A1Z2", "phone": "9820654321", "city": "Navi Mumbai", "cat": "Cement"},
            {"id": "vendor-acc-01", "name": "ACC Limited (Holcim)", "gstin": "27AAACA9999K1Z3", "phone": "9820111222", "city": "Thane", "cat": "Cement"},
            {"id": "vendor-tata-01", "name": "Tata Tiscon Rebars (Tata Steel)", "gstin": "27AAACT5555M1Z8", "phone": "9820333444", "city": "Mumbai", "cat": "Steel"},
            {"id": "vendor-jsw-01", "name": "JSW Steel Neosteel Ltd", "gstin": "27AAACJ4444N1Z9", "phone": "9820444555", "city": "Vasai", "cat": "Steel"},
            {"id": "vendor-brick-01", "name": "Panvel Clay & Red Bricks Depot", "gstin": "27AAACP7777Q1Z4", "phone": "9820777888", "city": "Panvel", "cat": "Bricks"},
            {"id": "vendor-flyash-01", "name": "Maharashtra Flyash Eco Bricks", "gstin": "27AAACM8888P1Z6", "phone": "9820888999", "city": "Taloja", "cat": "Bricks"},
            {"id": "vendor-sand-01", "name": "Raigad River Sand & Aggregates Supplier", "gstin": "27AAACR3333L1Z7", "phone": "9820999000", "city": "Pen", "cat": "Aggregates"}
        ]

        for v in vendors_data:
            if not db.query(Vendor).filter_by(id=v["id"]).first():
                db.add(Vendor(
                    id=v["id"],
                    tenant_id=tenant.id,
                    vendor_name=v["name"],
                    gstin=v["gstin"],
                    phone=v["phone"],
                    city=v["city"],
                    category=v["cat"]
                ))

        # Multi-category BOQ Items
        boq_items = [
            {
                "id": "boq-item-101",
                "wbs_code": "C-101",
                "desc": "M25 Grade Reinforced Cement Concrete for Substructure Footings and Columns",
                "unit": "CUM",
                "qty": 120.0,
                "rate": 6500.0
            },
            {
                "id": "boq-item-102",
                "wbs_code": "S-201",
                "desc": "High Yield Strength Deformed Fe 550D TMT Reinforcement Steel Bars",
                "unit": "MT",
                "qty": 14.5,
                "rate": 68500.0
            },
            {
                "id": "boq-item-103",
                "wbs_code": "B-301",
                "desc": "Class 7.5 Burnt Clay Brickwork in Cement Mortar 1:6 in Substructure & Plinth",
                "unit": "CUM",
                "qty": 45.0,
                "rate": 4200.0
            },
            {
                "id": "boq-item-104",
                "wbs_code": "P-401",
                "desc": "15mm Thick Cement Plaster 1:4 on Rough Side of Single Brick Wall",
                "unit": "SQM",
                "qty": 350.0,
                "rate": 320.0
            }
        ]

        for item in boq_items:
            if not db.query(BOQItemModel).filter_by(id=item["id"]).first():
                db.add(BOQItemModel(
                    id=item["id"],
                    project_id=project.id,
                    wbs_code=item["wbs_code"],
                    description=item["desc"],
                    unit=item["unit"],
                    quantity=item["qty"],
                    unit_rate=item["rate"],
                    is_verified=False
                ))

        db.commit()
    finally:
        db.close()
