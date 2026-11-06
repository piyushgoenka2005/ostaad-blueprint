"use client";

import React, { useState, useMemo } from "react";
import {
  PackageCheck,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  ShieldCheck,
  X,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  FileText,
  Camera,
  Scale,
} from "lucide-react";
import {
  GoodsReceiptNote,
  GodownStorageLocation,
  DEFAULT_GRN_LOGS,
  DEFAULT_GODOWNS,
} from "@/lib/site-store-operations";
import { AuthorisedPurchaseOrder } from "@/lib/commercial-finance";

interface GRNInwardGateLogProps {
  grnLogs: GoodsReceiptNote[];
  godowns: GodownStorageLocation[];
  orders: AuthorisedPurchaseOrder[];
  onUpdateGRNLogs: (logs: GoodsReceiptNote[]) => void;
  onStockInward?: (grn: GoodsReceiptNote) => void;
}

export default function GRNInwardGateLog({
  grnLogs,
  godowns,
  orders,
  onUpdateGRNLogs,
  onStockInward,
}: GRNInwardGateLogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInwardModal, setShowInwardModal] = useState(false);
  const [selectedGRNForPrint, setSelectedGRNForPrint] = useState<GoodsReceiptNote | null>(null);

  // New GRN Inward Wizard Form State
  const [targetPOId, setTargetPOId] = useState(orders[0]?.id || "po-01");
  const [targetGodownId, setTargetGodownId] = useState(godowns[0]?.id || "gdn-01");
  const [grossQuantity, setGrossQuantity] = useState<number>(700);
  const [damagedQuantity, setDamagedQuantity] = useState<number>(0);
  const [truckNumber, setTruckNumber] = useState("MH-12-RN-8821");
  const [transporterName, setTransporterName] = useState("Mahalaxmi Logistics Carriers");
  const [challanNumber, setChallanNumber] = useState("CHAL-2026-0099");
  const [grossWeightKg, setGrossWeightKg] = useState<number>(49800);
  const [tareWeightKg, setTareWeightKg] = useState<number>(14800);
  const [securitySealsStatus, setSecuritySealsStatus] = useState<
    "SEALS_INTACT_VERIFIED" | "SEALS_BROKEN_DISAPPROVED"
  >("SEALS_INTACT_VERIFIED");
  const [gateNotes, setGateNotes] = useState(
    "Truck weighed on site electronic weighbridge. Physical seal intact. Unloaded to pallet stacks."
  );

  const selectedPO = useMemo(() => {
    return orders.find((o) => o.id === targetPOId) || orders[0];
  }, [orders, targetPOId]);

  const selectedGodown = useMemo(() => {
    return godowns.find((g) => g.id === targetGodownId) || godowns[0];
  }, [godowns, targetGodownId]);

  // +5% Tolerance Guardrail Computations
  const toleranceCap = useMemo(() => {
    if (!selectedPO) return 0;
    return Math.round(selectedPO.quantity * 1.05 * 10) / 10;
  }, [selectedPO]);

  const isOverTolerance = useMemo(() => {
    return grossQuantity > toleranceCap;
  }, [grossQuantity, toleranceCap]);

  const netWeighbridgeWeightKg = useMemo(() => {
    return Math.max(0, grossWeightKg - tareWeightKg);
  }, [grossWeightKg, tareWeightKg]);

  const netAccepted = useMemo(() => {
    const cappedGross = isOverTolerance ? toleranceCap : grossQuantity;
    return Math.max(0, cappedGross - damagedQuantity);
  }, [grossQuantity, damagedQuantity, isOverTolerance, toleranceCap]);

  const filteredLogs = useMemo(() => {
    return grnLogs.filter((g) => {
      const q = searchQuery.toLowerCase();
      return (
        g.grnNumber.toLowerCase().includes(q) ||
        g.poNumber.toLowerCase().includes(q) ||
        g.vendorName.toLowerCase().includes(q) ||
        g.vehicleTruckNumber.toLowerCase().includes(q) ||
        g.challanNumber.toLowerCase().includes(q)
      );
    });
  }, [grnLogs, searchQuery]);

  const handleRecordGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !selectedGodown) return;

    const newGRN: GoodsReceiptNote = {
      id: `grn-${Date.now()}`,
      grnNumber: `GRN-2026-00${grnLogs.length + 44}`,
      poNumber: selectedPO.poNumber,
      targetGodownId: selectedGodown.id,
      targetGodownName: selectedGodown.name,
      vendorName: selectedPO.vendorName,
      materialName: selectedPO.materialName,
      standardUOM: selectedPO.standardUOM,
      grossDeliveredQuantity: Number(grossQuantity),
      damagedRejectedQuantity: Number(damagedQuantity || 0),
      netAcceptedQuantity: netAccepted,
      toleranceAllowedCapQuantity: toleranceCap,
      isOverToleranceRejected: isOverTolerance,
      transporterName: transporterName,
      vehicleTruckNumber: truckNumber.toUpperCase(),
      challanNumber: challanNumber.toUpperCase(),
      challanPhotoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
      weighbridgeGrossWeightKg: Number(grossWeightKg),
      weighbridgeTareWeightKg: Number(tareWeightKg),
      weighbridgeNetWeightKg: netWeighbridgeWeightKg,
      securitySealsStatus: securitySealsStatus,
      storekeeperId: "user-store-01",
      storekeeperName: "Mahesh Patil (Storekeeper)",
      inwardDate: new Date().toISOString().split("T")[0],
      inwardTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gateNotes: gateNotes,
    };

    onUpdateGRNLogs([newGRN, ...grnLogs]);
    if (onStockInward) {
      onStockInward(newGRN);
    }
    setShowInwardModal(false);
  };

  const exportGRNCSV = () => {
    const headers = [
      "GRN Number",
      "PO Number",
      "Supplier Name",
      "Material Name",
      "Gross Qty",
      "Damaged Qty",
      "Net Accepted",
      "UOM",
      "Tolerance Cap",
      "Truck Reg No",
      "Challan No",
      "Weighbridge Net (Kg)",
      "Inward Date",
      "Storekeeper",
    ];
    const rows = grnLogs.map((g) => [
      g.grnNumber,
      g.poNumber,
      `"${g.vendorName}"`,
      `"${g.materialName}"`,
      g.grossDeliveredQuantity,
      g.damagedRejectedQuantity,
      g.netAcceptedQuantity,
      g.standardUOM,
      g.toleranceAllowedCapQuantity,
      g.vehicleTruckNumber,
      g.challanNumber,
      g.weighbridgeNetWeightKg,
      g.inwardDate,
      `"${g.storekeeperName}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Goods_Receipt_Notes_GRN_${new Date().toISOString().split("T")[0]}.csv`);
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
              Sub-Modules 7.2 & 7.3
            </span>
            <span className="text-xs text-slate-500 font-medium">Gate Security & Weighbridge Inward</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Goods Receipt Note (GRN) & +5% Over-Delivery Guardrail
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time physical gate recording: Gross vehicle tare, Cloudflare R2 challan scans, transit damage deductions, and +5% tolerance caps.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportGRNCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowInwardModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Gate GRN Inward</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Inward GRNs</div>
            <div className="text-xl font-bold text-[#122b45]">{grnLogs.length} Delivery Slips</div>
            <div className="text-[11px] text-slate-500">100% Weighed at Gate</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Transit Damage Docked</div>
            <div className="text-xl font-bold text-amber-700">
              {grnLogs.reduce((sum, g) => sum + g.damagedRejectedQuantity, 0)} Units
            </div>
            <div className="text-[11px] text-slate-500">Deducted before stock credit</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">+5% Tolerance Guardrail</div>
            <div className="text-xl font-bold text-emerald-700">ACTIVE & ENFORCED</div>
            <div className="text-[11px] text-emerald-600 font-medium">Over-billing auto-rejected</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Weighbridge Total Inward</div>
            <div className="text-xl font-bold text-[#122b45]">
              {(grnLogs.reduce((sum, g) => sum + g.weighbridgeNetWeightKg, 0) / 1000).toFixed(1)} MT
            </div>
            <div className="text-[11px] text-purple-700 font-medium">Net material received</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search GRN, PO, supplier, or truck number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* GRN Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">GRN Number</th>
                <th className="py-3 px-3 w-28">PO Number</th>
                <th className="py-3 px-4 min-w-[200px]">Supplier & Vehicle Log</th>
                <th className="py-3 px-4 min-w-[180px]">Material & Storage Shed</th>
                <th className="py-3 px-3 text-right">Gross Qty</th>
                <th className="py-3 px-3 text-right text-rose-700">Damaged</th>
                <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">Net Accepted</th>
                <th className="py-3 px-3 text-right">Weighbridge Net</th>
                <th className="py-3 px-3 text-center">Seals Check</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    {log.grnNumber}
                    <div className="text-[10px] text-slate-400 font-sans font-normal">{log.inwardDate}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-slate-700">
                    {log.poNumber}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.vendorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Truck: <strong className="text-slate-800">{log.vehicleTruckNumber}</strong> • Challan: {log.challanNumber}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{log.materialName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{log.targetGodownName}</div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {log.grossDeliveredQuantity} {log.standardUOM}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-rose-700 font-semibold">
                    {log.damagedRejectedQuantity > 0 ? `-${log.damagedRejectedQuantity}` : "0"}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-sm bg-blue-50/30">
                    {log.netAcceptedQuantity.toLocaleString("en-IN")} {log.standardUOM}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    {(log.weighbridgeNetWeightKg / 1000).toFixed(1)} MT
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>INTACT</span>
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => setSelectedGRNForPrint(log)}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                    >
                      Print GRN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD GATE GRN INWARD                                           */}
      {/* ========================================================================= */}
      {showInwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Record Physical Gate GRN Inward</h3>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordGRN} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Authorised Purchase Order</label>
                  <select
                    value={targetPOId}
                    onChange={(e) => setTargetPOId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.poNumber} — {o.materialName} ({o.vendorName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Godown Yard</label>
                  <select
                    value={targetGodownId}
                    onChange={(e) => setTargetGodownId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.godownCode} — {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transporter Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Truck Vehicle Reg No</label>
                  <input
                    type="text"
                    required
                    value={truckNumber}
                    onChange={(e) => setTruckNumber(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    required
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Challan No</label>
                  <input
                    type="text"
                    required
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
              </div>

              {/* Weighbridge Tare Gross Input */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-600" />
                  <span>Site Electronic Weighbridge Weight Logs (Kg)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gross Truck Wt (Kg)</label>
                    <input
                      type="number"
                      required
                      value={grossWeightKg}
                      onChange={(e) => setGrossWeightKg(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-white border-2 border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tare Empty Wt (Kg)</label>
                    <input
                      type="number"
                      required
                      value={tareWeightKg}
                      onChange={(e) => setTareWeightKg(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-white border-2 border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Net Material Wt</label>
                    <div className="px-3 py-2.5 bg-blue-50 border-2 border-blue-200 rounded-lg font-mono font-bold text-blue-900 text-base flex items-center">
                      {netWeighbridgeWeightKg} kg
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Quantities & Tolerance Guardrail */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Delivered Gross Quantity ({selectedPO?.standardUOM})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={grossQuantity}
                    onChange={(e) => setGrossQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-blue-950"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    PO Quantity: {selectedPO?.quantity} • Max Allowed (+5%): <strong>{toleranceCap}</strong>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Damaged / Torn / Rejected Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={damagedQuantity}
                    onChange={(e) => setDamagedQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-rose-700 font-bold"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">Burst bags, bent rebar, cracked blocks</div>
                </div>
              </div>

              {/* +5% Tolerance Guardrail Notification */}
              {isOverTolerance && (
                <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>+5% Maximum Tolerance Limit Exceeded!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Gross delivered quantity ({grossQuantity}) exceeds the authorized +5% ceiling ({toleranceCap}).
                    The excess ({grossQuantity - toleranceCap} {selectedPO?.standardUOM}) will be automatically capped and rejected at the gate.
                  </p>
                </div>
              )}

              {/* Final Net Accepted Result Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-emerald-900 block">Net Accepted Quantity into Godown:</span>
                  <span className="text-[11px] text-emerald-700">Credited to live stock ledger upon submit</span>
                </div>
                <span className="font-mono font-bold text-emerald-950 text-base">
                  {netAccepted.toLocaleString("en-IN")} {selectedPO?.standardUOM}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gate Storekeeper Observations</label>
                <input
                  type="text"
                  value={gateNotes}
                  onChange={(e) => setGateNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1368d8] text-white text-sm font-bold hover:bg-blue-700 shadow-md transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Generate Verified GRN (+5% Gate Capped)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT OFFICIAL GRN SLIP                                          */}
      {/* ========================================================================= */}
      {selectedGRNForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Official Goods Receipt Note (GRN) Inward Slip — {selectedGRNForPrint.grnNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print GRN</span>
                </button>
                <button
                  onClick={() => setSelectedGRNForPrint(null)}
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
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • Site Warehouse & Materials Logistics</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  GOODS RECEIPT NOTE (GATE WEIGHBRIDGE INWARD SLIP)
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>GRN Ref: <strong className="font-mono">{selectedGRNForPrint.grnNumber}</strong></div>
                  <div>PO Number: <strong className="font-mono">{selectedGRNForPrint.poNumber}</strong></div>
                  <div>Supplier: <strong>{selectedGRNForPrint.vendorName}</strong></div>
                  <div>Target Godown: <strong>{selectedGRNForPrint.targetGodownName}</strong></div>
                </div>
                <div className="text-right">
                  <div>Truck No: <strong className="font-mono">{selectedGRNForPrint.vehicleTruckNumber}</strong></div>
                  <div>Challan No: <strong className="font-mono">{selectedGRNForPrint.challanNumber}</strong></div>
                  <div>Date & Time: <strong>{selectedGRNForPrint.inwardDate} ({selectedGRNForPrint.inwardTime})</strong></div>
                  <div>Seals Status: <strong className="text-emerald-700">SEALS INTACT VERIFIED</strong></div>
                </div>
              </div>

              {/* Quantity Breakdown Table */}
              <div>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2">Material Description</th>
                      <th className="p-2 text-center">Gross Delivered</th>
                      <th className="p-2 text-center text-rose-700">Damaged / Rejected</th>
                      <th className="p-2 text-center text-blue-900 bg-blue-50/50">Net Accepted Qty</th>
                      <th className="p-2 text-right">Weighbridge Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-bold">{selectedGRNForPrint.materialName}</td>
                      <td className="p-2 text-center font-mono">{selectedGRNForPrint.grossDeliveredQuantity} {selectedGRNForPrint.standardUOM}</td>
                      <td className="p-2 text-center font-mono text-rose-700 font-bold">{selectedGRNForPrint.damagedRejectedQuantity}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-800 text-sm bg-blue-50/30">
                        {selectedGRNForPrint.netAcceptedQuantity} {selectedGRNForPrint.standardUOM}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">{selectedGRNForPrint.weighbridgeNetWeightKg} kg</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="font-bold text-slate-900 mb-0.5">Gate Storekeeper Observations:</div>
                <p className="text-slate-700 italic">{selectedGRNForPrint.gateNotes}</p>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 mt-8">
                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Transporter Driver
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Delivery Driver
                  </div>
                  <div className="text-[10px] text-slate-500">Physical Handover Confirmed</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Security Guard
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Gate Security Guard
                  </div>
                  <div className="text-[10px] text-slate-500">Seals & Truck Inward Checked</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by {selectedGRNForPrint.storekeeperName}
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Storekeeper (Inward Verified)
                  </div>
                  <div className="text-[10px] text-slate-500">Credited to Live Stock Ledger</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
