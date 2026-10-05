"""OCR and text extraction module for Ostaad Blueprint-to-BOQ Engine.

Extracts printed dimensions, room labels, area values, and schedule tables
using native PDF text and Apache-2.0 EasyOCR.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from PIL import Image

from .ingest import IngestedSheet


@dataclass
class OCRItem:
    """Extracted text string with bounding box coordinates and confidence."""
    text: str
    confidence: float
    bbox: tuple[float, float, float, float]  # (x_min, y_min, x_max, y_max) normalized 0..1


# Regular expressions for architectural callouts
DIMENSION_PATTERN = re.compile(
    r"""(?P<feet>\d+)\s*(?:'|ft|feet|\u2032)?\s*[-–\s]?\s*(?P<inches>\d+(?:\.\d+)?|\d+/\d+)?\s*(?:"|in|inches|\u2033)?""",
    re.VERBOSE | re.IGNORECASE,
)
AREA_PATTERN = re.compile(
    r"""(?P<val>\d+(?:\.\d+)?)\s*(?:sq\s*ft|sqft|sf|s\.f\.|sq\s*m|m2|m²|ft²|ft2)""",
    re.IGNORECASE,
)
SCALE_STRING_PATTERN = re.compile(
    r"""(?:scale\s*[:=]?\s*)?(?P<paper>\d+(?:/\d+)?(?:\.\d+)?)\s*(?:\"|in)?\s*=\s*(?P<real>\d+(?:\.\d+)?)\s*(?:'|ft)(?:[-–\s]*(?P<real_in>\d+(?:\.\d+)?)\s*(?:\"|in)?)?""",
    re.IGNORECASE,
)


class OCREngine:
    """Robust OCR engine combining PaddleOCR, EasyOCR, and native vector PDF text."""

    def __init__(self, languages: list[str] | None = None) -> None:
        self.languages = languages or ["en"]
        self._easyocr_reader: Any = None
        self._paddleocr_reader: Any = None

    def _get_paddle_reader(self) -> Any:
        if self._paddleocr_reader is None:
            try:
                import paddle
                from paddleocr import PaddleOCR
                self._paddleocr_reader = PaddleOCR(use_angle_cls=False, lang="en")
            except Exception:
                self._paddleocr_reader = False
        return self._paddleocr_reader if self._paddleocr_reader is not False else None

    def _get_easy_reader(self) -> Any:
        if self._easyocr_reader is None:
            try:
                import easyocr
                self._easyocr_reader = easyocr.Reader(self.languages, gpu=False)
            except Exception:
                self._easyocr_reader = None
        return self._easyocr_reader

    def extract_text(self, sheet: IngestedSheet) -> list[OCRItem]:
        """Extract all text tokens with normalized bounding boxes from a sheet."""
        items: list[OCRItem] = []

        # 1. First prioritize native vector PDF text if present
        if sheet.is_vector_pdf and sheet.native_text:
            w, h = float(sheet.width_px), float(sheet.height_px)
            for nb in sheet.native_text:
                x0, y0, x1, y1 = nb.bbox
                items.append(
                    OCRItem(
                        text=nb.text,
                        confidence=0.99,  # Vector text is exact
                        bbox=(
                            max(0.0, min(1.0, x0 / w)),
                            max(0.0, min(1.0, y0 / h)),
                            max(0.0, min(1.0, x1 / w)),
                            max(0.0, min(1.0, y1 / h)),
                        ),
                    )
                )
            if items:
                return items

        # 2. Run vision OCR (EasyOCR reliably extracts CAD numbers & text)
        reader = self._get_easy_reader()
        if reader is not None:
            import numpy as np

            img_np = np.array(sheet.image)
            w, h = float(sheet.width_px), float(sheet.height_px)
            try:
                results = reader.readtext(img_np)
                for bbox_pts, text, conf in results:
                    text_clean = text.strip()
                    if not text_clean:
                        continue
                    xs = [pt[0] for pt in bbox_pts]
                    ys = [pt[1] for pt in bbox_pts]
                    items.append(
                        OCRItem(
                            text=text_clean,
                            confidence=float(conf),
                            bbox=(
                                max(0.0, min(1.0, min(xs) / w)),
                                max(0.0, min(1.0, min(ys) / h)),
                                max(0.0, min(1.0, max(xs) / w)),
                                max(0.0, min(1.0, max(ys) / h)),
                            ),
                        )
                    )
            except Exception:
                pass

        if items:
            return items

        # 3. PaddleOCR secondary fallback
        paddle = self._get_paddle_reader()
        if paddle is not None:
            import numpy as np

            img_np = np.array(sheet.image)
            w, h = float(sheet.width_px), float(sheet.height_px)
            try:
                result = paddle.ocr(img_np, cls=False)
                if result and result[0]:
                    for line in result[0]:
                        bbox_pts = line[0]
                        text, conf = line[1]
                        text_clean = text.strip()
                        if not text_clean:
                            continue
                        xs = [pt[0] for pt in bbox_pts]
                        ys = [pt[1] for pt in bbox_pts]
                        items.append(
                            OCRItem(
                                text=text_clean,
                                confidence=float(conf),
                                bbox=(
                                    max(0.0, min(1.0, min(xs) / w)),
                                    max(0.0, min(1.0, min(ys) / h)),
                                    max(0.0, min(1.0, max(xs) / w)),
                                    max(0.0, min(1.0, max(ys) / h)),
                                ),
                            )
                        )
            except Exception:
                pass

        return items


def parse_room_area_callouts(ocr_items: list[OCRItem]) -> list[dict]:
    """Parse room names and explicit square footage stated directly on the floor plan."""
    rooms: list[dict] = []
    room_kw = ["living", "dining", "bed", "room", "kitchen", "toilet", "bath", "balcony", "stair", "lobby", "hall", "porch", "entry", "store"]
    dim_or_tag_re = re.compile(r"""^(\d+['\"-]?\s*[xX]\s*\d+|[dwv]\d?|\d+['"]?\s*[-–]?\s*\d+["']?)$""", re.IGNORECASE)
    sheet_total_kw = ["built-up", "carpet area", "total area", "super built", "plot area"]

    sorted_items = sorted(ocr_items, key=lambda x: (x.bbox[1], x.bbox[0]))

    for i, item in enumerate(sorted_items):
        clean_text = item.text.strip()
        # Skip overall sheet totals
        sheet_total_kw = ["built-up", "carpet", "total", "super built", "plot", "area:"]
        if any(sk in clean_text.lower() for sk in sheet_total_kw):
            continue

        area_match = AREA_PATTERN.search(clean_text)
        if not area_match:
            continue

        try:
            area_val = float(area_match.group("val"))
        except ValueError:
            continue

        # Look for preceding room name in nearby text tokens
        room_name = clean_text[:area_match.start()].strip()
        
        # If room_name is empty or just a dimension/tag, search backwards
        if not room_name or dim_or_tag_re.match(room_name) or any(sk in room_name.lower() for sk in sheet_total_kw):
            best_candidate = None
            cand_idx = -1
            for j in range(i - 1, max(-1, i - 6), -1):
                cand = sorted_items[j]
                cand_text = cand.text.strip()
                if any(sk in cand_text.lower() for sk in sheet_total_kw):
                    continue
                if dim_or_tag_re.match(cand_text):
                    continue
                # Check spatial proximity: within 12% sheet height above, 15% sheet width horizontally
                v_dist = item.bbox[1] - cand.bbox[1]
                h_dist = abs(item.bbox[0] - cand.bbox[0])
                if 0 <= v_dist < 0.12 and h_dist < 0.15:
                    if any(k in cand_text.lower() for k in room_kw):
                        best_candidate = cand_text
                        cand_idx = j
                        break
                    elif not best_candidate and len(cand_text) > 3:
                        best_candidate = cand_text
                        cand_idx = j
            
            # Check if this candidate is part of a compound name like LIVING / DINING
            if best_candidate and cand_idx > 0:
                prev_cand = sorted_items[cand_idx - 1]
                if abs(cand.bbox[1] - prev_cand.bbox[1]) < 0.03 or abs(cand.bbox[1] - prev_cand.bbox[3]) < 0.04:
                    if any(k in prev_cand.text.lower() for k in room_kw):
                        best_candidate = f"{prev_cand.text.strip()} / {best_candidate}"

            room_name = best_candidate or ""

        clean_norm_name = room_name.lower().strip(" :.-")
        if (
            room_name
            and not dim_or_tag_re.match(room_name)
            and not any(sk in clean_norm_name for sk in sheet_total_kw)
            and clean_norm_name not in ["area", "carpet", "total", "sq ft"]
        ):
            # Clean up punctuation
            room_name = re.sub(r"[\n\r/]+", " / ", room_name)
            room_name = re.sub(r"\s+", " ", room_name).strip(" /")
            # Normalize title
            room_name = room_name.title()
            # Prevent duplicate room names with identical bbox
            if not any(r["room_name"] == room_name and abs(r["stated_sqft"] - area_val) < 1.0 for r in rooms):
                rooms.append(
                    {
                        "room_name": room_name,
                        "stated_sqft": area_val,
                        "confidence": item.confidence,
                        "bbox": item.bbox,
                    }
                )

    return rooms
