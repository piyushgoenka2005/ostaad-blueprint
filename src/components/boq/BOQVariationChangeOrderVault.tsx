"use client";

import React, { useState, useMemo } from "react";
import {
  Lock,
  GitCommit,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  History,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  Check,
  Shield,
} from "lucide-react";
import {
  BOQChangeOrder,
  HierarchicalBOQItem,
  DEFAULT_CHANGE_ORDERS,
} from "@/lib/boq-cost-control";

interface BOQVariationChangeOrderVaultProps {
  boqItems: HierarchicalBOQItem[];
  changeOrders: BOQChangeOrder[];
  onUpdateChangeOrders: (orders: BOQChangeOrder[]) => void;
  onApplyChangeOrderToBOQ?: (co: BOQChangeOrder) => void;
}

export default function BOQVariationChangeOrderVault({
  boqItems,
  changeOrders,
  onUpdateChangeOrders,
  onApplyChangeOrderToBOQ,
}: BOQVariationChangeOrderVaultProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCO, setSelectedCO] = useState<BOQChangeOrder | null>(null);

  // New Change Order form state
  const [selectedTargetItemId, setSelectedTargetItemId] = useState(
    boqItems[0]?.id || "boq-item-03"
  );
  const [revisedQtyInput, setRevisedQtyInput] = useState<number>(2000);
  const [variationReason, setVariationReason] = useState("");

  const targetItem = useMemo(() => {
    return boqItems.find((i) => i.id === selectedTargetItemId) || boqItems[0];
  }, [boqItems, selectedTargetItemId]);

  const quantityDelta = useMemo(() => {
    if (!targetItem) return 0;
    return revisedQtyInput - targetItem.tenderQuantity;
  }, [targetItem, revisedQtyInput]);

  const costImpact = useMemo(() => {
    if (!targetItem) return 0;
    return quantityDelta * targetItem.approvedRateINR;
  }, [targetItem, quantityDelta]);

  // Financial summary of Change Orders
  const approvedVariations = useMemo(() => {
    return changeOrders.filter((co) => co.status === "APPROVED");
  }, [changeOrders]);

  const totalVariationImpactINR = useMemo(() => {
    return approvedVariations.reduce((sum, co) => sum + co.costImpactINR, 0);
  }, [approvedVariations]);

  const pendingApprovalsCount = useMemo(() => {
    return changeOrders.filter((co) => co.status === "PENDING_APPROVAL").length;
  }, [changeOrders]);

  const filteredCOs = useMemo(() => {
    return changeOrders.filter((co) => {
      const matchesSearch =
        co.changeOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        co.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        co.reasonForVariation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || co.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [changeOrders, searchQuery, statusFilter]);

  const handleCreateChangeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetItem || !variationReason) return;

    const newCO: BOQChangeOrder = {
      id: `co-${Date.now()}`,
      changeOrderNumber: `CO-2026-00${changeOrders.length + 1}`,
      targetItemId: targetItem.id,
      itemDescription: targetItem.description,
      originalQuantity: targetItem.tenderQuantity,
      revisedQuantity: revisedQtyInput,
      quantityDelta: quantityDelta,
      rateINR: targetItem.approvedRateINR,
      costImpactINR: costImpact,
      reasonForVariation: variationReason,
      status: "PENDING_APPROVAL",
      requestedBy: "Vikram Kulkarni (Lead Resident Engineer)",
      date: new Date().toISOString().split("T")[0],
    };

    onUpdateChangeOrders([newCO, ...changeOrders]);
    setShowCreateModal(false);
    setVariationReason("");
  };

  const handleApproveCO = (coId: string) => {
    const updated = changeOrders.map((co) => {
      if (co.id === coId) {
        const approved: BOQChangeOrder = {
          ...co,
          status: "APPROVED",
          approvedBy: "Managing Authority / Project Director",
        };
        if (onApplyChangeOrderToBOQ) {
          onApplyChangeOrderToBOQ(approved);
        }
        return approved;
      }
      return co;
    });
    onUpdateChangeOrders(updated);
  };

  const handleRejectCO = (coId: string) => {
    const updated = changeOrders.map((co) => {
      if (co.id === coId) {
        return {
          ...co,
          status: "REJECTED" as const,
          approvedBy: "Managing Authority (Disapproved)",
        };
      }
      return co;
    });
    onUpdateChangeOrders(updated);
  };

  return (
    <div className="space-y-6">
      {/* Baseline Freeze & Governance Banner */}
      <div className="bg-gradient-to-r from-[#10263d] to-[#1a3857] text-white p-5 rounded-xl shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Rev-00 Baseline Frozen
                </span>
                <span className="text-xs text-slate-300">Tender Baseline Sign-off: 20 Jan 2026</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                BOQ Version Control & Change Order Variation Vault
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Strict managing authority audit trail for tender variations. Any deviation in scope,
                reinforcement density, or foundation strata requires formal approval before execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-600 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise Change Order (CO)</span>
            </button>
          </div>
        </div>

        {/* Revision Chips Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-medium">Revision Lineage:</span>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-white/10 text-slate-200 border border-white/10 font-mono text-[11px]">
              Rev-00: Tender Baseline (₹5.87 Cr)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2.5 py-1 rounded bg-white/10 text-slate-200 border border-white/10 font-mono text-[11px]">
              Rev-01: Foundation Raft Thickening (+₹8.38L)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2.5 py-1 rounded bg-blue-500/30 text-blue-200 border border-blue-400/40 font-mono font-bold text-[11px]">
              Rev-02 (Current Active): Seismic Detailing (+₹13.05L)
            </span>
          </div>
        </div>
      </div>

      {/* Variation Impact Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Cumulative Variation Impact</div>
            <div className="text-xl font-bold text-[#122b45]">
              +₹{(totalVariationImpactINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">+3.65% over tender baseline</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Approved Change Orders</div>
            <div className="text-xl font-bold text-emerald-700">{approvedVariations.length} Approved</div>
            <div className="text-[11px] text-slate-500">Managing Authority Authorized</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Pending Review</div>
            <div className="text-xl font-bold text-amber-700">{pendingApprovalsCount} Pending</div>
            <div className="text-[11px] text-slate-500">Resident Eng. Submissions</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Change Orders Logged</div>
            <div className="text-xl font-bold text-[#122b45]">{changeOrders.length} Variations</div>
            <div className="text-[11px] text-slate-500">Immutable Audit Log Active</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search CO number, item, or justification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved Only</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Change Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">CO Number</th>
                <th className="py-3 px-3 min-w-[240px]">Target Item & Specification</th>
                <th className="py-3 px-3 w-28 text-right">Orig Qty</th>
                <th className="py-3 px-3 w-28 text-right">Rev Qty</th>
                <th className="py-3 px-3 w-24 text-right">Delta</th>
                <th className="py-3 px-3 w-28 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-3 w-32 text-right">Cost Impact (₹)</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCOs.map((co) => {
                const isPositive = co.quantityDelta > 0;
                return (
                  <tr key={co.id} className="hover:bg-slate-50/80 transition">
                    {/* CO Number */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {co.changeOrderNumber}
                      <div className="text-[10px] text-slate-400 font-sans font-normal">{co.date}</div>
                    </td>

                    {/* Target Item & Justification */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 leading-snug">{co.itemDescription}</div>
                      <div className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                        &quot;{co.reasonForVariation}&quot;
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Requested by: <span className="font-medium text-slate-600">{co.requestedBy}</span>
                      </div>
                    </td>

                    {/* Orig Qty */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {co.originalQuantity.toLocaleString("en-IN")}
                    </td>

                    {/* Rev Qty */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                      {co.revisedQuantity.toLocaleString("en-IN")}
                    </td>

                    {/* Delta */}
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          isPositive
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isPositive ? `+${co.quantityDelta}` : co.quantityDelta}
                      </span>
                    </td>

                    {/* Unit Rate */}
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ₹{co.rateINR.toLocaleString("en-IN")}
                    </td>

                    {/* Cost Impact */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#122b45]">
                      +₹{co.costImpactINR.toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {co.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approved</span>
                        </span>
                      )}
                      {co.status === "PENDING_APPROVAL" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                      {co.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-center">
                      {co.status === "PENDING_APPROVAL" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveCO(co.id)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold shadow-sm transition"
                            title="Approve Change Order"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectCO(co.id)}
                            className="px-2 py-1 rounded bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold transition"
                            title="Reject Change Order"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500">
                          {co.approvedBy || "Reviewed"}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE CHANGE ORDER (VARIATION)                                    */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Raise New BOQ Change Order</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChangeOrder} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target BOQ Item</label>
                <select
                  value={selectedTargetItemId}
                  onChange={(e) => {
                    setSelectedTargetItemId(e.target.value);
                    const it = boqItems.find((i) => i.id === e.target.value);
                    if (it) {
                      setRevisedQtyInput(it.tenderQuantity + 50);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800"
                >
                  {boqItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.wbsCode}] {item.description.slice(0, 50)}... ({item.tenderQuantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {targetItem && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Original Tender Quantity:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {targetItem.tenderQuantity} {targetItem.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Contract Unit Rate:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{targetItem.approvedRateINR.toLocaleString("en-IN")} / {targetItem.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proposed Revised Quantity ({targetItem?.unit})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={revisedQtyInput}
                    onChange={(e) => setRevisedQtyInput(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Delta</label>
                  <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-blue-700">
                    {quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta} {targetItem?.unit}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-amber-900 block">Computed Variation Financial Impact:</span>
                  <span className="text-[11px] text-amber-700">Subject to Managing Authority Approval</span>
                </div>
                <span className="font-mono font-bold text-amber-950 text-base">
                  {costImpact >= 0 ? `+₹${costImpact.toLocaleString("en-IN")}` : `-₹${Math.abs(costImpact).toLocaleString("en-IN")}`}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Technical Justification & Structural Basis
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide engineering rationale (e.g. soil stratum variation, revised seismic IS 13920 detailing)..."
                  value={variationReason}
                  onChange={(e) => setVariationReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Submit Change Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
