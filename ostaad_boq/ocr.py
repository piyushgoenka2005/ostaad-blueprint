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
    """Extracted text string with bounding box coordinates, confidence, and provenance."""
    text: str
    confidence: float
    bbox: tuple[float, float, float, float]  # (x_min, y_min, x_max, y_max) normalized 0..1
    source_type: str = "ocr_raster"         # 'native_vector_text', 'ocr_raster'
    normalized_text: str = ""
    page_number: int = 1
    font_size: float = 0.0

    def __post_init__(self) -> None:
        if not self.normalized_text:
            self.normalized_text = re.sub(r"\s+", " ", self.text).strip().lower()


def _boxes_overlap(
    b1: tuple[float, float, float, float],
    b2: tuple[float, float, float, float],
    threshold: float = 0.35,
) -> bool:
    """Determine if two normalized bounding boxes overlap significantly."""
    x_left = max(b1[0], b2[0])
    y_top = max(b1[1], b2[1])
    x_right = min(b1[2], b2[2])
    y_bottom = min(b1[3], b2[3])

    if x_right <= x_left or y_bottom <= y_top:
        return False

    inter_area = (x_right - x_left) * (y_bottom - y_top)
    area1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    area2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    union_area = area1 + area2 - inter_area
    if union_area <= 0:
        return False
    return (inter_area / union_area) > threshold


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
    """Hybrid OCR engine combining native vector PDF text and Apache-2.0 EasyOCR."""

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
        """Extract all text tokens with provenance and spatial deduplication."""
        items: list[OCRItem] = []
        w, h = float(sheet.width_px), float(sheet.height_px)

        # 1. Harvest native vector PDF text (exact coordinates & vector provenance)
        if sheet.is_vector_pdf and sheet.native_text:
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
                        source_type="native_vector_text",
                        font_size=nb.font_size,
                    )
                )

        # 2. Run vision OCR (EasyOCR captures stroked SHX CAD text & raster annotations)
        # If native vector text already provided scale or area metadata, we can safely bypass heavy raster OCR.
        # Otherwise (e.g. AutoCAD SHX stroked fonts), run optimized EasyOCR (canvas_size=1600, batch_size=4).
        meta_probe = parse_title_block_metadata(items)
        has_essential_meta = (meta_probe.get("scale_string") is not None or meta_probe.get("total_premises_area") is not None)
        should_run_raster = not (sheet.is_vector_pdf and len(sheet.native_text) >= 50 and has_essential_meta)

        raster_items: list[OCRItem] = []
        if should_run_raster:
            reader = self._get_easy_reader()
            if reader is not None:
                import numpy as np

                img_np = np.array(sheet.image)
                try:
                    results = reader.readtext(img_np, canvas_size=1600, batch_size=4)
                    for bbox_pts, text, conf in results:
                        text_clean = text.strip()
                        if not text_clean:
                            continue
                        xs = [pt[0] for pt in bbox_pts]
                        ys = [pt[1] for pt in bbox_pts]
                        norm_bbox = (
                            max(0.0, min(1.0, min(xs) / w)),
                            max(0.0, min(1.0, min(ys) / h)),
                            max(0.0, min(1.0, max(xs) / w)),
                            max(0.0, min(1.0, max(ys) / h)),
                        )
                        # Spatial deduplication: skip if overlapping with an already extracted native vector block
                        is_dup = any(_boxes_overlap(norm_bbox, it.bbox) for it in items)
                        if not is_dup:
                            raster_items.append(
                                OCRItem(
                                    text=text_clean,
                                    confidence=float(conf),
                                    bbox=norm_bbox,
                                    source_type="ocr_raster",
                                )
                            )

                    # Targeted high-resolution title block crop OCR (top-right & bottom-right corners)
                    # Catches fine-print scales (e.g. 'SCALE 1:250') on dense CAD sheets that downsampling obscures
                    temp_meta = parse_title_block_metadata(items + raster_items)
                    if temp_meta.get("scale_string") is None:
                        corner_boxes = [
                            (int(0.65 * w), 0, w, int(0.35 * h)),
                            (int(0.60 * w), int(0.65 * h), w, h),
                        ]
                        for cx0, cy0, cx1, cy1 in corner_boxes:
                            if cx1 > cx0 and cy1 > cy0:
                                crop_np = img_np[cy0:cy1, cx0:cx1]
                                crop_res = reader.readtext(crop_np, canvas_size=1200, batch_size=2)
                                for c_pts, c_txt, c_conf in crop_res:
                                    c_clean = c_txt.strip()
                                    if not c_clean:
                                        continue
                                    c_xs = [pt[0] + cx0 for pt in c_pts]
                                    c_ys = [pt[1] + cy0 for pt in c_pts]
                                    c_norm = (
                                        max(0.0, min(1.0, min(c_xs) / w)),
                                        max(0.0, min(1.0, min(c_ys) / h)),
                                        max(0.0, min(1.0, max(c_xs) / w)),
                                        max(0.0, min(1.0, max(c_ys) / h)),
                                    )
                                    raster_items.append(
                                        OCRItem(
                                            text=c_clean,
                                            confidence=float(c_conf),
                                            bbox=c_norm,
                                            source_type="ocr_raster",
                                        )
                                    )
                except Exception:
                    pass

            items.extend(raster_items)

        # Sort items in natural reading order (top-to-bottom, left-to-right)
        items.sort(key=lambda it: (round(it.bbox[1], 2), it.bbox[0]))
        return items


def parse_title_block_metadata(ocr_items: list[OCRItem]) -> dict[str, Any]:
    """Parse title block metadata: scale, total premises/floor area, unit, and callouts."""
    result: dict[str, Any] = {
        "scale_string": None,
        "scale_ratio": None,
        "measurement_unit": None,
        "total_premises_area": None,
        "area_unit": None,
        "raw_area_callout": None,
    }

    # 1. Scale extraction (e.g. 'SCALE 1:250', 'SCALE 1.250', '1:100', '1/4" = 1\'-0"')
    scale_re = re.compile(
        r"""(?:scale\s*[:=.]?\s*)?(?P<ratio>1\s*[:. ]?\s*(?P<denom>20|25|50|100|200|250|500|1000|1250|2000|2500))\b""",
        re.IGNORECASE,
    )
    for it in ocr_items:
        m = scale_re.search(it.text)
        if m:
            denom = int(m.group("denom"))
            result["scale_ratio"] = denom
            result["scale_string"] = f"1:{denom}"
            result["measurement_unit"] = "metre"
            break

    if not result["scale_string"]:
        for it in ocr_items:
            m = SCALE_STRING_PATTERN.search(it.text)
            if m:
                result["scale_string"] = it.text.strip()
                result["measurement_unit"] = "ft"
                break

    # 2. Total Premises Area / Built-up Area
    # Single-token check
    single_area_re = re.compile(
        r"""(?:total\s*(?:premises|built-?up|carpet|plot)?\s*area\s*[:=]?\s*)(?P<val>[\d,]+(?:\.\d+)?)\s*(?P<unit>sq\.?\s*m\.?|m2|m²|sq\.?\s*ft\.?|sf)""",
        re.IGNORECASE,
    )
    for it in ocr_items:
        m = single_area_re.search(it.text)
        if m:
            val_str = m.group("val").replace(",", "")
            result["total_premises_area"] = float(val_str)
            raw_u = m.group("unit").lower().replace(" ", "").replace(".", "")
            result["area_unit"] = "sq.m." if "m" in raw_u else "sq.ft."
            result["measurement_unit"] = "metre" if "m" in raw_u else "ft"
            result["raw_area_callout"] = it.text.strip()
            break

    # Multi-token proximity check (e.g. 'TOTAL PREMISES AREA' on line 1, '10907.8046 SQ.M.' on line 2)
    if result["total_premises_area"] is None:
        for i, it in enumerate(ocr_items):
            t_lower = it.text.lower()
            is_title = ("total" in t_lower and ("premises" in t_lower or "area" in t_lower)) or (
                t_lower == "total" and i + 1 < len(ocr_items) and "premises" in ocr_items[i + 1].text.lower()
            )
            if is_title:
                for j in range(i + 1, min(len(ocr_items), i + 8)):
                    cand = ocr_items[j]
                    cand_text = cand.text.strip()
                    num_match = re.search(r"""(?P<val>\d{3,7}(?:\.\d+)?)""", cand_text)
                    if num_match:
                        val = float(num_match.group("val"))
                        result["total_premises_area"] = val
                        unit_str = cand_text[num_match.end():].strip().lower()
                        if not unit_str and j + 1 < len(ocr_items):
                            unit_str = ocr_items[j + 1].text.strip().lower()
                        if "sq" in unit_str or "m" in unit_str:
                            result["area_unit"] = "sq.m." if "m" in unit_str else "sq.ft."
                            result["measurement_unit"] = "metre" if "m" in unit_str else "ft"
                        else:
                            result["area_unit"] = "sq.m."
                            result["measurement_unit"] = "metre"
                        result["raw_area_callout"] = f"{it.text} = {cand_text}"
                        break
                if result["total_premises_area"] is not None:
                    break

    return result


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
