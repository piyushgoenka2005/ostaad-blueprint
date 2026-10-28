import uuid

from fastapi.testclient import TestClient

from ostaad_boq.app import app
from ostaad_boq.erp_core.database.models import (
    BOQItemModel,
    GoodsReceiptNoteModel,
    MaterialRequirementModel,
    PaymentTransactionModel,
    Project,
    PurchaseOrderModel,
    RFQPackageModel,
    SiteInventoryModel,
    Vendor,
    VendorBidModel,
)
from ostaad_boq.erp_core.database.session import SessionLocal


client = TestClient(app)


def test_current_blueprint_to_site_inventory_lifecycle():
    suffix = uuid.uuid4().hex[:8]
    vendor_ids = []
    project_id = None
    po_id = None
    try:
        for category, name in [("Cement", f"Test Cement {suffix}"), ("Aggregates", f"Test Aggregate {suffix}")]:
            response = client.post(
                "/api/v1/erp/vendors",
                json={
                    "vendor_name": name,
                    "gstin": f"27TEST{suffix[:6].upper()}1Z1",
                    "phone": "+91 9876543210",
                    "city": "Pune",
                    "category": category,
                },
            )
            assert response.status_code == 200, response.text
            vendor_ids.append(response.json()["id"])

        import_response = client.post(
            "/api/v1/erp/projects/from-takeoff",
            json={
                "project_name": f"Lifecycle Project {suffix}",
                "district": "Pune",
                "state": "Maharashtra",
                "lines": [{
                    "item_description": "M25 reinforced concrete slab",
                    "category": "Structural",
                    "quantity": 10,
                    "unit": "CUM",
                    "unit_cost": 6500,
                }],
            },
        )
        assert import_response.status_code == 200, import_response.text
        project_id = import_response.json()["project_id"]

        boq_response = client.get(f"/api/v1/erp/boq/items/{project_id}")
        assert boq_response.status_code == 200
        assert len(boq_response.json()) == 1

        verify_response = client.post(
            "/api/v1/erp/boq/verify-all",
            json={"project_id": project_id, "verified_by_user_id": "user-pm-01"},
        )
        assert verify_response.status_code == 200, verify_response.text

        materials_response = client.post(
            "/api/v1/erp/procurement/decompose", json={"project_id": project_id}
        )
        assert materials_response.status_code == 200, materials_response.text
        material = materials_response.json()["decomposed_materials"][0]

        rfq_response = client.post(
            "/api/v1/erp/procurement/rfq",
            json={
                "project_id": project_id,
                "material_name": material["material_name"],
                "required_quantity": material["quantity"],
                "uom": material["uom"],
            },
        )
        assert rfq_response.status_code == 200, rfq_response.text
        rfq_id = rfq_response.json()["rfq_id"]

        bid_ids = []
        for vendor_id, rate in zip(vendor_ids, [500, 510]):
            bid_response = client.post(
                "/api/v1/erp/procurement/bids",
                json={
                    "rfq_id": rfq_id,
                    "vendor_id": vendor_id,
                    "base_unit_rate": rate,
                    "freight_unit_rate": 0,
                    "gst_percentage": 0,
                },
            )
            assert bid_response.status_code == 200, bid_response.text
            bid_ids.append(bid_response.json()["bid_id"])

        comparison_response = client.get(f"/api/v1/erp/procurement/comparative/{rfq_id}")
        assert comparison_response.status_code == 200
        assert comparison_response.json()["comparative_ranking"][0]["bid_id"] == bid_ids[0]

        recommend_response = client.post(
            "/api/v1/erp/procurement/recommend",
            json={
                "rfq_id": rfq_id,
                "selected_bid_id": bid_ids[0],
                "manager_user_id": "user-pm-01",
                "manager_notes": "Selected lowest manually recorded vendor quote.",
            },
        )
        assert recommend_response.status_code == 200, recommend_response.text
        po_id = recommend_response.json()["po_id"]
        assert recommend_response.json()["finance_approval_status"] == "PENDING_FINANCE_APPROVAL"
        assert recommend_response.json()["is_dispatched_to_vendor"] is False

        finance_response = client.get("/api/v1/erp/finance/orders")
        assert finance_response.status_code == 200
        assert next(item for item in finance_response.json() if item["id"] == po_id)["status"] == "PENDING_FINANCE_APPROVAL"

        approve_response = client.post(
            "/api/v1/erp/finance/approve",
            json={
                "po_id": po_id,
                "finance_user_id": "user-fin-01",
                "payment_structure": "PART_BY_PART",
                "advance_percentage": 0,
            },
        )
        assert approve_response.status_code == 200, approve_response.text

        store_response = client.get(f"/api/v1/erp/stores/pos/{project_id}")
        assert store_response.status_code == 200
        assert any(item["id"] == po_id for item in store_response.json())

        po_quantity = next(item["ordered_quantity"] for item in store_response.json() if item["id"] == po_id)
        grn_response = client.post(
            "/api/v1/erp/stores/grn",
            json={
                "po_id": po_id,
                "storekeeper_id": "user-store-01",
                "challan_number": f"CHAL-{suffix}",
                "truck_number": "MH-12-AB-1234",
                "received_quantity": min(po_quantity, 1),
                "damaged_quantity": 0,
                "challan_photo_url": "https://example.test/challan.jpg",
            },
        )
        assert grn_response.status_code == 200, grn_response.text
        assert grn_response.json()["net_accepted_quantity"] == min(po_quantity, 1)

        report_response = client.get(f"/api/v1/erp/reports/procurement/{project_id}")
        assert report_response.status_code == 200
        assert report_response.json()["report"]["godown_inventory"]
    finally:
        db = SessionLocal()
        try:
            if po_id:
                db.query(PaymentTransactionModel).filter_by(purchase_order_id=po_id).delete()
                db.query(GoodsReceiptNoteModel).filter_by(purchase_order_id=po_id).delete()
                db.query(PurchaseOrderModel).filter_by(id=po_id).delete()
            if project_id:
                db.query(MaterialRequirementModel).filter_by(project_id=project_id).delete()
                db.query(RFQPackageModel).filter_by(project_id=project_id).delete()
                db.query(BOQItemModel).filter_by(project_id=project_id).delete()
                db.query(SiteInventoryModel).filter_by(project_id=project_id).delete()
                db.query(Project).filter_by(id=project_id).delete()
            if vendor_ids:
                db.query(VendorBidModel).filter(VendorBidModel.vendor_id.in_(vendor_ids)).delete(synchronize_session=False)
                db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()
