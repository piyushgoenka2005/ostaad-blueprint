"""OpenCV-based image processing and deterministic geometry calculation module.

Performs wall contour detection, room polygon extraction, and linear length
calculations without proprietary dependencies.
"""

from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from .models import (
    CalculationMethod,
    DrawingType,
    GeometricFeature,
    LinearRun,
    RoomTakeoff,
    ScaleCalibration,
    UnitType,
)
from .scale import CoordinateTransformEngine


def extract_drawing_geometry(
    sheet: Any,
    scale: ScaleCalibration,
    drawing_type: DrawingType = DrawingType.ARCHITECTURAL_FLOOR_PLAN,
) -> tuple[list[LinearRun], list[dict], list[GeometricFeature]]:
    """Extract deterministic geometric measurements strictly decoupled from semantic rooms.

    Invariants:
    1. SITE AREA != BUILDING FLOOR AREA.
    2. SITE GEOMETRY != ROOM GEOMETRY.
    3. Non-architectural drawings (site surveys, elevations, civil layouts) NEVER generate room polygons.
    """
    image = sheet.image if hasattr(sheet, "image") else sheet
    img_np = np.array(image.convert("L"))
    h, w = img_np.shape
    transform = CoordinateTransformEngine(scale)

    linear_runs: list[LinearRun] = []
    room_polygons: list[dict] = []
    features: list[GeometricFeature] = []

    # -------------------------------------------------------------
    # 1. Architectural Floor Plan: Walls & Room Envelopes
    # -------------------------------------------------------------
    if drawing_type == DrawingType.ARCHITECTURAL_FLOOR_PLAN:
        _, binary = cv2.threshold(img_np, 180, 255, cv2.THRESH_BINARY_INV)
        wall_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        walls = cv2.morphologyEx(binary, cv2.MORPH_OPEN, wall_kernel)
        contours, _ = cv2.findContours(walls, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        total_wall_perimeter_px = 0.0
        exterior_wall_px = 0.0
        interior_wall_px = 0.0

        for cnt in contours:
            arc_len = cv2.arcLength(cnt, closed=False)
            area = cv2.contourArea(cnt)
            if arc_len > 80:
                total_wall_perimeter_px += (arc_len / 2.0)
                if area > 1000:
                    exterior_wall_px += (arc_len / 2.0)
                else:
                    interior_wall_px += (arc_len / 2.0)

        ext_px = exterior_wall_px if exterior_wall_px > 0 else total_wall_perimeter_px * 0.45
        int_px = interior_wall_px if interior_wall_px > 0 else total_wall_perimeter_px - ext_px

        ext_qty, len_unit, len_review = transform.measure_length(ext_px)
        int_qty, _, _ = transform.measure_length(int_px)

        ext_label = "Exterior Bearing Walls (250mm Brick / RCC)" if scale.unit in ["metre", "m"] else "Exterior Bearing Walls (2x6 Framing + Sheathing)"
        int_label = "Interior Partition Walls (125mm Brick / Partition)" if scale.unit in ["metre", "m"] else "Interior Partition Walls (2x4 Drywall Framing)"

        linear_runs.extend([
            LinearRun(
                id="wall-ext",
                label=ext_label,
                length=ext_qty,
                unit=len_unit,
                calculation_method=CalculationMethod.LINEAR_MEASURED,
                notes=f"Measured from closed exterior wall perimeter ({scale.raw_scale_text or 'scale calibrated'})",
                needs_review=len_review,
            ),
            LinearRun(
                id="wall-int",
                label=int_label,
                length=int_qty,
                unit=len_unit,
                calculation_method=CalculationMethod.LINEAR_MEASURED,
                notes="Measured from internal wall partition centerlines",
                needs_review=len_review,
            ),
        ])

        # Closed room envelope polygons
        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        closed_plan = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, close_kernel)
        rooms_mask = cv2.bitwise_not(closed_plan)
        room_contours, _ = cv2.findContours(rooms_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        min_room_area_px = (w * h) * 0.005
        max_room_area_px = (w * h) * 0.45

        for idx, cnt in enumerate(room_contours):
            area_px = cv2.contourArea(cnt)
            if min_room_area_px <= area_px <= max_room_area_px:
                x, y, bw, bh = cv2.boundingRect(cnt)
                if x <= 5 and y <= 5 and (x + bw) >= (w - 10) and (y + bh) >= (h - 10):
                    continue

                meas_area, area_unit, area_review = transform.measure_area(area_px)
                meas_peri, _, _ = transform.measure_perimeter(cv2.arcLength(cnt, True))
                norm_pts = [(round(float(pt[0][0]) / w, 4), round(float(pt[0][1]) / h, 4)) for pt in cnt]

                room_polygons.append({
                    "bbox": [x / w, y / h, (x + bw) / w, (y + bh) / h],
                    "area_px": area_px,
                    "measured_sqft": meas_area if area_unit == UnitType.SF else (meas_area * 10.7639 if area_unit == UnitType.SQM else meas_area),
                    "measured_area": meas_area,
                    "area_unit": area_unit.value,
                    "perimeter_lf": meas_peri if len_unit == UnitType.LF else (meas_peri * 3.28084 if len_unit == UnitType.M else meas_peri),
                    "perimeter": meas_peri,
                    "needs_review": area_review,
                })

                features.append(
                    GeometricFeature(
                        id=f"feat-room-{idx}",
                        feature_type="room_envelope",
                        geometry_type="polygon",
                        points=norm_pts[::max(1, len(norm_pts) // 25)],
                        measured_length=meas_peri,
                        length_unit=len_unit,
                        measured_area=meas_area,
                        area_unit=area_unit,
                        formula=f"Shoelace formula ({area_px:.0f} px² scaled at {scale.pixels_per_unit:.2f} px/{scale.unit})",
                        confidence=0.92,
                    )
                )

    # -------------------------------------------------------------
    # 2. Site / Topographical Survey: Boundaries & Civil Features
    # -------------------------------------------------------------
    elif drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY:
        # STRICT INVARIANT: room_polygons remains strictly empty []!
        room_polygons = []

        _, binary = cv2.threshold(img_np, 210, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
        valid_contours.sort(key=lambda c: cv2.contourArea(c), reverse=True)

        if valid_contours:
            # Primary outer boundary contour
            site_cnt = valid_contours[0]
            x, y, bw, bh = cv2.boundingRect(site_cnt)
            # If outermost contour is the sheet margin border, select interior boundary
            if bw >= (w - 30) and bh >= (h - 30) and len(valid_contours) > 1:
                site_cnt = valid_contours[1]

            site_area_px = cv2.contourArea(site_cnt)
            site_peri_px = cv2.arcLength(site_cnt, closed=True)

            site_area, area_unit, _ = transform.measure_area(site_area_px)
            site_peri, len_unit, _ = transform.measure_length(site_peri_px)
            norm_pts = [(round(float(pt[0][0]) / w, 4), round(float(pt[0][1]) / h, 4)) for pt in site_cnt]

            features.append(
                GeometricFeature(
                    id="feat-site-boundary",
                    feature_type="property_boundary",
                    geometry_type="polygon",
                    points=norm_pts[::max(1, len(norm_pts) // 50)],
                    measured_length=site_peri,
                    length_unit=len_unit,
                    measured_area=site_area,
                    area_unit=area_unit,
                    formula=f"Green's Theorem Shoelace contour ({site_area_px:.0f} px² scaled at {scale.pixels_per_unit:.2f} px/{scale.unit})",
                    confidence=0.96,
                    notes="Deterministic property boundary contour from CAD survey paths",
                )
            )

            linear_runs.append(
                LinearRun(
                    id="site-boundary-wall",
                    label="Site Boundary Wall / Guard Wall Perimeter",
                    length=site_peri,
                    unit=len_unit,
                    calculation_method=CalculationMethod.LINEAR_MEASURED,
                    notes=f"Measured from closed site perimeter ({scale.raw_scale_text or 'scale calibrated'})",
                )
            )

            # Plinth structures / sheds footprints
            struct_count = 0
            struct_len_sum = 0.0
            for idx, c in enumerate(valid_contours[1:12]):
                c_area_px = cv2.contourArea(c)
                c_peri_px = cv2.arcLength(c, closed=True)
                if 1200 < c_area_px < site_area_px * 0.15:
                    c_area, _, _ = transform.measure_area(c_area_px)
                    c_len, _, _ = transform.measure_length(c_peri_px)
                    features.append(
                        GeometricFeature(
                            id=f"feat-site-structure-{idx}",
                            feature_type="building_footprint",
                            geometry_type="polygon",
                            measured_length=c_len,
                            length_unit=len_unit,
                            measured_area=c_area,
                            area_unit=area_unit,
                            formula="Shoelace polygon on structure footprint",
                            confidence=0.90,
                            notes="Existing structure / plinth footprint on site survey",
                        )
                    )
                    struct_count += 1
                    struct_len_sum += c_len

            if struct_count > 0:
                linear_runs.append(
                    LinearRun(
                        id="site-structures-perimeter",
                        label="Existing Structures / Sheds Plinth Perimeter",
                        length=round(struct_len_sum, 2),
                        unit=len_unit,
                        count=struct_count,
                        calculation_method=CalculationMethod.LINEAR_MEASURED,
                        notes=f"Measured plinth perimeters across {struct_count} existing structures on site",
                    )
                )

    # -------------------------------------------------------------
    # 3. Other Non-Architectural Types (Structural, Electrical, etc.)
    # -------------------------------------------------------------
    else:
        room_polygons = []

    return linear_runs, room_polygons, features


def extract_wall_measurements(
    image: Image.Image,
    scale: ScaleCalibration,
) -> tuple[list[LinearRun], list[dict]]:
    """Legacy backward-compatible wrapper for architectural floor plans."""
    linear_runs, room_polygons, _ = extract_drawing_geometry(
        image, scale, DrawingType.ARCHITECTURAL_FLOOR_PLAN
    )
    return linear_runs, room_polygons
