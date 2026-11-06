"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  BarChart3,
  Percent,
  Sparkles,
  Info,
  X,
  Target,
  Package,
} from "lucide-react";
import {
  ExecutiveProjectHealth,
  CashflowSCurvePoint,
  DEFAULT_EXECUTIVE_PROJECTS,
  DEFAULT_CASHFLOW_SCURVE,
  formatINR,
  formatCrores,
  generateCSV,
  downloadCSVFile,
} from "@/lib/reporting-audit-governance";

export default function CSuiteExecutiveDashboard() {
  const [projects, setProjects] = useState<ExecutiveProjectHealth[]>(DEFAULT_EXECUTIVE_PROJECTS);
  const [sCurveData] = useState<CashflowSCurvePoint[]>(DEFAULT_CASHFLOW_SCURVE);
  const [selectedProject, setSelectedProject] = useState<ExecutiveProjectHealth | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Portfolio aggregates
  const totalBudget = useMemo(() => projects.reduce((acc, p) => acc + p.plannedBudget, 0), [projects]);
  const totalCommitted = useMemo(() => projects.reduce((acc, p) => acc + p.committedSpend, 0), [projects]);
  const totalActual = useMemo(() => projects.reduce((acc, p) => acc + p.actualSpend, 0), [projects]);
  const avgCPI = useMemo(() => (projects.reduce((acc, p) => acc + p.cpi, 0) / projects.length).toFixed(2), [projects]);
  const avgSPI = useMemo(() => (projects.reduce((acc, p) => acc + p.spi, 0) / projects.length).toFixed(2), [projects]);

  const filteredProjects = useMemo(() => {
    if (filterCategory === "ALL") return projects;
    return projects.filter((p) => p.category.toUpperCase() === filterCategory);
  }, [projects, filterCategory]);

  const handleExportCSV = () => {
    const headers = [
      "Project ID",
      "Project Name",
      "Category",
      "Location",
      "Planned Budget (INR)",
      "Committed Spend (INR)",
      "Actual Paid (INR)",
      "Physical Progress %",
      "Planned Progress %",
      "CPI",
      "SPI",
      "Status",
      "Risk Score",
      "Critical Stock Days",
      "Project Manager",
    ];

    const rows = filteredProjects.map((p) => [
      p.projectId,
      p.projectName,
      p.category,
      p.location,
      p.plannedBudget,
      p.committedSpend,
      p.actualSpend,
      p.progressPct,
      p.plannedPct,
      p.cpi,
      p.spi,
      p.healthStatus,
      p.riskScore,
      p.criticalStockDays,
      p.projectManager,
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSVFile(`Executive_Portfolio_Health_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* C-SUITE TOP KPI TILES (Executive White Theme)                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Portfolio Budget</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#122b45]">{formatCrores(totalBudget)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Across 4 Active Capital Sites</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Committed POs</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#122b45]">{formatCrores(totalCommitted)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600">
            <span className="font-semibold">{((totalCommitted / totalBudget) * 100).toFixed(1)}%</span>
            <span className="text-slate-500">of total ceiling committed</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Actual Paid Outflow</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#122b45]">{formatCrores(totalActual)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="font-semibold">{((totalActual / totalCommitted) * 100).toFixed(1)}%</span>
            <span className="text-slate-500">of commitments disbursed</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Portfolio CPI / SPI</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#122b45]">{avgCPI}</span>
            <span className="text-xs font-medium text-slate-400">CPI</span>
            <span className="text-slate-300">|</span>
            <span className="text-2xl font-bold tracking-tight text-amber-600">{avgSPI}</span>
            <span className="text-xs font-medium text-slate-400">SPI</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">Cost On-Budget</span> · 6% Schedule Lag
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Alerts</span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600">1 Site</div>
          <div className="mt-1 text-xs text-slate-500">Riverside Villas (SPI 0.79 · 7d stock)</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CASHFLOW S-CURVE & SCHEDULE AGGREGATES                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-[#122b45]">Capital Expenditure & Cashflow S-Curve</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Cumulative baseline planned vs committed purchase orders vs actual verified cash disbursements (FY 2026).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-500 font-medium">Planned Baseline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-blue-700 font-medium">Committed POs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-medium">Actual Paid Outflow</span>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Visual S-Curve Matrix Bar Table */}
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[850px] space-y-3">
            {sCurveData.slice(0, 10).map((pt, idx) => {
              const maxCeiling = 1100000000; // 110 Cr max scale
              const plannedWidth = Math.min(100, (pt.plannedCumulative / maxCeiling) * 100);
              const committedWidth = Math.min(100, (pt.committedCumulative / maxCeiling) * 100);
              const actualWidth = Math.min(100, (pt.actualCumulative / maxCeiling) * 100);

              return (
                <div key={pt.month} className="grid grid-cols-[110px_1fr_130px] items-center gap-4 text-xs py-1">
                  <div className="font-semibold text-slate-700">{pt.month}</div>
                  <div className="space-y-1">
                    {/* Planned line */}
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-300"
                        style={{ width: `${plannedWidth}%` }}
                        title={`Planned: ${formatCrores(pt.plannedCumulative)}`}
                      />
                    </div>
                    {/* Committed line */}
                    <div className="h-2 w-full rounded-full bg-blue-50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${committedWidth}%` }}
                        title={`Committed: ${formatCrores(pt.committedCumulative)}`}
                      />
                    </div>
                    {/* Actual line */}
                    <div className="h-2 w-full rounded-full bg-emerald-50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${actualWidth}%` }}
                        title={`Actual Paid: ${formatCrores(pt.actualCumulative)}`}
                      />
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    <span className="text-emerald-700 font-bold">{formatCrores(pt.actualCumulative)}</span>
                    <span className="text-slate-400"> / {formatCrores(pt.committedCumulative)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>Monthly Run-rate: Peak billing anticipated in Q3 FY26 at ₹12.30 Cr/month.</span>
          </div>
          <span className="font-medium">Data synchronized with D1 Commercial Ledger</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PROJECT-BY-PROJECT HEALTH MATRIX                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-[#122b45]">Capital Projects Health Scorecard</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Live Earned Value Analysis (EVA) tracking Cost & Schedule Performance Indices across all sites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              {["ALL", "COMMERCIAL", "RESIDENTIAL", "INDUSTRIAL"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    filterCategory === cat
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Project / Location</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Approved Budget</th>
                <th className="px-4 py-3 text-right">Committed Spend</th>
                <th className="px-4 py-3 text-right">Actual Paid</th>
                <th className="px-4 py-3 text-center">Progress (Act vs Plan)</th>
                <th className="px-4 py-3 text-center">CPI / SPI</th>
                <th className="px-4 py-3 text-center">Critical Stock</th>
                <th className="px-4 py-3 text-center">Health Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <tr key={project.projectId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#122b45]">{project.projectName}</div>
                    <div className="text-[11px] text-slate-500">{project.location}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">Lead: {project.projectManager}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {project.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700">
                    {formatCrores(project.plannedBudget)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-blue-700">
                    {formatCrores(project.committedSpend)}
                    <div className="text-[10px] text-slate-400">
                      {((project.committedSpend / project.plannedBudget) * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700">
                    {formatCrores(project.actualSpend)}
                    <div className="text-[10px] text-slate-400">
                      {((project.actualSpend / project.committedSpend) * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="w-28 mx-auto">
                      <div className="flex justify-between text-[10px] font-medium mb-1">
                        <span className="text-blue-700 font-bold">{project.progressPct}%</span>
                        <span className="text-slate-400">tgt {project.plannedPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${project.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`font-bold ${
                          project.cpi >= 1.0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {project.cpi}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span
                        className={`font-bold ${
                          project.spi >= 0.95 ? "text-emerald-700" : "text-amber-600"
                        }`}
                      >
                        {project.spi}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400">CPI / SPI</div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        project.criticalStockDays < 10
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : project.criticalStockDays < 15
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {project.criticalStockDays} Days
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        project.healthStatus === "HEALTHY"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : project.healthStatus === "WATCHLIST"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {project.healthStatus === "HEALTHY" && <CheckCircle2 className="h-3 w-3" />}
                      {project.healthStatus === "WATCHLIST" && <Clock className="h-3 w-3" />}
                      {project.healthStatus === "CRITICAL" && <AlertTriangle className="h-3 w-3" />}
                      {project.healthStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedProject(project)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Eye className="h-3 w-3 text-blue-600" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PROJECT EVA DETAIL MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  {selectedProject.projectId} · {selectedProject.category}
                </span>
                <h3 className="text-xl font-bold text-[#122b45]">{selectedProject.projectName}</h3>
                <p className="text-xs text-slate-500">{selectedProject.location}</p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Cost Index (CPI)</div>
                  <div className="mt-1 text-lg font-bold text-[#122b45]">{selectedProject.cpi}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Earned Value / Actual</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Schedule Index (SPI)</div>
                  <div className="mt-1 text-lg font-bold text-[#122b45]">{selectedProject.spi}</div>
                  <div className="text-[10px] text-amber-600 font-medium">Earned Value / Planned</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Risk Score</div>
                  <div className="mt-1 text-lg font-bold text-rose-600">{selectedProject.riskScore} / 100</div>
                  <div className="text-[10px] text-slate-500">Statutory & Site Risk</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Stock Run-Rate</div>
                  <div className="mt-1 text-lg font-bold text-blue-600">{selectedProject.criticalStockDays} Days</div>
                  <div className="text-[10px] text-slate-500">Godown Reorder Window</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="font-semibold text-slate-800">Financial Execution Summary</div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Approved Baseline Budget:</span>
                  <span className="font-mono font-bold text-slate-800">{formatINR(selectedProject.plannedBudget)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Purchase Orders Issued:</span>
                  <span className="font-mono font-bold text-blue-700">{formatINR(selectedProject.committedSpend)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Actual Cash Outflow Settled:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatINR(selectedProject.actualSpend)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Milestones Achieved:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedProject.milestonesOnTrack} of {selectedProject.milestonesTotal} completed on schedule
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Executive Notice sent to Project Manager ${selectedProject.projectManager}`);
                  setSelectedProject(null);
                }}
                className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#153452]"
              >
                Send Executive Directive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
