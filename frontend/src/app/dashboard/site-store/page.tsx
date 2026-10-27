"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Warehouse,
  LogOut,
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight
} from "lucide-react";
import {
  getAuthSession,
  clearAuthSession,
  UserProfile,
  getStorePOs,
  receiveGoodsGRN,
  getProcurementReport,
  StoreDispatchedPO,
  GodownStockItem
} from "@/lib/api";

export default function SiteStoreDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Store data
  const [dispatchedPOs, setDispatchedPOs] = useState<StoreDispatchedPO[]>([]);
  const [godownStock, setGodownStock] = useState<GodownStockItem[]>([]);
  const [selectedPO, setSelectedPO] = useState<StoreDispatchedPO | null>(null);

  // GRN Form State
  const [challanNumber, setChallanNumber] = useState("CHAL-2026-0092");
  const [truckNumber, setTruckNumber] = useState("MH-04-AZ-9988");
  const [grossQuantity, setGrossQuantity] = useState<number>(700);
  const [damagedQuantity, setDamagedQuantity] = useState<number>(0);
  const [challanPhotoUrl, setChallanPhotoUrl] = useState("https://s3.ap-south-1.amazonaws.com/erp-docs/chal-0092.jpg");
  const [gateNotes, setGateNotes] = useState("Truck weighed at site weighbridge. Seals verified intact before unloading.");
  const [submittingGRN, setSubmittingGRN] = useState(false);
  const [grnSuccessMsg, setGrnSuccessMsg] = useState<{
    grn_id: string;
    challan: string;
    truck: string;
    net_qty: number;
    uom: string;
  } | null>(null);
  const [grnErrorMsg, setGrnErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const { token, user: activeUser } = getAuthSession();
    if (!token || !activeUser) {
      router.push("/login");
      return;
    }
    setUser(activeUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [pos, report] = await Promise.all([
        getStorePOs("proj-demo-101"),
        getProcurementReport("proj-demo-101")
      ]);
      setDispatchedPOs(pos);
      if (pos.length > 0 && !selectedPO) {
        setSelectedPO(pos[0]);
        setGrossQuantity(pos[0].pending_delivery_quantity > 0 ? pos[0].pending_delivery_quantity : pos[0].ordered_quantity);
      }
      if (report && (report.godown_inventory || report.godown_stock)) {
        setGodownStock(report.godown_inventory || report.godown_stock);
      } else {
        // Fallback default godown items
        setGodownStock([
          { material_name: "OPC 53 Grade Cement", current_stock: 1320, uom: "Bags" },
          { material_name: "Fe550D TMT Rebar (12mm-25mm)", current_stock: 45.5, uom: "MT" },
          { material_name: "Washed River Sand (Zone II)", current_stock: 110, uom: "MT" },
          { material_name: "Crushed Granite Aggregate 20mm", current_stock: 180, uom: "MT" }
        ]);
      }
    } catch (err: any) {
      console.error("Failed to load storekeeper data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectPO = (po: StoreDispatchedPO) => {
    setSelectedPO(po);
    setGrossQuantity(po.pending_delivery_quantity > 0 ? po.pending_delivery_quantity : po.ordered_quantity);
    setDamagedQuantity(0);
    setGrnSuccessMsg(null);
    setGrnErrorMsg(null);
  };

  const handleRecordGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) {
      setGrnErrorMsg("Please select a dispatched Purchase Order first.");
      return;
    }
    if (grossQuantity <= 0) {
      setGrnErrorMsg("Delivered gross quantity must be greater than zero.");
      return;
    }

    try {
      setSubmittingGRN(true);
      setGrnErrorMsg(null);
      setGrnSuccessMsg(null);

      const res = await receiveGoodsGRN({
        po_id: selectedPO.id,
        storekeeper_id: user?.id || "user-store-01",
        challan_number: challanNumber,
        truck_number: truckNumber,
        received_quantity: Number(grossQuantity),
        damaged_quantity: Number(damagedQuantity || 0),
        challan_photo_url: challanPhotoUrl,
        notes: gateNotes
      });

      setGrnSuccessMsg({
        grn_id: res.grn_id || "GRN-" + Date.now().toString().slice(-6),
        challan: challanNumber,
        truck: truckNumber.toUpperCase(),
        net_qty: Math.max(0, Number(grossQuantity) - Number(damagedQuantity || 0)),
        uom: selectedPO.uom
      });

      // Reload store POs and live stock report
      await loadData();
    } catch (err: any) {
      setGrnErrorMsg(err.message || "Failed to record GRN inward.");
    } finally {
      setSubmittingGRN(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const netAcceptedQty = Math.max(0, (grossQuantity || 0) - (damagedQuantity || 0));

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Site Storekeeper Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Physical Inward Verification (GRN), Vehicle Log & Godown Inventory Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              RP
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Ramesh Pawar"}</div>
              <div className="text-[10px] text-slate-400">Site Storekeeper (Godown)</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner / Hero */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Gate Delivery Inward & Physical GRN Control
              </span>
              <span className="text-xs text-slate-400 font-mono">Project: Shivaji Nagar Metro Viaduct (proj-demo-101)</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              Delivery Challan Verification & Live Godown Warehouse Balance
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Inspect physical consignments arriving at site gate, record transporter delivery challan & vehicle registration, deduct burst or damaged bags, and immediately credit verified accepted stock to the godown inventory.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Warehouse className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-medium">Active Dispatched POs</div>
            <div className="text-2xl font-bold text-white mt-1">{dispatchedPOs.length} In Transit</div>
            <div className="text-[11px] text-sky-400 mt-2 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              <span>Awaiting site gate delivery</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-medium">Godown Cement Inventory</div>
            <div className="text-2xl font-bold text-white mt-1">
              {godownStock.find(i => i.material_name.toLowerCase().includes("cement"))?.current_stock?.toLocaleString() || "1,320"} Bags
            </div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>OPC 53 Grade (Ultratech)</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-medium">Godown TMT Steel Inventory</div>
            <div className="text-2xl font-bold text-white mt-1">
              {godownStock.find(i => i.material_name.toLowerCase().includes("steel") || i.material_name.toLowerCase().includes("rebar"))?.current_stock || "45.5"} MT
            </div>
            <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
              <Boxes className="w-3 h-3" />
              <span>Fe550D Primary Steel</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-medium">Over-Delivery Guard</div>
            <div className="text-2xl font-bold text-white mt-1">Max +5% Tolerance</div>
            <div className="text-[11px] text-purple-400 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Enforced by ERP rules</span>
            </div>
          </div>
        </div>

        {/* 2-Column Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dispatched POs Table (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Dispatched Purchase Orders
                </h3>
                <p className="text-xs text-slate-400">Approved by Finance & released to vendor</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                {dispatchedPOs.length} Active
              </span>
            </div>

            {loading ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/10 text-center text-slate-400 text-xs">
                Loading dispatched POs...
              </div>
            ) : dispatchedPOs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/10 text-center text-slate-400 text-xs">
                No active dispatched POs found. Proposals must be approved by Finance before gate inward.
              </div>
            ) : (
              <div className="space-y-3">
                {dispatchedPOs.map((po) => {
                  const isSelected = selectedPO?.id === po.id;
                  return (
                    <div
                      key={po.id}
                      onClick={() => handleSelectPO(po)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                          : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">{po.po_number}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Dispatched
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-200 mt-1">{po.material_name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Vendor: {po.vendor_name}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-mono text-slate-300">
                            Ordered: <span className="font-bold text-white">{po.ordered_quantity}</span> {po.uom}
                          </div>
                          <div className="text-[11px] font-mono text-amber-400 mt-1">
                            Pending: <span className="font-bold">{po.pending_delivery_quantity}</span> {po.uom}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          Net Received: <strong className="text-emerald-400">{po.net_received_quantity} {po.uom}</strong>
                        </span>
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            isSelected
                              ? "bg-amber-500 text-slate-950 font-bold"
                              : "bg-white/5 hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          {isSelected ? "Selected for Gate Inward" : "Select PO"}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Physical Gate Inward (GRN) Form (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-amber-400" />
                    Physical Gate Delivery Inward (GRN Entry)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify transporter documents, weighment slip, count physical bags, and generate GRN
                  </p>
                </div>
                {selectedPO && (
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      PO: {selectedPO.po_number}
                    </span>
                  </div>
                )}
              </div>

              {grnSuccessMsg && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300">
                      Goods Receipt Note ({grnSuccessMsg.grn_id}) Created & Stock Credited!
                    </div>
                    <p className="text-slate-300 mt-0.5">
                      Transporter challan <strong>{grnSuccessMsg.challan}</strong> (Truck: {grnSuccessMsg.truck}) logged. Net verified inventory of <strong>{grnSuccessMsg.net_qty} {grnSuccessMsg.uom}</strong> added to live godown warehouse balance.
                    </p>
                  </div>
                </div>
              )}

              {grnErrorMsg && (
                <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-rose-300">Gate Verification Error</div>
                    <p className="text-slate-300 mt-0.5">{grnErrorMsg}</p>
                  </div>
                </div>
              )}

              {!selectedPO ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Please select an active dispatched purchase order from the left column to begin gate verification.
                </div>
              ) : (
                <form onSubmit={handleRecordGRN} className="space-y-4">
                  {/* Selected PO Summary Bar */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Target Material:</span>{" "}
                      <strong className="text-white">{selectedPO.material_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Vendor:</span>{" "}
                      <strong className="text-white">{selectedPO.vendor_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Expected Balance:</span>{" "}
                      <strong className="text-amber-400">{selectedPO.pending_delivery_quantity} {selectedPO.uom}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Transporter Delivery Challan No. <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={challanNumber}
                        onChange={(e) => setChallanNumber(e.target.value)}
                        placeholder="e.g. CHAL-2026-0092"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Commercial Truck / Vehicle Registration <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        placeholder="e.g. MH-04-AZ-9988"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Delivered Gross Quantity ({selectedPO.uom}) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={grossQuantity}
                        onChange={(e) => setGrossQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Damaged / Burst Bags ({selectedPO.uom})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={damagedQuantity}
                        onChange={(e) => setDamagedQuantity(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-rose-500/50"
                      />
                    </div>
                  </div>

                  {/* Net Accepted Stock Calculated Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300">Net Usable Quantity to Stock in Godown:</span>
                      <p className="text-[11px] text-slate-400">Gross delivered minus rejected / transit damaged units</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg font-extrabold text-emerald-400">
                        {netAcceptedQty.toLocaleString()} {selectedPO.uom}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Physical Challan Photo Proof (S3 / Camera Upload URL)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={challanPhotoUrl}
                        onChange={(e) => setChallanPhotoUrl(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setChallanPhotoUrl(`https://s3.ap-south-1.amazonaws.com/erp-docs/chal-${Date.now().toString().slice(-4)}.jpg`)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium"
                      >
                        Sample URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Gate Weighbridge & Physical Condition Notes
                    </label>
                    <textarea
                      rows={2}
                      value={gateNotes}
                      onChange={(e) => setGateNotes(e.target.value)}
                      placeholder="e.g. Weighbridge slip verified. Batch number stamps inspected on cement bags."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingGRN}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {submittingGRN ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Recording Inward & Updating Godown Stock...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="w-4 h-4" />
                          <span>Verify & Submit Physical GRN ({netAcceptedQty} {selectedPO.uom})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Godown Warehouse Stock Registry */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-400" />
                Live Godown Warehouse Physical Inventory
              </h3>
              <p className="text-xs text-slate-400">
                Synchronized with verified gate inward GRNs and physical store balances
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ● Live Warehouse Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Material Classification</th>
                  <th className="py-2.5 px-4 font-semibold">Current On-Hand Stock</th>
                  <th className="py-2.5 px-4 font-semibold">Unit of Measure</th>
                  <th className="py-2.5 px-4 font-semibold">Warehouse Status</th>
                  <th className="py-2.5 px-4 font-semibold">Last Inward Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {godownStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      <span>{item.material_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-emerald-400">
                      {item.current_stock?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {item.uom}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Adequate Stock
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{item.last_updated ? new Date(item.last_updated).toLocaleString("en-IN") : "Today, 18:30 IST"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
