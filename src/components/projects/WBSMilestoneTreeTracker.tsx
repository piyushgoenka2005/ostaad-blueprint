"use client";

import React, { useState, useMemo } from "react";
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  Calendar,
  Percent,
  Plus,
  Printer,
  Sparkles,
} from "lucide-react";
import {
  WBSNode,
  WBSLevel,
  WBSStatus,
  DEFAULT_WBS_TREE,
} from "@/lib/project-lifecycle";

interface WBSMilestoneTreeTrackerProps {
  className?: string;
}

export default function WBSMilestoneTreeTracker({
  className = "",
}: WBSMilestoneTreeTrackerProps) {
  const [nodes, setNodes] = useState<WBSNode[]>(DEFAULT_WBS_TREE);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Toggle collapse state for a node
  const toggleCollapse = (wbsCode: string) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [wbsCode]: !prev[wbsCode],
    }));
  };

  // Expand all / Collapse all
  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const allCodes: Record<string, boolean> = {};
    nodes.forEach((n) => {
      allCodes[n.wbsCode] = true;
    });
    setCollapsedNodes(allCodes);
  };

  // Compute overall weighted project progress
  const overallProgressPercent = useMemo(() => {
    let totalWeightedScore = 0;
    const level1Nodes = nodes.filter((n) => n.level === 1);
    level1Nodes.forEach((n) => {
      totalWeightedScore += (n.weightPercent * n.progressPercent) / 100;
    });
    return Math.round(totalWeightedScore * 10) / 10;
  }, [nodes]);

  // Major milestones count
  const milestones = useMemo(() => nodes.filter((n) => n.isMilestone), [nodes]);

  // Update progress for a node
  const updateNodeProgress = (id: string, val: number) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const p = Math.min(100, Math.max(0, val));
        const status: WBSStatus = p === 100 ? "COMPLETED" : p > 0 ? "IN_PROGRESS" : "NOT_STARTED";
        return { ...n, progressPercent: p, status };
      })
    );
  };

  const statusPills: Record<WBSStatus, { label: string; bg: string; text: string }> = {
    COMPLETED: { label: "COMPLETED", bg: "bg-emerald-100", text: "text-emerald-800" },
    IN_PROGRESS: { label: "IN PROGRESS", bg: "bg-blue-100", text: "text-blue-800" },
    DELAYED: { label: "DELAYED", bg: "bg-rose-100", text: "text-rose-800" },
    NOT_STARTED: { label: "NOT STARTED", bg: "bg-slate-100", text: "text-slate-600" },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/20">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Work Breakdown Structure (WBS) & Milestone Health Tracker (Sub-Module 3.2)
                </h3>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  Level-1 to Level-4 Tree
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hierarchical phase, package, item, and execution activity decomposition with completion % updates and delay variance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={expandAll}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Collapse All
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export WBS</span>
            </button>
          </div>
        </div>

        {/* Milestone Health KPI Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cumulative WBS Progress
            </div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              {overallProgressPercent}%
            </div>
            <div className="text-[11px] text-slate-500">Weighted Project Completion</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Active Phase
            </div>
            <div className="text-sm font-black text-[#122b45] mt-1 truncate">
              Phase 1: Substructure
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Raft Concrete at 55%
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Critical Milestones
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {milestones.length} Gates
            </div>
            <div className="text-[11px] text-emerald-700">
              1 Achieved, 3 Upcoming
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              Net Schedule Variance
            </div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">
              On Schedule (0d)
            </div>
            <div className="text-[11px] text-emerald-700">
              No Critical Path Breaches
            </div>
          </div>
        </div>
      </div>

      {/* Expandable WBS Tree Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          Hierarchical Work Breakdown Structure (Level 1 → 4)
        </h4>

        <div className="space-y-2">
          {nodes.map((node) => {
            const isCollapsed = collapsedNodes[node.wbsCode];
            const hasChildren = nodes.some((n) => n.parentCode === node.wbsCode);

            // Hide if an ancestor is collapsed
            const isHidden = nodes.some((ancestor) => {
              if (!ancestor.wbsCode || ancestor.wbsCode === node.wbsCode) return false;
              if (collapsedNodes[ancestor.wbsCode]) {
                return node.wbsCode.startsWith(ancestor.wbsCode + ".");
              }
              return false;
            });

            if (isHidden) return null;

            // Indentation padding
            const indentClass =
              node.level === 1
                ? "pl-2"
                : node.level === 2
                ? "pl-8"
                : node.level === 3
                ? "pl-14"
                : "pl-20";

            return (
              <div
                key={node.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  node.level === 1
                    ? "bg-slate-50 border-slate-200 font-bold"
                    : node.level === 2
                    ? "bg-white border-slate-100 hover:border-slate-200 font-semibold"
                    : "bg-white border-transparent hover:bg-slate-50/50 text-slate-700"
                }`}
              >
                {/* Title & Indent */}
                <div className={`flex items-center gap-2.5 ${indentClass} flex-1 min-w-[280px]`}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleCollapse(node.wbsCode)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <span className="w-6" />
                  )}

                  {node.isMilestone && (
                    <div
                      className="flex h-5 w-5 rotate-45 items-center justify-center rounded bg-blue-600 text-white shadow-xs"
                      title="Project Milestone Gate"
                    >
                      <Flag className="h-3 w-3 -rotate-45" />
                    </div>
                  )}

                  <span className="font-mono text-xs text-indigo-700 shrink-0">
                    {node.wbsCode}
                  </span>

                  <span className="text-xs text-[#122b45] leading-snug">{node.title}</span>
                </div>

                {/* Progress & Status Controls */}
                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="w-32 hidden sm:block">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{node.progressPercent}%</span>
                      <span>Weight: {node.weightPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          node.progressPercent === 100
                            ? "bg-emerald-600"
                            : node.progressPercent > 0
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                        style={{ width: `${node.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      statusPills[node.status].bg
                    } ${statusPills[node.status].text}`}
                  >
                    {statusPills[node.status].label}
                  </span>

                  <div className="text-right text-[11px] font-mono text-slate-500 w-24">
                    {node.plannedEndDate}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
