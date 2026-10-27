"""Stage 12 Test Suite: Cost Estimation & Pricing Engine.

Validates:
1. Multi-Regional Pricing Modes:
   - US Dollar (USD) — RSMeans benchmark rates.
   - Indian Rupee (INR) — CPWD Delhi Schedule of Rates (DSR 2023).
2. Financial Arithmetic Invariant:
   - Direct Cost Subtotal == Sum(line.total_cost).
   - Total Estimated Budget == Direct Cost + Overhead + Profit + Contingency.
3. 100% Pricing Coverage Guarantee:
   - Zero lines left with unit_cost <= 0.0.
4. Mandatory Gate on Real Benchmark:
   - Barakar evaluates with clean financial summary in INR (₹).
"""

from __future__ import annotations

import os
from ostaad_boq.models import (
    BOQReport,
    TakeoffLine,
    UnitType,
    CalculationMethod,
    ScaleCalibration,
)
from ostaad_boq.pricing_engine import price_boq_report
from ostaad_boq.engine import OstaadBOQEngine


def test_multi_regional_pricing_usd_and_inr():
    """Verify itemized pricing and breakdowns in both USD and INR modes."""
    lines_usd = [
        TakeoffLine(
            id="d1", item_description="Wood Door (D1)", category="Openings - Doors",
            quantity=2.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            wbs_code="08 14 00",
        ),
        TakeoffLine(
            id="dw1", item_description="1/2\" Gypsum Wallboard", category="Finishes - Walls",
            quantity=1000.0, unit=UnitType.SF, calculation_method=CalculationMethod.DERIVED_MATERIAL,
            wbs_code="09 29 00",
        ),
    ]
    report_usd = BOQReport(
        project_name="USD Project",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=lines_usd,
    )

    priced_usd = price_boq_report(report_usd, currency="USD")
    d1_usd = priced_usd.lines[0]
    dw_usd = priced_usd.lines[1]

    # USD verification
    assert d1_usd.currency == "USD"
    assert d1_usd.unit_cost == 420.00
    assert d1_usd.total_cost == 840.00
    assert d1_usd.material_cost > 0.0
    assert d1_usd.labor_cost > 0.0

    assert dw_usd.currency == "USD"
    assert dw_usd.unit_cost == 2.85
    assert dw_usd.total_cost == 2850.00

    assert priced_usd.cost_summary.currency_symbol == "$"
    # Direct cost = 840 + 2850 = 3690.00
    assert priced_usd.cost_summary.direct_cost_subtotal == 3690.00

    # INR verification
    lines_inr = [
        TakeoffLine(
            id="d1", item_description="Wood Door (D1)", category="Openings - Doors",
            quantity=2.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            wbs_code="08 14 00",
        ),
        TakeoffLine(
            id="fl1", item_description="Vitrified Floor Tiles", category="Finishes - Flooring",
            quantity=500.0, unit=UnitType.SF, calculation_method=CalculationMethod.CALLOUT_STATED,
            wbs_code="09 30 00",
        ),
    ]
    report_inr = BOQReport(
        project_name="INR Project",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=20.0, unit="metre"),
        lines=lines_inr,
    )

    priced_inr = price_boq_report(report_inr, currency="INR")
    d1_inr = priced_inr.lines[0]
    fl_inr = priced_inr.lines[1]

    assert d1_inr.currency == "INR"
    assert d1_inr.unit_cost == 12500.00
    assert d1_inr.total_cost == 25000.00

    assert fl_inr.currency == "INR"
    assert fl_inr.unit_cost == 145.00
    assert fl_inr.total_cost == 72500.00

    assert priced_inr.cost_summary.currency_symbol == "₹"
    # Direct cost = 25000 + 72500 = 97500.00
    assert priced_inr.cost_summary.direct_cost_subtotal == 97500.00


def test_financial_rollup_arithmetic_integrity():
    """Verify strict arithmetic: Direct Subtotal == Sum(lines), Budget == Subtotal + Markups."""
    lines = [
        TakeoffLine(
            id="l1", item_description="Wood Door", category="Openings - Doors",
            quantity=5.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            wbs_code="08 14 00",
        ),
        TakeoffLine(
            id="l2", item_description="Plastic Windows", category="Openings - Windows",
            quantity=4.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
            wbs_code="08 53 00",
        ),
    ]
    report = BOQReport(
        project_name="Audit Project",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=lines,
    )

    priced = price_boq_report(report, currency="USD", overhead_pct=10.0, profit_pct=10.0, contingency_pct=5.0)
    summary = priced.cost_summary

    # Sum of line item costs
    calculated_subtotal = round(sum(l.total_cost for l in priced.lines), 2)
    assert summary.direct_cost_subtotal == calculated_subtotal

    # Markup amounts
    exp_overhead = round(calculated_subtotal * 0.10, 2)
    exp_profit = round(calculated_subtotal * 0.10, 2)
    exp_contingency = round(calculated_subtotal * 0.05, 2)

    assert summary.overhead_amount == exp_overhead
    assert summary.profit_amount == exp_profit
    assert summary.contingency_amount == exp_contingency

    # Total budget
    exp_total = round(calculated_subtotal + exp_overhead + exp_profit + exp_contingency, 2)
    assert summary.total_estimated_budget == exp_total


def test_100_percent_pricing_coverage_guarantee():
    """Verify every line receives a positive unit rate, including unclassified/generic items."""
    arbitrary_line = TakeoffLine(
        id="arb-1", item_description="Custom Specialty Feature", category="General",
        quantity=3.0, unit=UnitType.EA, calculation_method=CalculationMethod.COUNTED,
        wbs_code="01 00 00",
    )
    report = BOQReport(
        project_name="Coverage Test",
        scale=ScaleCalibration(scale_known=True, pixels_per_unit=10.0, unit="ft"),
        lines=[arbitrary_line],
    )

    priced = price_boq_report(report, currency="USD")
    res_line = priced.lines[0]

    assert res_line.unit_cost > 0.0, "Unit cost must be strictly positive"
    assert res_line.total_cost == res_line.unit_cost * 3.0
    assert res_line.currency == "USD"


def test_mandatory_gate_barakar_and_floorplan_pricing():
    """Mandatory Gate: Barakar evaluates with clean financial summary in INR (₹)."""
    barakar_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    if not os.path.exists(barakar_path):
        raise FileNotFoundError(f"Barakar PDF not found at {barakar_path}")

    engine = OstaadBOQEngine()
    report = engine.process_file(barakar_path)

    # Cost summary exists
    assert report.cost_summary is not None
    assert report.cost_summary.currency == "INR"
    assert report.cost_summary.direct_cost_subtotal > 0.0
    assert report.cost_summary.total_estimated_budget > 0.0

    print("Stage 12 Cost Estimation & Pricing Gate PASSED: Multi-currency and arithmetic verified.")


if __name__ == "__main__":
    test_multi_regional_pricing_usd_and_inr()
    print("PASS: test_multi_regional_pricing_usd_and_inr")
    test_financial_rollup_arithmetic_integrity()
    print("PASS: test_financial_rollup_arithmetic_integrity")
    test_100_percent_pricing_coverage_guarantee()
    print("PASS: test_100_percent_pricing_coverage_guarantee")
    test_mandatory_gate_barakar_and_floorplan_pricing()
    print("PASS: test_mandatory_gate_barakar_and_floorplan_pricing")
    print("ALL STAGE 12 TESTS COMPLETED SUCCESSFULLY!")
