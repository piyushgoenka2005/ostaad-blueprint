from fastapi.testclient import TestClient

from ostaad_boq.app import app
from ostaad_boq.erp_core.database.models import BOQItemModel, Project
from ostaad_boq.erp_core.database.session import SessionLocal

client = TestClient(app)


def test_project_can_be_created_from_takeoff_lines():
    response = client.post(
        "/api/v1/erp/projects/from-takeoff",
        json={
            "project_name": "Fresh Blueprint Project",
            "district": "Pune",
            "state": "Maharashtra",
            "lines": [
                {
                    "item_description": "Measured concrete slab",
                    "category": "Structural",
                    "quantity": 12.5,
                    "unit": "CUM",
                    "unit_cost": 6500,
                }
            ],
        },
    )
    assert response.status_code == 200
    project_id = response.json()["project_id"]

    db = SessionLocal()
    try:
        project = db.query(Project).filter_by(id=project_id).first()
        item = db.query(BOQItemModel).filter_by(project_id=project_id).first()
        assert project is not None
        assert project.project_name == "Fresh Blueprint Project"
        assert item is not None
        assert item.description == "Measured concrete slab"
        assert item.quantity == 12.5
        assert item.is_verified is False
    finally:
        db.delete(item)
        db.delete(project)
        db.commit()
        db.close()
