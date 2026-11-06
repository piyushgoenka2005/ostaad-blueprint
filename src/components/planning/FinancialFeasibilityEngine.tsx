"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Percent,
  SlidersHorizontal,
  ShieldCheck,
  Building2,
  PieChart,
  ArrowRight,
  Printer,
  Sparkles,
  Info,
  DollarSign,
  Briefcase,
} from "lucide-react";
import {
  evaluateFinancialFeasibility,
  FeasibilityAnalysisResult,
} from "@/lib/planning/finance-scorecard";

interface FinancialFeasibilityEngineProps {
  initialCapexINR?: number;
  initialSaleableSqFt?: number;
  className?: string;
}

export default function FinancialFeasibilityEngine({
  initialCapexINR = 225000000, // ₹22.5 Crores
  initialSaleableSqFt = 65000, // 65,000 sq.ft
  className = "",
}: FinancialFeasibilityEngineProps) {
  const [totalCapex, setTotalCapex] = useState<number>(initialCapexINR);
  const [saleableArea, setSaleableArea] = useState<number>(initialSaleableSqFt);
  const [targetSaleRate, setTargetSaleRate] = useState<number>(5500); // ₹5,500 / sq.ft
  const [equityPercent, setEquityPercent] = useState<number>(35); // 35% Equity, 65% Debt
  const [interestRate, setInterestRate] = useState<number>(10.5); // 10.5% per annum
  const [tenureMonths, setTenureMonths] = useState<number>(36); // 3 years
  const [moratoriumMonths, setMoratoriumMonths] = useState<number>(18); // 1.5 years construction

  const analysis: FeasibilityAnalysisResult = useMemo(() => {
    return evaluateFinancialFeasibility({
      totalCapexINR: totalCapex,
      saleableAreaSqFt: saleableArea,
      projectedSaleRatePerSqFt: targetSaleRate,
      equityContributionPercent: equityPercent,
      debtInterestRatePercent: interestRate,
      loanTenureMonths: tenureMonths,
      moratoriumPeriodMonths: moratoriumMonths,
    });
  }, [
    totalCapex,
    saleableArea,
    targetSaleRate,
    equityPercent,
    interestRate,
    tenureMonths,
    moratoriumMonths,
  ]);

  const formatINR = (amount: number) => {
    if (Math.abs(amount) >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview & Capital Structure Controller */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Financial Feasibility, Debt/EMI & Return Analyzer (Tool 9)
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Construction Finance (CF) Model
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Debt-equity modeling, moratorium interest capitalization, break-even sale rate, ROE, and DSCR
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Feasibility Report</span>
          </button>
        </div>

        {/* Input Parameters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs">
          {/* Total Project Capex */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Total Project Capex (INR)</label>
            <input
              type="number"
              value={totalCapex}
              onChange={(e) => setTotalCapex(Math.max(1000000, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-400">
              Formatted: <span className="font-bold text-slate-700">{formatINR(totalCapex)}</span>
            </div>
          </div>

          {/* Saleable Area & Target Rate */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Saleable Area (sq.ft)</label>
            <input
              type="number"
              value={saleableArea}
              onChange={(e) => setSaleableArea(Math.max(100, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-400">Net marketable floor space</div>
          </div>

          {/* Target Sale Price */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Projected Sale Rate / sq.ft</label>
            <div className="relative">
              <input
                type="number"
                value={targetSaleRate}
                onChange={(e) => setTargetSaleRate(Math.max(100, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">₹/sq.ft</span>
            </div>
            <div className="text-[10px] text-slate-400">Market benchmark absorption rate</div>
          </div>

          {/* Promoter Equity % */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Promoter Equity Ratio</label>
              <span className="font-mono text-blue-700 font-bold">{equityPercent}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="1"
              value={equityPercent}
              onChange={(e) => setEquityPercent(Number(e.target.value))}
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">
              Debt Share: <span className="font-bold text-slate-700">{100 - equityPercent}%</span> (
              {formatINR(analysis.loanAmountINR)})
            </div>
          </div>
        </div>

        {/* Loan Tenure & Interest Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Construction Loan Interest Rate</label>
              <span className="font-mono text-purple-700 font-bold">{interestRate}% p.a.</span>
            </div>
            <input
              type="range"
              min="8.0"
              max="15.0"
              step="0.25"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full mt-1.5 accent-purple-600"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Total Loan Tenure</label>
              <span className="font-mono text-slate-800 font-bold">{tenureMonths} Months ({tenureMonths / 12} yrs)</span>
            </div>
            <input
              type="range"
              min="12"
              max="60"
              step="6"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full mt-1.5 accent-slate-800"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Construction Moratorium</label>
              <span className="font-mono text-amber-700 font-bold">{moratoriumMonths} Months</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="3"
              value={moratoriumMonths}
              onChange={(e) => setMoratoriumMonths(Number(e.target.value))}
              className="w-full mt-1.5 accent-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Primary Financial Feasibility Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Projected Gross Revenue */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Projected Gross Sales Revenue
          </div>
          <div className="text-3xl font-black text-blue-950 font-mono">
            {formatINR(analysis.projectedGrossRevenueINR)}
          </div>
          <div className="text-xs text-blue-800 font-medium">
            Based on {saleableArea.toLocaleString()} sq.ft @ ₹{targetSaleRate}/sq.ft
          </div>
          <div className="text-[10px] text-blue-600 pt-1 border-t border-blue-200/60 mt-2">
            Total Inflow before tax
          </div>
        </div>

        {/* Net Profit & Margin */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Projected Gross Profit
          </div>
          <div className="text-3xl font-black text-emerald-950 font-mono">
            {formatINR(analysis.grossProfitINR)}
          </div>
          <div className="text-xs text-emerald-800 font-bold">
            Gross Margin: {analysis.grossMarginPercent}%
          </div>
          <div className="text-[10px] text-emerald-600 pt-1 border-t border-emerald-200/60 mt-2">
            After Capex + Financing Costs
          </div>
        </div>

        {/* Break-Even Sale Rate */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Break-Even Sale Rate
          </div>
          <div className="text-3xl font-black text-amber-950 font-mono">
            ₹{analysis.breakEvenSaleRatePerSqFt.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-amber-800 font-medium">
            Safety Margin: ₹{(targetSaleRate - analysis.breakEvenSaleRatePerSqFt).toLocaleString()}/sq.ft
          </div>
          <div className="text-[10px] text-amber-600 pt-1 border-t border-amber-200/60 mt-2">
            Includes total interest debt load
          </div>
        </div>

        {/* Return on Equity & IRR */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
            Return on Equity (ROE)
          </div>
          <div className="text-3xl font-black text-purple-950 font-mono">
            {analysis.returnOnEquityPercent}%
          </div>
          <div className="text-xs text-purple-800 font-bold">
            Est. Project IRR: ~{analysis.estimatedIRRPercent}% p.a.
          </div>
          <div className="text-[10px] text-purple-600 pt-1 border-t border-purple-200/60 mt-2">
            Equity Invested: {formatINR(analysis.equityRequiredINR)}
          </div>
        </div>
      </div>

      {/* Financing Breakdown & Loan Amortization Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Capital Structure Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              Capital Structure & Debt Servicing
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Promoter equity contribution vs. bank construction loan exposure
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Promoter Equity Required ({equityPercent}%)</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(analysis.equityRequiredINR)}</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-700">Construction Finance Loan ({100 - equityPercent}%)</span>
              <span className="font-mono font-bold text-blue-700">{formatINR(analysis.loanAmountINR)}</span>
            </div>

            <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/60 flex items-center justify-between">
              <span className="font-semibold text-purple-900">Total Interest Outflow ({interestRate}%)</span>
              <span className="font-mono font-bold text-purple-950">{formatINR(analysis.totalInterestINR)}</span>
            </div>

            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
              <span className="font-semibold text-amber-900">Capitalized Moratorium Interest</span>
              <span className="font-mono font-bold text-amber-950">{formatINR(analysis.capitalizedInterestMoratoriumINR)}</span>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Monthly Post-Moratorium EMI</span>
              <span className="font-mono font-bold text-emerald-950">{formatINR(analysis.monthlyEMIINR)} / mo</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900">Debt Service Coverage Ratio (DSCR)</span>
              <span className="font-mono font-bold text-emerald-700">{analysis.dscrRatio}x (Healthy &gt; 1.5x)</span>
            </div>
          </div>
        </div>

        {/* Milestone Amortization Schedule Table */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Loan Amortization Milestone Schedule
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Principal drawdown, monthly repayment, and closing debt balances
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Month</th>
                  <th className="px-3 py-2.5">Opening Balance</th>
                  <th className="px-3 py-2.5">Payment / EMI</th>
                  <th className="px-3 py-2.5">Interest</th>
                  <th className="px-3 py-2.5">Principal Paid</th>
                  <th className="px-3 py-2.5 text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {analysis.schedulePreview.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2 font-bold text-slate-800">
                      M-{m.month} {m.month <= moratoriumMonths && <span className="text-[9px] text-amber-600 font-sans font-normal">(Moratorium)</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatINR(m.openingPrincipal)}</td>
                    <td className="px-3 py-2 font-bold text-blue-700">{formatINR(m.emi)}</td>
                    <td className="px-3 py-2 text-purple-700">{formatINR(m.interest)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatINR(m.principalRepaid)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatINR(m.closingPrincipal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

