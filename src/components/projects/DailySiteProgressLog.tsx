"use client";

import React, { useState } from "react";
import {
  ClipboardCheck,
  Sun,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Printer,
  Plus,
  RotateCcw,
  Sparkles,
  CloudSun,
  ShieldCheck,
  FileText,
  X,
  HardHat,
} from "lucide-react";
import {
  DailyProgressReport,
  TradeLabourCount,
  MachineryDeployment,
  DEFAULT_DPR_LOGS,
} from "@/lib/project-lifecycle";

interface DailySiteProgressLogProps {
  className?: string;
}

export default function DailySiteProgressLog({
  className = "",
}: DailySiteProgressLogProps) {
  const [reports, setReports] = useState<DailyProgressReport[]>(DEFAULT_DPR_LOGS);
  const [activeReportId, setActiveReportId] = useState<string>(DEFAULT_DPR_LOGS[0].id);
  const [isNewDPRModalOpen, setIsNewDPRModalOpen] = useState(false);

  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];

  // New DPR Form state
  const [newDate, setNewDate] = useState("2026-03-06");
  const [newShiftHours, setNewShiftHours] = useState(10);
  const [newActivities, setNewActivities] = useState("");
  const [newHindrance, setNewHindrance] = useState("");

  const handleCreateDPR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivities.trim()) return;

    const newDPR: DailyProgressReport = {
      id: `dpr-${Date.now()}`,
      reportDate: newDate,
      reportNumber: `DPR-TWR-B-${reports.length + 52}`,
      weather: "SUNNY",
      temperatureC: 33,
      shiftHours: Number(newShiftHours) || 10,
      labourCounts: [
        { trade: "Bar Benders", count: 26 },
        { trade: "Carpenters", count: 20 },
        { trade: "Masons", count: 10 },
        { trade: "Concrete Helpers", count: 25 },
        { trade: "MEP Technicians", count: 8 },
      ],
      totalWorkforce: 89,
      machineryLogs: [
        { machine: "Potain 45m Tower Crane", count: 1, hoursOperated: 9.0, status: "ACTIVE" },
        { machine: "Schwing Stetter RMC Pump Line", count: 1, hoursOperated: 8.0, status: "ACTIVE" },
        { machine: "Tata Hitachi EX200 Excavator", count: 1, hoursOperated: 5.5, status: "ACTIVE" },
        { machine: "125 kVA Silent DG Set", count: 1, hoursOperated: 3.0, status: "ACTIVE" },
      ],
      completedActivities: newActivities.split("\n").filter((a) => a.trim().length > 0),
      plannedForTomorrow: ["Continue structural raft and column starter fixing."],
      hindrances: newHindrance ? [newHindrance.trim()] : ["No critical hindrance reported."],
      safetyIncidents: 0,
      preparedBy: "Amit Deshmukh (Site Engineer)",
      reviewedBy: "Vikram Kulkarni (Lead Resident Engineer)",
    };

    setReports((prev) => [newDPR, ...prev]);
    setActiveReportId(newDPR.id);
    setIsNewDPRModalOpen(false);
    setNewActivities("");
    setNewHindrance("");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Daily Site Progress & Activity Log (DPR - Sub-Module 3.4)
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Field Execution Register
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Weather conditions, trade-wise labour muster headcount, heavy plant deployment, and physical activities log
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNewDPRModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Record Today&apos;s DPR</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print DPR Sheet</span>
            </button>
          </div>
        </div>

        {/* Executive Metrics Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Weather & Shift</span>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {activeReport.temperatureC}°C Sunny
            </div>
            <div className="text-[11px] text-slate-500">
              {activeReport.shiftHours} Hours Operational Shift
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Site Labour Muster</span>
              <Users className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-700 mt-0.5">
              {activeReport.totalWorkforce} Personnel
            </div>
            <div className="text-[11px] text-slate-500">Across 5 Trade Specializations</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active Plant / Machinery</span>
              <Truck className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              {activeReport.machineryLogs.length} Units Online
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Tower Crane, Pump & Excavator
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>EHS Safety Index</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">
              Zero Incidents
            </div>
            <div className="text-[11px] text-emerald-700">100% Hard Hat Compliance</div>
          </div>
        </div>
      </div>

      {/* Main DPR Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Labour Headcount & Plant Operations (1 Col) */}
        <div className="space-y-6">
          {/* Trade Labour Headcount Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h4 className="font-bold text-[#122b45] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Trade-Wise Labour Muster</span>
              </h4>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {activeReport.totalWorkforce} Total
              </span>
            </div>

            <div className="space-y-3">
              {activeReport.labourCounts.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{t.trade}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${(t.count / activeReport.totalWorkforce) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-[#122b45] w-6 text-right">
                      {t.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plant & Machinery Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h4 className="font-bold text-[#122b45] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-indigo-600" />
                <span>Machinery & Heavy Plant Log</span>
              </h4>
            </div>

            <div className="space-y-2.5">
              {activeReport.machineryLogs.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#122b45]">{m.machine}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Operated: {m.hoursOperated} hrs
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Completed Activities, Tomorrow Plan, Hindrances (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">
                  {activeReport.reportNumber}
                </span>
                <h4 className="font-bold text-[#122b45] text-base">
                  Field Progress Log for {activeReport.reportDate}
                </h4>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                Shift Verified
              </span>
            </div>

            {/* Activities Completed */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Physical Work Items Completed Today</span>
              </h5>
              <div className="space-y-2">
                {activeReport.completedActivities.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-medium"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned for Tomorrow */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Targeted Work Plan for Next Shift</span>
              </h5>
              <div className="space-y-1.5">
                {activeReport.plannedForTomorrow.map((plan, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 font-medium"
                  >
                    • {plan}
                  </div>
                ))}
              </div>
            </div>

            {/* Hindrances & Delays */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Hindrances, Road Bottlenecks & Site Impediments</span>
              </h5>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                {activeReport.hindrances.map((h, i) => (
                  <p key={i}>⚠ {h}</p>
                ))}
              </div>
            </div>

            {/* Sign-off Stamps */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Prepared By:</span>
                <span className="font-bold text-[#122b45]">{activeReport.preparedBy}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Reviewed & Verified By:</span>
                <span className="font-bold text-[#122b45]">{activeReport.reviewedBy}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEW DPR MODAL */}
      {isNewDPRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Record Daily Progress Report (DPR)</h4>
              <button
                onClick={() => setIsNewDPRModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDPR} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Report Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Shift Working Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={newShiftHours}
                    onChange={(e) => setNewShiftHours(parseFloat(e.target.value) || 10)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Completed Activities (One per line)
                </label>
                <textarea
                  required
                  rows={4}
                  value={newActivities}
                  onChange={(e) => setNewActivities(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. Completed concreting of Grid B-4 to B-8 raft slab&#10;Bound 35 MT rebar for column starters&#10;Tested concrete slump at 140mm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Site Hindrance / Delay Causes (Optional)
                </label>
                <input
                  type="text"
                  value={newHindrance}
                  onChange={(e) => setNewHindrance(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. 1-hour delay due to RMC transit mixer traffic"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDPRModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  Save & Publish DPR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

