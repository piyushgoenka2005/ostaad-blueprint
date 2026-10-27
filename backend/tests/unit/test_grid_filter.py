"""Unit tests for surveyor grid line & coordinate filter (Stage 4 & 9 Grid Defense)."""

import numpy as np
import cv2
import pytest
from ostaad_boq.grid_filter import (
    is_coordinate_text,
    suppress_raster_grid_lines,
    filter_plinth_contours,
    suppress_pdf_grid_layers,
)


def test_is_coordinate_text_detection():
    """Verify regex correctly flags Easting/Northing and station coordinates."""
    # Positive matches (surveyor grid coordinates)
    assert is_coordinate_text("20700.231")
    assert is_coordinate_text("10402.000")
    assert is_coordinate_text("10402")
    assert is_coordinate_text("20700")
    assert is_coordinate_text("10+00")
    assert is_coordinate_text("E: 10402")
    assert is_coordinate_text("N: 20700")
    assert is_coordinate_text("3000 M")

    # Negative matches (real dimensions, room names, or scales)
    assert not is_coordinate_text("SCALE 1:250")
    assert not is_coordinate_text("BEDROOM")
    assert not is_coordinate_text("12'-6\"")
    assert not is_coordinate_text("3.5m")
    assert not is_coordinate_text("D1")


def test_suppress_raster_grid_lines_preserves_thick_walls():
    """Verify that thin rectilinear lines are stripped while thick walls are preserved."""
    # Create 500x500 white canvas
    img = np.zeros((500, 500), dtype=np.uint8)

    # 1. Add thick boundary wall (thickness = 6px)
    cv2.rectangle(img, (50, 50), (450, 450), 255, thickness=6)

    # 2. Add thin grid lines across the whole canvas (thickness = 1px)
    for y in range(100, 450, 50):
        cv2.line(img, (0, y), (500, y), 255, thickness=1)
    for x in range(100, 450, 50):
        cv2.line(img, (x, 0), (x, 500), 255, thickness=1)

    initial_white = np.sum(img > 0)

    # Apply grid suppression
    cleaned = suppress_raster_grid_lines(img, min_line_len=30, wall_min_thickness=3)
    cleaned_white = np.sum(cleaned > 0)

    # Cleaned image should have significantly fewer white pixels (grid removed)
    assert cleaned_white < initial_white

    # But thick wall rectangle must still be closed and present
    contours, _ = cv2.findContours(cleaned, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    assert len(contours) > 0
    # Outer rectangle perimeter ~ 1600 px
    max_cnt = max(contours, key=cv2.contourArea)
    assert cv2.contourArea(max_cnt) > 100000


def test_filter_plinth_contours():
    """Verify plinth filtering rejects small grid cells and keeps legitimate footprints."""
    site_area_px = 500000.0

    # Create dummy contours:
    # 1. Real building plinth (25000 px²)
    plinth1 = np.array([[[100, 100]], [[100, 300]], [[300, 300]], [[300, 100]]], dtype=np.int32)
    # 2. Tiny grid cell artifact (200 px²)
    grid_cell = np.array([[[50, 50]], [[50, 60]], [[70, 60]], [[70, 50]]], dtype=np.int32)
    # 3. Huge contour (> 15% site area)
    huge_cnt = np.array([[[0, 0]], [[0, 400]], [[400, 400]], [[400, 0]]], dtype=np.int32)

    candidates = [plinth1, grid_cell, huge_cnt]
    filtered = filter_plinth_contours(candidates, site_area_px=site_area_px, min_area_px=1200.0, max_area_ratio=0.15)

    assert len(filtered) == 1
    assert cv2.contourArea(filtered[0]) == cv2.contourArea(plinth1)


def test_suppress_pdf_grid_layers_mock():
    """Verify layer filter disables matching CAD OCG layers."""
    class MockDoc:
        def __init__(self):
            self.ocgs = {
                1: {"name": "WALLS", "on": True},
                2: {"name": "SURVEY_GRID", "on": True},
                3: {"name": "COORDINATE_TICKS", "on": True},
                4: {"name": "DOORS", "on": True},
            }
        def get_ocgs(self):
            return self.ocgs
        def set_ocg(self, ocg_id, on):
            self.ocgs[ocg_id]["on"] = on

    doc = MockDoc()
    modified = suppress_pdf_grid_layers(doc)

    assert modified is True
    assert doc.ocgs[1]["on"] is True   # WALLS preserved
    assert doc.ocgs[2]["on"] is False  # SURVEY_GRID turned off
    assert doc.ocgs[3]["on"] is False  # COORDINATE_TICKS turned off
    assert doc.ocgs[4]["on"] is True   # DOORS preserved
