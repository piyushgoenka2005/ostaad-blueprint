"""Unit tests for Phase 8: Anti-Hallucination Guardrails & Gates."""

import pytest
from ostaad_boq.models import (
    DrawingType,
    ValidationStatus,
    QuantityType,
    EvidenceCandidate,
    TakeoffLine,
    RoomTakeoff,
    ScaleCalibration,
    UnitType,
    CalculationMethod,
)
from ostaad_boq.anti_hallucination import AntiHallucinationEngine


def test_site_survey_purges_residential_rooms():
    """Verify that a drawing classified as SITE_TOPOGRAPHICAL_SURVEY purges any room takeoff."""
    fake_rooms = [
        RoomTakeoff(id="room-1", name="Main Living Space", measured_area_sqft=320.0),
        RoomTakeoff(id="room-2", name="Secondary Suite", measured_area_sqft=180.0),
    ]

    rooms, candidates, lines, flags = AntiHallucinationEngine.enforce_site_survey_invariants(
        drawing_type=DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
        rooms=fake_rooms,
        candidates=[],
        lines=[],
    )

    assert len(rooms) == 0
    assert len(flags) >= 1
    assert "Purged residential rooms" in flags[0].subject


def test_site_survey_rejects_doors_and_plumbing_lines():
    """Verify that site surveys reject doors, windows, and toilets from BOQ takeoff lines."""
    fake_lines = [
        TakeoffLine(
            id="line-door",
            item_description="Single Flush Interior Door",
            category="08 10 00 - Doors and Frames",
            quantity=8.0,
            unit=UnitType.EA,
            calculation_method=CalculationMethod.COUNTED,
        ),
        TakeoffLine(
            id="line-wc",
            item_description="Vitreous China Water Closet WC",
            category="22 40 00 - Plumbing Fixtures",
            quantity=2.0,
            unit=UnitType.EA,
            calculation_method=CalculationMethod.COUNTED,
        ),
        TakeoffLine(
            id="line-boundary",
            item_description="Property Boundary Wall Enclosure",
            category="31 00 00 - Earthwork & Site Civil",
            quantity=250.0,
            unit=UnitType.M,
            calculation_method=CalculationMethod.LINEAR_MEASURED,
        ),
    ]

    rooms, candidates, filtered_lines, flags = AntiHallucinationEngine.enforce_site_survey_invariants(
        drawing_type=DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
        rooms=[],
        candidates=[],
        lines=fake_lines,
    )

    # Only boundary wall must survive
    assert len(filtered_lines) == 1
    assert filtered_lines[0].id == "line-boundary"
    assert len(flags) == 2  # Flags for door and WC rejection


def test_unresolved_scale_sets_needs_review():
    """Verify that uncalibrated scale marks dimensional lines as NEEDS_REVIEW."""
    unresolved_scale = ScaleCalibration(scale_known=False, unit="norm")
    lines = [
        TakeoffLine(
            id="line-wall",
            item_description="Drywall Partition Wall",
            category="09 22 00",
            quantity=45.0,
            unit=UnitType.LF,
            calculation_method=CalculationMethod.LINEAR_MEASURED,
            is_measured=True,
        )
    ]

    validated_lines = AntiHallucinationEngine.enforce_scale_invariant(unresolved_scale, lines)
    assert validated_lines[0].needs_review is True
    assert validated_lines[0].validation_status == ValidationStatus.NEEDS_REVIEW


def test_uncorroborated_ai_cannot_be_verified():
    """Verify that AI-only candidates with no corroborating evidence are downgraded from VERIFIED."""
    unsupported_candidate = EvidenceCandidate(
        item_type="door",
        category="08 10 00",
        source="GEMINI",
        quantity=8.0,
        confidence=0.88,
        validation_status=ValidationStatus.VERIFIED,
        corroborating_evidence_ids=[],  # Zero corroborating evidence
    )

    filtered = AntiHallucinationEngine.filter_unsupported_ai_candidates([unsupported_candidate])
    assert filtered[0].validation_status == ValidationStatus.SUPPORTED
