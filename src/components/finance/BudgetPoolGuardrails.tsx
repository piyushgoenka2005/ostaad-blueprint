"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  Download,
  Building2,
  DollarSign,
  ArrowRight,
  Info,
  X,
  Sliders,
} from "lucide-react";
import {
  DepartmentBudgetPool,
  DEFAULT_BUDGET_POOLS,
} from "@/lib/commercial-finance";

interface BudgetPoolGuardrailsProps {
  budgetPools: DepartmentBudgetPool[];
  onUpdateBudgetPools: (pools: DepartmentBudgetPool[]) => void;
}

export default function BudgetPoolGuardrails({
  budgetPools,
  onUpdateBudgetPools,
}: BudgetPoolGuardrailsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoolForEdit, setSelectedPoolForEdit] = useState<DepartmentBudgetPool | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(500000);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Summary Metrics
  const totalApprovedBudget = useMemo(() => {
    return budgetPools.reduce((sum, p) => sum + p.approvedBudgetINR, 0);
  }, [budgetPools]);

  const totalCommittedSpend = useMemo(() => {
    return budgetPools.reduce((sum, p) => sum + p.committedSpendINR, 0);
  }, [budgetPools]);

  const totalPendingSpend = useMemo(() => {
    return budgetPools.reduce((sum, p) => sum + p.pendingSpendINR, 0);
  }, [budgetPools]);

  const totalActualSettled = useMemo(() => {
    return budgetPools.reduce((sum, p) => sum + p.actualSettledINR, 0);
  }, [budgetPools]);

  const totalRemainingHeadroom = useMemo(() => {
    return budgetPools.reduce((sum, p) => sum + p.remainingHeadroomINR, 0);
  }, [budgetPools]);

  const filteredPools = useMemo(() => {
    return budgetPools.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.packageName.toLowerCase().includes(q) ||
        p.costCode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [budgetPools, searchQuery]);

  const handleAdjustBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolForEdit) return;

    const updated = budgetPools.map((p) => {
      if (p.costCode === selectedPoolForEdit.costCode) {
        const newBudget = p.approvedBudgetINR + adjustmentAmount;
        const remaining = newBudget - p.committedSpendINR - p.pendingSpendINR;
        const util = Math.round(((p.committedSpendINR + p.pendingSpendINR) / newBudget) * 1000) / 10;
        return {
          ...p,
          approvedBudgetINR: newBudget,
          remainingHeadroomINR: remaining,
          utilizationPercent: util,
          isHardStopTriggered: remaining < 0,
        };
      }
      return p;
    });

    onUpdateBudgetPools(updated);
    setSelectedPoolForEdit(null);
    setAdjustmentReason("");
  };

  const exportBudgetsCSV = () => {
    const headers = [
      "Cost Code",
      "Package Name",
      "Category",
      "Approved Budget (INR)",
      "Committed Spend (INR)",
      "Pending Spend (INR)",
      "Actual Settled (INR)",
      "Remaining Headroom (INR)",
      "Utilization %",
      "Hard Stop Status",
    ];
    const rows = budgetPools.map((p) => [
      p.costCode,
      `"${p.packageName}"`,
      p.category,
      p.approvedBudgetINR,
      p.committedSpendINR,
      p.pendingSpendINR,
      p.actualSettledINR,
      p.remainingHeadroomINR,
      `${p.utilizationPercent}%`,
      p.isHardStopTriggered ? "TRIGGERED" : "NORMAL",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Budget_Pools_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Sub-Module 6.1
            </span>
            <span className="text-xs text-slate-500 font-medium">Cost Code Capital Allocations & Guardrails</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Departmental Budget Pools & Over-Budget Hard-Stop Engine
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time headroom monitoring across cost codes. Purchase order commitments exceeding package ceilings are automatically blocked.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportBudgetsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Approved Budget Ceiling</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalApprovedBudget / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">₹{totalApprovedBudget.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Committed Spend (POs)</div>
            <div className="text-xl font-bold text-amber-700">
              ₹{(totalCommittedSpend / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">
              {((totalCommittedSpend / totalApprovedBudget) * 100).toFixed(1)}% of ceiling committed
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Actual Settled (Bank)</div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{(totalActualSettled / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Disbursed via RTGS/NEFT</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Remaining Headroom</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalRemainingHeadroom / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-purple-700 font-medium">Zero hard stops active</div>
          </div>
        </div>
      </div>

      {/* Budget Pools Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Cost Code Allocation & Utilization Register
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Hard-stop threshold: 100% of approved package allocation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">Cost Code</th>
                <th className="py-3 px-4 min-w-[200px]">Package Name</th>
                <th className="py-3 px-3 text-right">Approved Ceiling</th>
                <th className="py-3 px-3 text-right">Committed (POs)</th>
                <th className="py-3 px-3 text-right">Pending Review</th>
                <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-900">Remaining Headroom</th>
                <th className="py-3 px-4 w-44 text-center">Utilization</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPools.map((pool) => {
                const isWarning = pool.utilizationPercent >= 95;
                return (
                  <tr key={pool.costCode} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {pool.costCode}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{pool.packageName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{pool.category}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      ₹{pool.approvedBudgetINR.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{pool.committedSpendINR.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-amber-700">
                      {pool.pendingSpendINR > 0 ? `+₹${pool.pendingSpendINR.toLocaleString("en-IN")}` : "—"}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 bg-blue-50/30">
                      ₹{pool.remainingHeadroomINR.toLocaleString("en-IN")}
                    </td>

                    {/* Utilization Progress Bar */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className={`font-bold ${isWarning ? "text-amber-700" : "text-slate-800"}`}>
                          {pool.utilizationPercent}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {pool.isHardStopTriggered ? "BLOCKED" : "SAFE"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pool.isHardStopTriggered
                              ? "bg-rose-600"
                              : isWarning
                              ? "bg-amber-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${Math.min(100, pool.utilizationPercent)}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedPoolForEdit(pool)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADJUST BUDGET ALLOCATION                                           */}
      {/* ========================================================================= */}
      {selectedPoolForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Adjust Package Budget Pool</h3>
              </div>
              <button
                onClick={() => setSelectedPoolForEdit(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustBudget} className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-800">{selectedPoolForEdit.packageName}</div>
                <div className="text-[11px] text-slate-500">Cost Code: {selectedPoolForEdit.costCode}</div>
                <div className="text-[11px] text-slate-600 pt-1">
                  Current Ceiling: <strong className="font-mono">₹{selectedPoolForEdit.approvedBudgetINR.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Budget Delta Adjustment (INR) (+ Increase / - Decrease)
                </label>
                <input
                  type="number"
                  step={50000}
                  required
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Corporate Finance Reallocation Rationale
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Authorized transfer from Contingency Pool to accommodate enhanced seismic rebar detailing..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-blue-900">New Budget Ceiling:</span>
                <span className="font-mono font-bold text-blue-950 text-sm">
                  ₹{(selectedPoolForEdit.approvedBudgetINR + adjustmentAmount).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPoolForEdit(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

