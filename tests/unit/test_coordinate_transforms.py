"""Unit tests for Phase 3: Canonical Coordinate Normalization Engine."""

import pytest
from ostaad_boq.coordinate_transform import CoordinateTransformer, CoordinateSpace


def test_gemini_box_to_canonical_conversion():
    """Verify Gemini [ymin, xmin, ymax, xmax] in [0, 1000] maps to Canonical [xmin, ymin, xmax, ymax] in [0.0, 1.0]."""
    # Box located from y: 150..450, x: 200..600
    gemini_box = [150, 200, 450, 600]
    canonical = CoordinateTransformer.gemini_box_to_canonical(gemini_box)

    assert canonical == [0.2, 0.15, 0.6, 0.45]


def test_gemini_canonical_roundtrip_invariance():
    """Test that canonical -> gemini -> canonical roundtrips without coordinate drift."""
    original_canonical = [0.125, 0.350, 0.875, 0.720]
    gemini_box = CoordinateTransformer.canonical_to_gemini_box(original_canonical)
    roundtrip = CoordinateTransformer.gemini_box_to_canonical(gemini_box)

    for orig, rt in zip(original_canonical, roundtrip):
        assert abs(orig - rt) <= 0.001


def test_canonical_to_pixel_mapping():
    """Verify mapping canonical coordinates to 3000x2400 canvas."""
    transformer = CoordinateTransformer(canvas_width_px=3000, canvas_height_px=2400)
    canonical_box = [0.1, 0.2, 0.5, 0.8]
    px_box = transformer.canonical_box_to_pixel(canonical_box)

    assert px_box == [300, 480, 1500, 1920]

    # Invert back to canonical
    roundtrip_can = transformer.pixel_box_to_canonical(px_box)
    assert roundtrip_can == canonical_box


def test_pdf_points_mapping():
    """Verify mapping canonical coordinates to standard ISO A4 PostScript points (842 x 595 pt)."""
    transformer = CoordinateTransformer(pdf_page_width_pt=842.0, pdf_page_height_pt=595.0)
    canonical_box = [0.0, 0.0, 1.0, 1.0]
    pdf_box = transformer.canonical_to_pdf_points(canonical_box)

    assert pdf_box == [0.0, 0.0, 842.0, 595.0]


def test_real_world_measurements_from_scale():
    """Verify pixel length and area calculations given a known scale ratio."""
    # Scale: 20 pixels per meter
    transformer = CoordinateTransformer(
        canvas_width_px=2000,
        canvas_height_px=2000,
        pixels_per_unit=20.0,
        world_unit="m",
    )

    # 100 pixels = 5 meters
    assert transformer.pixel_length_to_world(100.0) == 5.0

    # 400 sq pixels = 1 sq meter
    assert transformer.pixel_area_to_world(400.0) == 1.0

    # Rectangle polygon: 0.1 to 0.6 width (1000 px = 50 m), 0.1 to 0.3 height (400 px = 20 m)
    # Expected area = 50 m * 20 m = 1000 sq m
    rect_polygon = [
        [0.1, 0.1],
        [0.6, 0.1],
        [0.6, 0.3],
        [0.1, 0.3],
    ]
    computed_area = transformer.canonical_polygon_area_to_world(rect_polygon)
    assert abs(computed_area - 1000.0) < 0.01
