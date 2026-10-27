"""Stage 8: Schedule & Legend Extraction Engine.

Extracts tabular schedules (doors, windows, finishes, area statements) and symbol legends.
Cross-references stated schedule counts against detected plan symbols to detect discrepancies.
Enforces strict guardrails: zero false door/window schedules on civil/site drawings.
"""

from __future__ import annotations

import re
from typing import Any
from .models import (
    ScheduleTable,
    ScheduleItem,
    LegendItem,
    SymbolCandidate,
    TakeoffLine,
    ReconciliationFlag,
    ClassificationResult,
    DrawingType,
)
from .ocr import OCRItem, parse_title_block_metadata


# Civil standard abbreviations dictionary
CIVIL_LEGEND_PATTERNS = [
    (re.compile(r"""\b(?:T\.?B\.?M\.?|TEMPORARY\s*BENCHMARK)\b""", re.IGNORECASE), "TBM", "Temporary Benchmark"),
    (re.compile(r"""\b(?:B\.?M\.?|BENCHMARK)\b""", re.IGNORECASE), "BM", "Permanent Benchmark Level"),
    (re.compile(r"""\b(?:E\.?P\.?|ELECTRIC\s*POLE)\b""", re.IGNORECASE), "EP", "Electric Utility Pole"),
    (re.compile(r"""\b(?:M\.?H\.?|MANHOLE)\b""", re.IGNORECASE), "MH", "Drainage / Sewer Manhole"),
    (re.compile(r"""\b(?:B\.?W\.?|BOUNDARY\s*WALL)\b""", re.IGNORECASE), "BW", "Property Boundary Enclosure Wall"),
    (re.compile(r"""\b(?:G\.?W\.?|GUARD\s*WALL)\b""", re.IGNORECASE), "GW", "Masonry Guard Wall / Retaining Edge"),
    (re.compile(r"""\b(?:C\.?R\.?|CONCRETE\s*ROAD)\b""", re.IGNORECASE), "CR", "Rigid Pavement Concrete Road"),
    (re.compile(r"""\b(?:G\.?L\.?|GROUND\s*LEVEL)\b""", re.IGNORECASE), "GL", "Existing Natural Ground Level"),
]


def extract_schedules_and_legends(
    ocr_items: list[OCRItem],
    classification: ClassificationResult | None = None,
) -> tuple[list[ScheduleTable], list[LegendItem]]:
    """Parse tabular schedules and symbol legends respecting drawing type classification."""
    schedules: list[ScheduleTable] = []
    legend_items: list[LegendItem] = []

    is_site = classification and classification.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY

    # --- 1. Civil Site Legends & Area Statement Extraction ---
    if is_site:
        # Check for premises area statement using verified metadata parser
        meta = parse_title_block_metadata(ocr_items)
        area_items: list[ScheduleItem] = []
        if meta.get("total_premises_area") is not None:
            area_val = meta["total_premises_area"]
            unit_str = meta.get("area_unit", "sq.m.")
            area_items.append(
                ScheduleItem(
                    tag="TOTAL_PREMISES",
                    description="Total Survey Premises Area Statement",
                    quantity=area_val,
                    remarks=f"{area_val} {unit_str.upper()}",
                    raw_data={"raw_text": meta.get("raw_area_callout", ""), "unit": unit_str},
                )
            )

        if area_items:
            schedules.append(
                ScheduleTable(
                    id="sched-site-area-summary",
                    schedule_type="area_summary",
                    title="Premises Area Summary Statement",
                    headers=["Tag", "Description", "Area", "Unit"],
                    items=area_items,
                    confidence=0.98,
                )
            )


        # Extract civil legends / abbreviations
        found_civil_tags: set[str] = set()
        for it in ocr_items:
            for pattern, tag, meaning in CIVIL_LEGEND_PATTERNS:
                if tag not in found_civil_tags and pattern.search(it.text):
                    legend_items.append(
                        LegendItem(
                            symbol_tag=tag,
                            meaning=meaning,
                            category="civil_notes",
                            confidence=0.95,
                        )
                    )
                    found_civil_tags.add(tag)

        # STRICT INVARIANT: Return civil schedules/legends only, 0 door/window schedules
        return schedules, legend_items

    # --- 2. Architectural Schedules (Doors, Windows, Finishes) ---
    # Parse tabular door schedule if tokens indicate table headers
    door_sched_headers = ["MARK", "TYPE", "WIDTH", "HEIGHT", "QTY", "DESCRIPTION"]
    door_items: list[ScheduleItem] = []
    win_items: list[ScheduleItem] = []

    door_tag_re = re.compile(r"""^(D[1-9]?|MD|ED)$""", re.IGNORECASE)
    win_tag_re = re.compile(r"""^(W[1-9]?|V[1-9]?)$""", re.IGNORECASE)
    dim_re = re.compile(r"""(\d+['"’”-]?\s*\d*["”]?|\d+\s*(?:mm|m|cm))\s*[xX*]\s*(\d+['"’”-]?\s*\d*["”]?|\d+\s*(?:mm|m|cm))""")

    # Look for tabular rows in OCR text
    # e.g., "D1 | 3'-0" x 7'-0" | Flush Door | 4"
    for it in ocr_items:
        text = it.text.strip()
        # Direct regex match for table rows like "D1 3'-0\"x7'-0\" Wood Door 4"
        d_match = door_tag_re.match(text)
        if d_match:
            tag = d_match.group(1).upper()
            door_items.append(
                ScheduleItem(
                    tag=tag,
                    description=f"Standard Architectural Door ({tag})",
                    raw_data={"token": text},
                )
            )
        elif win_tag_re.match(text):
            tag = text.upper()
            win_items.append(
                ScheduleItem(
                    tag=tag,
                    description=f"Window Unit ({tag})",
                    raw_data={"token": text},
                )
            )

    # If explicit schedule items or legend tokens detected, structure them
    if door_items:
        schedules.append(
            ScheduleTable(
                id="sched-doors",
                schedule_type="door_schedule",
                title="Door Schedule Table",
                headers=door_sched_headers,
                items=door_items,
                confidence=0.92,
            )
        )

    if win_items:
        schedules.append(
            ScheduleTable(
                id="sched-windows",
                schedule_type="window_schedule",
                title="Window Schedule Table",
                headers=["MARK", "TYPE", "SIZE", "QTY", "DESCRIPTION"],
                items=win_items,
                confidence=0.92,
            )
        )

    # Architectural standard legend items
    for it in ocr_items:
        clean = it.text.strip().upper()
        if clean in ["WC", "EWC"]:
            legend_items.append(
                LegendItem(symbol_tag=clean, meaning="Water Closet (Toilet)", category="plumbing", confidence=0.95)
            )
        elif clean in ["DB", "MCB"]:
            legend_items.append(
                LegendItem(symbol_tag=clean, meaning="Distribution Board", category="electrical", confidence=0.95)
            )

    return schedules, legend_items


def reconcile_schedules_with_takeoff(
    schedules: list[ScheduleTable],
    symbol_candidates: list[SymbolCandidate],
    takeoff_lines: list[TakeoffLine],
) -> list[ReconciliationFlag]:
    """Reconcile schedule-stated counts against plan-counted symbols and takeoff items."""
    flags: list[ReconciliationFlag] = []

    # Map candidate counts by tag
    plan_counts: dict[str, int] = {}
    for s in symbol_candidates:
        t = s.label.strip().upper()
        plan_counts[t] = plan_counts.get(t, 0) + 1

    for sched in schedules:
        if sched.schedule_type in ["door_schedule", "window_schedule"]:
            for item in sched.items:
                if item.quantity is not None and item.quantity > 0:
                    tag = item.tag.upper()
                    plan_qty = plan_counts.get(tag, 0)
                    sched_qty = int(item.quantity)

                    if plan_qty != sched_qty:
                        diff = abs(plan_qty - sched_qty)
                        diff_pct = (diff / sched_qty) * 100.0 if sched_qty > 0 else 100.0
                        flag_id = f"flag-sched-discrepancy-{tag}"
                        flags.append(
                            ReconciliationFlag(
                                id=flag_id,
                                severity="discrepancy" if diff_pct > 10.0 else "warning",
                                category="Schedule Reconciliation",
                                subject=f"Count Discrepancy for Opening Tag '{tag}'",
                                details=(
                                    f"Schedule '{sched.title}' specifies {sched_qty} units of '{tag}', "
                                    f"but {plan_qty} units were counted on the drawing floor plan "
                                    f"({diff_pct:.1f}% discrepancy)."
                                ),
                                recommendation=(
                                    f"Verify layout plan for missed '{tag}' symbols or confirm "
                                    "if schedule includes alternate floors or un-modeled units."
                                ),
                            )
                        )

                        # Mark affected takeoff lines for review
                        for line in takeoff_lines:
                            if tag in line.item_description:
                                line.needs_review = True
                                line.review_reasons.append(
                                    f"Schedule mismatch: stated {sched_qty} vs counted {plan_qty}"
                                )

    return flags
