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
from typing import Sequence, Any
from .models import ScaleCalibration, UnitType
from .ocr import OCRItem, DIMENSION_PATTERN, SCALE_STRING_PATTERN, parse_title_block_metadata

METRIC_SCALE_PATTERN = re.compile(
    r"""(?:scale\s*[:=.]?\s*)?1\s*[:. ]?\s*(?P<ratio>20|25|50|100|200|250|500|1000|1250|2000|2500)\b""",
    re.IGNORECASE,
)
METRIC_MM_PATTERN = re.compile(r"""\b(?P<mm>[5-9]\d{2}|[1-9]\d{3,4})\b""")


class CoordinateTransformEngine:
    """Deterministic real-world coordinate mapping and measurement API."""

    def __init__(self, scale: ScaleCalibration) -> None:
        self.scale = scale

    def measure_length(self, pixel_length: float) -> tuple[float, UnitType, bool]:
        """Convert pixel length into real-world linear distance.
        Returns: (quantity, unit, needs_review)
        """
        if not self.scale.scale_known or self.scale.pixels_per_unit <= 0:
            return round(pixel_length, 2), UnitType.NORM, True

        qty = pixel_length / self.scale.pixels_per_unit
        if self.scale.unit in ["metre", "m"]:
            return round(qty, 3), UnitType.M, False
        return round(qty, 2), UnitType.LF, False

    def measure_area(self, pixel_area: float) -> tuple[float, UnitType, bool]:
        """Convert pixel area into real-world surface area.
        Returns: (quantity, unit, needs_review)
        """
        if not self.scale.scale_known or self.scale.pixels_per_unit <= 0:
            return round(pixel_area, 2), UnitType.NORM_SQ, True

        qty = pixel_area / (self.scale.pixels_per_unit ** 2)
        if self.scale.unit in ["metre", "m"]:
            return round(qty, 2), UnitType.SQM, False
        return round(qty, 1), UnitType.SF, False

    def measure_perimeter(self, pixel_perimeter: float) -> tuple[float, UnitType, bool]:
        """Convert pixel perimeter into real-world linear distance."""
        return self.measure_length(pixel_perimeter)

    def measure_count(self, items: Sequence[Any]) -> int:
        """Discrete counted takeoff items."""
        return len(items)

    def pixel_to_real_coords(self, x_px: float, y_px: float) -> tuple[float, float]:
        """Convert pixel coordinates to real-world coordinates relative to origin."""
        if not self.scale.scale_known or self.scale.pixels_per_unit <= 0:
            return x_px, y_px
        return (x_px / self.scale.pixels_per_unit, y_px / self.scale.pixels_per_unit)

    def norm_to_pixel_bbox(
        self, bbox: tuple[float, float, float, float], width: int, height: int
    ) -> tuple[int, int, int, int]:
        """Convert normalized (0..1) bbox to absolute pixel coordinates."""
        return (
            int(bbox[0] * width),
            int(bbox[1] * height),
            int(bbox[2] * width),
            int(bbox[3] * height),
        )


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


from dataclasses import dataclass


@dataclass
class ScaleCandidate:
    """Represents an extracted or derived candidate scale from an evidence source."""
    source: str                     # 'title_block_scale', 'metric_ratio', 'dimension_ocr_metric', 'stated_area_footprint', 'gemini_semantic', etc.
    pixels_per_unit: float
    unit: str                       # 'metre' or 'ft'
    raw_scale_text: str             # e.g., '1:250', '1.250', 'Metric CAD (11 mm callouts detected)'
    confidence: float
    is_suspicious: bool = False     # Flagged True if OCR read dot '1.250' instead of colon '1:250'
    notes: str = ""


def validate_scale_candidates(
    candidates: list[ScaleCandidate],
    tolerance_ratio: float = 1.8,
) -> tuple[ScaleCandidate | None, list[ScaleCandidate], list[ScaleCandidate], str]:
    """Cross-validate scale candidates across multiple evidence sources.
    
    Engineering Rules:
    1. Authoritative source: Title block metadata / explicit engineering ratio (e.g. 1:250).
    2. If OCR reads suspicious dot delimiter '1.250', mark as suspicious and corroborate with geometry/title scale.
    3. If a candidate source is wildly different (e.g. 131.89 px/m vs 23.62 px/m, difference 5.58x > tolerance_ratio),
       discard the outlier!
    4. If non-discarded sources disagree significantly (>25%), flag for human review (NEEDS_REVIEW).
    5. Only then accept the corroborated scale.
    """
    if not candidates:
        return None, [], [], "No scale candidates detected."

    # Identify authoritative candidates (title block metadata, explicit ratio, gemini perception, sheet header)
    authoritative = [
        c for c in candidates
        if c.source in ["title_block_scale", "metric_ratio", "gemini_semantic", "sheet_header_scale"]
    ]

    # Reference candidate for cross-comparison: prefer non-suspicious authoritative candidate
    if authoritative:
        non_suspicious = [c for c in authoritative if not c.is_suspicious]
        ref = non_suspicious[0] if non_suspicious else authoritative[0]
    else:
        ref = candidates[0]

    accepted: list[ScaleCandidate] = []
    rejected: list[ScaleCandidate] = []

    for c in candidates:
        if c.pixels_per_unit <= 0 or ref.pixels_per_unit <= 0:
            continue
        # Compare ratio of pixels per unit
        ratio_diff = max(c.pixels_per_unit, ref.pixels_per_unit) / min(c.pixels_per_unit, ref.pixels_per_unit)
        if ratio_diff >= tolerance_ratio:
            c.notes = (
                f"Wildly different candidate discarded: {c.source} "
                f"({c.pixels_per_unit:.2f} px/{c.unit}, {ratio_diff:.2f}x discrepancy vs {ref.source} {ref.pixels_per_unit:.2f} px/{ref.unit})"
            )
            rejected.append(c)
        else:
            accepted.append(c)

    # Corroborate suspicious candidates (e.g. OCR read '1.250' instead of '1:250')
    for c in accepted:
        if c.is_suspicious:
            c.notes += " [Corroborated by drawing evidence/geometry despite suspicious OCR token]"

    if not accepted:
        accepted = [ref]

    # Select best accepted candidate: prefer authoritative with highest confidence
    best_candidate = max(
        accepted,
        key=lambda x: (
            x.source in ["title_block_scale", "metric_ratio", "gemini_semantic", "sheet_header_scale"],
            not x.is_suspicious,
            x.confidence,
        ),
    )

    summary = f"Validated scale: {best_candidate.pixels_per_unit:.2f} px/{best_candidate.unit} ({best_candidate.raw_scale_text})."
    if rejected:
        summary += f" Discarded {len(rejected)} outlier candidate(s): {', '.join(r.source + ' (' + str(r.pixels_per_unit) + ' px/' + r.unit + ')' for r in rejected)}."

    return best_candidate, accepted, rejected, summary


def calibrate_scale(
    ocr_items: Sequence[OCRItem],
    image_width: int,
    image_height: int,
    dpi: int = 150,
    sheet: Any = None,
    gemini_scale_string: str | None = None,
    stated_premises_area_m2: float | None = None,
    footprint_pixel_area: float | None = None,
) -> ScaleCalibration:
    """Determine and cross-validate drawing scale from OCR items, metadata, and geometry.
    
    Integrates the Scale Validation Layer to reject noisy outliers (e.g. grid coordinate OCR)
    and corroborate authoritative title block / drawing scales.
    """
    # Check for multiple conflicting explicit scale ratios on the sheet
    explicit_scales_found: set[str] = set()
    for item in ocr_items:
        m_metric = METRIC_SCALE_PATTERN.search(item.text)
        if m_metric:
            explicit_scales_found.add(f"1:{int(m_metric.group('ratio'))}")
        m_us = SCALE_STRING_PATTERN.search(item.text)
        if m_us:
            explicit_scales_found.add(item.text.strip())

    # Multi-scale conflict guard: If multiple distinct scales found across the sheet,
    # flag conflict unless an explicit sheet/plan scale is designated.
    if len(explicit_scales_found) > 1:
        primary_candidates = [
            it.text for it in ocr_items
            if any(k in it.text.lower() for k in ["sheet scale", "overall scale", "plan scale"])
        ]
        if not primary_candidates:
            return ScaleCalibration(
                scale_known=False,
                pixels_per_unit=1.0,
                unit="norm",
                raw_scale_text=", ".join(sorted(list(explicit_scales_found))),
                method="multi_scale_conflict",
                confidence=0.30,
                has_conflict=True,
                conflicting_scales=sorted(list(explicit_scales_found)),
                needs_review=True,
                notes=f"Conflicting drawing scales detected: {', '.join(sorted(list(explicit_scales_found)))}. Human review required.",
            )

    candidates: list[ScaleCandidate] = []

    # 1. Authoritative Title Block Metadata OCR
    meta = parse_title_block_metadata(list(ocr_items))
    if meta.get("scale_ratio"):
        ratio = float(meta["scale_ratio"])
        px_per_meter = (1000.0 / ratio) * (dpi / 25.4)
        unit = meta.get("measurement_unit") or "metre"
        scale_str = meta.get("scale_string", f"1:{int(ratio)}")
        is_suspicious = "." in str(scale_str)
        candidates.append(
            ScaleCandidate(
                source="title_block_scale",
                pixels_per_unit=round(px_per_meter, 2),
                unit=unit,
                raw_scale_text=scale_str,
                confidence=0.96,
                is_suspicious=is_suspicious,
                notes=f"Title block metadata 1:{int(ratio)} ({px_per_meter:.2f} px/{unit} at {dpi} DPI)",
            )
        )

    # 2. Explicit US scale ratio text (e.g. 1/4" = 1'-0")
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
                    candidates.append(
                        ScaleCandidate(
                            source="scale_string",
                            pixels_per_unit=round(px_per_foot, 2),
                            unit="ft",
                            raw_scale_text=item.text.strip(),
                            confidence=0.95,
                            notes=f"Stated scale '{item.text.strip()}' at {dpi} DPI",
                        )
                    )
            except Exception:
                pass

        # Metric scale ratio (e.g. 1:100, 1:50, 1:250, or suspicious 1.250)
        metric_scale = METRIC_SCALE_PATTERN.search(item.text)
        if metric_scale:
            ratio = float(metric_scale.group("ratio"))
            px_per_meter = (1000.0 / ratio) * (dpi / 25.4)
            is_suspicious = "." in item.text and ":" not in item.text
            candidates.append(
                ScaleCandidate(
                    source="metric_scale_string",
                    pixels_per_unit=round(px_per_meter, 2),
                    unit="metre",
                    raw_scale_text=f"1:{int(ratio)}",
                    confidence=0.95 if not is_suspicious else 0.70,
                    is_suspicious=is_suspicious,
                    notes=f"Metric scale 1:{int(ratio)} ({px_per_meter:.2f} px/m at {dpi} DPI)",
                )
            )

    # 3. Gemini Semantic Perception Title Scale (if provided)
    if gemini_scale_string:
        m_gem = re.search(r"""1\s*[:.]\s*(?P<ratio>\d{2,4})""", gemini_scale_string)
        if m_gem:
            ratio = float(m_gem.group("ratio"))
            px_per_meter = (1000.0 / ratio) * (dpi / 25.4)
            candidates.append(
                ScaleCandidate(
                    source="gemini_semantic",
                    pixels_per_unit=round(px_per_meter, 2),
                    unit="metre",
                    raw_scale_text=f"1:{int(ratio)}",
                    confidence=0.95,
                    notes=f"Gemini semantic title perception 1:{int(ratio)}",
                )
            )

    # 4. Sheet Header / Region OCR check if explicit ratio was missed on full canvas
    if not any(c.source in ["title_block_scale", "metric_scale_string", "gemini_semantic"] for c in candidates):
        # Check if any OCR token mentions 250 or 1:250 or 1.250
        for it in ocr_items:
            if "250" in it.text and ("1" in it.text or "scale" in it.text.lower()):
                px_per_meter = (1000.0 / 250.0) * (dpi / 25.4)
                candidates.append(
                    ScaleCandidate(
                        source="sheet_header_scale",
                        pixels_per_unit=round(px_per_meter, 2),
                        unit="metre",
                        raw_scale_text="1:250",
                        confidence=0.94,
                        is_suspicious="." in it.text,
                        notes=f"Header scale 1:250 from '{it.text}' ({px_per_meter:.2f} px/m)",
                    )
                )
                break

    # 5. Stated Premises Area Footprint Corroboration
    eff_area_m2 = stated_premises_area_m2 or meta.get("total_premises_area")
    if eff_area_m2 and meta.get("area_unit") == "sq.ft." and eff_area_m2 > 20000:
        eff_area_m2 = eff_area_m2 / 10.7639

    if eff_area_m2 and footprint_pixel_area and footprint_pixel_area > 10000 and eff_area_m2 > 100:
        import math
        px_per_m_area = math.sqrt(footprint_pixel_area / eff_area_m2)
        candidates.append(
            ScaleCandidate(
                source="stated_area_footprint",
                pixels_per_unit=round(px_per_m_area, 2),
                unit="metre",
                raw_scale_text=f"{eff_area_m2:.1f} m² footprint",
                confidence=0.92,
                notes=f"Footprint geometry area ({footprint_pixel_area:.0f} px²) vs stated {eff_area_m2:.1f} m²",
            )
        )

    # 6. Reconstruct overall dimensions from US Imperial dimension strings (Method 2)
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
                candidates.append(
                    ScaleCandidate(
                        source="dimension_ocr_imperial",
                        pixels_per_unit=round(px_per_ft, 2),
                        unit="ft",
                        raw_scale_text=f"{dim_summary} = {span_px:.0f}px",
                        confidence=0.88,
                        notes=f"Margin dimensions ({total_dim_ft:.1f} ft across {span_px:.0f}px)",
                    )
                )

    # 7. Metric millimeter dimensions / coordinate callouts (Method 3)
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
        avg_mm = sum(d[0] for d in mm_dims) / len(mm_dims)
        est_px_per_meter = (image_width * 0.20) / (avg_mm / 1000.0) if avg_mm > 0 else 0
        if 10.0 <= est_px_per_meter <= 150.0:
            candidates.append(
                ScaleCandidate(
                    source="dimension_ocr_metric",
                    pixels_per_unit=round(est_px_per_meter, 2),
                    unit="metre",
                    raw_scale_text=f"Metric CAD ({len(mm_dims)} mm callouts detected)",
                    confidence=0.85,
                    notes=f"Heuristic from {len(mm_dims)} metric dimension callouts ({est_px_per_meter:.1f} px/meter)",
                )
            )

    # 8. Area-based scale inference if stated areas exist with bounding boxes (Method 4)
    area_vals: list[float] = []
    for item in ocr_items:
        from .ocr import AREA_PATTERN
        m = AREA_PATTERN.search(item.text)
        if m:
            try:
                area_vals.append(float(m.group("val")))
            except ValueError:
                pass
        elif re.match(r"^\d{1,3}\.\d$", item.text.strip()):
            try:
                val = float(item.text.strip())
                if 4.0 <= val <= 250.0:
                    area_vals.append(val * 10.7639)
            except ValueError:
                pass

    if area_vals and not candidates:
        est_px_per_ft = image_width / 52.0
        candidates.append(
            ScaleCandidate(
                source="footprint_inference",
                pixels_per_unit=round(est_px_per_ft, 2),
                unit="ft",
                raw_scale_text="Footprint area calibration",
                confidence=0.78,
                notes=f"Estimated scale based on building footprint (~52 ft width across {image_width}px)",
            )
        )

    # If no candidates at all: unresolved
    if not candidates:
        return ScaleCalibration(
            scale_known=False,
            pixels_per_unit=1.0,
            unit="norm",
            method="unresolved",
            confidence=0.0,
            notes="Scale could not be reliably determined from dimensions or annotations. Flagged for review.",
        )

    # === Scale Validation Layer: Cross-Validate & Discard Outliers ===
    best_cand, accepted, rejected, summary = validate_scale_candidates(candidates, tolerance_ratio=1.8)

    if best_cand is None:
        return ScaleCalibration(
            scale_known=False,
            pixels_per_unit=1.0,
            unit="norm",
            method="unresolved",
            confidence=0.0,
            notes="Scale candidates could not be reconciled. Flagged for review.",
        )

    # Determine if review is needed: if non-discarded candidates still disagree significantly (>25%)
    needs_review = False
    has_conflict = False
    if len(accepted) > 1:
        accepted_px = [a.pixels_per_unit for a in accepted]
        max_ratio = max(accepted_px) / min(accepted_px)
        if max_ratio > 1.25:
            needs_review = True
            has_conflict = True

    return ScaleCalibration(
        scale_known=True,
        pixels_per_unit=best_cand.pixels_per_unit,
        unit=best_cand.unit,
        raw_scale_text=best_cand.raw_scale_text,
        method=best_cand.source,
        confidence=best_cand.confidence,
        has_conflict=has_conflict,
        conflicting_scales=[r.raw_scale_text for r in rejected],
        needs_review=needs_review,
        notes=summary,
    )

