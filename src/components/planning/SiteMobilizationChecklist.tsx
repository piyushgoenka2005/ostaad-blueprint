"use client";

import React, { useState, useMemo } from "react";
import {
  HardHat,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Printer,
  RotateCcw,
  Award,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Sparkles,
  Info,
  Building,
  Check,
  X,
} from "lucide-react";
import {
  MobilizationCheckItem,
  ReadinessCategory,
  INITIAL_MOBILIZATION_CHECKLIST,
  calculateMobilizationReadiness,
} from "@/lib/planning/variance-readiness";

interface SiteMobilizationChecklistProps {
  className?: string;
  projectName?: string;
  projectLocation?: string;
}

export default function SiteMobilizationChecklist({
  className = "",
  projectName = "Commercial Complex — Tower B",
  projectLocation = "Kalyani Nagar, Pune, Maharashtra",
}: SiteMobilizationChecklistProps) {
  const [items, setItems] = useState<MobilizationCheckItem[]>(INITIAL_MOBILIZATION_CHECKLIST);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Computed readiness summary
  const summary = useMemo(() => {
    return calculateMobilizationReadiness(items);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (selectedCategory === "ALL") return items;
    return items.filter((i) => i.category === selectedCategory);
  }, [items, selectedCategory]);

  // Toggle status: PASS -> FAIL -> PENDING -> PASS
  const cycleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus =
          item.status === "PASS" ? "FAIL" : item.status === "FAIL" ? "PENDING" : "PASS";
        return {
          ...item,
          status: nextStatus,
          verifiedBy: nextStatus === "PASS" ? "Site Engineer" : item.verifiedBy,
        };
      })
    );
  };

  // Mark all as passed
  const handleMarkAllPassed = () => {
    setItems((prev) =>
      prev.map((i) => ({ ...i, status: "PASS", verifiedBy: "Site Quality Lead" }))
    );
  };

  // Reset to defaults
  const handleReset = () => {
    setItems(INITIAL_MOBILIZATION_CHECKLIST);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-600 text-white shadow-md shadow-amber-500/20">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Site Mobilization & Project Kickoff Readiness Checklist (Tool 15)
                </h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                  Pre-Commencement Gate
                </span>
              </div>
              <p className="text-xs text-slate-500">
                50-point comprehensive inspection across statutory clearances, contractor insurance, site utilities, safety barricading, and survey benchmarks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleMarkAllPassed}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Verify All Passed</span>
            </button>

            <button
              onClick={() => setShowCertificateModal(true)}
              disabled={!summary.isCriticalPassed}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs ${
                summary.isCriticalPassed
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-300 cursor-not-allowed"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Issue Kickoff Certificate</span>
            </button>
          </div>
        </div>

        {/* Executive Readiness Metrics KPI Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Mobilization Readiness
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {summary.readinessScorePercent}%
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              {summary.passedItems} of {summary.totalItems} Checkpoints Cleared
            </div>
          </div>

          <div
            className={`rounded-xl border p-3.5 ${
              summary.isCriticalPassed
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-rose-200 bg-rose-50/50"
            }`}
          >
            <div
              className={`text-[10px] font-bold uppercase tracking-wider ${
                summary.isCriticalPassed ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Critical Hard Gates
            </div>
            <div
              className={`text-xl font-black mt-0.5 ${
                summary.isCriticalPassed ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {summary.isCriticalPassed ? "ALL PASSED" : `${summary.criticalFailures.length} FAILED`}
            </div>
            <div
              className={`text-[11px] font-medium ${
                summary.isCriticalPassed ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {summary.isCriticalPassed ? "Zero Gating Breaches" : "Halts Physical Excavation"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Rectifications
            </div>
            <div className="text-xl font-black text-amber-700 mt-0.5">
              {summary.pendingItems} Points
            </div>
            <div className="text-[11px] text-slate-500">Under Site Contractor Rectification</div>
          </div>

          <div
            className={`rounded-xl border p-3.5 ${
              summary.decisionVerdict === "CLEAR TO COMMENCE"
                ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                : summary.decisionVerdict === "CONDITIONAL COMMENCEMENT"
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-rose-300 bg-rose-50 text-rose-950"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider">Statutory Kickoff Decision</div>
            <div className="text-sm font-black mt-1 leading-snug">{summary.decisionVerdict}</div>
            <div className="text-[10px] font-medium opacity-80 mt-0.5">Authorizes Groundbreaking</div>
          </div>
        </div>
      </div>

      {/* Critical Gate Alert Banner if any failed */}
      {!summary.isCriticalPassed && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 text-sm">
                MOBILIZATION HALT TRIGGERED: Critical Pre-requisite Failed
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Physical site excavation or equipment delivery cannot begin until the following mandatory gates are cleared:
              </p>
              <ul className="text-xs text-rose-800 list-disc pl-5 mt-1 space-y-0.5">
                {summary.criticalFailures.map((f) => (
                  <li key={f.id} className="font-semibold">
                    {f.question} ({f.category})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            selectedCategory === "ALL"
              ? "bg-[#122b45] text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Categories ({items.length})
        </button>
        {[
          { id: "STATUTORY", name: "1. Statutory Sanctions" },
          { id: "INSURANCE_LABOUR", name: "2. Insurance & Labour" },
          { id: "UTILITIES", name: "3. Power & Utilities" },
          { id: "SAFETY_ENVIRONMENT", name: "4. Safety & Barricading" },
          { id: "SURVEY_ENGINEERING", name: "5. Survey & Datum" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              selectedCategory === cat.id
                ? "bg-amber-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Checklist Inspection Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Checkpoint & Inspection Requirement</th>
                <th className="py-3 px-3">Compliance Standard</th>
                <th className="py-3 px-3 text-center">Criticality</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Verified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#122b45] leading-snug">{item.question}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.category}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px] leading-relaxed">
                    {item.complianceRequirement}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.isCritical ? (
                      <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-rose-200">
                        CRITICAL GATE
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-semibold">
                        ROUTINE
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => cycleStatus(item.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition-transform active:scale-95 ${
                        item.status === "PASS"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : item.status === "FAIL"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {item.status === "PASS" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : item.status === "FAIL" ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>{item.status}</span>
                    </button>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700 text-[11px]">
                    {item.verifiedBy || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OFFICIAL MOBILIZATION CLEARANCE CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-[#122b45] text-sm">
                  Official Site Mobilization & Kickoff Authorization Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-slate-800">
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    OSTAAD ERP ENTERPRISE
                  </div>
                  <div className="text-xs text-slate-500">
                    Project Directorate & Construction Quality Assurance Board
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900">
                    AUTH-MOB-2026-TWR-B-001
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Project Name</div>
                  <div className="font-bold text-slate-900">{projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Site Location</div>
                  <div className="font-bold text-slate-900">{projectLocation}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Mobilization Readiness Index
                  </div>
                  <div className="font-bold text-emerald-700">
                    {summary.readinessScorePercent}% ({summary.passedItems}/{summary.totalItems} Passed)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Critical Gate Status
                  </div>
                  <div className="font-bold text-emerald-700">All Mandatory Gating Passed</div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50/70 p-5 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Site Physical Commencement Gate
                </div>
                <div className="text-3xl font-black tracking-tight text-emerald-950 mt-1">
                  AUTHORIZATION GRANTED: CLEAR TO COMMENCE
                </div>
                <div className="text-xs text-emerald-800 font-medium mt-2">
                  Immediate physical deployment of heavy excavators, piling rigs, and subcontractor labour authorized.
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">EHS Safety Lead</div>
                  <div className="text-[10px] text-slate-400">Safety & Barricading</div>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">Chief Resident Engineer</div>
                  <div className="text-[10px] text-slate-400">Survey & Engineering GFC</div>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">Project Director</div>
                  <div className="text-[10px] text-slate-400">Executive Commercial Clearance</div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Digitally sealed and verified on Ostaad ERP Multi-Tenant Architecture
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
