"""Drawing Type Classifier for Ostaad Blueprint-to-BOQ Engine.

Classifies blueprints before any entity extraction or takeoff computation.
Distinguishes between Architectural Floor Plans, Site/Topographical Surveys,
Structural, Electrical, Plumbing, HVAC, Elevations, Sections, and Schedules.
"""

from __future__ import annotations

import re
from typing import Sequence
from .models import DrawingType, ClassificationResult
from .ingest import IngestedSheet
from .ocr import OCRItem


# Weighted indicator dictionaries for drawing types
DRAWING_TYPE_RULES: dict[DrawingType, dict[str, Any]] = {
    DrawingType.SITE_TOPOGRAPHICAL_SURVEY: {
        "strong_terms": [
            "topographical survey", "topographical", "topo survey", "site survey",
            "premises area", "total premises area", "boundary wall", "guard wall",
            "property line", "temporary benchmark", "bench mark", "tbm",
            "bituminous road", "concrete road", "green field", "play ground",
            "existing structure", "level shown", "grid line 10x10", "fencing",
            "electrical post", "lamp post", "highmust", "swimming pool", "fountain"
        ],
        "keywords": [
            "survey", "plot", "premises", "road", "boundary", "fence", "drain",
            "gate", "ground", "contour", "rl", "gl", "datum", "shed", "field",
            "finetech", "pool", "sqft", "sq.ft", "sqm", "sq.m"
        ],
        "scales": ["1:250", "1.250", "1250", "1 250", "1:500", "1:1000", "1:1250", "1:2000", "1:2500"],
    },
    DrawingType.ARCHITECTURAL_FLOOR_PLAN: {
        "strong_terms": [
            "floor plan", "ground floor plan", "first floor plan", "second floor plan",
            "typical floor plan", "residential building plan", "proposed building plan",
            "municipal building plan", "sanction plan", "carpet area", "built-up area",
            "living / dining", "master bed room", "master bedroom", "bed room", "attached toilet",
            "common toilet", "staircase & lobby", "kitchen", "balcony"
        ],
        "keywords": [
            "bedroom", "bed room", "living", "dining", "kitchen", "toilet", "bath",
            "balcony", "verandah", "puja", "pooja", "hall", "lobby", "porch",
            "d1", "d2", "d3", "w1", "w2"
        ],
        "scales": ["1/4\" = 1'-0\"", "1/8\" = 1'-0\"", "1:50", "1:100"],
    },
    DrawingType.STRUCTURAL_DRAWING: {
        "strong_terms": [
            "structural layout", "foundation plan", "footing details", "column layout",
            "plinth beam layout", "slab reinforcement", "beam reinforcement",
            "rebar schedule", "grade of concrete", "fe 500", "fe 415", "clear cover",
            "lap length", "schedule of columns", "schedule of footings"
        ],
        "keywords": [
            "structural", "footing", "column", "beam", "slab", "reinforcement",
            "rebar", "stirrups", "c1", "c2", "b1", "b2", "f1", "f2"
        ],
        "scales": ["1:20", "1:25", "1:50"],
    },
    DrawingType.ELECTRICAL_DRAWING: {
        "strong_terms": [
            "electrical layout", "lighting layout", "power layout", "single line diagram",
            "sld", "distribution board", "switchboard layout", "conduit layout",
            "cable schedule", "earthing details"
        ],
        "keywords": [
            "electrical", "lighting", "conduit", "switch", "socket", "db", "mcb",
            "circuit", "luminaire", "wiring", "phase", "load"
        ],
        "scales": ["1:50", "1:100"],
    },
    DrawingType.PLUMBING_DRAWING: {
        "strong_terms": [
            "plumbing layout", "sanitary layout", "water supply layout", "drainage layout",
            "sewerage layout", "soil and waste pipe", "inspection chamber", "gully trap",
            "rainwater harvesting", "plumbing riser"
        ],
        "keywords": [
            "plumbing", "sanitary", "drainage", "sewer", "water supply", "pvc",
            "upvc", "ci pipe", "trap", "manhole", "chamber"
        ],
        "scales": ["1:50", "1:100"],
    },
    DrawingType.HVAC_DRAWING: {
        "strong_terms": [
            "hvac layout", "duct layout", "air conditioning layout", "chilled water layout",
            "ductwork sizing", "diffuser schedule", "ahu room"
        ],
        "keywords": [
            "hvac", "duct", "ducting", "diffuser", "grille", "cfm", "chiller",
            "ahu", "fcu", "refrigerant", "ventilation"
        ],
        "scales": ["1:50", "1:100"],
    },
    DrawingType.ELEVATION: {
        "strong_terms": [
            "front elevation", "rear elevation", "side elevation", "north elevation",
            "south elevation", "east elevation", "west elevation", "external elevation"
        ],
        "keywords": [
            "elevation", "facade", "plinth level", "parapet level", "terrace level"
        ],
        "scales": ["1:50", "1:100"],
    },
    DrawingType.SECTION: {
        "strong_terms": [
            "cross section", "longitudinal section", "section a-a", "section b-b",
            "section c-c", "section through staircase", "sectional elevation"
        ],
        "keywords": [
            "section", "sectional", "headroom", "lintel", "sill", "floor-to-floor"
        ],
        "scales": ["1:50", "1:100"],
    },
    DrawingType.SCHEDULE: {
        "strong_terms": [
            "door schedule", "window schedule", "door & window schedule",
            "schedule of openings", "schedule of finishes", "bar bending schedule",
            "bbs schedule"
        ],
        "keywords": [
            "schedule", "hardware", "finishes", "openings", "lintel level"
        ],
        "scales": [],
    },
}


class DrawingTypeClassifier:
    """Pre-extraction classifier that inspects drawing text, vector paths, and metadata."""

    def classify(
        self,
        sheet: IngestedSheet | None = None,
        ocr_items: Sequence[OCRItem] | None = None,
        text_tokens: Sequence[str] | None = None,
    ) -> ClassificationResult:
        """Classify a blueprint sheet into a verified architectural or engineering class."""
        evidence_lines: list[str] = []
        scores: dict[DrawingType, float] = {dt: 0.0 for dt in DRAWING_TYPE_RULES}
        evidence_found: dict[DrawingType, list[str]] = {dt: [] for dt in DRAWING_TYPE_RULES}

        # 1. Harvest all text candidates
        collected_texts: list[str] = []
        if sheet and sheet.native_text:
            for tb in sheet.native_text:
                cleaned = tb.text.strip()
                if cleaned:
                    collected_texts.append(cleaned)

        if ocr_items:
            for item in ocr_items:
                cleaned = item.text.strip()
                if cleaned and cleaned not in collected_texts:
                    collected_texts.append(cleaned)

        if text_tokens:
            for t in text_tokens:
                cleaned = t.strip()
                if cleaned and cleaned not in collected_texts:
                    collected_texts.append(cleaned)

        # Normalize unified corpus
        full_corpus = " \n ".join(collected_texts).lower()

        # 2. Rule evaluation per drawing type
        for dt, rules in DRAWING_TYPE_RULES.items():
            # Check strong phrases (weight = 10.0)
            for phrase in rules["strong_terms"]:
                if phrase in full_corpus:
                    scores[dt] += 10.0
                    evidence_found[dt].append(f"Strong Term: '{phrase}'")

            # Check individual keywords (weight = 2.0)
            for kw in rules["keywords"]:
                pattern = r"\b" + re.escape(kw) + r"\b"
                matches = len(re.findall(pattern, full_corpus))
                if matches > 0:
                    score_gain = min(matches, 4) * 2.0
                    scores[dt] += score_gain
                    evidence_found[dt].append(f"Keyword: '{kw}' (x{matches})")

            # Check scale associations (weight = 4.0)
            for sc in rules.get("scales", []):
                if sc in full_corpus:
                    scores[dt] += 4.0
                    evidence_found[dt].append(f"Scale format: '{sc}'")

        # 3. Handle domain-specific exclusions & disambiguations
        # If strong site survey indicators are present and ZERO residential rooms exist:
        site_score = scores[DrawingType.SITE_TOPOGRAPHICAL_SURVEY]
        arch_score = scores[DrawingType.ARCHITECTURAL_FLOOR_PLAN]

        has_residential_rooms = any(
            re.search(r"\b(bed\s*room|bedroom|living|kitchen|toilet)\b", t, re.I)
            for t in collected_texts
        )
        if not has_residential_rooms and site_score > 6.0:
            # Penalize architectural misclassification on site surveys
            scores[DrawingType.ARCHITECTURAL_FLOOR_PLAN] = 0.0

        # 4. Rank and select winning classification
        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_type, top_score = sorted_types[0]
        second_score = sorted_types[1][1] if len(sorted_types) > 1 else 0.0

        if top_score < 4.0:
            return ClassificationResult(
                drawing_type=DrawingType.UNKNOWN,
                confidence=0.20,
                evidence=["Insufficient recognizable title block, room, or site survey indicators."],
                source_page=1,
                classification_reasoning="Confidence threshold not met; no dominant drawing classification detected."
            )

        # Compute calibrated confidence
        score_diff = top_score - second_score
        confidence = min(0.99, max(0.50, 0.65 + (score_diff / (top_score + 10.0)) * 0.34))

        top_evidence = evidence_found[top_type][:8]
        reasoning = (
            f"Classified as {top_type.value} with score {top_score:.1f} vs next best {second_score:.1f}. "
            f"Identified {len(evidence_found[top_type])} distinct domain indicators."
        )

        return ClassificationResult(
            drawing_type=top_type,
            confidence=round(confidence, 3),
            evidence=top_evidence,
            source_page=1,
            classification_reasoning=reasoning
        )
