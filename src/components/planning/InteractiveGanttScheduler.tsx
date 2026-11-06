"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Printer,
  RotateCcw,
  Flag,
  CloudRain,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  GanttTask,
  TaskTrade,
  INITIAL_GANTT_TASKS,
  calculateCPM,
} from "@/lib/planning/schedule-cashflow";

interface InteractiveGanttSchedulerProps {
  className?: string;
}

export default function InteractiveGanttScheduler({
  className = "",
}: InteractiveGanttSchedulerProps) {
  const [tasks, setTasks] = useState(INITIAL_GANTT_TASKS);
  const [selectedTrade, setSelectedTrade] = useState<string>("ALL");
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);

  // Compute CPM schedule dynamically
  const cpmTasks: GanttTask[] = useMemo(() => {
    return calculateCPM(tasks);
  }, [tasks]);

  // Total project duration
  const totalProjectDays = useMemo(() => {
    return Math.max(...cpmTasks.map((t) => t.earlyFinishDay), 1);
  }, [cpmTasks]);

  // Critical tasks count
  const criticalTasksCount = useMemo(() => {
    return cpmTasks.filter((t) => t.isCritical).length;
  }, [cpmTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return cpmTasks.filter((task) => {
      const matchTrade = selectedTrade === "ALL" || task.trade === selectedTrade;
      const matchCritical = !criticalOnly || task.isCritical;
      return matchTrade && matchCritical;
    });
  }, [cpmTasks, selectedTrade, criticalOnly]);

  // Toggle progress between 0, 50, 100
  const cycleTaskProgress = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextProgress = t.progressPercent === 100 ? 0 : t.progressPercent === 0 ? 50 : 100;
        return { ...t, progressPercent: nextProgress };
      })
    );
  };

  // Reset to default
  const handleReset = () => {
    setTasks(INITIAL_GANTT_TASKS);
    setSelectedTrade("ALL");
    setCriticalOnly(false);
  };

  // Trade colors
  const tradeColors: Record<TaskTrade, string> = {
    ENABLING: "bg-slate-100 text-slate-700 border-slate-200",
    SUBSTRUCTURE: "bg-amber-50 text-amber-800 border-amber-200",
    SUPERSTRUCTURE: "bg-blue-50 text-blue-800 border-blue-200",
    FINISHING: "bg-emerald-50 text-emerald-800 border-emerald-200",
    MEP: "bg-purple-50 text-purple-800 border-purple-200",
    HANDOVER: "bg-teal-50 text-teal-800 border-teal-200",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-700 text-white shadow-md shadow-rose-500/20">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Interactive Gantt Timeline & Critical Path Scheduler (Tool 4)
                </h3>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                  CPM Forward / Backward Pass
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Finish-to-Start dependencies, zero-float critical path identification, and monsoon season sensitivity buffers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Network</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Timeline</span>
            </button>
          </div>
        </div>

        {/* Milestone & Metrics KPI Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Project Duration
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {totalProjectDays} Days
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              ~{(totalProjectDays / 30).toFixed(1)} Months Turnaround
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
            <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              Critical Path Tasks
            </div>
            <div className="text-xl font-black text-rose-700 mt-0.5">
              {criticalTasksCount} Tasks
            </div>
            <div className="text-[11px] text-rose-600 font-semibold">
              Total Float ($TF$) = 0 Days
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Major Milestones
            </div>
            <div className="text-xl font-black text-blue-800 mt-0.5">
              {cpmTasks.filter((t) => t.isMilestone).length} Gates
            </div>
            <div className="text-[11px] text-blue-600">
              Handover, Plinth, Top-out
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <CloudRain className="h-3 w-3" />
              Monsoon Impact
            </div>
            <div className="text-xl font-black text-amber-800 mt-0.5">
              Days 90–165
            </div>
            <div className="text-[11px] text-amber-700">
              Excavation & Facade Curbed
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Controller */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTrade("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              selectedTrade === "ALL"
                ? "bg-[#122b45] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Trades ({cpmTasks.length})
          </button>
          {(["ENABLING", "SUBSTRUCTURE", "SUPERSTRUCTURE", "FINISHING", "MEP", "HANDOVER"] as TaskTrade[]).map(
            (tr) => (
              <button
                key={tr}
                onClick={() => setSelectedTrade(tr)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedTrade === tr
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tr}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => setCriticalOnly(!criticalOnly)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
            criticalOnly
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          <span>Critical Path Only (Zero Float)</span>
        </button>
      </div>

      {/* Visual Gantt Chart View */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5">
        {/* Timeline Axis Scale */}
        <div className="flex items-center border-b border-slate-200 pb-3 mb-4 text-[10px] font-mono text-slate-500">
          <div className="w-64 shrink-0 font-bold uppercase tracking-wider text-slate-700">
            WBS & Task Description
          </div>
          <div className="flex-1 grid grid-cols-6 text-center">
            <span>Day 0 (M01)</span>
            <span>Day 45 (M02)</span>
            <span>Day 90 (M03)</span>
            <span>Day 135 (M05)</span>
            <span>Day 180 (M06)</span>
            <span>Day 225+ (M08)</span>
          </div>
        </div>

        {/* Task Rows */}
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const startPct = (task.earlyStartDay / totalProjectDays) * 100;
            const widthPct = Math.max((task.durationDays / totalProjectDays) * 100, task.isMilestone ? 2 : 3);

            return (
              <div
                key={task.id}
                className="flex flex-col md:flex-row md:items-center gap-2 group hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
              >
                {/* Task Label */}
                <div className="w-64 shrink-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {task.wbsCode}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                        tradeColors[task.trade]
                      }`}
                    >
                      {task.trade}
                    </span>
                    {task.monsoonSensitive && (
                      <span title="Monsoon sensitive task">
                        <CloudRain className="h-3 w-3 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#122b45] truncate mt-0.5">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {task.durationDays === 0 ? "Milestone Gate" : `${task.durationDays} Days`}{" "}
                    | Float: {task.totalFloatDays}d
                  </div>
                </div>

                {/* Gantt Bar Lane */}
                <div className="flex-1 relative h-7 bg-slate-100/60 rounded-lg overflow-hidden flex items-center">
                  {/* Monsoon restriction background shade */}
                  <div
                    className="absolute top-0 bottom-0 bg-amber-100/30 border-x border-amber-200/50 pointer-events-none"
                    style={{
                      left: `${(90 / totalProjectDays) * 100}%`,
                      width: `${(60 / totalProjectDays) * 100}%`,
                    }}
                    title="Monsoon Weather Window"
                  />

                  {/* Task Bar */}
                  {task.isMilestone ? (
                    <div
                      className="absolute z-10 flex items-center justify-center -translate-x-1/2 cursor-pointer"
                      style={{ left: `${startPct}%` }}
                      onClick={() => cycleTaskProgress(task.id)}
                      title={`${task.name} (Day ${task.earlyStartDay})`}
                    >
                      <div
                        className={`h-5 w-5 rotate-45 border-2 shadow-xs flex items-center justify-center ${
                          task.progressPercent === 100
                            ? "bg-emerald-600 border-white text-white"
                            : "bg-blue-600 border-white text-white"
                        }`}
                      >
                        <Flag className="h-2.5 w-2.5 -rotate-45" />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => cycleTaskProgress(task.id)}
                      className={`absolute top-1 bottom-1 rounded-md cursor-pointer transition-all flex items-center justify-between px-2 text-[10px] font-bold text-white shadow-xs ${
                        task.isCritical
                          ? "bg-rose-600 hover:bg-rose-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                      }}
                      title={`${task.name} | Early Start: Day ${task.earlyStartDay}, Finish: Day ${task.earlyFinishDay}, Float: ${task.totalFloatDays}d. Click to cycle progress.`}
                    >
                      <span className="truncate pr-1 text-[9px]">
                        {task.progressPercent}%
                      </span>
                      <span className="text-[8px] font-mono opacity-80 hidden sm:inline">
                        D{task.earlyStartDay}–D{task.earlyFinishDay}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-600" />
              <span className="font-semibold text-slate-700">Critical Path (Zero Float)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-indigo-600" />
              <span>Non-Critical (Has Buffer Float)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rotate-45 bg-blue-600" />
              <span>Project Milestone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-5 bg-amber-100 border border-amber-300" />
              <span>Monsoon Season Window</span>
            </div>
          </div>
          <span className="text-slate-400 italic">Click any task bar to toggle progress (0% → 50% → 100%)</span>
        </div>
      </div>

      {/* Critical Path Method (CPM) Schedule Calculation Register */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          CPM Schedule Register: Early/Late Schedule & Float Analysis
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-2.5 px-3">WBS Code</th>
                <th className="py-2.5 px-3">Task Name</th>
                <th className="py-2.5 px-3">Trade</th>
                <th className="py-2.5 px-3 text-center">Duration</th>
                <th className="py-2.5 px-3 text-center">ES (Day)</th>
                <th className="py-2.5 px-3 text-center">EF (Day)</th>
                <th className="py-2.5 px-3 text-center">LS (Day)</th>
                <th className="py-2.5 px-3 text-center">LF (Day)</th>
                <th className="py-2.5 px-3 text-center font-bold">Total Float</th>
                <th className="py-2.5 px-3 text-center">Critical</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cpmTasks.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    t.isCritical ? "bg-rose-50/20 font-medium" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{t.wbsCode}</td>
                  <td className="py-2.5 px-3 text-[#122b45] font-semibold">{t.name}</td>
                  <td className="py-2.5 px-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${tradeColors[t.trade]}`}>
                      {t.trade}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">{t.durationDays}d</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{t.earlyStartDay}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{t.earlyFinishDay}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{t.lateStartDay}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{t.lateFinishDay}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        t.totalFloatDays === 0
                          ? "bg-rose-100 text-rose-800 font-black"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.totalFloatDays}d
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {t.isCritical ? (
                      <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        CRITICAL
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        BUFFER
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
