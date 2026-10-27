"""Stage 9: CSI MasterFormat & NRM Standardized WBS Classification Engine.

Maps 100% of extracted takeoff items to standardized construction work breakdown structures:
1. CSI MasterFormat 2020 (50 Divisions, 6-digit section codes)
2. RICS New Rules of Measurement 2 (NRM2)
3. Indian CPWD Delhi Schedule of Rates (DSR) Work Classifications

Guarantees 100% classification coverage with zero blank or 'UNKNOWN' codes.
"""

from __future__ import annotations

import re
from pydantic import BaseModel
from .models import TakeoffLine, UnitType


class WBSClassification(BaseModel):
    """Standardized multi-framework WBS mapping for construction estimating."""
    wbs_code: str                          # 6-digit CSI code (e.g., '08 11 00')
    wbs_title: str                         # Standard title (e.g., 'Metal Doors and Frames')
    csi_division: str                      # CSI Division (e.g., '08 - Openings')
    nrm_code: str | None = None            # RICS NRM2 code (e.g., '17.1')
    cpwd_code: str | None = None           # CPWD DSR code (e.g., '9.1')
    confidence: float = 1.0
    is_ambiguous: bool = False
    ambiguity_reason: str = ""


# Detailed rules mapping: (regex_pattern, wbs_code, wbs_title, csi_division, nrm_code, cpwd_code, is_ambiguous, amb_reason)
CLASSIFICATION_RULES = [
    # --- Division 08: Openings (Doors & Windows) ---
    (
        re.compile(r"""\b(?:wood|timber|flush|panel|teak)\b.*?\bdoor\b|\bdoor\b.*?\b(?:wood|timber|flush|panel|teak)\b""", re.IGNORECASE),
        "08 14 00", "Wood Doors", "08 - Openings", "17.1", "9.1", False, ""
    ),
    (
        re.compile(r"""\b(?:metal|steel|hollow\s*metal|fire)\b.*?\bdoor\b|\bdoor\b.*?\b(?:metal|steel|hollow\s*metal|fire)\b""", re.IGNORECASE),
        "08 11 00", "Metal Doors and Frames", "08 - Openings", "17.2", "10.1", False, ""
    ),
    (
        re.compile(r"""\b(?:sliding\s*glass|patio\s*door|french\s*door)\b""", re.IGNORECASE),
        "08 32 00", "Sliding Glass Doors", "08 - Openings", "17.3", "9.15", False, ""
    ),
    (
        re.compile(r"""\b(?:aluminum|aluminium|metal|steel)\b.*?\bwindow\b|\bwindow\b.*?\b(?:aluminum|aluminium|metal|steel)\b""", re.IGNORECASE),
        "08 51 23", "Metal Windows (Aluminum / Steel)", "08 - Openings", "18.1", "21.1", False, ""
    ),
    (
        re.compile(r"""\b(?:upvc|vinyl|plastic)\b.*?\bwindow\b|\bwindow\b.*?\b(?:upvc|vinyl|plastic)\b""", re.IGNORECASE),
        "08 53 00", "Plastic / UPVC Windows", "08 - Openings", "18.2", "21.3", False, ""
    ),
    (
        re.compile(r"""\b(?:ventilator|louver|v[1-9]?\b)\b""", re.IGNORECASE),
        "08 51 69", "Louvered Metal Ventilators and Windows", "08 - Openings", "18.4", "21.2", False, ""
    ),
    (
        re.compile(r"""\b(?:door\s*unit|interior.*door|swing\s*door|door)\b""", re.IGNORECASE),
        "08 10 00", "Doors and Frames (Material Unspecified)", "08 - Openings", "17.0", "9.0", True, "Door material unspecified; default classified to Division 08 generic"
    ),
    (
        re.compile(r"""\b(?:window\s*unit|exterior.*window|window)\b""", re.IGNORECASE),
        "08 50 00", "Windows (Material Unspecified)", "08 - Openings", "18.0", "21.0", True, "Window frame material unspecified; default classified to Division 08 generic"
    ),


    # --- Division 09: Finishes (Walls & Flooring) ---
    (
        re.compile(r"""\b(?:gypsum|wallboard|drywall|sheetrock|plasterboard)\b""", re.IGNORECASE),
        "09 29 00", "Gypsum Board Assemblies", "09 - Finishes", "23.1", "12.1", False, ""
    ),
    (
        re.compile(r"""\b(?:plaster(?:ing)?|stucco|cement\s*render|cement\s*plaster)\b""", re.IGNORECASE),
        "09 24 00", "Portland Cement Plastering", "09 - Finishes", "23.2", "12.2", False, ""
    ),

    (
        re.compile(r"""\b(?:tile|ceramic|vitrified|porcelain)\b""", re.IGNORECASE),
        "09 30 00", "Tiling (Ceramic / Vitrified)", "09 - Finishes", "24.1", "11.1", False, ""
    ),
    (
        re.compile(r"""\b(?:resilient|vinyl\s*tile|lvt|linoleum)\b""", re.IGNORECASE),
        "09 65 00", "Resilient Flooring", "09 - Finishes", "24.2", "11.3", False, ""
    ),
    (
        re.compile(r"""\b(?:carpet|rug)\b""", re.IGNORECASE),
        "09 68 00", "Carpeting", "09 - Finishes", "24.3", "11.4", False, ""
    ),
    (
        re.compile(r"""\b(?:flooring|floor\s*finish|finished\s*flooring)\b""", re.IGNORECASE),
        "09 60 00", "Flooring Finishes (Finish Unspecified)", "09 - Finishes", "24.0", "11.0", True, "Flooring finish material unspecified; default classified to Division 09 generic"
    ),
    (
        re.compile(r"""\b(?:paint(?:ing)?|coating)\b""", re.IGNORECASE),
        "09 91 00", "Painting and Coating", "09 - Finishes", "25.1", "13.1", False, ""
    ),


    # --- Division 22: Plumbing Fixtures ---
    (
        re.compile(r"""\b(?:water\s*closet|toilet|wc|ewc|iwc)\b""", re.IGNORECASE),
        "22 42 13", "Commercial / Residential Water Closets", "22 - Plumbing", "33.1", "17.1", False, ""
    ),
    (
        re.compile(r"""\b(?:lavatory|wash\s*basin|vanity\s*sink|basin)\b""", re.IGNORECASE),
        "22 42 16", "Commercial / Residential Lavatories and Sinks", "22 - Plumbing", "33.2", "17.2", False, ""
    ),
    (
        re.compile(r"""\b(?:kitchen\s*sink|sink)\b""", re.IGNORECASE),
        "22 41 16", "Residential Sinks", "22 - Plumbing", "33.3", "17.3", False, ""
    ),
    (
        re.compile(r"""\b(?:shower|bathtub|bath\s*tub)\b""", re.IGNORECASE),
        "22 41 39", "Residential Bathtubs and Shower Units", "22 - Plumbing", "33.4", "17.4", False, ""
    ),
    (
        re.compile(r"""\b(?:plumbing|fixture)\b""", re.IGNORECASE),
        "22 40 00", "Plumbing Fixtures (Type Unspecified)", "22 - Plumbing", "33.0", "17.0", True, "Plumbing fixture type unspecified; default classified to Division 22 generic"
    ),

    # --- Division 11 & 12: Appliances & Casework ---
    (
        re.compile(r"""\b(?:range|cooktop|stove|oven)\b""", re.IGNORECASE),
        "11 31 13", "Residential Ranges and Cooktops", "11 - Equipment", "27.1", "N/A", False, ""
    ),
    (
        re.compile(r"""\b(?:refrigerator|fridge)\b""", re.IGNORECASE),
        "11 31 23", "Residential Refrigerators", "11 - Equipment", "27.2", "N/A", False, ""
    ),
    (
        re.compile(r"""\b(?:appliance)\b""", re.IGNORECASE),
        "11 31 00", "Residential Appliances", "11 - Equipment", "27.0", "N/A", False, ""
    ),
    (
        re.compile(r"""\b(?:countertop|cabinet|casework|millwork|cupboard)\b""", re.IGNORECASE),
        "12 35 30", "Residential Kitchen Casework and Cabinets", "12 - Furnishings", "26.1", "9.8", False, ""
    ),

    # --- Division 31 & 32: Site Civil, Boundaries & Paving ---
    (
        re.compile(r"""\b(?:boundary\s*wall|perimeter\s*wall|fence|gate)\b""", re.IGNORECASE),
        "32 31 00", "Fences, Gates, and Boundary Enclosures", "32 - Exterior Improvements", "4.1", "6.3", False, ""
    ),
    (
        re.compile(r"""\b(?:guard\s*wall|retaining\s*wall|parapet)\b""", re.IGNORECASE),
        "32 32 00", "Retaining Walls and Guard Enclosures", "32 - Exterior Improvements", "4.2", "6.4", False, ""
    ),
    (
        re.compile(r"""\b(?:concrete\s*road|rigid\s*paving|pavement)\b""", re.IGNORECASE),
        "32 13 00", "Rigid Paving (Concrete Roads and Aprons)", "32 - Exterior Improvements", "3.1", "16.1", False, ""
    ),
    (
        re.compile(r"""\b(?:site\s*clearing|earthwork|excavation|grading)\b""", re.IGNORECASE),
        "31 10 00", "Site Clearing and Earth Moving", "31 - Earthwork", "2.1", "2.1", False, ""
    ),
    (
        re.compile(r"""\b(?:geodetic|benchmark|setting\s*out|tbm\b|survey\s*control)\b""", re.IGNORECASE),
        "01 71 23", "Field Engineering & Geodetic Benchmarks", "01 - General Requirements", "1.2", "1.1", False, ""
    ),

    # --- Division 03, 04, 05: Structural ---
    (
        re.compile(r"""\b(?:column|rcc\s*column|concrete\s*column|slab|beam|footing|plinth|foundation)\b""", re.IGNORECASE),
        "03 30 00", "Cast-in-Place Concrete", "03 - Concrete", "11.1", "4.1", False, ""
    ),
    (
        re.compile(r"""\b(?:brick|masonry|block\s*wall)\b""", re.IGNORECASE),
        "04 20 00", "Unit Masonry", "04 - Masonry", "14.1", "6.1", False, ""
    ),
    (
        re.compile(r"""\b(?:structural\s*steel|steel\s*framing)\b""", re.IGNORECASE),
        "05 12 00", "Structural Steel Framing", "05 - Metals", "13.1", "10.0", False, ""
    ),

    # --- Division 26: Electrical ---
    (
        re.compile(r"""\b(?:distribution\s*board|panelboard|db\b|mcb\b)\b""", re.IGNORECASE),
        "26 24 16", "Panelboards and Distribution Boards", "26 - Electrical", "38.1", "19.1", False, ""
    ),
    (
        re.compile(r"""\b(?:switch|receptacle|outlet|wiring\s*device|sb\b)\b""", re.IGNORECASE),
        "26 27 26", "Wiring Devices and Switchboards", "26 - Electrical", "38.2", "19.2", False, ""
    ),

]


def classify_takeoff_line(
    item_description: str,
    category: str = "",
    unit: UnitType | str = "",
) -> WBSClassification:
    """Classify a single takeoff line into CSI MasterFormat, NRM2, and CPWD codes."""
    combined_query = f"{item_description} {category}".strip()

    # Rule-based matching against comprehensive taxonomy
    for pattern, wbs_code, wbs_title, division, nrm, cpwd, is_amb, amb_reason in CLASSIFICATION_RULES:
        if pattern.search(combined_query):
            conf = 0.85 if is_amb else 0.98
            return WBSClassification(
                wbs_code=wbs_code,
                wbs_title=wbs_title,
                csi_division=division,
                nrm_code=nrm,
                cpwd_code=cpwd,
                confidence=conf,
                is_ambiguous=is_amb,
                ambiguity_reason=amb_reason,
            )

    # Contextual category fallback if specific pattern did not match
    cat_lower = category.lower()
    if "door" in cat_lower or "opening" in cat_lower:
        return WBSClassification(
            wbs_code="08 10 00",
            wbs_title="Doors and Frames",
            csi_division="08 - Openings",
            nrm_code="17.0",
            cpwd_code="9.0",
            confidence=0.88,
            is_ambiguous=True,
            ambiguity_reason="Classified from category 'Openings - Doors'; specific material not identified",
        )
    elif "window" in cat_lower:
        return WBSClassification(
            wbs_code="08 50 00",
            wbs_title="Windows",
            csi_division="08 - Openings",
            nrm_code="18.0",
            cpwd_code="21.0",
            confidence=0.88,
            is_ambiguous=True,
            ambiguity_reason="Classified from category 'Openings - Windows'; specific material not identified",
        )
    elif "plumbing" in cat_lower:
        return WBSClassification(
            wbs_code="22 40 00",
            wbs_title="Plumbing Fixtures",
            csi_division="22 - Plumbing",
            nrm_code="33.0",
            cpwd_code="17.0",
            confidence=0.88,
        )
    elif "floor" in cat_lower or "finish" in cat_lower:
        return WBSClassification(
            wbs_code="09 60 00",
            wbs_title="Flooring Finishes",
            csi_division="09 - Finishes",
            nrm_code="24.0",
            cpwd_code="11.0",
            confidence=0.85,
        )
    elif "wall" in cat_lower or "drywall" in cat_lower:
        return WBSClassification(
            wbs_code="09 22 00",
            wbs_title="Wall Framing and Finishes",
            csi_division="09 - Finishes",
            nrm_code="23.0",
            cpwd_code="12.0",
            confidence=0.85,
        )
    elif "civil" in cat_lower or "site" in cat_lower or "earth" in cat_lower:
        return WBSClassification(
            wbs_code="31 00 00",
            wbs_title="Earthwork and Site Civil",
            csi_division="31 - Earthwork",
            nrm_code="2.0",
            cpwd_code="2.0",
            confidence=0.85,
        )

    # Universal Construction General Requirements fallback (Guarantees 100% coverage, NEVER empty or UNKNOWN)
    return WBSClassification(
        wbs_code="01 00 00",
        wbs_title="General Requirements & Allowances",
        csi_division="01 - General Requirements",
        nrm_code="1.0",
        cpwd_code="1.0",
        confidence=0.75,
        is_ambiguous=True,
        ambiguity_reason="Item description does not specify construction trade; assigned to Division 01 General",
    )


def classify_boq_lines(lines: list[TakeoffLine]) -> list[TakeoffLine]:
    """Classify 100% of takeoff lines with CSI MasterFormat, NRM, and CPWD WBS codes."""
    for line in lines:
        wbs = classify_takeoff_line(line.item_description, line.category, line.unit)
        line.wbs_code = wbs.wbs_code
        line.wbs_title = wbs.wbs_title
        line.csi_division = wbs.csi_division
        line.nrm_code = wbs.nrm_code
        line.cpwd_code = wbs.cpwd_code

        if wbs.is_ambiguous:
            line.needs_review = True
            if wbs.ambiguity_reason and wbs.ambiguity_reason not in line.review_reasons:
                line.review_reasons.append(wbs.ambiguity_reason)

    return lines
