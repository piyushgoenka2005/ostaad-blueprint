"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Download,
  Building,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Clock,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  StockLedgerEntry,
  GodownStorageLocation,
  DEFAULT_STOCK_LEDGER,
  DEFAULT_GODOWNS,
} from "@/lib/site-store-operations";

interface ImmutableStockLedgerProps {
  ledgerEntries: StockLedgerEntry[];
  godowns: GodownStorageLocation[];
  onUpdateLedger: (entries: StockLedgerEntry[]) => void;
}

export default function ImmutableStockLedger({
  ledgerEntries,
  godowns,
  onUpdateLedger,
}: ImmutableStockLedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [movementFilter, setMovementFilter] = useState<string>("ALL");
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Transfer Form State
  const [transferState, setTransferState] = useState({
    fromGodownId: godowns[0]?.id || "gdn-01",
    toGodownId: godowns[1]?.id || "gdn-02",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    quantity: 100,
    standardUOM: "50kg Bags",
    transferReason: "Inter-site staging transfer for morning shift concreting",
  });

  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((e) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        e.materialName.toLowerCase().includes(q) ||
        e.godownName.toLowerCase().includes(q) ||
        e.referenceDocNumber.toLowerCase().includes(q) ||
        e.recipientOrTransporter.toLowerCase().includes(q);
      const matchesMovement = movementFilter === "ALL" || e.movementType === movementFilter;
      return matchesSearch && matchesMovement;
    });
  }, [ledgerEntries, searchQuery, movementFilter]);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceGdn = godowns.find((g) => g.id === transferState.fromGodownId);
    const destGdn = godowns.find((g) => g.id === transferState.toGodownId);
    if (!sourceGdn || !destGdn) return;

    const newEntries: StockLedgerEntry[] = [
      {
        id: `stk-${Date.now()}-out`,
        timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        movementType: "TRANSFER_BETWEEN_GODOWNS",
        materialName: transferState.materialName,
        godownName: sourceGdn.name,
        quantityIn: 0,
        quantityOut: Number(transferState.quantity),
        balanceQuantityAfter: Math.max(0, sourceGdn.currentStockQuantity - Number(transferState.quantity)),
        standardUOM: transferState.standardUOM,
        referenceDocNumber: `TRF-${Date.now().toString().slice(-4)}`,
        recipientOrTransporter: `Internal Transfer to ${destGdn.name}`,
        operatorStorekeeper: "Mahesh Patil (Storekeeper)",
      },
      {
        id: `stk-${Date.now()}-in`,
        timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        movementType: "TRANSFER_BETWEEN_GODOWNS",
        materialName: transferState.materialName,
        godownName: destGdn.name,
        quantityIn: Number(transferState.quantity),
        quantityOut: 0,
        balanceQuantityAfter: destGdn.currentStockQuantity + Number(transferState.quantity),
        standardUOM: transferState.standardUOM,
        referenceDocNumber: `TRF-${Date.now().toString().slice(-4)}`,
        recipientOrTransporter: `Received from ${sourceGdn.name}`,
        operatorStorekeeper: "Mahesh Patil (Storekeeper)",
      },
    ];

    onUpdateLedger([...newEntries, ...ledgerEntries]);
    setShowTransferModal(false);
  };

  const exportLedgerCSV = () => {
    const headers = [
      "Timestamp",
      "Movement Type",
      "Material Name",
      "Godown Location",
      "Quantity In",
      "Quantity Out",
      "Balance After",
      "UOM",
      "Reference Doc",
      "Recipient / Transporter",
      "Operator",
    ];
    const rows = ledgerEntries.map((e) => [
      e.timestamp,
      e.movementType,
      `"${e.materialName}"`,
      `"${e.godownName}"`,
      e.quantityIn,
      e.quantityOut,
      e.balanceQuantityAfter,
      e.standardUOM,
      e.referenceDocNumber,
      `"${e.recipientOrTransporter}"`,
      `"${e.operatorStorekeeper}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Immutable_Stock_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              Sub-Module 7.4
            </span>
            <span className="text-xs text-slate-500 font-medium">Double-Entry Immutable Audit Register</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Double-Entry Warehouse Stock Ledger & Inventory Log
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Immutable perpetual inventory journal: Inwards, contractor issues, transfers, and real-time live godown balance verification.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportLedgerCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Ledger CSV</span>
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Inter-Godown Transfer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, doc ref, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Movements</option>
            <option value="INWARD_GRN">Inward GRN Only</option>
            <option value="ISSUE_TO_CONTRACTOR">Contractor Issue Only</option>
            <option value="TRANSFER_BETWEEN_GODOWNS">Inter-Godown Transfers</option>
          </select>
        </div>
      </div>

      {/* Stock Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-36">Timestamp</th>
                <th className="py-3 px-3 w-32">Movement Type</th>
                <th className="py-3 px-4 min-w-[200px]">Material & Storage Shed</th>
                <th className="py-3 px-3 w-28 text-right text-emerald-700">Quantity In (+)</th>
                <th className="py-3 px-3 w-28 text-right text-rose-700">Quantity Out (-)</th>
                <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">Balance After</th>
                <th className="py-3 px-3 w-28">Ref Document</th>
                <th className="py-3 px-4 min-w-[200px]">Recipient / Transporter</th>
                <th className="py-3 px-3 w-32">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                    {entry.timestamp}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.movementType === "INWARD_GRN"
                          ? "bg-emerald-100 text-emerald-800"
                          : entry.movementType === "ISSUE_TO_CONTRACTOR"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {entry.movementType.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{entry.materialName}</div>
                    <div className="text-[11px] text-slate-500">{entry.godownName}</div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                    {entry.quantityIn > 0 ? `+${entry.quantityIn.toLocaleString("en-IN")}` : "—"}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                    {entry.quantityOut > 0 ? `-${entry.quantityOut.toLocaleString("en-IN")}` : "—"}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45] text-sm bg-blue-50/30">
                    {entry.balanceQuantityAfter.toLocaleString("en-IN")} {entry.standardUOM}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    {entry.referenceDocNumber}
                  </td>

                  <td className="py-3 px-4 text-slate-700 text-[11px]">
                    {entry.recipientOrTransporter}
                  </td>

                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {entry.operatorStorekeeper}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: INTER-GODOWN TRANSFER                                              */}
      {/* ========================================================================= */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Record Inter-Godown Internal Transfer</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Source Godown (Debited)</label>
                  <select
                    value={transferState.fromGodownId}
                    onChange={(e) => setTransferState({ ...transferState, fromGodownId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Godown (Credited)</label>
                  <select
                    value={transferState.toGodownId}
                    onChange={(e) => setTransferState({ ...transferState, toGodownId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  value={transferState.materialName}
                  onChange={(e) => setTransferState({ ...transferState, materialName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transfer Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={transferState.quantity}
                    onChange={(e) => setTransferState({ ...transferState, quantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={transferState.standardUOM}
                    onChange={(e) => setTransferState({ ...transferState, standardUOM: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal Transfer Justification</label>
                <input
                  type="text"
                  required
                  value={transferState.transferReason}
                  onChange={(e) => setTransferState({ ...transferState, transferReason: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Execute Double-Entry Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
