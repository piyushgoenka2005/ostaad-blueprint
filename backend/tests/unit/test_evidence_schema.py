"""Unit tests for Phase 1: Unified Evidence Schema (ValidationStatus, QuantityType, EvidenceCandidate)."""

import json
import pytest
from pydantic import ValidationError

from ostaad_boq.models import (
    ValidationStatus,
    QuantityType,
    EvidenceCandidate,
    TakeoffLine,
    UnitType,
    CalculationMethod,
    BOQReport,
    ScaleCalibration,
)


def test_validation_status_enum():
    """Verify all required validation statuses exist and serialize properly."""
    assert ValidationStatus.VERIFIED.value == "VERIFIED"
    assert ValidationStatus.SUPPORTED.value == "SUPPORTED"
    assert ValidationStatus.NEEDS_REVIEW.value == "NEEDS_REVIEW"
    assert ValidationStatus.REJECTED.value == "REJECTED"


def test_quantity_type_enum():
    """Verify all required quantity types exist and serialize properly."""
    assert QuantityType.MEASURED_QUANTITY.value == "MEASURED_QUANTITY"
    assert QuantityType.DERIVED_QUANTITY.value == "DERIVED_QUANTITY"
    assert QuantityType.ESTIMATED_QUANTITY.value == "ESTIMATED_QUANTITY"


def test_evidence_candidate_creation_and_defaults():
    """Verify EvidenceCandidate initializes with sensible defaults and unique IDs."""
    candidate = EvidenceCandidate(
        item_type="door",
        category="08 10 00 - Doors and Frames",
        source="GEMINI",
        source_model="gemini-3.8-flash",
        bbox_normalized=[0.1, 0.2, 0.3, 0.4],
        quantity=1.0,
        unit="EA",
        confidence=0.92,
    )

    assert candidate.id is not None
    assert len(candidate.id) > 10
    assert candidate.validation_status == ValidationStatus.NEEDS_REVIEW
    assert candidate.quantity_type == QuantityType.ESTIMATED_QUANTITY
    assert candidate.bbox_normalized == [0.1, 0.2, 0.3, 0.4]
    assert candidate.confidence == 0.92


def test_evidence_candidate_confidence_bounds():
    """Confidence must strictly be between 0.0 and 1.0."""
    with pytest.raises(ValidationError):
        EvidenceCandidate(
            item_type="door",
            category="08 10 00",
            source="GEMINI",
            confidence=1.5,  # Invalid
        )

    with pytest.raises(ValidationError):
        EvidenceCandidate(
            item_type="door",
            category="08 10 00",
            source="GEMINI",
            confidence=-0.1,  # Invalid
        )


def test_evidence_candidate_json_roundtrip():
    """Verify lossless JSON serialization and deserialization."""
    candidate = EvidenceCandidate(
        item_type="window",
        category="08 50 00 - Windows",
        source="OCR_SCHEDULE",
        sheet_id="sheet-101",
        page_number=2,
        raw_text="W1 1200x1500",
        normalized_text="W1",
        quantity=4.0,
        unit="EA",
        confidence=0.98,
        corroborating_evidence_ids=["vec-001", "vec-002"],
        validation_status=ValidationStatus.VERIFIED,
        quantity_type=QuantityType.MEASURED_QUANTITY,
    )

    dumped = candidate.model_dump_json()
    loaded = EvidenceCandidate.model_validate_json(dumped)

    assert loaded.id == candidate.id
    assert loaded.validation_status == ValidationStatus.VERIFIED
    assert loaded.quantity_type == QuantityType.MEASURED_QUANTITY
    assert loaded.corroborating_evidence_ids == ["vec-001", "vec-002"]


def test_takeoff_line_backwards_compatibility():
    """Verify existing TakeoffLine calls work without specifying new fields."""
    line = TakeoffLine(
        id="line-1",
        item_description="Single Flush Door",
        category="08 10 00 - Doors and Frames",
        quantity=5.0,
        unit=UnitType.EA,
        calculation_method=CalculationMethod.COUNTED,
    )

    # Defaults ensure zero breakage of existing downstream consumers
    assert line.validation_status == ValidationStatus.SUPPORTED
    assert line.quantity_type == QuantityType.MEASURED_QUANTITY
    assert line.corroborating_evidence_ids == []


def test_boq_report_evidence_candidates_aggregation():
    """Verify BOQReport seamlessly accepts and exposes evidence candidates."""
    scale = ScaleCalibration(scale_known=True, pixels_per_unit=25.0, unit="m")
    candidate = EvidenceCandidate(
        item_type="boundary_wall",
        category="31 00 00 - Earthwork & Site Civil",
        source="OPENCV",
        quantity=345.2,
        unit="M",
        validation_status=ValidationStatus.VERIFIED,
        quantity_type=QuantityType.MEASURED_QUANTITY,
    )

    report = BOQReport(
        project_name="Test Project",
        sheet_name="Page 1",
        scale=scale,
        evidence_candidates=[candidate],
    )

    assert len(report.evidence_candidates) == 1
    assert report.evidence_candidates[0].validation_status == ValidationStatus.VERIFIED
    assert report.evidence_candidates[0].quantity == 345.2
