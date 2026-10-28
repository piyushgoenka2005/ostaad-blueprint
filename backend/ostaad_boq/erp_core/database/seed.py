"""Initialize the local database and retain only authentication bootstrap data."""

from sqlalchemy import text

from .models import Tenant, User, UserRole
from .session import Base, SessionLocal, engine
from ..auth import hash_password


def init_db_and_seed():
    """Create tables and ensure role accounts exist without seeding business data."""
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        try:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "password_hash" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            if "phone" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
            po_columns = [row[1] for row in conn.execute(text("PRAGMA table_info(purchase_orders)")).fetchall()]
            if "finance_clarification_reason" not in po_columns:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN finance_clarification_reason TEXT"))
            if "finance_clarification_at" not in po_columns:
                conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN finance_clarification_at DATETIME"))
            conn.commit()
        except Exception:
            pass

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter_by(id="tenant-demo-1").first()
        if not tenant:
            tenant = Tenant(
                id="tenant-demo-1",
                company_name="BuildBharat Construction",
                gstin="27AAACL1234F1Z1",
                state_code="27",
            )
            db.add(tenant)
            db.commit()

        accounts = [
            ("user-pm-01", "rajesh.pm@lt.com", "Rajesh Sharma", UserRole.OPERATIONS, "pm123456", "+91 98201 12233"),
            ("user-fin-01", "sunita.finance@lt.com", "Sunita Iyer", UserRole.FINANCE, "fin123456", "+91 98202 33445"),
            ("user-store-01", "ramesh.store@lt.com", "Ramesh Pawar", UserRole.SITE_STORE, "store123456", "+91 98203 55667"),
            ("admin-01", "admin@buildbharat.in", "Aditya Verma", UserRole.ADMIN, "admin123456", "+91 98200 99887"),
        ]
        for user_id, email, full_name, role, password, phone in accounts:
            user = db.query(User).filter_by(email=email).first()
            if not user:
                db.add(User(
                    id=user_id,
                    tenant_id=tenant.id,
                    email=email,
                    full_name=full_name,
                    role=role,
                    password_hash=hash_password(password),
                    phone=phone,
                    is_active=True,
                ))

        db.commit()
    finally:
        db.close()
