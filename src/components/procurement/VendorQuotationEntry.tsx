"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Building,
  CreditCard,
  Percent,
  Download,
  AlertCircle,
  X,
  Layers,
  Calculator,
  ArrowRight,
} from "lucide-react";
import {
  VendorQuotationBid,
  MaterialRFQItem,
  VerifiedVendorProfile,
  computeLandedRate,
} from "@/lib/procurement-sourcing";

interface VendorQuotationEntryProps {
  rfqs: MaterialRFQItem[];
  vendors: VerifiedVendorProfile[];
  bids: VendorQuotationBid[];
  onUpdateBids: (bids: VendorQuotationBid[]) => void;
  onSelectBidForComparison?: (rfqId: string) => void;
}

export default function VendorQuotationEntry({
  rfqs,
  vendors,
  bids,
  onUpdateBids,
  onSelectBidForComparison,
}: VendorQuotationEntryProps) {
  const [selectedRFQFilter, setSelectedRFQFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddBidModal, setShowAddBidModal] = useState(false);

  // New Bid Form State
  const [newBid, setNewBid] = useState({
    rfqId: rfqs[0]?.id || "rfq-01",
    vendorId: vendors[0]?.id || "vnd-01",
    baseRateINR: 280,
    freightPerUOMINR: 12,
    unloadingHandlingPerUOMINR: 3,
    gstRatePercent: 28,
    deliveryLeadTimeDays: 2,
    paymentCreditTerms: "30 Days Credit after Delivery",
    technicalComplianceConfirmed: true,
    notes: "Direct factory dispatches with batch test certificate.",
  });

  const targetRFQ = useMemo(() => {
    return rfqs.find((r) => r.id === newBid.rfqId) || rfqs[0];
  }, [rfqs, newBid.rfqId]);

  const targetVendor = useMemo(() => {
    return vendors.find((v) => v.id === newBid.vendorId) || vendors[0];
  }, [vendors, newBid.vendorId]);

  // Live Landed Calculation for form
  const computedLive = useMemo(() => {
    return computeLandedRate(
      Number(newBid.baseRateINR) || 0,
      Number(newBid.freightPerUOMINR) || 0,
      Number(newBid.unloadingHandlingPerUOMINR) || 0,
      Number(newBid.gstRatePercent) || 0,
      targetRFQ ? targetRFQ.requiredQuantity : 1000
    );
  }, [newBid, targetRFQ]);

  // Filtered Bids
  const filteredBids = useMemo(() => {
    return bids.filter((b) => {
      const matchesRFQ = selectedRFQFilter === "ALL" || b.rfqId === selectedRFQFilter;
      const matchesSearch =
        b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.paymentCreditTerms.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRFQ && matchesSearch;
    });
  }, [bids, selectedRFQFilter, searchQuery]);

  const handleCreateBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRFQ || !targetVendor) return;

    const bid: VendorQuotationBid = {
      id: `bid-${Date.now()}`,
      rfqId: targetRFQ.id,
      rfqNumber: targetRFQ.rfqNumber,
      vendorId: targetVendor.id,
      vendorName: targetVendor.vendorName,
      vendorGstin: targetVendor.gstin,
      quotedDate: new Date().toISOString().split("T")[0],
      validityUntilDate: "2026-03-31",
      baseRateINR: Number(newBid.baseRateINR),
      freightPerUOMINR: Number(newBid.freightPerUOMINR),
      unloadingHandlingPerUOMINR: Number(newBid.unloadingHandlingPerUOMINR),
      subtotalTaxablePerUOMINR: computedLive.taxableSubtotal,
      gstRatePercent: Number(newBid.gstRatePercent),
      gstAmountPerUOMINR: computedLive.gstAmount,
      netLandedRatePerUOMINR: computedLive.landedRate,
      totalLandedContractCostINR: computedLive.totalCost,
      deliveryLeadTimeDays: Number(newBid.deliveryLeadTimeDays),
      paymentCreditTerms: newBid.paymentCreditTerms,
      technicalComplianceConfirmed: newBid.technicalComplianceConfirmed,
      notes: newBid.notes,
    };

    onUpdateBids([...bids, bid]);
    setShowAddBidModal(false);
  };

  const exportBidsCSV = () => {
    const headers = [
      "RFQ Number",
      "Vendor Name",
      "GSTIN",
      "Base Rate",
      "Freight",
      "Handling",
      "GST %",
      "Net Landed Rate",
      "Total Landed Cost",
      "Lead Days",
      "Credit Terms",
      "Technical Compliant",
    ];
    const rows = bids.map((b) => [
      b.rfqNumber,
      `"${b.vendorName}"`,
      b.vendorGstin,
      b.baseRateINR,
      b.freightPerUOMINR,
      b.unloadingHandlingPerUOMINR,
      `${b.gstRatePercent}%`,
      b.netLandedRatePerUOMINR,
      b.totalLandedContractCostINR,
      b.deliveryLeadTimeDays,
      `"${b.paymentCreditTerms}"`,
      b.technicalComplianceConfirmed ? "YES" : "NO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Vendor_Quotation_Bids_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sub-Module 5.3
            </span>
            <span className="text-xs text-slate-500 font-medium">Landed Cost Mathematical Breakdown</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Vendor Quotation Capture & Landed Cost Ledger
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Precision itemization: Base Rate + Freight + Handling + GST Slab = Net Landed Unit Cost.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportBidsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Quotes CSV</span>
          </button>

          <button
            onClick={() => setShowAddBidModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enter Supplier Bid</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, RFQ, or terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter RFQ:</span>
          <select
            value={selectedRFQFilter}
            onChange={(e) => setSelectedRFQFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Requisition Packages ({rfqs.length})</option>
            {rfqs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rfqNumber} — {r.materialName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotation Bids Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Verified Supplier Bids & Landed Breakdown Register
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredBids.length} captured bids
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">RFQ Number</th>
                <th className="py-3 px-4 min-w-[200px]">Vendor & Compliance</th>
                <th className="py-3 px-3 text-right">Base Rate</th>
                <th className="py-3 px-3 text-right">Freight</th>
                <th className="py-3 px-3 text-right">Handling</th>
                <th className="py-3 px-3 text-center">GST Slab</th>
                <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-900">Net Landed Rate</th>
                <th className="py-3 px-4 text-right">Total Landed Cost</th>
                <th className="py-3 px-3 text-center">Lead Days</th>
                <th className="py-3 px-3 min-w-[150px]">Payment Terms</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBids.map((bid) => (
                <tr key={bid.id} className="hover:bg-slate-50/80 transition">
                  {/* RFQ */}
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    {bid.rfqNumber}
                  </td>

                  {/* Vendor Name & GSTIN */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{bid.vendorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">GST: {bid.vendorGstin}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>IS Spec Compliant</span>
                    </div>
                  </td>

                  {/* Base */}
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{bid.baseRateINR.toLocaleString("en-IN")}
                  </td>

                  {/* Freight */}
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    +₹{bid.freightPerUOMINR.toLocaleString("en-IN")}
                  </td>

                  {/* Handling */}
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    +₹{bid.unloadingHandlingPerUOMINR.toLocaleString("en-IN")}
                  </td>

                  {/* GST */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] bg-slate-100 text-slate-700">
                      {bid.gstRatePercent}%
                    </span>
                  </td>

                  {/* Net Landed Rate */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/30">
                    ₹{bid.netLandedRatePerUOMINR.toLocaleString("en-IN")}
                  </td>

                  {/* Total Cost */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45]">
                    ₹{bid.totalLandedContractCostINR.toLocaleString("en-IN")}
                  </td>

                  {/* Lead Days */}
                  <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {bid.deliveryLeadTimeDays} days
                  </td>

                  {/* Credit Terms */}
                  <td className="py-3 px-3 text-slate-700 text-[11px]">
                    {bid.paymentCreditTerms}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-center">
                    {onSelectBidForComparison && (
                      <button
                        onClick={() => onSelectBidForComparison(bid.rfqId)}
                        className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                      >
                        Compare
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ENTER NEW VENDOR BID                                               */}
      {/* ========================================================================= */}
      {showAddBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Capture Supplier Quotation & Landed Cost</h3>
              </div>
              <button
                onClick={() => setShowAddBidModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBid} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target RFQ Package</label>
                  <select
                    value={newBid.rfqId}
                    onChange={(e) => setNewBid({ ...newBid, rfqId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                  >
                    {rfqs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rfqNumber} — {r.materialName} ({r.requiredQuantity} {r.standardUOM})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bidding Supplier</label>
                  <select
                    value={newBid.vendorId}
                    onChange={(e) => setNewBid({ ...newBid, vendorId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendorName} ({v.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate Breakdown Input Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Cost Components per {targetRFQ?.standardUOM || "Unit"}</span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Base Ex-Mill Rate</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newBid.baseRateINR}
                      onChange={(e) => setNewBid({ ...newBid, baseRateINR: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Freight / Transit</label>
                    <input
                      type="number"
                      min={0}
                      value={newBid.freightPerUOMINR}
                      onChange={(e) => setNewBid({ ...newBid, freightPerUOMINR: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">Unload & Stacking</label>
                    <input
                      type="number"
                      min={0}
                      value={newBid.unloadingHandlingPerUOMINR}
                      onChange={(e) => setNewBid({ ...newBid, unloadingHandlingPerUOMINR: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-600 mb-1">GST Slab</label>
                    <select
                      value={newBid.gstRatePercent}
                      onChange={(e) => setNewBid({ ...newBid, gstRatePercent: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono"
                    >
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Steel/Aggregates)</option>
                      <option value={28}>28% GST (Cement)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Calculated Landed Preview Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="text-[11px] text-blue-800">
                      Taxable Subtotal: <strong>₹{computedLive.taxableSubtotal.toFixed(2)}</strong> + GST: <strong>₹{computedLive.gstAmount.toFixed(2)}</strong>
                    </div>
                    <div className="font-bold text-blue-950 text-sm mt-0.5">
                      Net Landed Rate: ₹{computedLive.landedRate.toFixed(2)} / {targetRFQ?.standardUOM}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Outlay ({targetRFQ?.requiredQuantity} {targetRFQ?.standardUOM})</span>
                    <span className="font-mono font-bold text-blue-900 text-base">
                      ₹{computedLive.totalCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Lead Time (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBid.deliveryLeadTimeDays}
                    onChange={(e) => setNewBid({ ...newBid, deliveryLeadTimeDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Payment Terms</label>
                  <input
                    type="text"
                    required
                    value={newBid.paymentCreditTerms}
                    onChange={(e) => setNewBid({ ...newBid, paymentCreditTerms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Delivery Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Ex-Chakan plant, NABL test certificates enclosed..."
                  value={newBid.notes}
                  onChange={(e) => setNewBid({ ...newBid, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBidModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Record Bid & Calculate Landed Cost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

