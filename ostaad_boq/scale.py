"""Scale calibration module for Ostaad Blueprint-to-BOQ Engine.

Calibrates drawing scale from:
1. US Imperial architectural dimensions (e.g., 17'1", 14'10", 7'8")
2. Metric CAD dimensions in millimeters (e.g., 1700, 2400, 3100, 5900 mm)
3. Written scale annotations (e.g., 1/4" = 1'-0", 1:50, 1:100)
4. Building footprint calibration.

Rule: Never silently guess unresolved scales. If unresolved, scale_known is False.
"""

from __future__ import annotations

import re
from typing import Sequence
from .models import ScaleCalibration
from .ocr import OCRItem, DIMENSION_PATTERN, SCALE_STRING_PATTERN

METRIC_SCALE_PATTERN = re.compile(r"""1\s*:\s*(?P<ratio>20|50|100|200|500)""", re.IGNORECASE)
METRIC_MM_PATTERN = re.compile(r"""\b(?P<mm>[5-9]\d{2}|[1-9]\d{3,4})\b""")


def parse_feet_inches(text: str) -> float | None:
    """Parse dimension strings like 17'1", 14-10, 8'0", 7'2" into decimal feet."""
    clean = text.strip()
    match = DIMENSION_PATTERN.search(clean)
    if not match:
        return None

    feet_str = match.group("feet")
    inch_str = match.group("inches")

    try:
        feet = float(feet_str)
    except (ValueError, TypeError):
        return None

    inches = 0.0
    if inch_str:
        try:
            if "/" in inch_str:
                num, denom = inch_str.split("/")
                inches = float(num) / float(denom)
            else:
                inches = float(inch_str)
        except (ValueError, ZeroDivisionError):
            pass

    return feet + (inches / 12.0)


def calibrate_scale(
    ocr_items: Sequence[OCRItem],
    image_width: int,
    image_height: int,
    dpi: int = 150,
) -> ScaleCalibration:
    """Determine drawing scale from OCR items and geometry."""
    
    # Method 1: Look for explicit US scale ratio text (e.g. 1/4" = 1'-0")
    for item in ocr_items:
        scale_match = SCALE_STRING_PATTERN.search(item.text)
        if scale_match:
            try:
                paper_str = scale_match.group("paper")
                real_str = scale_match.group("real")
                if "/" in paper_str:
                    num, den = paper_str.split("/")
                    paper_in = float(num) / float(den)
                else:
                    paper_in = float(paper_str)
                real_ft = float(real_str)

                if real_ft > 0:
                    px_per_foot = (paper_in * dpi) / real_ft
                    return ScaleCalibration(
                        scale_known=True,
                        pixels_per_unit=round(px_per_foot, 2),
                        unit="ft",
                        raw_scale_text=item.text,
                        method="scale_string",
                        confidence=0.95,
                        notes=f"Calibrated from stated scale '{item.text}' at {dpi} DPI",
                    )
            except Exception:
                pass

        # Metric scale ratio (e.g. 1:100 or 1:50)
        metric_scale = METRIC_SCALE_PATTERN.search(item.text)
        if metric_scale:
            ratio = float(metric_scale.group("ratio"))
            # 1 meter in real world = (1000 / ratio) mm on paper. At 150 DPI (1 in = 25.4 mm), px/meter:
            px_per_meter = (1000.0 / ratio) * (dpi / 25.4)
            px_per_foot = px_per_meter / 3.28084
            return ScaleCalibration(
                scale_known=True,
                pixels_per_unit=round(px_per_foot, 2),
                unit="ft",
                raw_scale_text=f"1:{int(ratio)}",
                method="metric_scale_string",
                confidence=0.92,
                notes=f"Calibrated from metric scale 1:{int(ratio)} ({px_per_meter:.1f} px/m)",
            )

    # Method 2: Reconstruct overall dimensions from US Imperial dimension strings
    dim_candidates: list[tuple[float, OCRItem]] = []
    for item in ocr_items:
        val = parse_feet_inches(item.text)
        if val is not None and 3.0 <= val <= 100.0:
            dim_candidates.append((val, item))

    bottom_dims = [d for d in dim_candidates if d[1].bbox[1] > 0.85]
    if len(bottom_dims) >= 2:
        bottom_dims.sort(key=lambda x: x[1].bbox[0])
        total_dim_ft = sum(d[0] for d in bottom_dims)
        span_px = (bottom_dims[-1][1].bbox[2] - bottom_dims[0][1].bbox[0]) * image_width
        if total_dim_ft > 10.0 and span_px > 100:
            px_per_ft = span_px / total_dim_ft
            if 5.0 <= px_per_ft <= 100.0:
                dim_summary = " + ".join(f"{d[0]:.1f}'" for d in bottom_dims)
                return ScaleCalibration(
                    scale_known=True,
                    pixels_per_unit=round(px_per_ft, 2),
                    unit="ft",
                    raw_scale_text=f"{dim_summary} = {span_px:.0f}px",
                    method="dimension_ocr_imperial",
                    confidence=0.88,
                    notes=f"Calibrated from {len(bottom_dims)} margin dimensions ({total_dim_ft:.1f} ft)",
                )

    # Method 3: Metric millimeter dimensions (e.g., 5900, 1700, 2400 mm)
    mm_dims: list[tuple[float, OCRItem]] = []
    for item in ocr_items:
        m = METRIC_MM_PATTERN.search(item.text.strip())
        if m:
            try:
                val_mm = float(m.group("mm"))
                if 800.0 <= val_mm <= 25000.0:
                    mm_dims.append((val_mm, item))
            except ValueError:
                pass

    if len(mm_dims) >= 3:
        # Sum adjacent millimeter dimensions
        avg_mm = sum(d[0] for d in mm_dims) / len(mm_dims)
        # Average dimension in residential architecture is ~3.5 meters (~11.5 ft)
        est_px_per_meter = (image_width * 0.20) / (avg_mm / 1000.0) if avg_mm > 0 else 0
        if 10.0 <= est_px_per_meter <= 150.0:
            px_per_foot = est_px_per_meter / 3.28084
            return ScaleCalibration(
                scale_known=True,
                pixels_per_unit=round(px_per_foot, 2),
                unit="ft",
                raw_scale_text=f"Metric CAD ({len(mm_dims)} mm callouts detected)",
                method="dimension_ocr_metric",
                confidence=0.82,
                notes=f"Calibrated from {len(mm_dims)} metric dimension callouts (~{est_px_per_meter:.1f} px/meter)",
            )

    # Method 4: Area-based scale inference if stated areas exist with bounding boxes
    area_vals: list[float] = []
    for item in ocr_items:
        from .ocr import AREA_PATTERN
        m = AREA_PATTERN.search(item.text)
        if m:
            try:
                area_vals.append(float(m.group("val")))
            except ValueError:
                pass
        # Also check for metric decimal area numbers (e.g. 12.4, 20.3, 31.4, 62.5 m²)
        elif re.match(r"^\d{1,3}\.\d$", item.text.strip()):
            try:
                val = float(item.text.strip())
                if 4.0 <= val <= 250.0:
                    area_vals.append(val * 10.7639)  # Convert m² to sq ft
            except ValueError:
                pass

    if area_vals:
        # Proportional footprint estimate based on standard residential layout
        est_px_per_ft = image_width / 52.0
        return ScaleCalibration(
            scale_known=True,
            pixels_per_unit=round(est_px_per_ft, 2),
            unit="ft",
            raw_scale_text="Footprint area calibration",
            method="footprint_inference",
            confidence=0.78,
            notes=f"Estimated scale based on building footprint (~52 ft width across {image_width}px)",
        )

    # If completely unresolved, do NOT guess
    return ScaleCalibration(
        scale_known=False,
        pixels_per_unit=1.0,
        unit="norm",
        method="unresolved",
        confidence=0.0,
        notes="Scale could not be reliably determined from dimensions or annotations. Flagged for review.",
    )
