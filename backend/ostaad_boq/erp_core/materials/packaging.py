"""
Packaging Round-Up & Waste Calculations
Adapted from OpenTakeoff math/materials.js
"""
import math

def calculate_packaged_units(measured_quantity: float, coverage_per_unit: float, waste_percentage: float = 5.0) -> int:
    """
    Calculates commercial order packaging with waste allowance, always rounding up to whole commercial units.
    """
    if coverage_per_unit <= 0:
        raise ValueError("Coverage per unit must be greater than zero.")
    gross_quantity = measured_quantity * (1.0 + (waste_percentage / 100.0))
    return math.ceil(gross_quantity / coverage_per_unit)
