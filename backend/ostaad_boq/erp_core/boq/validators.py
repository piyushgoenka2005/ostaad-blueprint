"""
BOQ Line Item and WBS Validation Engine
Adapted from OpenConstructionERP validation/rules
"""
from typing import List, Dict, Any
from .wbs_tree import HierarchicalBOQ, BOQPosition

class BOQValidationError(Exception):
    pass

def validate_boq_integrity(boq: HierarchicalBOQ) -> List[Dict[str, Any]]:
    """
    Validates structural rules across the BOQ tree:
    1. Rejects negative or zero quantities.
    2. Rejects missing item descriptions.
    3. Checks for duplicate WBS codes.
    4. Enforces manual verification flag before procurement release.
    """
    errors = []
    seen_wbs = set()

    for s in boq.sections:
        if not s.title or not s.title.strip():
            errors.append({"level": "ERROR", "wbs": s.wbs_code, "msg": "Section title cannot be empty."})
        
        for p in s.positions:
            # Check duplicate WBS
            if p.wbs_code in seen_wbs:
                errors.append({"level": "ERROR", "wbs": p.wbs_code, "msg": f"Duplicate WBS code detected: {p.wbs_code}"})
            seen_wbs.add(p.wbs_code)

            # Check quantity
            if p.quantity <= 0:
                errors.append({"level": "ERROR", "wbs": p.wbs_code, "msg": f"Quantity must be greater than zero. Found: {p.quantity}"})

            # Check description
            if not p.description or not p.description.strip():
                errors.append({"level": "ERROR", "wbs": p.wbs_code, "msg": "Description is required."})

            # Check verification
            if not p.is_verified:
                errors.append({"level": "WARNING", "wbs": p.wbs_code, "msg": "Position pending manual engineer verification."})

    return errors
