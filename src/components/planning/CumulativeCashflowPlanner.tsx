"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  TrendingDown,
  TrendingUp,
  Activity,
  AlertCircle,
  IndianRupee,
  Calendar,
  Layers,
  Printer,
  Sparkles,
  Info,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  DEFAULT_MONTHLY_CASHFLOW_SCHEDULE,
  calculateCashflowSCurve,
  CashflowAnalysisSummary,
} from "@/lib/planning/schedule-cashflow";

interface CumulativeCashflowPlannerProps {
  className?: string;
}

export default function CumulativeCashflowPlanner({
  className = "",
}: CumulativeCashflowPlannerProps) {
  const [schedule, setSchedule] = useState(DEFAULT_MONTHLY_CASHFLOW_SCHEDULE);

  // Compute cashflow analysis dynamically
  const cashflowData: CashflowAnalysisSummary = useMemo(() => {
    return calculateCashflowSCurve(schedule);
  }, [schedule]);

  // Currency formatter
  const formatCr = (amountINR: number) => {
    const cr = amountINR / 10000000;
    return `₹${cr.toFixed(2)} Cr`;
  };

  const formatLakhs = (amountINR: number) => {
    const lk = amountINR / 100000;
    return `₹${lk.toFixed(1)} L`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-700 text-white shadow-md shadow-teal-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Construction Phase & Cumulative Cashflow S-Curve Planner (Tool 10)
                </h3>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                  S-Curve & Liquidity Deficit Model
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Phase-wise capital outflow projections, customer collection inflows, cumulative S-Curve trajectories, and peak debt line exposure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Cashflow Model</span>
            </button>
          </div>
        </div>

        {/* Executive Liquidity & Exposure KPI Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Capex Outflow</span>
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {formatCr(cashflowData.totalOutflowINR)}
            </div>
            <div className="text-[11px] text-slate-500">Across 18 Construction Months</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Projected Inflow</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              {formatCr(cashflowData.totalInflowINR)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Equity + Customer Milestones</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
              <span>Peak Funding Deficit</span>
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-900 mt-0.5">
              {formatCr(cashflowData.peakDeficitINR)}
            </div>
            <div className="text-[11px] text-amber-800 font-medium">
              Peak Month: M{cashflowData.peakDeficitMonth.toString().padStart(2, "0")} (CF Line Req.)
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5">
            <div className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center justify-between">
              <span>Net Project Surplus</span>
              <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <div className="text-xl font-black text-teal-900 mt-0.5">
              {formatCr(cashflowData.finalSurplusINR)}
            </div>
            <div className="text-[11px] text-teal-700">Net Realized Cash Profit</div>
          </div>
        </div>
      </div>

      {/* Visual S-Curve Graph Representation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#122b45]">
              Cumulative Cashflow S-Curve (Spend Trajectory vs Inflow Realization)
            </h4>
            <p className="text-xs text-slate-500">
              The classic S-curve reflects slow start mobilization, accelerated superstructure casting, and plateauing finishes.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600">Cumulative Outflow (Spend)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Cumulative Inflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600">Net Position (Exposure)</span>
            </div>
          </div>
        </div>

        {/* Dynamic SVG S-Curve Chart */}
        <div className="relative h-64 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {/* Grid horizontal lines */}
            <line x1="0" y1="20" x2="1000" y2="20" stroke="#e2e8f0" strokeDasharray="4" />
            <line x1="0" y1="70" x2="1000" y2="70" stroke="#e2e8f0" strokeDasharray="4" />
            <line x1="0" y1="120" x2="1000" y2="120" stroke="#e2e8f0" strokeDasharray="4" />
            <line x1="0" y1="170" x2="1000" y2="170" stroke="#e2e8f0" strokeDasharray="4" />

            {/* Zero balance reference line */}
            <line x1="0" y1="140" x2="1000" y2="140" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Outflow S-Curve Line (Red) */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3"
              points={cashflowData.monthlySchedule
                .map((m, idx) => {
                  const x = (idx / (cashflowData.monthlySchedule.length - 1)) * 1000;
                  const maxVal = cashflowData.totalInflowINR;
                  const y = 180 - (m.cumulativeOutflowINR / maxVal) * 160;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* Inflow Step/Curve Line (Emerald) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              points={cashflowData.monthlySchedule
                .map((m, idx) => {
                  const x = (idx / (cashflowData.monthlySchedule.length - 1)) * 1000;
                  const maxVal = cashflowData.totalInflowINR;
                  const y = 180 - (m.cumulativeInflowINR / maxVal) * 160;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* Net Position Line (Amber) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4"
              points={cashflowData.monthlySchedule
                .map((m, idx) => {
                  const x = (idx / (cashflowData.monthlySchedule.length - 1)) * 1000;
                  // Baseline zero line is y=140
                  const y = 140 - (m.cumulativeNetBalanceINR / cashflowData.totalInflowINR) * 120;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>

          {/* Month Axis Labels */}
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-2 px-1">
            {cashflowData.monthlySchedule
              .filter((_, i) => i % 2 === 0 || i === cashflowData.monthlySchedule.length - 1)
              .map((m) => (
                <span key={m.monthIndex}>{m.monthLabel.slice(0, 3)}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Monthly Cashflow Breakdown Schedule Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          Monthly Construction Cashflow & Working Capital Schedule
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3">Construction Phase</th>
                <th className="py-2.5 px-3 text-right text-rose-700">Planned Outflow</th>
                <th className="py-2.5 px-3 text-right">Cum. Outflow</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Planned Inflow</th>
                <th className="py-2.5 px-3 text-right">Cum. Inflow</th>
                <th className="py-2.5 px-3 text-right">Net Monthly</th>
                <th className="py-2.5 px-3 text-right font-bold text-[#122b45]">Cumulative Position</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashflowData.monthlySchedule.map((row) => (
                <tr
                  key={row.monthIndex}
                  className={`hover:bg-slate-50 transition-colors ${
                    row.monthIndex === cashflowData.peakDeficitMonth ? "bg-amber-50/30" : ""
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{row.monthLabel}</td>
                  <td className="py-3 px-3 text-slate-600">{row.activePhase}</td>
                  <td className="py-3 px-3 text-right font-mono text-rose-700 font-medium">
                    {formatLakhs(row.plannedOutflowINR)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {formatCr(row.cumulativeOutflowINR)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700 font-medium">
                    {row.plannedInflowINR > 0 ? formatLakhs(row.plannedInflowINR) : "—"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {formatCr(row.cumulativeInflowINR)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-semibold ${
                      row.netCashflowINR >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {row.netCashflowINR >= 0 ? "+" : ""}
                    {formatLakhs(row.netCashflowINR)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono font-bold ${
                      row.cumulativeNetBalanceINR >= 0 ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {row.cumulativeNetBalanceINR >= 0 ? "+" : "-"}
                    {formatCr(Math.abs(row.cumulativeNetBalanceINR))}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.monthIndex === cashflowData.peakDeficitMonth ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                        PEAK DEFICIT
                      </span>
                    ) : row.isNegativeExposure ? (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        DEFICIT
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        SURPLUS
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

