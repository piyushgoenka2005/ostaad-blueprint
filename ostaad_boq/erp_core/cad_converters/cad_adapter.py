"""
CAD and BIM Ingestion Adapter
Wrapper for integrating extracted elements from cad2data converters into BOQ entities
"""
from typing import Dict, Any, List
from ..boq.wbs_tree import BOQPosition, CivilUnit

def parse_cad_element_to_boq(cad_row: Dict[str, Any]) -> BOQPosition:
    """
    Maps an extracted CAD DataFrame row (from RVT/IFC/DWG) to an unverified BOQ position.
    """
    category = cad_row.get("Category", "General Civil")
    level = cad_row.get("Level", "Plinth")
    volume = float(cad_row.get("Volume_m3", 0.0))
    area = float(cad_row.get("Area_m2", 0.0))
    element_id = str(cad_row.get("ElementId", "CAD-001"))

    if volume > 0:
        qty = volume
        unit = CivilUnit.CUM
        desc = f"{category} Concrete Work - {level} (CAD ID: {element_id})"
    elif area > 0:
        qty = area
        unit = CivilUnit.SQM
        desc = f"{category} Surface Finish - {level} (CAD ID: {element_id})"
    else:
        qty = 1.0
        unit = CivilUnit.NOS
        desc = f"{category} Component - {level} (CAD ID: {element_id})"

    return BOQPosition(
        item_id=f"ITEM-{element_id}",
        wbs_code="1.01.01",
        description=desc,
        unit=unit,
        quantity=round(qty, 3),
        unit_rate=0.0,
        is_verified=False,
        metadata={"cad_source": cad_row},
    )
