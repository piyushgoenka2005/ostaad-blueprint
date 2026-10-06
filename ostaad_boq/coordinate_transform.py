"""Authoritative Bidirectional Coordinate Transformation Engine for Ostaad BOQ.

Converts coordinates across:
1. Gemini Normalized Space: [ymin, xmin, ymax, xmax] in [0, 1000]
2. Canonical Normalized Space: [xmin, ymin, xmax, ymax] in [0.0, 1.0], origin Top-Left (0, 0)
3. High-Resolution Raster Canvas: (x_px, y_px) at rendered DPI (e.g. 2800x3300)
4. PDF Page PostScript Points: 72 DPI origin Top-Left or Bottom-Left
5. Real-World Physical Metric/Imperial: meters or feet via calibrated scale ratio
"""

from __future__ import annotations

from enum import Enum
from typing import Tuple, List, Optional
import math


class CoordinateSpace(str, Enum):
    GEMINI_1000 = "GEMINI_1000"              # [ymin, xmin, ymax, xmax] integers in [0, 1000]
    CANONICAL_UNIT = "CANONICAL_UNIT"        # [xmin, ymin, xmax, ymax] floats in [0.0, 1.0]
    RASTER_PIXEL = "RASTER_PIXEL"            # Pixel coordinates in rendered bitmap
    PDF_POINTS = "PDF_POINTS"                # 72 DPI PostScript points
    WORLD_METRIC = "WORLD_METRIC"            # Real world meters
    WORLD_IMPERIAL = "WORLD_IMPERIAL"        # Real world feet


class CoordinateTransformer:
    """Mathematical bidirectional coordinate mapper with bounds clamping and validation."""

    def __init__(
        self,
        canvas_width_px: int = 3000,
        canvas_height_px: int = 2400,
        pdf_page_width_pt: float = 841.89,
        pdf_page_height_pt: float = 595.28,
        pixels_per_unit: float = 23.622,
        world_unit: str = "m",
        page_rotation: int = 0,
    ) -> None:
        self.width_px = canvas_width_px
        self.height_px = canvas_height_px
        self.pdf_w_pt = pdf_page_width_pt
        self.pdf_h_pt = pdf_page_height_pt
        self.px_per_unit = max(pixels_per_unit, 1e-6)
        self.world_unit = world_unit
        self.page_rotation = page_rotation % 360

    # --------------------------------------------------------------------------
    # 1. Gemini [0, 1000] <-> Canonical [0.0, 1.0]
    # --------------------------------------------------------------------------
    @staticmethod
    def gemini_box_to_canonical(box_1000: List[float] | Tuple[float, ...]) -> List[float]:
        """Convert Gemini [ymin, xmin, ymax, xmax] in [0, 1000] to Canonical [xmin, ymin, xmax, ymax] in [0.0, 1.0]."""
        if len(box_1000) != 4:
            raise ValueError(f"Expected 4 coordinates for box, got {len(box_1000)}")

        ymin, xmin, ymax, xmax = box_1000
        xmin_c = max(0.0, min(1.0, float(xmin) / 1000.0))
        ymin_c = max(0.0, min(1.0, float(ymin) / 1000.0))
        xmax_c = max(0.0, min(1.0, float(xmax) / 1000.0))
        ymax_c = max(0.0, min(1.0, float(ymax) / 1000.0))

        # Enforce valid bounding box geometry
        if xmin_c > xmax_c:
            xmin_c, xmax_c = xmax_c, xmin_c
        if ymin_c > ymax_c:
            ymin_c, ymax_c = ymax_c, ymin_c

        return [round(xmin_c, 6), round(ymin_c, 6), round(xmax_c, 6), round(ymax_c, 6)]

    @staticmethod
    def canonical_to_gemini_box(box_canonical: List[float] | Tuple[float, ...]) -> List[int]:
        """Convert Canonical [xmin, ymin, xmax, ymax] in [0.0, 1.0] to Gemini [ymin, xmin, ymax, xmax] in [0, 1000]."""
        if len(box_canonical) != 4:
            raise ValueError(f"Expected 4 coordinates for box, got {len(box_canonical)}")

        xmin, ymin, xmax, ymax = box_canonical
        ymin_g = int(round(max(0.0, min(1.0, ymin)) * 1000.0))
        xmin_g = int(round(max(0.0, min(1.0, xmin)) * 1000.0))
        ymax_g = int(round(max(0.0, min(1.0, ymax)) * 1000.0))
        xmax_g = int(round(max(0.0, min(1.0, xmax)) * 1000.0))

        return [ymin_g, xmin_g, ymax_g, xmax_g]

    # --------------------------------------------------------------------------
    # 2. Canonical [0.0, 1.0] <-> Raster Pixels
    # --------------------------------------------------------------------------
    def canonical_box_to_pixel(self, box_canonical: List[float]) -> List[int]:
        """Map Canonical [xmin, ymin, xmax, ymax] to rendered raster integer pixels."""
        xmin, ymin, xmax, ymax = box_canonical
        px_xmin = int(round(xmin * self.width_px))
        px_ymin = int(round(ymin * self.height_px))
        px_xmax = int(round(xmax * self.width_px))
        px_ymax = int(round(ymax * self.height_px))
        return [px_xmin, px_ymin, px_xmax, px_ymax]

    def pixel_box_to_canonical(self, box_pixel: List[int] | Tuple[int, ...]) -> List[float]:
        """Map rendered raster integer pixels to Canonical [xmin, ymin, xmax, ymax] in [0.0, 1.0]."""
        px_xmin, px_ymin, px_xmax, px_ymax = box_pixel
        xmin = max(0.0, min(1.0, float(px_xmin) / self.width_px))
        ymin = max(0.0, min(1.0, float(px_ymin) / self.height_px))
        xmax = max(0.0, min(1.0, float(px_xmax) / self.width_px))
        ymax = max(0.0, min(1.0, float(px_ymax) / self.height_px))
        return [round(xmin, 6), round(ymin, 6), round(xmax, 6), round(ymax, 6)]

    def canonical_polygon_to_pixel(self, polygon_canonical: List[List[float]]) -> List[Tuple[int, int]]:
        """Map polygon vertices [(x, y), ...] from Canonical [0.0, 1.0] to integer pixels."""
        return [
            (int(round(pt[0] * self.width_px)), int(round(pt[1] * self.height_px)))
            for pt in polygon_canonical
        ]

    # --------------------------------------------------------------------------
    # 3. Canonical [0.0, 1.0] <-> PDF PostScript Points (72 DPI)
    # --------------------------------------------------------------------------
    def canonical_to_pdf_points(self, box_canonical: List[float]) -> List[float]:
        """Convert Canonical [xmin, ymin, xmax, ymax] to PDF PostScript points."""
        xmin, ymin, xmax, ymax = box_canonical
        pt_xmin = xmin * self.pdf_w_pt
        pt_ymin = ymin * self.pdf_h_pt
        pt_xmax = xmax * self.pdf_w_pt
        pt_ymax = ymax * self.pdf_h_pt
        return [round(pt_xmin, 2), round(pt_ymin, 2), round(pt_xmax, 2), round(pt_ymax, 2)]

    # --------------------------------------------------------------------------
    # 4. Raster Pixels -> Real-World Physical Measurements
    # --------------------------------------------------------------------------
    def pixel_length_to_world(self, length_px: float) -> float:
        """Calculate physical length (meters or feet) from pixel length via calibrated scale."""
        return round(length_px / self.px_per_unit, 4)

    def pixel_area_to_world(self, area_px_sq: float) -> float:
        """Calculate physical area (sq. meters or sq. feet) from pixel area via calibrated scale squared."""
        return round(area_px_sq / (self.px_per_unit ** 2), 4)

    def canonical_polygon_area_to_world(self, polygon_canonical: List[List[float]]) -> float:
        """Compute real-world polygon area via Green's Theorem / Shoelace algorithm."""
        n = len(polygon_canonical)
        if n < 3:
            return 0.0

        # Shoelace in pixel space
        px_pts = self.canonical_polygon_to_pixel(polygon_canonical)
        area_sum = 0.0
        for i in range(n):
            j = (i + 1) % n
            area_sum += px_pts[i][0] * px_pts[j][1]
            area_sum -= px_pts[j][0] * px_pts[i][1]

        area_px_sq = abs(area_sum) / 2.0
        return self.pixel_area_to_world(area_px_sq)
