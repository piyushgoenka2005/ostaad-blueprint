"use client";

import React, { useState } from "react";
import {
  FileCheck,
  Download,
  Upload,
  Layers,
  History,
  CheckCircle2,
  Calendar,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import {
  DrawingSheet,
  DrawingDiscipline,
  DEFAULT_GFC_DRAWINGS,
} from "@/lib/project-lifecycle";

interface GFCDrawingsVersioningVaultProps {
  className?: string;
}

export default function GFCDrawingsVersioningVault({
  className = "",
}: GFCDrawingsVersioningVaultProps) {
  const [drawings, setDrawings] = useState<DrawingSheet[]>(DEFAULT_GFC_DRAWINGS);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>("drg-01");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form state
  const [drawingNo, setDrawingNo] = useState("");
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<DrawingDiscipline>("STRUCTURAL");
  const [revision, setRevision] = useState("Rev-0");
  const [approver, setApprover] = useState("Lead Structural Engineer");

  const filteredDrawings = drawings.filter((d) => {
    if (selectedDiscipline === "ALL") return true;
    return d.discipline === selectedDiscipline;
  });

  const handleUploadDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawingNo.trim() || !title.trim()) return;

    const newDrawing: DrawingSheet = {
      id: `drg-${Date.now()}`,
      drawingNumber: drawingNo.trim(),
      title: title.trim(),
      discipline,
      currentRevision: revision,
      isGFC: true,
      gfcApprovalDate: new Date().toISOString().slice(0, 10),
      gfcApprover: approver.trim() || "Consultant",
      sheetSize: "A0",
      scale: "1:100",
      fileKey: `drawings/${discipline.toLowerCase()}/${drawingNo}_${revision}.pdf`,
      revisions: [
        {
          revision,
          releaseDate: new Date().toISOString().slice(0, 10),
          changeDescription: "Initial GFC Release",
          approver: approver.trim(),
        },
      ],
    };

    setDrawings((prev) => [newDrawing, ...prev]);
    setIsUploadModalOpen(false);
    setDrawingNo("");
    setTitle("");
  };

  const disciplineBadges: Record<DrawingDiscipline, string> = {
    STRUCTURAL: "bg-blue-50 text-blue-700 border-blue-200",
    ARCHITECTURAL: "bg-indigo-50 text-indigo-700 border-indigo-200",
    MEP_SERVICES: "bg-purple-50 text-purple-700 border-purple-200",
    LANDSCAPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  GFC Drawing Sheets & Revision History Vault (Sub-Module 3.3)
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  Cloudflare R2 Backed
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Discipline categorization, Good For Construction (GFC) stamping, and full version-controlled drawing revisions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Upload className="h-3.5 w-3.5 text-blue-400" />
              <span>Upload GFC Drawing</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Register</span>
            </button>
          </div>
        </div>

        {/* KPI Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Active GFC Sheets
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {drawings.length} Sheets
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">100% Stamped & Released</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Structural Discipline
            </div>
            <div className="text-xl font-black text-blue-700 mt-0.5">
              {drawings.filter((d) => d.discipline === "STRUCTURAL").length} Drawings
            </div>
            <div className="text-[11px] text-slate-500">Foundation & Shear Walls</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Architectural & MEP
            </div>
            <div className="text-xl font-black text-purple-700 mt-0.5">
              {drawings.filter((d) => d.discipline !== "STRUCTURAL").length} Drawings
            </div>
            <div className="text-[11px] text-slate-500">Plans & Sump Piping</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              R2 Storage Engine
            </div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              Active
            </div>
            <div className="text-[11px] text-emerald-600">Encrypted Binary Blobs</div>
          </div>
        </div>
      </div>

      {/* Discipline Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDiscipline("ALL")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            selectedDiscipline === "ALL"
              ? "bg-[#122b45] text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Disciplines ({drawings.length})
        </button>
        {(["STRUCTURAL", "ARCHITECTURAL", "MEP_SERVICES", "LANDSCAPE"] as DrawingDiscipline[]).map(
          (disc) => (
            <button
              key={disc}
              onClick={() => setSelectedDiscipline(disc)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedDiscipline === disc
                  ? "bg-blue-600 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {disc.replace("_", " ")}
            </button>
          )
        )}
      </div>

      {/* Drawing Sheets List / Cards */}
      <div className="space-y-4">
        {filteredDrawings.map((sheet) => {
          const isExpanded = expandedId === sheet.id;

          return (
            <div
              key={sheet.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300"
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* GFC Digital Stamp */}
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-center shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                      GOOD FOR
                    </span>
                    <span className="text-xs font-black text-emerald-900 leading-tight">
                      CONSTRUCTION
                    </span>
                    <span className="text-[8px] font-mono font-bold text-emerald-700 mt-0.5">
                      {sheet.currentRevision}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {sheet.drawingNumber}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          disciplineBadges[sheet.discipline]
                        }`}
                      >
                        {sheet.discipline.replace("_", " ")}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Size: {sheet.sheetSize} | Scale: {sheet.scale}
                      </span>
                    </div>

                    <h4 className="font-bold text-[#122b45] text-sm sm:text-base mt-1">
                      {sheet.title}
                    </h4>

                    <div className="text-xs text-slate-500 mt-1">
                      GFC Approved by <strong className="text-slate-700">{sheet.gfcApprover}</strong> on {sheet.gfcApprovalDate}
                    </div>
                  </div>
                </div>

                {/* Actions & History Accordion Button */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <a
                    href={`/api/storage/${sheet.fileKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>Download PDF</span>
                  </a>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    title="Revision History"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Revision History */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#122b45] mb-2.5">
                    <History className="h-4 w-4 text-slate-500" />
                    <span>Drawing Revision Audit Trail</span>
                  </div>

                  <div className="space-y-2">
                    {sheet.revisions.map((rev, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {rev.revision}
                          </span>
                          <span className="text-slate-700 font-medium">{rev.changeDescription}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
                          <span>By: {rev.approver}</span>
                          <span>{rev.releaseDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Upload GFC Drawing Sheet</h4>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDrawing} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Drawing Sheet Number</label>
                <input
                  type="text"
                  required
                  value={drawingNo}
                  onChange={(e) => setDrawingNo(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  placeholder="e.g. STR-SLB-005"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Drawing Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. 1st to 5th Typical Floor Slab Reinforcement"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Discipline</label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value as DrawingDiscipline)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="STRUCTURAL">Structural</option>
                    <option value="ARCHITECTURAL">Architectural</option>
                    <option value="MEP_SERVICES">MEP Services</option>
                    <option value="LANDSCAPE">Landscape</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Revision Tag</label>
                  <input
                    type="text"
                    required
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                    placeholder="Rev-0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">GFC Approver Name / Authority</label>
                <input
                  type="text"
                  required
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="Principal Consultant"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Upload & Release GFC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

