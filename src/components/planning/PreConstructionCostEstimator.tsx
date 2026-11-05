"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  IndianRupee,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import {
  calculatePreConstructionBudget,
  CPWD_WORK_HEAD_PACKAGES,
  CostEstimationResult,
} from "@/lib/planning/geotech-cost";

interface PreConstructionCostEstimatorProps {
  initialBUASqFt?: number;
  className?: string;
}

export default function PreConstructionCostEstimator({
  initialBUASqFt = 75000,
  className = "",
}: PreConstructionCostEstimatorProps) {
  const [buaSqFt, setBuaSqFt] = useState<number>(initialBUASqFt);
  const [grade, setGrade] = useState<"ECONOMY" | "STANDARD_COMMERCIAL" | "PREMIUM_CORPORATE" | "LUXURY_HIGH_RISE">(
    "STANDARD_COMMERCIAL"
  );
  const [contingencyPercent, setContingencyPercent] = useState<number>(5.0);
  const [contractorMarginPercent, setContractorMarginPercent] = useState<number>(12.0);
  const [consultantFeePercent, setConsultantFeePercent] = useState<number>(3.5);
  const [gstPercent, setGstPercent] = useState<number>(18.0);
  const [packageOverrides, setPackageOverrides] = useState<Record<string, number>>({});

  const budget: CostEstimationResult = useMemo(() => {
    return calculatePreConstructionBudget({
      grossBUASqFt: buaSqFt,
      buildingGrade: grade,
      contingencyReservePercent: contingencyPercent,
      contractorMarginPercent: contractorMarginPercent,
      statutoryConsultantFeesPercent: consultantFeePercent,
      applyGstPercent: gstPercent,
      packageOverrides,
    });
  }, [
    buaSqFt,
    grade,
    contingencyPercent,
    contractorMarginPercent,
    consultantFeePercent,
    gstPercent,
    packageOverrides,
  ]);

  const formatINR = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const handleUpdatePackageRate = (pkgId: string, rate: number) => {
    setPackageOverrides((prev) => ({
      ...prev,
      [pkgId]: Math.max(0, rate),
    }));
  };

  const handleResetRates = () => {
    setPackageOverrides({});
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview & Project Scale Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Pre-Construction Cost Estimator & Rate Analysis (Tool 2)
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  CPWD DSR 2026 Aligned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Work-head budgeting across Substructure, Superstructure, MEP, Finishes, Contingencies, and Taxes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetRates}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Reset to CPWD DSR
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Budget</span>
            </button>
          </div>
        </div>

        {/* Primary Parameter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs">
          {/* Gross BUA */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Gross Built-Up Area (BUA)</label>
            <div className="relative">
              <input
                type="number"
                value={buaSqFt}
                onChange={(e) => setBuaSqFt(Math.max(100, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-slate-400">sq.ft</span>
            </div>
            <div className="text-[10px] text-slate-400">
              ≈ {Math.round(buaSqFt / 10.7639).toLocaleString()} sq.meters
            </div>
          </div>

          {/* Building Grade */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Specification & Quality Grade</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="ECONOMY">Economy Civil (₹1,800 - ₹2,100 / sq.ft)</option>
              <option value="STANDARD_COMMERCIAL">Standard Commercial (₹2,200 - ₹2,600 / sq.ft)</option>
              <option value="PREMIUM_CORPORATE">Premium Corporate IT (₹2,700 - ₹3,300 / sq.ft)</option>
              <option value="LUXURY_HIGH_RISE">Luxury High-Rise (₹3,400+ / sq.ft)</option>
            </select>
            <div className="text-[10px] text-slate-400">Applies market finishing multiplier</div>
          </div>

          {/* Contingency Reserve */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Contingency Reserve</label>
              <span className="font-mono text-emerald-700 font-bold">{contingencyPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={contingencyPercent}
              onChange={(e) => setContingencyPercent(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-600"
            />
            <div className="text-[10px] text-slate-400">Reserve for price escalation & changes</div>
          </div>

          {/* Contractor Overhead & Profit */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Contractor OH & Profit</label>
              <span className="font-mono text-blue-700 font-bold">{contractorMarginPercent}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={contractorMarginPercent}
              onChange={(e) => setContractorMarginPercent(Number(e.target.value))}
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Standard CPWD allowance is 10-15%</div>
          </div>
        </div>
      </div>

      {/* Primary Financial Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Grand Total Capex */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Total Estimated Project Capex
          </div>
          <div className="text-3xl font-black text-emerald-950 font-mono">
            {formatINR(budget.grandTotalProjectCostINR)}
          </div>
          <div className="text-xs text-emerald-800 font-medium">
            All-Inclusive Turnkey Delivery
          </div>
          <div className="text-[10px] text-emerald-600 pt-1 border-t border-emerald-200/60 mt-2 font-mono">
            Raw INR: ₹{budget.grandTotalProjectCostINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* All-Inclusive Rate per Sq.Ft */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            All-Inclusive Rate / Sq.Ft BUA
          </div>
          <div className="text-3xl font-black text-blue-950 font-mono">
            ₹{budget.effectiveAllInclusiveRatePerSqFt.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-blue-800 font-medium">
            Base Civil Rate: ₹{budget.baseRatePerSqFtINR} / sq.ft
          </div>
          <div className="text-[10px] text-blue-600 pt-1 border-t border-blue-200/60 mt-2">
            Includes Contractor Margin, Reserves & GST
          </div>
        </div>

        {/* Base Civil Works Subtotal */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Direct Civil & MEP Subtotal
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatINR(budget.baseConstructionCostINR)}
          </div>
          <div className="text-xs font-semibold text-slate-700">
            7 Work Packages Combined
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 mt-2">
            Material (62%), Labour (20%), Plant (18%)
          </div>
        </div>

        {/* Overheads, Contingency & GST */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
            Statutory, Contingency & GST
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">
            {formatINR(
              budget.statutoryConsultantFeesINR +
                budget.contingencyReserveINR +
                budget.contractorMarginINR +
                budget.gstAmountINR
            )}
          </div>
          <div className="text-xs text-purple-800 font-medium">
            GST (18%): {formatINR(budget.gstAmountINR)}
          </div>
          <div className="text-[10px] text-purple-600 pt-1 border-t border-purple-200/60 mt-2">
            Contingency: {formatINR(budget.contingencyReserveINR)}
          </div>
        </div>
      </div>

      {/* CPWD Work-Head Packages Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            CPWD / IS 1200 Work-Head Cost Packages Breakdown
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed rate analysis per square foot BUA with key material specifications
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Work Package Code & Scope</th>
                <th className="px-3 py-3">Rate / Sq.Ft</th>
                <th className="px-3 py-3">Package Total (INR)</th>
                <th className="px-3 py-3">% Weight</th>
                <th className="px-4 py-3">Key Material Specifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budget.packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">{pkg.packageName}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {pkg.description}
                    </div>
                  </td>

                  <td className="px-3 py-3.5 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">₹</span>
                      <input
                        type="number"
                        value={pkg.ratePerSqFt}
                        onChange={(e) => handleUpdatePackageRate(pkg.id, Number(e.target.value))}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-blue-700 outline-none focus:border-blue-500"
                      />
                    </div>
                  </td>

                  <td className="px-3 py-3.5 font-mono font-bold text-slate-900">
                    {formatINR(pkg.totalPackageCostINR)}
                  </td>

                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${Math.min(100, pkg.percentageOfBase * 2.5)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">
                        {pkg.percentageOfBase}%
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-[11px] text-slate-500">
                    {pkg.materialsList}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3">Direct Base Construction Total</td>
                <td className="px-3 py-3 font-mono text-blue-800">
                  ₹{budget.baseRatePerSqFtINR} / sq.ft
                </td>
                <td className="px-3 py-3 font-mono text-emerald-800">
                  {formatINR(budget.baseConstructionCostINR)}
                </td>
                <td className="px-3 py-3 font-mono">100.0%</td>
                <td className="px-4 py-3 text-[11px] text-slate-500">
                  Excludes Contractor OH/Profit, Contingencies & GST
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
