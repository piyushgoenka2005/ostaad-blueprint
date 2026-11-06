"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  ShieldAlert,
  Building,
  User,
  X,
  FileCheck2,
  TrendingUp,
} from "lucide-react";
import {
  MaterialIndentIssueSlip,
  DEFAULT_MATERIAL_INDENTS,
} from "@/lib/site-store-operations";

interface MaterialIndentWastageTrackerProps {
  indents: MaterialIndentIssueSlip[];
  onUpdateIndents: (indents: MaterialIndentIssueSlip[]) => void;
}

export default function MaterialIndentWastageTracker({
  indents,
  onUpdateIndents,
}: MaterialIndentWastageTrackerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddIndentModal, setShowAddIndentModal] = useState(false);
  const [selectedIndentForPrint, setSelectedIndentForPrint] = useState<MaterialIndentIssueSlip | null>(null);

  // New Indent Form State
  const [newIndent, setNewIndent] = useState({
    contractorName: "L&T Construction Consortium Ltd.",
    workAreaLocation: "Tower B — Level 4 Column Pouring Grid D",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    standardUOM: "50kg Bags",
    requestedQuantity: 250,
    issuedQuantity: 250,
    theoreticalBOQConsumption: 246, // ~1.6% variance
  });

  const varianceCalculated = useMemo(() => {
    const issued = Number(newIndent.issuedQuantity) || 0;
    const theo = Number(newIndent.theoreticalBOQConsumption) || 1;
    return Math.round(((issued - theo) / theo) * 1000) / 10;
  }, [newIndent.issuedQuantity, newIndent.theoreticalBOQConsumption]);

  const isWastageWarning = useMemo(() => {
    return varianceCalculated > 3.5;
  }, [varianceCalculated]);

  const filteredIndents = useMemo(() => {
    return indents.filter((i) => {
      const q = searchQuery.toLowerCase();
      return (
        i.indentNumber.toLowerCase().includes(q) ||
        i.issueSlipNumber.toLowerCase().includes(q) ||
        i.materialName.toLowerCase().includes(q) ||
        i.workAreaLocation.toLowerCase().includes(q) ||
        i.contractorName.toLowerCase().includes(q)
      );
    });
  }, [indents, searchQuery]);

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();

    const slip: MaterialIndentIssueSlip = {
      id: `ind-${Date.now()}`,
      indentNumber: `IND-2026-00${indents.length + 23}`,
      issueSlipNumber: `ISS-2026-00${indents.length + 23}`,
      date: new Date().toISOString().split("T")[0],
      requestingEngineer: "Vikram Kulkarni (Lead Resident Engineer)",
      contractorName: newIndent.contractorName,
      workAreaLocation: newIndent.workAreaLocation,
      materialName: newIndent.materialName,
      standardUOM: newIndent.standardUOM,
      requestedQuantity: Number(newIndent.requestedQuantity),
      issuedQuantity: Number(newIndent.issuedQuantity),
      theoreticalBOQConsumption: Number(newIndent.theoreticalBOQConsumption),
      varianceWastagePercent: varianceCalculated,
      wastageStatus: isWastageWarning ? "ABNORMAL_SCRAP_WARNING" : "NORMAL_WITHIN_TOLERANCE",
      storekeeperSignOff: "Mahesh Patil",
      engineerSignOff: "Vikram Kulkarni",
    };

    onUpdateIndents([slip, ...indents]);
    setShowAddIndentModal(false);
  };

  const exportIndentsCSV = () => {
    const headers = [
      "Indent No",
      "Issue Slip No",
      "Date",
      "Contractor",
      "Work Location",
      "Material",
      "Requested Qty",
      "Issued Qty",
      "Theoretical BOQ Qty",
      "Variance Wastage %",
      "Wastage Status",
      "Engineer Sign-Off",
    ];
    const rows = indents.map((i) => [
      i.indentNumber,
      i.issueSlipNumber,
      i.date,
      `"${i.contractorName}"`,
      `"${i.workAreaLocation}"`,
      `"${i.materialName}"`,
      i.requestedQuantity,
      i.issuedQuantity,
      i.theoreticalBOQConsumption,
      `${i.varianceWastagePercent}%`,
      i.wastageStatus,
      `"${i.engineerSignOff}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Contractor_Material_Indents_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
              Sub-Module 7.5
            </span>
            <span className="text-xs text-slate-500 font-medium">Requisition vs. Theoretical BOQ Consumption</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Contractor Material Indents & Theoretical Wastage Monitor
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Compares actual storekeeper issues against theoretical IS 456 BOQ consumption to prevent site pilferage and abnormal scrap.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportIndentsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddIndentModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Material Issue Slip</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search indent no, material, location, or contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Indents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">Indent No</th>
                <th className="py-3 px-3 w-28">Issue Slip</th>
                <th className="py-3 px-4 min-w-[200px]">Contractor & Work Zone</th>
                <th className="py-3 px-4 min-w-[180px]">Material Description</th>
                <th className="py-3 px-3 text-right">Issued Qty</th>
                <th className="py-3 px-3 text-right">Theoretical BOQ</th>
                <th className="py-3 px-3 text-right">Variance %</th>
                <th className="py-3 px-3 text-center">Wastage Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredIndents.map((indent) => {
                const isNormal = indent.wastageStatus === "NORMAL_WITHIN_TOLERANCE";
                return (
                  <tr key={indent.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {indent.indentNumber}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {indent.issueSlipNumber}
                      <div className="text-[10px] text-slate-400 font-sans font-normal">{indent.date}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{indent.contractorName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{indent.workAreaLocation}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{indent.materialName}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                      {indent.issuedQuantity} {indent.standardUOM}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {indent.theoreticalBOQConsumption} {indent.standardUOM}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={isNormal ? "text-emerald-700" : "text-rose-700"}>
                        +{indent.varianceWastagePercent}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isNormal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>WITHIN NORM</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>EXCESS SCRAP</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedIndentForPrint(indent)}
                        className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                      >
                        View Slip
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
      {/* MODAL 1: CREATE MATERIAL INDENT & ISSUE SLIP                              */}
      {/* ========================================================================= */}
      {showAddIndentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Generate Contractor Material Issue Slip</h3>
              </div>
              <button
                onClick={() => setShowAddIndentModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIndent} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contractor Name</label>
                  <input
                    type="text"
                    required
                    value={newIndent.contractorName}
                    onChange={(e) => setNewIndent({ ...newIndent, contractorName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Area / Pour Location</label>
                  <input
                    type="text"
                    required
                    value={newIndent.workAreaLocation}
                    onChange={(e) => setNewIndent({ ...newIndent, workAreaLocation: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Description</label>
                <input
                  type="text"
                  required
                  value={newIndent.materialName}
                  onChange={(e) => setNewIndent({ ...newIndent, materialName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Qty</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newIndent.requestedQuantity}
                    onChange={(e) => setNewIndent({ ...newIndent, requestedQuantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issued Qty</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newIndent.issuedQuantity}
                    onChange={(e) => setNewIndent({ ...newIndent, issuedQuantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Theoretical BOQ</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={0.1}
                    value={newIndent.theoreticalBOQConsumption}
                    onChange={(e) => setNewIndent({ ...newIndent, theoreticalBOQConsumption: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              {/* Live Variance Calculation Banner */}
              <div
                className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                  isWastageWarning
                    ? "bg-rose-50 border-rose-300 text-rose-900"
                    : "bg-emerald-50 border-emerald-300 text-emerald-900"
                }`}
              >
                <div>
                  <div className="font-bold">
                    Wastage Variance: +{varianceCalculated}%
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {isWastageWarning
                      ? "Exceeds CPWD benchmark norm (3.5%). Requires Resident Engineer review."
                      : "Within standard empirical handling tolerance allowance."}
                  </div>
                </div>
                <span className="font-mono font-bold text-xs uppercase px-2 py-1 rounded bg-white/80">
                  {isWastageWarning ? "FLAGGED" : "APPROVED"}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddIndentModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Issue Material from Godown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT OFFICIAL MATERIAL ISSUE SLIP                               */}
      {/* ========================================================================= */}
      {selectedIndentForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Official Material Issue Slip — {selectedIndentForPrint.issueSlipNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedIndentForPrint(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans border p-6 rounded-lg bg-white shadow-sm">
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-[#10263d]">OSTAAD INFRASTRUCTURE DEVELOPERS LTD.</h1>
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • Site Warehouse & Inventory Management</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  MATERIAL REQUISITION & STORE ISSUE SLIP
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>Issue Slip Ref: <strong className="font-mono">{selectedIndentForPrint.issueSlipNumber}</strong></div>
                  <div>Indent Ref: <strong className="font-mono">{selectedIndentForPrint.indentNumber}</strong></div>
                  <div>Contractor: <strong>{selectedIndentForPrint.contractorName}</strong></div>
                </div>
                <div className="text-right">
                  <div>Issue Date: <strong>{selectedIndentForPrint.date}</strong></div>
                  <div>Work Zone: <strong>{selectedIndentForPrint.workAreaLocation}</strong></div>
                  <div>Wastage Check: <strong className="text-emerald-700">{selectedIndentForPrint.wastageStatus}</strong></div>
                </div>
              </div>

              {/* Comparison Table */}
              <div>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2">Material Issued</th>
                      <th className="p-2 text-center">Requested Qty</th>
                      <th className="p-2 text-center text-blue-900 bg-blue-50/50">Issued Qty</th>
                      <th className="p-2 text-center">Theoretical BOQ</th>
                      <th className="p-2 text-right">Wastage Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-bold">{selectedIndentForPrint.materialName}</td>
                      <td className="p-2 text-center font-mono">{selectedIndentForPrint.requestedQuantity} {selectedIndentForPrint.standardUOM}</td>
                      <td className="p-2 text-center font-mono font-bold text-blue-900 text-sm bg-blue-50/30">
                        {selectedIndentForPrint.issuedQuantity} {selectedIndentForPrint.standardUOM}
                      </td>
                      <td className="p-2 text-center font-mono">{selectedIndentForPrint.theoreticalBOQConsumption} {selectedIndentForPrint.standardUOM}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">
                        +{selectedIndentForPrint.varianceWastagePercent}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dual Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200 mt-8">
                <div>
                  <div className="h-16 flex items-end font-mono text-slate-500 italic text-[11px]">
                    Signed by {selectedIndentForPrint.engineerSignOff}
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Lead Resident Engineer (Requisitioner)
                  </div>
                  <div className="text-[10px] text-slate-500">Material Received at Site Workfront</div>
                </div>

                <div className="text-right">
                  <div className="h-16 flex flex-col justify-end items-end font-mono text-slate-500 italic text-[11px]">
                    Signed by {selectedIndentForPrint.storekeeperSignOff}
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Site Storekeeper
                  </div>
                  <div className="text-[10px] text-slate-500">Debited from Live Godown Stock Ledger</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
