"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  FolderTree,
  FileCheck,
  ClipboardCheck,
  Layers,
  ArrowRight,
  Printer,
  Sparkles,
  MapPin,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ProjectSetupMemberAssignment from "@/components/projects/ProjectSetupMemberAssignment";
import WBSMilestoneTreeTracker from "@/components/projects/WBSMilestoneTreeTracker";
import GFCDrawingsVersioningVault from "@/components/projects/GFCDrawingsVersioningVault";
import DailySiteProgressLog from "@/components/projects/DailySiteProgressLog";

export default function ProjectLifecycleHub() {
  const [activeTab, setActiveTab] = useState<"setup" | "wbs" | "drawings" | "dpr">("setup");
  const [projectName, setProjectName] = useState("Project Workspace");
  const [projectLocation, setProjectLocation] = useState("Active Site");

  useEffect(() => {
    try {
      const savedMaster = localStorage.getItem("ostaad_project_master");
      if (savedMaster) {
        const parsed = JSON.parse(savedMaster);
        if (parsed.name) setProjectName(parsed.name);
        if (parsed.city || parsed.state) {
          setProjectLocation(`${parsed.city || ""}, ${parsed.state || ""}`.trim().replace(/^,|,$/g, ""));
        }
      } else {
        const savedName = localStorage.getItem("ostaad_operations_project_name");
        if (savedName) setProjectName(savedName);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AppShell
      title="Project Management & Lifecycle Monitoring (Module 3)"
      subtitle="Connect project planning to field execution: master setup, hierarchical WBS tracking, GFC drawing releases, and daily field logs"
      breadcrumbs={[
        { label: "Execution & Engineering" },
        { label: "Project Lifecycle", href: "/dashboard/projects" },
        { label: projectName },
      ]}
      activeNav="operations"
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-slate-900">{projectName}</span>
            {projectLocation && (
              <>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{projectLocation}</span>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("setup")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "setup"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Sub-Module 3.1: Project Setup & Team</span>
              <span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-mono border border-emerald-200">
                Staffing
              </span>
            </button>

            <button
              onClick={() => setActiveTab("wbs")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "wbs"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FolderTree className="h-4 w-4 text-indigo-400" />
              <span>Sub-Module 3.2: WBS Tree & Milestones</span>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-mono border border-indigo-200">
                Level 1–4
              </span>
            </button>

            <button
              onClick={() => setActiveTab("drawings")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "drawings"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FileCheck className="h-4 w-4 text-blue-400" />
              <span>Sub-Module 3.3: GFC Drawings & Revisions</span>
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-mono border border-blue-200">
                R2 GFC
              </span>
            </button>

            <button
              onClick={() => setActiveTab("dpr")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "dpr"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <ClipboardCheck className="h-4 w-4 text-teal-400" />
              <span>Sub-Module 3.4: Daily Progress Log (DPR)</span>
              <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-0.5 text-[10px] font-mono border border-teal-200">
                Muster Log
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Module 3 Integrated</span>
          </div>
        </div>

        {/* Tab 1: Project Setup & Member Assignment */}
        {activeTab === "setup" && <ProjectSetupMemberAssignment />}

        {/* Tab 2: WBS Milestone Tree Tracker */}
        {activeTab === "wbs" && <WBSMilestoneTreeTracker />}

        {/* Tab 3: GFC Drawings Versioning Vault */}
        {activeTab === "drawings" && <GFCDrawingsVersioningVault />}

        {/* Tab 4: Daily Site Progress Log (DPR) */}
        {activeTab === "dpr" && <DailySiteProgressLog />}
      </div>
    </AppShell>
  );
}

