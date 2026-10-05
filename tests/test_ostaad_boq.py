"""Automated test suite for Ostaad Blueprint-to-BOQ Engine."""

import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from ostaad_boq.models import (
    BOQReport,
    ScaleCalibration,
    TakeoffLine,
    RoomTakeoff,
    LinearRun,
    UnitType,
    CalculationMethod,
)
from ostaad_boq.scale import parse_feet_inches, calibrate_scale
from ostaad_boq.ocr import OCRItem
from ostaad_boq.geometry import extract_wall_measurements
from ostaad_boq.reconciliation import assemble_and_reconcile_boq
from ostaad_boq.exporter import export_to_csv, export_to_xlsx
from ostaad_boq.app import app


def test_dimension_parser():
    assert parse_feet_inches("17'1\"") == 17.083333333333332
    assert parse_feet_inches("14-10") == 14.833333333333334
    assert parse_feet_inches("8'0\"") == 8.0
    assert parse_feet_inches("invalid") is None


def test_scale_unresolved_safety():
    """Verify that scale is NEVER guessed silently if dimensions are absent."""
    scale = calibrate_scale([], 800, 600)
    assert scale.scale_known is False
    assert scale.unit == "norm"
    assert scale.method == "unresolved"


def test_opencv_wall_geometry():
    """Verify deterministic wall linear feet extraction on a synthetic floor plan image."""
    img = Image.new("L", (400, 300), color=255)
    draw = ImageDraw.Draw(img)
    # Draw dark black rectangle perimeter representing walls
    draw.rectangle([20, 20, 380, 280], outline=0, width=8)
    draw.line([200, 20, 200, 280], fill=0, width=6)  # Interior dividing wall

    scale = ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft", confidence=1.0)
    linear_runs, room_polygons = extract_wall_measurements(img, scale)

    assert len(linear_runs) == 2
    assert linear_runs[0].length > 0
    assert linear_runs[1].length > 0
    assert len(room_polygons) >= 1


def test_reconciliation_and_derived_materials():
    """Verify that directly measured items and derived material estimates are clearly separated."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=15.0, unit="ft", confidence=0.9)
    semantic_data = {
        "doors": [{"description": "Single Swing Door", "quantity": 5, "confidence": 0.95}],
        "rooms": [{"name": "Living Room", "stated_area_sqft": 200.0, "confidence": 0.98}],
    }
    linear_runs = [LinearRun(id="w1", label="Partition", length=50.0, unit=UnitType.LF)]

    report = assemble_and_reconcile_boq(
        sheet_name="Test Sheet",
        scale=scale,
        semantic_data=semantic_data,
        ocr_items=[],
        linear_runs=linear_runs,
        room_polygons=[{"measured_sqft": 195.0, "perimeter_lf": 60.0}],
    )

    assert len(report.lines) >= 3
    # Check door is directly measured
    door = next(l for l in report.lines if "Door" in l.item_description)
    assert door.is_measured is True
    assert door.quantity == 5.0

    # Check drywall is derived material
    drywall = next(l for l in report.lines if "Wallboard" in l.item_description)
    assert drywall.is_measured is False
    assert drywall.calculation_method == CalculationMethod.DERIVED_MATERIAL

    # Check flooring is derived from room stated sq ft
    flooring = next(l for l in report.lines if "Flooring" in l.item_description)
    assert flooring.quantity == 200.0


def test_csv_and_xlsx_exporters():
    """Verify export generation and valid content."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=15.0, unit="ft", raw_scale_text="1/4\"=1'")
    report = BOQReport(
        project_name="Unit Test Project",
        sheet_name="A-101",
        scale=scale,
        lines=[
            TakeoffLine(
                id="d1",
                item_description="Entry Door",
                category="08 10 00 - Doors",
                quantity=1.0,
                unit=UnitType.EA,
                calculation_method=CalculationMethod.COUNTED,
                is_measured=True,
            )
        ],
    )

    csv_data = export_to_csv(report)
    assert "Entry Door" in csv_data
    assert "Directly Measured" in csv_data

    xlsx_bytes = export_to_xlsx(report)
    assert len(xlsx_bytes) > 1000
    assert xlsx_bytes[:4] == b"PK\x03\x04"  # Valid ZIP/XLSX header


def test_fastapi_endpoints():
    """Test web API endpoints."""
    client = TestClient(app)
    # Health check
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Main dashboard
    res_ui = client.get("/")
    assert res_ui.status_code == 200
    assert "Ostaad" in res_ui.text

    # Takeoff endpoint with sample synthetic image
    img = Image.new("RGB", (200, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    res_post = client.post("/api/takeoff", files={"file": ("test.png", buf.getvalue(), "image/png")})
    assert res_post.status_code == 200
    body = res_post.json()
    assert body["success"] is True
    assert "report" in body
    assert len(body["report"]["lines"]) > 0

    # Export endpoints
    res_csv = client.post("/api/export/csv", json=body["report"])
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]

    res_xlsx = client.post("/api/export/xlsx", json=body["report"])
    assert res_xlsx.status_code == 200
    assert res_xlsx.content[:4] == b"PK\x03\x04"
