"""Gemini 3.8 Flash Semantic Perception Service with Pro Escalation and Cost Telemetry.

Provides structured perception for:
1. Drawing Classification Corroboration
2. Title Block Metadata Parsing
3. Door / Window / Finish Schedule Parsing
4. Candidate Object & Symbol Detection (bounding boxes normalized to [0, 1000])

Enforces strict role boundaries:
- SEMANTIC PERCEPTION AND CANDIDATE EVIDENCE ONLY.
- NEVER AUTHORITATIVE MEASUREMENTS (lengths, areas, volumes).
"""

from __future__ import annotations

import os
import time
import json
import logging
from typing import Optional, Dict, Any, Type, List
from pydantic import BaseModel, Field

logger = logging.getLogger("ostaad_boq.gemini")

# Standard Gemini API Pricing (USD per 1 Million Tokens)
# Gemini 3.8 Flash (estimated tier pricing)
FLASH_INPUT_COST_PER_M = 0.075
FLASH_OUTPUT_COST_PER_M = 0.300
# Gemini 3.1 Pro Preview tier
PRO_INPUT_COST_PER_M = 1.250
PRO_OUTPUT_COST_PER_M = 5.000


class GeminiTelemetry(BaseModel):
    """Execution telemetry captured for every API call."""
    model_id: str
    prompt_tokens: int = 0
    candidate_tokens: int = 0
    total_tokens: int = 0
    latency_seconds: float = 0.0
    estimated_cost_usd: float = 0.0
    was_escalated: bool = False
    cached_hit: bool = False


class GeminiTitleBlockResponse(BaseModel):
    project_name: Optional[str] = None
    sheet_title: Optional[str] = None
    scale_string: Optional[str] = None
    stated_total_area: Optional[str] = None
    unit_statement: Optional[str] = None
    revision: Optional[str] = None
    architect_or_engineer: Optional[str] = None
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)


class GeminiScheduleRow(BaseModel):
    tag: str
    description: Optional[str] = None
    width: Optional[str] = None
    height: Optional[str] = None
    material: Optional[str] = None
    quantity: Optional[float] = None
    remarks: Optional[str] = None


class GeminiScheduleResponse(BaseModel):
    schedule_type: str  # "door_schedule", "window_schedule", "area_summary"
    rows: List[GeminiScheduleRow] = Field(default_factory=list)
    confidence: float = Field(default=0.90, ge=0.0, le=1.0)


class GeminiCandidateBox(BaseModel):
    label: str
    box_2d: List[int]  # [ymin, xmin, ymax, xmax] in [0, 1000]
    category: str
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)


class GeminiObjectDetectionResponse(BaseModel):
    candidates: List[GeminiCandidateBox] = Field(default_factory=list)


class GeminiService:
    """Production service client managing Gemini 3.8 Flash and escalation to Pro."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        primary_model: str = "gemini-2.5-flash",
        escalation_model: str = "gemini-2.5-pro",
        max_retries: int = 2,
        request_timeout: float = 15.0,
    ) -> None:
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except Exception:
            pass

        if api_key is not None:
            self.api_key = api_key
        else:
            self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
        self.primary_model = os.environ.get("GEMINI_PRIMARY_MODEL") or primary_model or "gemini-2.5-flash"
        self.escalation_model = os.environ.get("GEMINI_ESCALATION_MODEL") or escalation_model or "gemini-2.5-pro"
        self.max_retries = max_retries
        self.request_timeout = request_timeout
        self.client = None

        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google.genai Client: {e}")

    @property
    def is_available(self) -> bool:
        """Returns True if a live Gemini client is configured and authorized."""
        return self.client is not None and bool(self.api_key)

    def calculate_cost(self, model: str, prompt_tokens: int, candidate_tokens: int) -> float:
        """Calculate USD cost from token counts."""
        if "pro" in model.lower():
            in_rate = PRO_INPUT_COST_PER_M
            out_rate = PRO_OUTPUT_COST_PER_M
        else:
            in_rate = FLASH_INPUT_COST_PER_M
            out_rate = FLASH_OUTPUT_COST_PER_M

        cost = (prompt_tokens / 1_000_000.0) * in_rate + (candidate_tokens / 1_000_000.0) * out_rate
        return round(cost, 6)

    def generate_structured(
        self,
        prompt: str,
        image_bytes: Optional[bytes] = None,
        response_model: Type[BaseModel] = BaseModel,
        escalate_on_ambiguity: bool = False,
    ) -> tuple[Optional[BaseModel], GeminiTelemetry]:
        """Generate structured Pydantic response with automatic retry, telemetry, and escalation."""
        start_time = time.time()
        active_model = self.escalation_model if escalate_on_ambiguity else self.primary_model
        telemetry = GeminiTelemetry(
            model_id=active_model,
            was_escalated=escalate_on_ambiguity,
        )

        if not self.is_available:
            logger.info("GeminiService: API key not provided. Returning offline status.")
            telemetry.latency_seconds = round(time.time() - start_time, 3)
            return None, telemetry

        # Invoke Gemini with exponential backoff on transient errors
        last_exception = None
        for attempt in range(1, self.max_retries + 1):
            try:
                from google.genai import types

                contents: List[Any] = [prompt]
                if image_bytes:
                    mime = "image/jpeg" if (len(image_bytes) >= 2 and image_bytes[:2] == b'\xff\xd8') else "image/png"
                    contents.append(
                        types.Part.from_bytes(data=image_bytes, mime_type=mime)
                    )

                response = self.client.models.generate_content(
                    model=active_model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=response_model,
                        temperature=0.1,  # Low temperature for deterministic semantic extraction
                    ),
                )

                # Capture usage
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    telemetry.prompt_tokens = response.usage_metadata.prompt_token_count or 0
                    telemetry.candidate_tokens = response.usage_metadata.candidates_token_count or 0
                    telemetry.total_tokens = response.usage_metadata.total_token_count or 0
                    telemetry.estimated_cost_usd = self.calculate_cost(
                        active_model, telemetry.prompt_tokens, telemetry.candidate_tokens
                    )

                telemetry.latency_seconds = round(time.time() - start_time, 3)

                # Parse validated JSON into Pydantic model
                if response.text:
                    parsed = response_model.model_validate_json(response.text)
                    return parsed, telemetry
                else:
                    return None, telemetry

            except Exception as e:
                last_exception = e
                logger.warning(f"Gemini API attempt {attempt} failed: {e}")
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt * 0.5)

        logger.error(f"GeminiService failed after {self.max_retries} attempts: {last_exception}")
        telemetry.latency_seconds = round(time.time() - start_time, 3)
        return None, telemetry
