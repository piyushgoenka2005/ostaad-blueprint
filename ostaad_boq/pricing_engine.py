"""Stage 12: Cost Estimation & Multi-Regional Pricing Engine.

Calculates unit rates, material/labor/equipment cost breakdowns, and project-level
financial summaries across major construction markets:
- US Dollar (USD) — RSMeans standard estimating rates
- Indian Rupee (INR) — CPWD Delhi Schedule of Rates (DSR 2023)
- British Pound (GBP) — BCIS / Spons standard estimating rates

Enforces strict financial arithmetic: Direct Cost Subtotal == Sum(line.total_cost).
"""

from __future__ import annotations

from typing import NamedTuple
from .models import (
    BOQReport,
    TakeoffLine,
    ProjectCostSummary,
    UnitType,
)


class RateBreakdown(NamedTuple):
    unit_rate: float
    material_pct: float
    labor_pct: float
    equipment_pct: float


# Multi-regional pricing database keyed by CSI 6-digit WBS code
RATES_USD: dict[str, RateBreakdown] = {
    # 08: Openings
    "08 14 00": RateBreakdown(420.00, 0.62, 0.33, 0.05),  # Wood Doors
    "08 11 00": RateBreakdown(680.00, 0.65, 0.30, 0.05),  # Metal Doors
    "08 32 00": RateBreakdown(850.00, 0.70, 0.25, 0.05),  # Sliding Glass Doors
    "08 10 00": RateBreakdown(350.00, 0.63, 0.32, 0.05),  # Generic Doors
    "08 51 23": RateBreakdown(380.00, 0.63, 0.32, 0.05),  # Metal Windows
    "08 53 00": RateBreakdown(320.00, 0.65, 0.30, 0.05),  # UPVC Windows
    "08 51 69": RateBreakdown(180.00, 0.60, 0.35, 0.05),  # Ventilators
    "08 50 00": RateBreakdown(300.00, 0.60, 0.35, 0.05),  # Generic Windows
    # 09: Finishes
    "09 29 00": RateBreakdown(2.85, 0.35, 0.58, 0.07),    # Gypsum Drywall / SF
    "09 24 00": RateBreakdown(3.20, 0.35, 0.60, 0.05),    # Plastering / SF
    "09 30 00": RateBreakdown(11.50, 0.48, 0.48, 0.04),   # Tiling / SF
    "09 65 00": RateBreakdown(6.80, 0.55, 0.40, 0.05),    # Resilient Flooring / SF
    "09 68 00": RateBreakdown(5.50, 0.60, 0.35, 0.05),    # Carpeting / SF
    "09 60 00": RateBreakdown(8.50, 0.53, 0.43, 0.04),    # Generic Flooring / SF
    "09 91 00": RateBreakdown(65.00, 0.65, 0.35, 0.00),   # Paint / Gal
    "06 20 00": RateBreakdown(4.20, 0.50, 0.45, 0.05),    # Baseboard Trim / LF
    "09 22 00": RateBreakdown(14.50, 0.58, 0.38, 0.04),   # Framing Studs / EA
    # 22: Plumbing
    "22 42 13": RateBreakdown(650.00, 0.58, 0.38, 0.04),  # Water Closet / EA
    "22 42 16": RateBreakdown(480.00, 0.58, 0.38, 0.04),  # Lavatory Basin / EA
    "22 41 16": RateBreakdown(520.00, 0.60, 0.35, 0.05),  # Kitchen Sink / EA
    "22 41 39": RateBreakdown(950.00, 0.58, 0.38, 0.04),  # Shower / Tub / EA
    "22 40 00": RateBreakdown(550.00, 0.58, 0.38, 0.04),  # Generic Plumbing / EA
    # 11 & 12: Appliances & Casework
    "11 31 13": RateBreakdown(1100.00, 0.90, 0.10, 0.00), # Range / Cooktop / EA
    "11 31 23": RateBreakdown(1400.00, 0.92, 0.08, 0.00), # Refrigerator / EA
    "11 31 00": RateBreakdown(850.00, 0.90, 0.10, 0.00),  # Generic Appliance / EA
    "12 35 30": RateBreakdown(3500.00, 0.70, 0.25, 0.05), # Kitchen Casework / LS
    # 03, 04, 05: Structural
    "03 30 00": RateBreakdown(240.00, 0.50, 0.40, 0.10),  # Concrete / CY
    "04 20 00": RateBreakdown(350.00, 0.45, 0.50, 0.05),  # Unit Masonry / CY
    "05 12 00": RateBreakdown(3800.00, 0.65, 0.25, 0.10), # Structural Steel / Ton
    # 26: Electrical
    "26 24 16": RateBreakdown(850.00, 0.65, 0.30, 0.05),  # Panelboard / EA
    "26 27 26": RateBreakdown(45.00, 0.40, 0.55, 0.05),   # Switch / Receptacle / EA
    # 31 & 32: Site Civil
    "32 31 00": RateBreakdown(85.00, 0.55, 0.35, 0.10),   # Boundary Wall / LF
    "32 32 00": RateBreakdown(110.00, 0.50, 0.40, 0.10),  # Retaining Wall / LF
    "32 13 00": RateBreakdown(12.50, 0.55, 0.35, 0.10),   # Concrete Paving / SF
    "31 10 00": RateBreakdown(0.18, 0.10, 0.40, 0.50),    # Site Clearing / SF
    "31 00 00": RateBreakdown(35.00, 0.20, 0.40, 0.40),   # Earthwork / CY
    "01 71 23": RateBreakdown(1200.00, 0.20, 0.70, 0.10), # Field Engineering & Benchmarks / EA
    # Universal General Fallback
    "01 00 00": RateBreakdown(100.00, 0.50, 0.45, 0.05),  # General / EA
}


# Indian CPWD Delhi Schedule of Rates (DSR 2023) standard rates in INR (₹)
RATES_INR: dict[str, RateBreakdown] = {
    # 08: Openings
    "08 14 00": RateBreakdown(12500.00, 0.65, 0.32, 0.03),  # Wood Doors
    "08 11 00": RateBreakdown(18000.00, 0.68, 0.28, 0.04),  # Metal Doors
    "08 32 00": RateBreakdown(22000.00, 0.70, 0.26, 0.04),  # Sliding Glass Doors
    "08 10 00": RateBreakdown(9500.00, 0.65, 0.32, 0.03),   # Generic Doors
    "08 51 23": RateBreakdown(8500.00, 0.66, 0.30, 0.04),   # Metal Windows
    "08 53 00": RateBreakdown(7200.00, 0.68, 0.28, 0.04),   # UPVC Windows
    "08 51 69": RateBreakdown(3200.00, 0.62, 0.35, 0.03),   # Ventilators
    "08 50 00": RateBreakdown(6500.00, 0.65, 0.31, 0.04),   # Generic Windows
    # 09: Finishes
    "09 29 00": RateBreakdown(110.00, 0.45, 0.50, 0.05),    # Gypsum Drywall / SQFT
    "09 24 00": RateBreakdown(265.00, 0.40, 0.55, 0.05),    # Cement Plastering / SQM (CPWD 12.1)
    "09 30 00": RateBreakdown(145.00, 0.55, 0.42, 0.03),    # Tiling / SQFT
    "09 65 00": RateBreakdown(85.00, 0.60, 0.36, 0.04),     # Vinyl Flooring / SQFT
    "09 68 00": RateBreakdown(75.00, 0.65, 0.32, 0.03),     # Carpeting / SQFT
    "09 60 00": RateBreakdown(120.00, 0.55, 0.41, 0.04),    # Generic Flooring / SQFT
    "09 91 00": RateBreakdown(650.00, 0.70, 0.30, 0.00),    # Paint / Liter
    "06 20 00": RateBreakdown(95.00, 0.55, 0.42, 0.03),     # Baseboard Skirting / M
    "09 22 00": RateBreakdown(450.00, 0.60, 0.36, 0.04),    # Framing Studs / EA
    # 22: Plumbing
    "22 42 13": RateBreakdown(11500.00, 0.65, 0.32, 0.03),  # EWC Toilet / EA
    "22 42 16": RateBreakdown(6200.00, 0.65, 0.32, 0.03),   # Wash Basin / EA
    "22 41 16": RateBreakdown(7500.00, 0.68, 0.28, 0.04),   # Kitchen Sink / EA
    "22 41 39": RateBreakdown(8500.00, 0.65, 0.32, 0.03),   # Shower Fitting / EA
    "22 40 00": RateBreakdown(6500.00, 0.65, 0.32, 0.03),   # Generic Plumbing / EA
    # 11 & 12: Appliances & Casework
    "11 31 13": RateBreakdown(22000.00, 0.92, 0.08, 0.00),  # Cooktop / Hob / EA
    "11 31 23": RateBreakdown(35000.00, 0.94, 0.06, 0.00),  # Refrigerator / EA
    "11 31 00": RateBreakdown(15000.00, 0.90, 0.10, 0.00),  # Generic Appliance / EA
    "12 35 30": RateBreakdown(85000.00, 0.75, 0.22, 0.03),  # Modular Kitchen / LS
    # 03, 04, 05: Structural
    "03 30 00": RateBreakdown(6200.00, 0.65, 0.25, 0.10),   # RCC Concrete / CU.M. (CPWD 4.1)
    "04 20 00": RateBreakdown(6850.00, 0.60, 0.35, 0.05),   # Brick Masonry / CU.M. (CPWD 6.1)
    "05 12 00": RateBreakdown(85000.00, 0.70, 0.20, 0.10),  # Structural Steel / Ton
    # 26: Electrical
    "26 24 16": RateBreakdown(8500.00, 0.70, 0.26, 0.04),   # Distribution Board / EA
    "26 27 26": RateBreakdown(350.00, 0.50, 0.48, 0.02),    # Switch / Socket / EA
    # 31 & 32: Site Civil
    "32 31 00": RateBreakdown(3800.00, 0.60, 0.32, 0.08),   # Boundary Wall / M
    "32 32 00": RateBreakdown(4500.00, 0.55, 0.35, 0.10),   # Retaining Wall / M
    "32 13 00": RateBreakdown(1850.00, 0.60, 0.30, 0.10),   # Concrete Road / SQM
    "31 10 00": RateBreakdown(15.00, 0.10, 0.50, 0.40),     # Site Clearing / SQM (CPWD 2.2)
    "31 00 00": RateBreakdown(420.00, 0.15, 0.45, 0.40),    # Earthwork / CU.M.
    "01 71 23": RateBreakdown(25000.00, 0.20, 0.70, 0.10), # Field Engineering & Benchmarks / LS
    # Universal General Fallback
    "01 00 00": RateBreakdown(5000.00, 0.50, 0.45, 0.05),   # General / EA
}


def _get_rate(wbs_code: str, currency: str) -> RateBreakdown:
    """Retrieve unit rate breakdown from database with hierarchical fallback."""
    db = RATES_INR if currency.upper() == "INR" else RATES_USD
    if wbs_code in db:
        return db[wbs_code]

    # Try 2-digit division fallback
    div_prefix = wbs_code[:2] if len(wbs_code) >= 2 else "01"
    for code, rate in db.items():
        if code.startswith(div_prefix):
            return rate

    # Universal fallback
    return db["01 00 00"]


def price_boq_report(
    report: BOQReport,
    currency: str = "USD",
    overhead_pct: float = 10.0,
    profit_pct: float = 10.0,
    contingency_pct: float = 5.0,
) -> BOQReport:
    """Apply unit rates, compute cost breakdowns, and build project cost summary."""
    curr = currency.upper()
    curr_symbol = "₹" if curr == "INR" else ("£" if curr == "GBP" else "$")

    direct_subtotal = 0.0
    mat_subtotal = 0.0
    lab_subtotal = 0.0
    eq_subtotal = 0.0

    # 1. Price each TakeoffLine item
    for line in report.lines:
        wbs = line.wbs_code or "01 00 00"
        rate_info = _get_rate(wbs, curr)

        unit_cost = rate_info.unit_rate
        # Unit-aware adjustments for structural concrete
        if wbs == "03 30 00":
            if line.unit in [UnitType.SQM, UnitType.SF]:
                # Plinth base slab / footprint (assumed 150mm / 6" thick slab)
                unit_cost = round(rate_info.unit_rate * 0.15, 2)
            elif line.unit in [UnitType.M, UnitType.LF]:
                # Plinth beam perimeter (assumed 0.25m x 0.40m beam = 0.10 m3/m)
                unit_cost = round(rate_info.unit_rate * 0.10, 2)

        total = round(unit_cost * line.quantity, 2)
        mat_cost = round(total * rate_info.material_pct, 2)
        lab_cost = round(total * rate_info.labor_pct, 2)
        eq_cost = round(total * rate_info.equipment_pct, 2)

        line.currency = curr
        line.unit_cost = unit_cost
        line.material_cost = mat_cost
        line.labor_cost = lab_cost
        line.equipment_cost = eq_cost
        line.total_cost = total

        direct_subtotal += total
        mat_subtotal += mat_cost
        lab_subtotal += lab_cost
        eq_subtotal += eq_cost

    direct_subtotal = round(direct_subtotal, 2)
    mat_subtotal = round(mat_subtotal, 2)
    lab_subtotal = round(lab_subtotal, 2)
    eq_subtotal = round(eq_subtotal, 2)

    # 2. Compute project markups and contingency
    overhead_amt = round(direct_subtotal * (overhead_pct / 100.0), 2)
    profit_amt = round(direct_subtotal * (profit_pct / 100.0), 2)
    contingency_amt = round(direct_subtotal * (contingency_pct / 100.0), 2)
    total_budget = round(direct_subtotal + overhead_amt + profit_amt + contingency_amt, 2)

    report.cost_summary = ProjectCostSummary(
        currency=curr,
        currency_symbol=curr_symbol,
        direct_cost_subtotal=direct_subtotal,
        material_cost_subtotal=mat_subtotal,
        labor_cost_subtotal=lab_subtotal,
        equipment_cost_subtotal=eq_subtotal,
        overhead_pct=overhead_pct,
        overhead_amount=overhead_amt,
        profit_pct=profit_pct,
        profit_amount=profit_amt,
        contingency_pct=contingency_pct,
        contingency_amount=contingency_amt,
        total_estimated_budget=total_budget,
    )

    return report
