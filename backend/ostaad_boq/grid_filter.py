"""Grid line and surveyor artifact suppression module for Ostaad Blueprint-to-BOQ Engine.

Eliminates surveyor coordinate grids, coordinate ticks, and CAD grid lines before
geometric contour tracing, preventing grid intersections from being misinterpreted
as walls or building plinths.
"""

from __future__ import annotations

import re
from typing import Any
import cv2
import numpy as np


# Regex pattern to identify surveyor coordinate numbers (e.g. 20700.231, 10402.000, 10+00, E:12345)
COORDINATE_TEXT_PATTERN = re.compile(
    r"^(?:\d{4,6}(?:\.\d{2,4})?|\d{1,2}\+\d{2}|[EN]\s*[:=]?\s*\d{4,6}|\d{4,6}\s*[mMeEnN])$"
)


def is_coordinate_text(text: str) -> bool:
    """Return True if text string matches surveyor grid coordinate patterns."""
    clean = text.strip()
    return bool(COORDINATE_TEXT_PATTERN.match(clean))


def suppress_pdf_grid_layers(doc: Any) -> bool:
    """Disable CAD OCG layers representing grids, surveys, or coordinate annotations."""
    if not hasattr(doc, "get_ocgs") or not hasattr(doc, "set_ocg"):
        return False

    ocgs = doc.get_ocgs()
    if not ocgs:
        return False

    grid_pattern = re.compile(r"(?i)(grid|coord|survey|defpoint)", re.IGNORECASE)
    modified = False
    for ocg_id, ocg_info in ocgs.items():
        name = ocg_info.get("name", "")
        if grid_pattern.search(name):
            doc.set_ocg(ocg_id, on=False)
            modified = True
    return modified


def suppress_raster_grid_lines(
    binary_img: np.ndarray,
    min_line_len: int = 35,
    wall_min_thickness: int = 3,
) -> np.ndarray:
    """Detect and remove thin surveyor grid lines from binary blueprint image.

    Preserves thick structural walls and closed boundary contours while subtracting
    thin, rectilinear grid lines that cross the site.
    """
    if binary_img is None or binary_img.size == 0:
        return binary_img

    # 1. Detect rectilinear lines of length >= min_line_len
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_line_len, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_line_len))

    h_lines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, h_kernel)
    v_lines = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, v_kernel)
    raw_grid = cv2.bitwise_or(h_lines, v_lines)

    # 2. Identify thick structural walls (which should NEVER be erased)
    thick_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (wall_min_thickness, wall_min_thickness)
    )
    thick_structures = cv2.morphologyEx(binary_img, cv2.MORPH_OPEN, thick_kernel)

    # 3. Grid lines are rectilinear lines that lack thick structural body
    thin_grid = cv2.bitwise_and(raw_grid, cv2.bitwise_not(thick_structures))

    # 4. Subtract thin grid lines from binary image
    cleaned = cv2.bitwise_and(binary_img, cv2.bitwise_not(thin_grid))

    # 5. Reconnect tiny junction gaps (1-2px) where grid intersected real boundary walls
    recon_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, recon_kernel)

    return cleaned


def filter_plinth_contours(
    contours: list[np.ndarray],
    site_area_px: float,
    min_area_px: float = 1200.0,
    max_area_ratio: float = 0.15,
) -> list[np.ndarray]:
    """Filter out small grid intersection boxes and retain legitimate building plinths.

    Plinths must:
    - Have closed area >= min_area_px and <= max_area_ratio * site_area_px
    - Not be elongated hairline artifacts
    - Not be uniform grid cells
    """
    legit_plinths: list[np.ndarray] = []
    max_area_px = site_area_px * max_area_ratio

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if min_area_px < area < max_area_px:
            x, y, w, h = cv2.boundingRect(cnt)
            # Avoid extreme aspect ratio artifacts (lines mistaken for boxes)
            aspect = float(w) / max(float(h), 1.0)
            if 0.15 < aspect < 7.0:
                legit_plinths.append(cnt)

    return legit_plinths
