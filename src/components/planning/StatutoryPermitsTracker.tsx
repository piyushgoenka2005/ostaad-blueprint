"use client";

import React, { useState, useMemo } from "react";
import {
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  IndianRupee,
  Calendar,
  Building,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import {
  StatutoryPermit,
  PermitCategory,
  PermitStatus,
  DEFAULT_STATUTORY_PERMITS,
  calculatePermitsSummary,
} from "@/lib/planning/logistics-permits";

interface StatutoryPermitsTrackerProps {
  className?: string;
}

export default function StatutoryPermitsTracker({
  className = "",
}: StatutoryPermitsTrackerProps) {
  const [permits, setPermits] = useState<StatutoryPermit[]>(DEFAULT_STATUTORY_PERMITS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Permit form state
  const [newPermitName, setNewPermitName] = useState("");
  const [newAuthority, setNewAuthority] = useState("");
  const [newCategory, setNewCategory] = useState<PermitCategory>("MUNICIPAL");
  const [newFee, setNewFee] = useState<number>(150000);
  const [newStatus, setNewStatus] = useState<PermitStatus>("APPLIED");
  const [newAppDate, setNewAppDate] = useState("2026-03-01");
  const [newExpiryDate, setNewExpiryDate] = useState("2027-02-28");
  const [newDocRef, setNewDocRef] = useState("REF/2026/001");
  const [newMandatory, setNewMandatory] = useState<boolean>(true);

  // Metrics summary
  const summary = useMemo(() => calculatePermitsSummary(permits), [permits]);

  // Filtered permits
  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchSearch =
        searchQuery === "" ||
        p.permitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.docRef.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [permits, selectedCategory, searchQuery]);

  // Status cycle: APPROVED -> IN_REVIEW -> APPLIED -> APPROVED
  const cycleStatus = (id: string) => {
    setPermits((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus: PermitStatus =
          p.status === "APPROVED"
            ? "IN_REVIEW"
            : p.status === "IN_REVIEW"
            ? "APPLIED"
            : "APPROVED";
        return { ...p, status: nextStatus };
      })
    );
  };

  // Add permit submit
  const handleAddPermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermitName.trim()) return;

    const newPermit: StatutoryPermit = {
      id: `pm-${Date.now()}`,
      permitName: newPermitName.trim(),
      category: newCategory,
      authority: newAuthority.trim() || "Municipal Authority",
      status: newStatus,
      sanctionFeeINR: Number(newFee) || 0,
      applicationDate: newAppDate,
      approvalDate: newStatus === "APPROVED" ? new Date().toISOString().slice(0, 10) : "—",
      expiryDate: newExpiryDate,
      isMandatoryForGroundbreaking: newMandatory,
      docRef: newDocRef.trim() || "DOC/NOC/PENDING",
    };

    setPermits((prev) => [...prev, newPermit]);
    setIsAddModalOpen(false);
    setNewPermitName("");
    setNewAuthority("");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Statutory Permit, NOC & Clearance Lifecycle Tracker (Tool 5)
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Municipal & Statutory Compliance
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track CC sanctions, environmental clearances, provisional fire NOCs, and fee expenditure ledger
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Add Sanction / NOC</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export NOC Ledger</span>
            </button>
          </div>
        </div>

        {/* Executive Compliance KPI Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Clearance Index
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {summary.clearanceIndexPercent}%
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              {summary.approvedCount} of {summary.totalCount} Sanctions Cleared
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Fees Disbursed
            </div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              ₹{summary.totalFeesPaidLakhs} L
            </div>
            <div className="text-[11px] text-slate-500">
              Statutory Government Dues Paid
            </div>
          </div>

          <div
            className={`rounded-xl border p-3.5 ${
              summary.criticalGatesPassed
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-rose-200 bg-rose-50/50"
            }`}
          >
            <div
              className={`text-[10px] font-bold uppercase tracking-wider ${
                summary.criticalGatesPassed ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Groundbreaking Gate
            </div>
            <div
              className={`text-xl font-black mt-0.5 ${
                summary.criticalGatesPassed ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {summary.criticalGatesPassed ? "CLEAR GO" : "GATE HOLD"}
            </div>
            <div
              className={`text-[11px] font-medium ${
                summary.criticalGatesPassed ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {summary.criticalGatesPassed ? "All 7 Mandatory Gates Passed" : "Critical NOC Pending"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              In Review / Pipeline
            </div>
            <div className="text-xl font-black text-amber-700 mt-0.5">
              {summary.inReviewCount} NOCs
            </div>
            <div className="text-[11px] text-amber-800">
              Under Active Department Review
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-3xl scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "ALL"
                ? "bg-[#122b45] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Authorities ({permits.length})
          </button>
          {[
            { id: "MUNICIPAL", name: "Municipal & CC" },
            { id: "ENVIRONMENT", name: "Environmental (EC)" },
            { id: "SAFETY_FIRE", name: "Fire & Aviation" },
            { id: "UTILITIES", name: "Power & Water" },
            { id: "LAND_TITLE", name: "Land Title" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sanction, authority, doc ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
          />
        </div>
      </div>

      {/* Permits Register Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-3 px-4">Sanction / Clearance Name</th>
                <th className="py-3 px-3">Issuing Authority</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Fee Paid (₹)</th>
                <th className="py-3 px-3">Approval Date</th>
                <th className="py-3 px-3">Validity Expiry</th>
                <th className="py-3 px-3">Document Ref</th>
                <th className="py-3 px-3 text-center">Mandatory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPermits.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#122b45] leading-snug">{p.permitName}</div>
                    {p.notes && <div className="text-[10px] text-slate-500 mt-0.5">{p.notes}</div>}
                  </td>

                  <td className="py-3 px-3 text-slate-600 font-medium">{p.authority}</td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => cycleStatus(p.id)}
                      title="Click to toggle status"
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition-transform active:scale-95 ${
                        p.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : p.status === "IN_REVIEW"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {p.status === "APPROVED" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      <span>{p.status}</span>
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                    ₹{p.sanctionFeeINR.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-600">{p.approvalDate}</td>

                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        p.expiryDate.startsWith("2026")
                          ? "bg-amber-100 text-amber-900 font-bold"
                          : "text-slate-600"
                      }`}
                    >
                      {p.expiryDate}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-blue-700 flex items-center gap-1 mt-2.5">
                    <span>{p.docRef}</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </td>

                  <td className="py-3 px-3 text-center">
                    {p.isMandatoryForGroundbreaking ? (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        CRITICAL
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        ROUTINE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SANCTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Add Statutory NOC / Permit</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPermit} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Sanction / Clearance Name</label>
                <input
                  type="text"
                  required
                  value={newPermitName}
                  onChange={(e) => setNewPermitName(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. Lift Inspectorate Operational Sanction"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Issuing Authority</label>
                  <input
                    type="text"
                    required
                    value={newAuthority}
                    onChange={(e) => setNewAuthority(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                    placeholder="e.g. PWD Electrical Inspectorate"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as PermitCategory)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="MUNICIPAL">Municipal & CC</option>
                    <option value="ENVIRONMENT">Environmental</option>
                    <option value="SAFETY_FIRE">Fire & Safety</option>
                    <option value="UTILITIES">Utilities & Power</option>
                    <option value="LAND_TITLE">Land Title</option>
                    <option value="OCCUPANCY">Occupancy (OC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Sanction Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newFee}
                    onChange={(e) => setNewFee(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Current Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as PermitStatus)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="APPLIED">APPLIED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Application Date</label>
                  <input
                    type="date"
                    value={newAppDate}
                    onChange={(e) => setNewAppDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Validity Expiry Date</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Document Reference Number</label>
                <input
                  type="text"
                  value={newDocRef}
                  onChange={(e) => setNewDocRef(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  placeholder="e.g. NOC-2026-PWD-881"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mandatoryCheck"
                  checked={newMandatory}
                  onChange={(e) => setNewMandatory(e.target.checked)}
                  className="rounded text-emerald-600 accent-emerald-600"
                />
                <label htmlFor="mandatoryCheck" className="text-xs font-semibold text-[#122b45] cursor-pointer">
                  Mandatory prerequisite for site groundbreaking
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                >
                  Record Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

