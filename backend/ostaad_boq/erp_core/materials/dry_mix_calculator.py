"""
Indian Standards Civil Material Dry-Mix Conversion Engine
Formulas conform to IS 456 (Plain and Reinforced Concrete) and IS 1200 (Measurement of Works)
"""
import math
from typing import Dict, Any

# Concrete Mix Constants (Cement : Sand : Aggregate)
CONCRETE_MIX_RATIOS = {
    "M15": {"cement": 1, "sand": 2, "aggregate": 4, "total_parts": 7, "dry_coeff": 1.54},
    "M20": {"cement": 1, "sand": 1.5, "aggregate": 3, "total_parts": 5.5, "dry_coeff": 1.54},
    "M25": {"cement": 1, "sand": 1, "aggregate": 2, "total_parts": 4, "dry_coeff": 1.54},
}

# Cement Density
CEMENT_DENSITY_KG_PER_CUM = 1440.0
BAG_WEIGHT_KG = 50.0

def calculate_concrete_materials(volume_cum: float, grade: str = "M20") -> Dict[str, Any]:
    """
    Decomposes wet concrete volume into dry ingredient requirements:
    - Cement bags (OPC 43, OPC 53, or PPC)
    - Coarse sand (in CUM and Brass)
    - Coarse aggregate 10mm/20mm (in CUM and Brass)
    """
    if grade not in CONCRETE_MIX_RATIOS:
        raise ValueError(f"Unsupported concrete grade: {grade}. Supported: {list(CONCRETE_MIX_RATIOS.keys())}")
    
    spec = CONCRETE_MIX_RATIOS[grade]
    dry_volume = volume_cum * spec["dry_coeff"]
    total_parts = spec["total_parts"]

    # Cement
    cement_volume_cum = (spec["cement"] / total_parts) * dry_volume
    cement_kg = cement_volume_cum * CEMENT_DENSITY_KG_PER_CUM
    cement_bags = math.ceil(cement_kg / BAG_WEIGHT_KG)

    # Sand
    sand_cum = round((spec["sand"] / total_parts) * dry_volume, 3)
    sand_brass = round(sand_cum * 0.353147, 3)

    # Aggregate
    agg_cum = round((spec["aggregate"] / total_parts) * dry_volume, 3)
    agg_brass = round(agg_cum * 0.353147, 3)

    return {
        "wet_volume_cum": volume_cum,
        "grade": grade,
        "dry_volume_cum": round(dry_volume, 3),
        "cement_bags": cement_bags,
        "cement_kg": round(cement_kg, 2),
        "sand_cum": sand_cum,
        "sand_brass": sand_brass,
        "aggregate_cum": agg_cum,
        "aggregate_brass": agg_brass,
    }

def calculate_brickwork_materials(wall_volume_cum: float, mortar_ratio: str = "1:6") -> Dict[str, Any]:
    """
    Calculates standard modular brick count and mortar ingredients for 1 m^3 of brickwork:
    - Standard modular brick (190 x 90 x 90 mm) with 10mm joint: 500 bricks / m^3
    - Mortar requirement: ~0.30 m^3 wet mortar per m^3 brickwork (dry volume coeff 1.33)
    """
    standard_bricks_per_cum = 500
    total_bricks = math.ceil(wall_volume_cum * standard_bricks_per_cum)
    
    # Dry mortar volume
    dry_mortar_cum = wall_volume_cum * 0.30 * 1.33
    if mortar_ratio == "1:6":
        parts = 7
        cement_cum = (1 / parts) * dry_mortar_cum
        sand_cum = (6 / parts) * dry_mortar_cum
    elif mortar_ratio == "1:4":
        parts = 5
        cement_cum = (1 / parts) * dry_mortar_cum
        sand_cum = (4 / parts) * dry_mortar_cum
    else:
        parts = 7
        cement_cum = (1 / parts) * dry_mortar_cum
        sand_cum = (6 / parts) * dry_mortar_cum

    cement_bags = math.ceil((cement_cum * CEMENT_DENSITY_KG_PER_CUM) / BAG_WEIGHT_KG)

    return {
        "wall_volume_cum": wall_volume_cum,
        "bricks_count": total_bricks,
        "mortar_ratio": mortar_ratio,
        "cement_bags": cement_bags,
        "sand_cum": round(sand_cum, 3),
        "sand_brass": round(sand_cum * 0.353147, 3),
    }
