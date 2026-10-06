"""Unit tests for Phase 4: Gemini Service Adapter & Cost Control."""

import pytest
from ostaad_boq.gemini_service import (
    GeminiService,
    GeminiTelemetry,
    GeminiTitleBlockResponse,
    GeminiScheduleResponse,
    GeminiScheduleRow,
    GeminiCandidateBox,
    GeminiObjectDetectionResponse,
)


def test_gemini_service_offline_mode_graceful():
    """Verify that absent GEMINI_API_KEY causes graceful offline behavior without crashes."""
    service = GeminiService(api_key="")
    assert not service.is_available

    parsed, telemetry = service.generate_structured(
        prompt="Extract title block",
        response_model=GeminiTitleBlockResponse,
    )

    assert parsed is None
    assert isinstance(telemetry, GeminiTelemetry)
    assert telemetry.model_id == "gemini-3.8-flash"
    assert telemetry.total_tokens == 0
    assert telemetry.estimated_cost_usd == 0.0


def test_gemini_cost_calculation():
    """Verify mathematical calculation of token expenditures."""
    service = GeminiService()

    # Flash Tier: 10,000 prompt tokens ($0.075/M) + 1,000 output tokens ($0.30/M)
    # Prompt cost = 10000 / 1e6 * 0.075 = 0.00075
    # Output cost = 1000 / 1e6 * 0.30 = 0.00030
    # Total = 0.00105
    flash_cost = service.calculate_cost("gemini-3.8-flash", 10_000, 1_000)
    assert flash_cost == 0.00105

    # Pro Tier: 10,000 prompt tokens ($1.25/M) + 1,000 output tokens ($5.00/M)
    # Prompt cost = 10000 / 1e6 * 1.25 = 0.0125
    # Output cost = 1000 / 1e6 * 5.00 = 0.0050
    # Total = 0.0175
    pro_cost = service.calculate_cost("gemini-3.1-pro-preview", 10_000, 1_000)
    assert pro_cost == 0.0175


def test_gemini_title_block_schema_validation():
    """Verify title block schema parses valid JSON correctly."""
    mock_json = """
    {
        "project_name": "Commercial Complex Phase 1",
        "sheet_title": "Ground Floor Plan",
        "scale_string": "1:100",
        "stated_total_area": "450 SQ.M.",
        "unit_statement": "ALL DIMENSIONS IN METRES",
        "confidence": 0.95
    }
    """
    parsed = GeminiTitleBlockResponse.model_validate_json(mock_json)
    assert parsed.project_name == "Commercial Complex Phase 1"
    assert parsed.scale_string == "1:100"
    assert parsed.stated_total_area == "450 SQ.M."
    assert parsed.confidence == 0.95


def test_gemini_schedule_schema_validation():
    """Verify schedule table schema parses row entries."""
    mock_json = """
    {
        "schedule_type": "door_schedule",
        "rows": [
            {"tag": "D1", "description": "Flush Door", "width": "900mm", "height": "2100mm", "quantity": 8},
            {"tag": "D2", "description": "Balcony Door", "width": "1200mm", "height": "2100mm", "quantity": 4}
        ],
        "confidence": 0.92
    }
    """
    parsed = GeminiScheduleResponse.model_validate_json(mock_json)
    assert parsed.schedule_type == "door_schedule"
    assert len(parsed.rows) == 2
    assert parsed.rows[0].tag == "D1"
    assert parsed.rows[0].quantity == 8.0


def test_gemini_candidate_detection_schema_validation():
    """Verify candidate detection boxes conform to [ymin, xmin, ymax, xmax] in [0, 1000]."""
    mock_json = """
    {
        "candidates": [
            {"label": "D1", "box_2d": [100, 200, 150, 250], "category": "door", "confidence": 0.88}
        ]
    }
    """
    parsed = GeminiObjectDetectionResponse.model_validate_json(mock_json)
    assert len(parsed.candidates) == 1
    assert parsed.candidates[0].box_2d == [100, 200, 150, 250]
    assert parsed.candidates[0].label == "D1"
