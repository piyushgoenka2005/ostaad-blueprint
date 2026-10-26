"""
Unit Tests for BuildBharat ERP Milestone 1: Database, RBAC & Verification Gate
"""
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ostaad_boq.erp_core.database.session import Base
from ostaad_boq.erp_core.database.models import (
    Tenant, User, UserRole, Project, ProjectStatus, BOQItemModel, MaterialRequirementModel
)
from ostaad_boq.erp_core.database.verification_service import (
    verify_boq_item, verify_all_project_items, can_dispatch_procurement, VerificationGateError
)

@pytest.fixture
def db_session():
    """In-memory SQLite session for fast isolated unit testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_tenant_creation_with_valid_gstin(db_session):
    # Valid Maharashtra GSTIN (state 27)
    tenant = Tenant(
        company_name="Larsen Construction Pvt Ltd",
        gstin="27ABCDE1234F1Z5",
        state_code="27",
    )
    db_session.add(tenant)
    db_session.commit()

    saved = db_session.query(Tenant).filter_by(gstin="27ABCDE1234F1Z5").first()
    assert saved is not None
    assert saved.company_name == "Larsen Construction Pvt Ltd"

def test_tenant_creation_with_invalid_gstin_raises_error(db_session):
    with pytest.raises(ValueError, match="Invalid Indian GSTIN format"):
        tenant = Tenant(
            company_name="Fraud Builders",
            gstin="INVALID_GSTIN_123",
            state_code="19",
        )
        db_session.add(tenant)
        db_session.commit()

def test_project_and_unverified_boq_creation(db_session):
    tenant = Tenant(
        company_name="Bengal Infra Developers",
        gstin="19ABCDE1234F1Z5",
        state_code="19",
    )
    db_session.add(tenant)
    db_session.commit()

    project = Project(
        tenant_id=tenant.id,
        project_name="Barakar Residential G+3",
        district="Paschim Bardhaman",
        state="West Bengal",
        contract_value_inr=15000000.0,
    )
    db_session.add(project)
    db_session.commit()

    item1 = BOQItemModel(
        project_id=project.id,
        wbs_code="1.01",
        description="Substructure Earthwork Excavation",
        unit="CUM",
        quantity=150.0,
        is_verified=False,
    )
    item2 = BOQItemModel(
        project_id=project.id,
        wbs_code="2.01",
        description="M20 Grade Reinforced Cement Concrete",
        unit="CUM",
        quantity=85.0,
        is_verified=False,
    )
    db_session.add_all([item1, item2])
    db_session.commit()

    # Gate check: cannot dispatch procurement while unverified
    can_dispatch, unverified = can_dispatch_procurement(db_session, project.id)
    assert can_dispatch is False
    assert len(unverified) == 2
    assert unverified[0]["wbs_code"] == "1.01"

def test_unauthorized_user_cannot_verify_boq(db_session):
    tenant = Tenant(company_name="ABC Builders", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    project = Project(tenant_id=tenant.id, project_name="Site 1", district="Pune", state="Maharashtra")
    db_session.add(project)
    db_session.commit()

    # Storekeeper user lacks verification permission
    store_user = User(
        tenant_id=tenant.id,
        email="storekeeper@abc.com",
        full_name="Mohan Lal",
        role=UserRole.SITE_STORE,
    )
    item = BOQItemModel(project_id=project.id, wbs_code="1.01", description="Brickwork", unit="CUM", quantity=20.0)
    db_session.add_all([store_user, item])
    db_session.commit()

    with pytest.raises(VerificationGateError, match="lacks permission"):
        verify_boq_item(db_session, item.id, store_user.id)

def test_authorized_engineer_verifies_boq_and_unlocks_procurement(db_session):
    tenant = Tenant(company_name="Apex Constructions", gstin="27ABCDE1234F1Z5", state_code="27")
    db_session.add(tenant)
    db_session.commit()

    # Operations Engineer with permission
    eng_user = User(
        tenant_id=tenant.id,
        email="engineer@apex.com",
        full_name="Vikram Sen",
        role=UserRole.OPERATIONS,
    )
    project = Project(tenant_id=tenant.id, project_name="Commercial Tower", district="Mumbai", state="Maharashtra")
    db_session.add_all([eng_user, project])
    db_session.commit()

    item1 = BOQItemModel(project_id=project.id, wbs_code="1.01", description="Excavation", unit="CUM", quantity=100.0)
    item2 = BOQItemModel(project_id=project.id, wbs_code="2.01", description="PCC 1:4:8", unit="CUM", quantity=40.0)
    db_session.add_all([item1, item2])
    db_session.commit()

    # Initial gate: blocked
    assert can_dispatch_procurement(db_session, project.id)[0] is False

    # Batch verify all items by engineer
    verified_count = verify_all_project_items(db_session, project.id, eng_user.id)
    assert verified_count == 2

    # Gate check: now cleared!
    can_dispatch, unverified = can_dispatch_procurement(db_session, project.id)
    assert can_dispatch is True
    assert len(unverified) == 0

    # Verify audit timestamp and verifier recorded
    refreshed_item = db_session.query(BOQItemModel).filter_by(id=item1.id).first()
    assert refreshed_item.is_verified is True
    assert refreshed_item.verified_by_user_id == eng_user.id
    assert refreshed_item.verified_at is not None
