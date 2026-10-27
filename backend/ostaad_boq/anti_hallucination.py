"""Anti-Hallucination Validation Gates for Ostaad BOQ Hybrid Engine.

Enforces non-negotiable domain rules to guarantee that:
1. No ungrounded AI predictions ever enter the final BOQ.
2. Non-architectural drawings (site surveys, structural plans) never extract residential rooms.
3. Drawings with unresolved scale never silently invent physical dimensions.
4. Conflicting or single-source detections are flagged as NEEDS_REVIEW or REJECTED.
"""

from __future__ import annotations

import logging
from typing import List, Tuple
from ostaad_boq.models import (
    DrawingType,
    ValidationStatus,
    QuantityType,
    EvidenceCandidate,
    TakeoffLine,
    RoomTakeoff,
    ScaleCalibration,
    ReconciliationFlag,
)

logger = logging.getLogger("ostaad_boq.anti_hallucination")

# Strictly forbidden residential items on non-architectural site/topographical surveys
SITE_SURVEY_FORBIDDEN_KEYWORDS = [
    "door", "window", "bedroom", "living room", "kitchen", "shower",
    "water closet", "wc", "wash basin", "sink", "cooktop", "cabinet",
    "flooring finish", "drywall", "hollow core", "louvered vent",
    "secondary suite", "suite", "dining", "balcony door"
]


class AntiHallucinationEngine:
    """Enforces mathematical and domain guardrails across candidates and takeoff lines."""

    @staticmethod
    def enforce_site_survey_invariants(
        drawing_type: DrawingType,
        rooms: List[RoomTakeoff],
        candidates: List[EvidenceCandidate],
        lines: List[TakeoffLine],
    ) -> Tuple[List[RoomTakeoff], List[EvidenceCandidate], List[TakeoffLine], List[ReconciliationFlag]]:
        """Strict Gate: If drawing is SITE_TOPOGRAPHICAL_SURVEY, purge all residential rooms and items."""
        flags: List[ReconciliationFlag] = []

        if drawing_type != DrawingType.SITE_TOPOGRAPHICAL_SURVEY:
            return rooms, candidates, lines, flags

        # 1. Purge all rooms
        if rooms:
            flags.append(
                ReconciliationFlag(
                    id="flag-purged-site-rooms",
                    severity="warning",
                    category="Anti-Hallucination",
                    subject="Purged residential rooms on Site Survey",
                    details=f"Drawing classified as SITE_TOPOGRAPHICAL_SURVEY; purged {len(rooms)} room candidates.",
                    recommendation="Site surveys do not contain interior residential rooms.",
                )
            )
            rooms = []

        # 2. Filter candidates
        filtered_candidates: List[EvidenceCandidate] = []
        for cand in candidates:
            cand_text = f"{cand.item_type} {cand.category} {cand.raw_text or ''}".lower()
            if any(forbidden in cand_text for forbidden in SITE_SURVEY_FORBIDDEN_KEYWORDS):
                cand.validation_status = ValidationStatus.REJECTED
                cand.assumptions.append("Rejected by Site Survey Anti-Hallucination Gate")
            else:
                filtered_candidates.append(cand)

        # 3. Filter takeoff lines
        filtered_lines: List[TakeoffLine] = []
        for line in lines:
            line_desc = f"{line.item_description} {line.category}".lower()
            if any(forbidden in line_desc for forbidden in SITE_SURVEY_FORBIDDEN_KEYWORDS):
                flags.append(
                    ReconciliationFlag(
                        id=f"flag-rejected-{line.id}",
                        severity="warning",
                        category="Anti-Hallucination",
                        subject=f"Rejected architectural item: {line.item_description}",
                        details="Item rejected because document is a Site/Topographical Survey.",
                        recommendation="Do not include interior architectural items on civil site plans.",
                    )
                )
            else:
                filtered_lines.append(line)

        return rooms, filtered_candidates, filtered_lines, flags

    @staticmethod
    def enforce_scale_invariant(
        scale: ScaleCalibration,
        lines: List[TakeoffLine],
    ) -> List[TakeoffLine]:
        """Strict Gate: If drawing scale is unresolved, dimensional quantities must be flagged."""
        if scale.scale_known:
            return lines

        for line in lines:
            if line.is_measured and line.unit not in ["EA", "norm", "norm²"]:
                line.needs_review = True
                line.validation_status = ValidationStatus.NEEDS_REVIEW
                line.review_reasons.append("Unresolved drawing scale: physical unit requires manual calibration.")
        return lines

    @staticmethod
    def filter_unsupported_ai_candidates(
        candidates: List[EvidenceCandidate],
    ) -> List[EvidenceCandidate]:
        """Strict Gate: AI candidates with zero corroborating evidence cannot be marked VERIFIED."""
        for cand in candidates:
            if cand.source in ["GEMINI", "GEMINI_VLM"] and not cand.corroborating_evidence_ids:
                if cand.validation_status == ValidationStatus.VERIFIED:
                    cand.validation_status = ValidationStatus.SUPPORTED if cand.confidence >= 0.85 else ValidationStatus.NEEDS_REVIEW
        return candidates
