"""Unit tests for the Scale Validation Layer in Ostaad Blueprint-to-BOQ Engine."""

import pytest
from ostaad_boq.scale import (
    ScaleCandidate,
    validate_scale_candidates,
    calibrate_scale,
)
from ostaad_boq.ocr import OCRItem
from ostaad_boq.models import ScaleCalibration


def test_outlier_scale_rejected_and_title_scale_accepted():
    """Verify that a wildly different candidate (131.89 px/m) is discarded as an outlier,
    and authoritative title scale (23.62 px/m) is accepted with 5.58x discrepancy reported.
    """
    candidates = [
        ScaleCandidate(
            source="title_block_scale",
            pixels_per_unit=23.62,
            unit="metre",
            raw_scale_text="1:250",
            confidence=0.96,
            is_suspicious=False,
            notes="Title block metadata 1:250",
        ),
        ScaleCandidate(
            source="dimension_ocr_metric",
            pixels_per_unit=131.89,
            unit="metre",
            raw_scale_text="Metric CAD (11 mm callouts detected)",
            confidence=0.85,
            is_suspicious=False,
            notes="Noisy grid coordinate callout heuristic",
        ),
    ]

    best, accepted, rejected, summary = validate_scale_candidates(candidates, tolerance_ratio=1.8)

    assert best is not None
    assert abs(best.pixels_per_unit - 23.62) < 0.05
    assert best.raw_scale_text == "1:250"
    assert best.source == "title_block_scale"

    # Outlier verification
    assert len(rejected) == 1
    assert rejected[0].source == "dimension_ocr_metric"
    assert rejected[0].pixels_per_unit == 131.89
    assert "5.58x discrepancy" in rejected[0].notes
    assert "Discarded 1 outlier candidate(s)" in summary


def test_suspicious_ocr_dot_delimiter_corroborated():
    """Verify that OCR reading '1.250' with a dot is flagged as suspicious
    and corroborated with drawing evidence/ratio 1:250.
    """
    candidates = [
        ScaleCandidate(
            source="metric_ratio",
            pixels_per_unit=23.62,
            unit="metre",
            raw_scale_text="1:250",
            confidence=0.70,
            is_suspicious=True,
            notes="Suspicious OCR dot delimiter in ratio 1.250",
        ),
        ScaleCandidate(
            source="stated_area_footprint",
            pixels_per_unit=23.65,
            unit="metre",
            raw_scale_text="10907.8 m² footprint",
            confidence=0.92,
            is_suspicious=False,
            notes="Footprint geometry corroboration",
        ),
    ]

    best, accepted, rejected, summary = validate_scale_candidates(candidates, tolerance_ratio=1.8)

    assert best is not None
    assert abs(best.pixels_per_unit - 23.62) < 0.1
    assert len(rejected) == 0
    assert len(accepted) == 2
    # Verify corroboration note appended
    suspicious_item = [c for c in accepted if c.is_suspicious][0]
    assert "Corroborated by drawing evidence/geometry" in suspicious_item.notes


def test_calibrate_scale_e2e_rejection_of_noisy_mm():
    """End-to-end test on calibrate_scale: when noisy metric numbers exist alongside
    authoritative 1:250 or 1.250 scale token, the noisy 131.89 px/m is discarded
    and 23.62 px/m is returned.
    """
    ocr_items = [
        # Authoritative title block / ratio token (even with dot delimiter 'SCALE 1.250')
        OCRItem(text="SCALE 1.250", confidence=0.90, bbox=(0.91, 0.01, 0.96, 0.02)),
        # Noisy grid coordinate numbers that previously triggered Method 3
        OCRItem(text="20700", confidence=0.88, bbox=(0.1, 0.1, 0.15, 0.12)),
        OCRItem(text="10402", confidence=0.88, bbox=(0.2, 0.2, 0.25, 0.22)),
        OCRItem(text="2410", confidence=0.88, bbox=(0.3, 0.3, 0.35, 0.32)),
        OCRItem(text="3000", confidence=0.88, bbox=(0.4, 0.4, 0.45, 0.42)),
    ]

    scale: ScaleCalibration = calibrate_scale(
        ocr_items=ocr_items,
        image_width=3112,
        image_height=2334,
        dpi=150,
    )

    assert scale.scale_known is True
    assert scale.unit == "metre"
    assert scale.raw_scale_text == "1:250"
    # 23.62 px/m accepted
    assert abs(scale.pixels_per_unit - 23.62) < 0.2
    assert scale.has_conflict is False
    assert scale.needs_review is False
    # Verify rejection of outlier in conflicting_scales or notes
    assert any("dimension_ocr_metric" in s or "Metric CAD" in s for s in scale.conflicting_scales) or "Discarded" in scale.notes
