"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquareText,
  ShieldCheck,
  Building2,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Info,
  X,
  Check,
  Percent,
  Search,
  Filter,
} from "lucide-react";
import {
  PendingProcurementApproval,
  DEFAULT_PENDING_APPROVALS,
  AuthorisedPurchaseOrder,
} from "@/lib/commercial-finance";

interface DualControlPOApprovalProps {
  approvals: PendingProcurementApproval[];
  onUpdateApprovals: (approvals: PendingProcurementApproval[]) => void;
  onPOApproved?: (po: AuthorisedPurchaseOrder) => void;
}

export default function DualControlPOApproval({
  approvals,
  onUpdateApprovals,
  onPOApproved,
}: DualControlPOApprovalProps) {
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(
    approvals[0]?.id || "appr-01"
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Action Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showClarifyModal, setShowClarifyModal] = useState(false);

  // Decision inputs
  const [paymentTermsInput, setPaymentTermsInput] = useState<
    "100_PERCENT_ADVANCE" | "PART_BY_PART" | "30_DAYS_CREDIT" | "AGAINST_GRN"
  >("PART_BY_PART");
  const [advancePercentInput, setAdvancePercentInput] = useState<number>(15);
  const [rejectionReason, setRejectionReason] = useState("");
  const [clarificationReason, setClarificationReason] = useState("");

  const selectedApproval = useMemo(() => {
    return approvals.find((a) => a.id === selectedApprovalId) || approvals[0];
  }, [approvals, selectedApprovalId]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchesSearch =
        a.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.recommendedVendorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [approvals, searchQuery, statusFilter]);

  const handleApprove = () => {
    if (!selectedApproval) return;

    const newPO: AuthorisedPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-PUN-01${approvals.length + 10}`,
      poDate: new Date().toISOString().split("T")[0],
      projectCode: selectedApproval.projectCode,
      projectName: selectedApproval.projectName,
      costCode: selectedApproval.costCode,
      vendorId: selectedApproval.recommendedVendorId,
      vendorName: selectedApproval.recommendedVendorName,
      vendorGstin: selectedApproval.vendorGstin,
      vendorAddress: "Pune Industrial Hub, Maharashtra",
      vendorBankDetails: "HDFC Bank (A/C: 50200034910281, IFSC: HDFC0000039)",
      materialName: selectedApproval.materialName,
      technicalSpecification: "Standard IS compliance as per requisition",
      quantity: selectedApproval.orderedQuantity,
      standardUOM: selectedApproval.standardUOM,
      baseRateINR: Math.round(selectedApproval.quotedLandedUnitRateINR * 0.75),
      freightINR: Math.round(selectedApproval.quotedLandedUnitRateINR * 0.05),
      handlingINR: Math.round(selectedApproval.quotedLandedUnitRateINR * 0.02),
      gstPercent: 18,
      netLandedRateINR: selectedApproval.quotedLandedUnitRateINR,
      totalOrderValueINR: selectedApproval.totalCommitmentAmountINR,
      paymentTerms:
        paymentTermsInput === "PART_BY_PART"
          ? `${advancePercentInput}% Advance, balance against progressive GRN slips`
          : paymentTermsInput === "100_PERCENT_ADVANCE"
          ? "100% Full Advance against proforma invoice"
          : "30 Days Credit against Gate GRN invoice",
      deliverySiteGodown: "Commercial Complex Tower B Central Yard",
      deliverySchedule: "Weekly phased drops upon engineer call-off",
      status: "RELEASED_TO_VENDOR",
      authorisedByFinance: "Sunil K. Mehta (Chief Financial Controller)",
      financeSignOffDate: new Date().toISOString().split("T")[0],
      digitalStampCode: `OSTAAD-DS-FIN-${Date.now().toString().slice(-4)}-VERIFIED`,
    };

    const updated = approvals.map((a) => {
      if (a.id === selectedApproval.id) {
        return {
          ...a,
          status: "APPROVED" as const,
          paymentTerms: paymentTermsInput,
          advancePercentage: advancePercentInput,
          financeApprover: "Sunil K. Mehta (Chief Financial Controller)",
          decisionDate: new Date().toISOString().split("T")[0],
        };
      }
      return a;
    });

    onUpdateApprovals(updated);
    if (onPOApproved) {
      onPOApproved(newPO);
    }
    setShowApproveModal(false);
  };

  const handleReject = () => {
    if (!selectedApproval || !rejectionReason.trim()) return;

    const updated = approvals.map((a) => {
      if (a.id === selectedApproval.id) {
        return {
          ...a,
          status: "REJECTED" as const,
          decisionNotes: rejectionReason,
          financeApprover: "Sunil K. Mehta (Chief Financial Controller)",
          decisionDate: new Date().toISOString().split("T")[0],
        };
      }
      return a;
    });

    onUpdateApprovals(updated);
    setShowRejectModal(false);
    setRejectionReason("");
  };

  const handleClarify = () => {
    if (!selectedApproval || !clarificationReason.trim()) return;

    const updated = approvals.map((a) => {
      if (a.id === selectedApproval.id) {
        return {
          ...a,
          status: "CLARIFICATION_REQUESTED" as const,
          decisionNotes: clarificationReason,
          financeApprover: "Sunil K. Mehta (Chief Financial Controller)",
          decisionDate: new Date().toISOString().split("T")[0],
        };
      }
      return a;
    });

    onUpdateApprovals(updated);
    setShowClarifyModal(false);
    setClarificationReason("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sub-Module 6.2
            </span>
            <span className="text-xs text-slate-500 font-medium">Dual-Control Executive Governance</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Dual-Control Purchase Order Approval Inbox
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Strict separation of duties: Project Managers propose supplier awards; Finance independently authorizes legal PO release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            {approvals.filter((a) => a.status === "PENDING_FINANCE_APPROVAL").length} Pending Actions
          </span>
        </div>
      </div>

      {/* Main Split Grid: Left List + Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Requests List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requisition or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_FINANCE_APPROVAL">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLARIFICATION_REQUESTED">Clarification</option>
            </select>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredApprovals.map((item) => {
              const isSelected = selectedApproval?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedApprovalId(item.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer text-xs ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-400 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-blue-700">{item.requisitionNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "PENDING_FINANCE_APPROVAL"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm">{item.materialName}</div>
                  <div className="text-slate-600 mt-0.5 font-medium">{item.recommendedVendorName}</div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="font-mono text-slate-500">
                      {item.orderedQuantity.toLocaleString("en-IN")} {item.standardUOM}
                    </span>
                    <span className="font-mono font-bold text-[#122b45] text-xs">
                      ₹{item.totalCommitmentAmountINR.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Inspector & Action Controls */}
        <div className="lg:col-span-7">
          {selectedApproval ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedApproval.requisitionNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Cost Code: {selectedApproval.costCode}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#122b45] mt-1">{selectedApproval.materialName}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">Project: {selectedApproval.projectName}</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total PO Commitment</div>
                  <div className="text-2xl font-bold text-[#122b45] font-mono">
                    ₹{selectedApproval.totalCommitmentAmountINR.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Vendor & Pricing Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900">{selectedApproval.recommendedVendorName}</div>
                  <div className="font-mono text-[11px] text-slate-600">GSTIN: {selectedApproval.vendorGstin}</div>
                  <div className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>L1 Ranked Lowest Commercial Bidder</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="text-slate-600">
                    Net Landed Rate: <strong className="font-mono text-slate-900">₹{selectedApproval.quotedLandedUnitRateINR.toLocaleString("en-IN")} / {selectedApproval.standardUOM}</strong>
                  </div>
                  <div className="text-slate-600">
                    Order Quantity: <strong className="font-mono text-slate-900">{selectedApproval.orderedQuantity.toLocaleString("en-IN")} {selectedApproval.standardUOM}</strong>
                  </div>
                  <div className="text-blue-700 font-semibold">Includes 18% Works GST & Transit Cartage</div>
                </div>
              </div>

              {/* PM Recommendation Justification */}
              <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-200 text-xs space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Managing Authority & PM Commercial Rationale:</span>
                </div>
                <p className="text-blue-950 italic leading-relaxed">&quot;{selectedApproval.pmJustification}&quot;</p>
                <div className="text-[10px] text-slate-500 pt-1">
                  Submitted by: <strong>{selectedApproval.submittedBy}</strong> on {selectedApproval.submittedDate}
                </div>
              </div>

              {/* Budget Pool Headroom Check */}
              <div className="bg-emerald-50/60 p-4 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-emerald-900">Budget Pool Headroom Verification: PASS</div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    Package allocation ceiling has sufficient headroom. No budget hard stop triggered.
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-950">
                  Headroom: ₹{selectedApproval.budgetHeadroomBeforeINR.toLocaleString("en-IN")}
                </div>
              </div>

              {/* Audit Decision Result Note if already processed */}
              {selectedApproval.status !== "PENDING_FINANCE_APPROVAL" && (
                <div className="p-3.5 rounded-lg border text-xs bg-slate-50 border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Finance Decision Record:</div>
                  <div className="text-slate-600">{selectedApproval.decisionNotes || "Purchase order successfully authorized."}</div>
                  <div className="text-[10px] text-slate-400">
                    Decided by: {selectedApproval.financeApprover} on {selectedApproval.decisionDate}
                  </div>
                </div>
              )}

              {/* Action Buttons Bar */}
              {selectedApproval.status === "PENDING_FINANCE_APPROVAL" && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setShowClarifyModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    <span>Request Clarification</span>
                  </button>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10263d] text-white hover:bg-blue-900 text-xs font-semibold transition shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authorize Legal PO Release</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select a procurement request from the left list.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: APPROVE AND SET PAYMENT STRUCTURE                                */}
      {/* ========================================================================= */}
      {showApproveModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-[#122b45] text-base">Authorize PO Release & Set Payment Terms</h3>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedApproval.materialName}</div>
                <div className="text-[11px] text-slate-500">Supplier: {selectedApproval.recommendedVendorName}</div>
                <div className="text-sm font-bold text-blue-950 font-mono mt-1">
                  Commitment: ₹{selectedApproval.totalCommitmentAmountINR.toLocaleString("en-IN")}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approved Payment Structure</label>
                <select
                  value={paymentTermsInput}
                  onChange={(e) => setPaymentTermsInput(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                >
                  <option value="PART_BY_PART">Part-by-Part against Progressive GRNs</option>
                  <option value="30_DAYS_CREDIT">30 Days Credit against Weighbridge Gate GRN</option>
                  <option value="AGAINST_GRN">100% Payment against Delivery Verification</option>
                  <option value="100_PERCENT_ADVANCE">100% Advance against Bank Guarantee</option>
                </select>
              </div>

              {paymentTermsInput === "PART_BY_PART" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mobilization Advance % ({advancePercentInput}% = ₹{Math.round((selectedApproval.totalCommitmentAmountINR * advancePercentInput) / 100).toLocaleString("en-IN")})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={advancePercentInput}
                    onChange={(e) => setAdvancePercentInput(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0% (No Advance)</span>
                    <span>15% (Standard)</span>
                    <span>50% (Max)</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-1.5 rounded-lg bg-[#10263d] text-white font-semibold hover:bg-blue-900"
                >
                  Confirm & Release PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REJECT WITH AUDIT REASON                                         */}
      {/* ========================================================================= */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-[#122b45] text-base">Reject Procurement Award</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-600">
                A mandatory auditable reason is required. This will be transmitted back to the Project Manager.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Commercial Rejection</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Quoted landed freight exceeds benchmark CPWD transit allowance by 12%..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REQUEST CLARIFICATION                                            */}
      {/* ========================================================================= */}
      {showClarifyModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Request Commercial Clarification</h3>
              </div>
              <button
                onClick={() => setShowClarifyModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <p className="text-slate-600">
                Specify questions regarding batching capacity, credit days, or test certifications.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clarification Query</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Please confirm if supplier provides third-party NABL 28-day concrete cube compressive strength test reports free of charge..."
                  value={clarificationReason}
                  onChange={(e) => setClarificationReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowClarifyModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClarify}
                  disabled={!clarificationReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  Send Query to PM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

