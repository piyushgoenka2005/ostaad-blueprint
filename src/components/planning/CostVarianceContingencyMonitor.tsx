"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Printer,
  Plus,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  X,
  PieChart,
} from "lucide-react";
import {
  PackageBudgetItem,
  ContingencyDrawdown,
  DEFAULT_BUDGET_PACKAGES,
  INITIAL_CONTINGENCY_DRAWDOWNS,
  TOTAL_PROJECT_CONTINGENCY_POOL_INR,
  calculateBudgetVarianceSummary,
} from "@/lib/planning/variance-readiness";

interface CostVarianceContingencyMonitorProps {
  className?: string;
}

export default function CostVarianceContingencyMonitor({
  className = "",
}: CostVarianceContingencyMonitorProps) {
  const [packages, setPackages] = useState<PackageBudgetItem[]>(DEFAULT_BUDGET_PACKAGES);
  const [drawdowns, setDrawdowns] = useState<ContingencyDrawdown[]>(INITIAL_CONTINGENCY_DRAWDOWNS);
  const [isDrawdownModalOpen, setIsDrawdownModalOpen] = useState<boolean>(false);

  // Form state for new contingency drawdown
  const [targetPackageId, setTargetPackageId] = useState<string>("pkg-02");
  const [drawdownAmount, setDrawdownAmount] = useState<number>(500000);
  const [drawdownJustification, setDrawdownJustification] = useState<string>("");

  // Summary analysis
  const summary = useMemo(() => {
    return calculateBudgetVarianceSummary(packages, drawdowns, TOTAL_PROJECT_CONTINGENCY_POOL_INR);
  }, [packages, drawdowns]);

  // Currency formatters
  const formatCr = (amt: number) => `₹${(amt / 10000000).toFixed(2)} Cr`;
  const formatLakhs = (amt: number) => `₹${(amt / 100000).toFixed(2)} L`;
  const formatINR = (amt: number) => `₹${amt.toLocaleString("en-IN")}`;

  // Handle new contingency drawdown
  const handleAddDrawdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawdownJustification.trim()) return;

    const targetPkg = packages.find((p) => p.id === targetPackageId);
    if (!targetPkg) return;

    const newDrawdown: ContingencyDrawdown = {
      id: `drw-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      targetPackageId,
      targetPackageName: targetPkg.packageName,
      amountINR: Number(drawdownAmount) || 0,
      justification: drawdownJustification.trim(),
      approvedBy: "Project Director / Finance Head",
    };

    setDrawdowns((prev) => [newDrawdown, ...prev]);

    // Update package contingency allocated
    setPackages((prev) =>
      prev.map((p) => {
        if (p.id !== targetPackageId) return p;
        return {
          ...p,
          contingencyAllocatedINR: p.contingencyAllocatedINR + (Number(drawdownAmount) || 0),
        };
      })
    );

    setIsDrawdownModalOpen(false);
    setDrawdownJustification("");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-700 text-white shadow-md shadow-rose-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Cost vs. Budget Variance & Contingency Monitor (Tool 13)
                </h3>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                  Earned Value & EAC Guardrails
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Baseline tender budget, committed POs, actual invoiced payments, and contingency reserve drawdown tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawdownModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              <span>Drawdown Contingency</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Variance Sheet</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Baseline Budget
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {formatCr(summary.totalBaselineBudgetINR)}
            </div>
            <div className="text-[11px] text-slate-500">Approved Tender Scope</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Committed Contracts
            </div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              {formatCr(summary.totalCommittedOrdersINR)}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium">
              Invoiced: {formatCr(summary.totalActualInvoicedINR)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Estimate at Completion (EAC)
            </div>
            <div className="text-xl font-black text-rose-700 mt-0.5">
              {formatCr(summary.grandTotalEACINR)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium">
              Variance: {summary.netVariancePercent >= 0 ? "+" : ""}
              {summary.netVariancePercent}%
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Contingency Reserve
            </div>
            <div className="text-xl font-black text-amber-900 mt-0.5">
              {formatLakhs(summary.remainingContingencyINR)}
            </div>
            <div className="text-[11px] text-amber-800">
              {summary.contingencyUtilizationPercent}% Drawn (of {formatCr(summary.totalContingencyPoolINR)})
            </div>
          </div>
        </div>
      </div>

      {/* Contingency Pool Visual Progress Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#122b45]">
              Contingency Reserve Pool Utilization Status
            </h4>
            <p className="text-xs text-slate-500">
              Project contingency pool allocated at 5% of direct works to mitigate market inflation and scope expansion.
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-slate-700">
            Drawn: {formatLakhs(summary.totalDrawnINR)} / Available: {formatLakhs(summary.remainingContingencyINR)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, summary.contingencyUtilizationPercent)}%` }}
            title={`Drawn: ${summary.contingencyUtilizationPercent}%`}
          />
        </div>

        {/* Audit Log Table of Contingency Drawdowns */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
            Approved Drawdown Audit Log ({drawdowns.length} Events)
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Target Work Package</th>
                  <th className="py-2 px-3 text-right">Drawn Amount</th>
                  <th className="py-2 px-3">Justification & Scope Change</th>
                  <th className="py-2 px-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drawdowns.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-600">{d.date}</td>
                    <td className="py-2.5 px-3 font-bold text-[#122b45]">{d.targetPackageName}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                      {formatLakhs(d.amountINR)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{d.justification}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{d.approvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Package Variance Register Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          Package-by-Package Budget vs. Committed Contracts Variance Register
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-3 px-3">Cost Code</th>
                <th className="py-3 px-4">Package Name</th>
                <th className="py-3 px-3 text-right">Baseline Budget</th>
                <th className="py-3 px-3 text-right">Committed POs</th>
                <th className="py-3 px-3 text-right">Actual Invoiced</th>
                <th className="py-3 px-3 text-right font-bold text-[#122b45]">EAC Projected</th>
                <th className="py-3 px-3 text-right">Variance (%)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.analyzedPackages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-500">{pkg.costCode}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#122b45]">{pkg.packageName}</div>
                    {pkg.notes && <div className="text-[10px] text-slate-500 mt-0.5">{pkg.notes}</div>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                    {formatCr(pkg.baselineBudgetINR)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-indigo-700">
                    {formatCr(pkg.committedOrdersINR)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {formatCr(pkg.actualInvoicedINR)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#122b45]">
                    {formatCr(pkg.eacINR)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold ${
                      pkg.variancePercent < 0 ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {pkg.variancePercent >= 0 ? "+" : ""}
                    {pkg.variancePercent}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    {pkg.computedStatus === "SAFE" ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        SAFE
                      </span>
                    ) : pkg.computedStatus === "WARNING" ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        VARIANCE
                      </span>
                    ) : (
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                        OVERRUN
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-[#122b45]">
                <td colSpan={2} className="py-3.5 px-4 uppercase text-[11px] tracking-wider text-slate-600">
                  Total Civil & MEP Portfolio:
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs">
                  {formatCr(summary.totalBaselineBudgetINR)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs text-indigo-700">
                  {formatCr(summary.totalCommittedOrdersINR)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-600">
                  {formatCr(summary.totalActualInvoicedINR)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs font-black text-rose-900">
                  {formatCr(summary.grandTotalEACINR)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs text-rose-700">
                  {summary.netVariancePercent}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* DRAWDOWN REQUEST MODAL */}
      {isDrawdownModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Request Contingency Drawdown</h4>
              <button
                onClick={() => setIsDrawdownModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDrawdown} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Target Work Package</label>
                <select
                  value={targetPackageId}
                  onChange={(e) => setTargetPackageId(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.packageName} ({pkg.costCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Drawdown Amount (₹)</label>
                <input
                  type="number"
                  min="10000"
                  step="50000"
                  required
                  value={drawdownAmount}
                  onChange={(e) => setDrawdownAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Available in contingency buffer: {formatLakhs(summary.remainingContingencyINR)}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Technical Scope Justification</label>
                <textarea
                  required
                  rows={3}
                  value={drawdownJustification}
                  onChange={(e) => setDrawdownJustification(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="Explain market price escalation, site unforeseen strata, or authority specification upgrade..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDrawdownModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#122b45] px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
                >
                  Approve & Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

