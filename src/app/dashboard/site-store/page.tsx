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
  ArrowRight,
  Search,
} from "lucide-react";
import {
  getAuthSession,
  clearAuthSession,
  UserProfile,
  getStorePOs,
  receiveGoodsGRN,
  getProcurementReport,
  StoreDispatchedPO,
  GodownStockItem,
} from "@/lib/api";
import CompanySwitcher from "@/components/CompanySwitcher";
import { RoleBadge } from "@/components/RoleGate";

export default function SiteStoreDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projectName, setProjectName] = useState("Commercial Complex - Tower B");

  // Store data
  const [dispatchedPOs, setDispatchedPOs] = useState<StoreDispatchedPO[]>([]);
  const [godownStock, setGodownStock] = useState<GodownStockItem[]>([]);
  const [selectedPO, setSelectedPO] = useState<StoreDispatchedPO | null>(null);

  // GRN Form State
  const [challanNumber, setChallanNumber] = useState("CHAL-2026-0092");
  const [truckNumber, setTruckNumber] = useState("MH-04-AZ-9988");
  const [grossQuantity, setGrossQuantity] = useState<number>(700);
  const [damagedQuantity, setDamagedQuantity] = useState<number>(0);
  const [challanPhotoUrl, setChallanPhotoUrl] = useState("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d");
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
    const pName =
      window.localStorage.getItem("ostaad_operations_project_name") ||
      window.localStorage.getItem("buildbharat_operations_project_name") ||
      "Commercial Complex - Tower B";
    const pId =
      window.localStorage.getItem("ostaad_operations_project_id") ||
      window.localStorage.getItem("buildbharat_operations_project_id") ||
      "proj-demo-101";

    setProjectName(pName);
    loadData(pId);
  }, [router]);

  const loadData = async (projectId: string | null = "proj-demo-101") => {
    try {
      setRefreshing(true);
      const targetId = projectId || "proj-demo-101";
      const [pos, report] = await Promise.all([
        getStorePOs(targetId),
        getProcurementReport(targetId),
      ]);
      setDispatchedPOs(pos);
      if (pos.length > 0 && !selectedPO) {
        setSelectedPO(pos[0]);
        setGrossQuantity(
          pos[0].pending_delivery_quantity > 0
            ? pos[0].pending_delivery_quantity
            : pos[0].ordered_quantity
        );
      }
      if (report && (report.godown_inventory || report.godown_stock)) {
        setGodownStock(report.godown_inventory || report.godown_stock);
      } else {
        setGodownStock([
          {
            material_name: "Ordinary Portland Cement (OPC 53 Grade)",
            current_stock: 1320,
            uom: "Bags",
            last_updated: new Date().toISOString(),
          },
          {
            material_name: "TMT Rebars Fe-550D (16mm & 20mm)",
            current_stock: 45.5,
            uom: "MT",
            last_updated: new Date().toISOString(),
          },
          {
            material_name: "Crushed Sand (M-Sand Zone II)",
            current_stock: 240,
            uom: "cum",
            last_updated: new Date().toISOString(),
          },
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
    setGrossQuantity(
      po.pending_delivery_quantity > 0 ? po.pending_delivery_quantity : po.ordered_quantity
    );
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
        notes: gateNotes,
      });

      setGrnSuccessMsg({
        grn_id: res?.grn?.id || "GRN-" + Date.now().toString().slice(-6),
        challan: challanNumber,
        truck: truckNumber.toUpperCase(),
        net_qty: Math.max(0, Number(grossQuantity) - Number(damagedQuantity || 0)),
        uom: selectedPO.uom,
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
    <div className="min-h-screen bg-[#f4f8fc] text-slate-700 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#122b45]">
                Ostaad <span className="text-amber-600">ERP</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Site Storekeeper Portal
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Physical Inward Verification (GRN), Vehicle Log & Godown Inventory Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <CompanySwitcher />
          <button
            onClick={() => loadData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
              RP
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-800">{user?.full_name || "Ramesh Pawar"}</div>
              <div className="mt-0.5"><RoleBadge role={user?.role || "STORE_MANAGER"} size="sm" /></div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 shadow-sm transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner / Hero */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Gate Delivery Inward & Physical GRN Control
              </span>
              <span className="text-xs text-slate-500 font-mono">Project: {projectName}</span>
            </div>
            <h2 className="text-2xl font-bold text-[#122b45] mt-2">
              Delivery Challan Verification & Live Godown Warehouse Balance
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Inspect physical consignments arriving at site gate, record transporter delivery challan & vehicle registration, deduct burst or damaged bags, and immediately credit verified accepted stock to the godown inventory.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
              <Warehouse className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="text-xs text-slate-500 font-medium">Active Dispatched POs</div>
            <div className="text-2xl font-bold text-[#122b45] mt-1">{dispatchedPOs.length} In Transit</div>
            <div className="text-[11px] text-blue-600 mt-2 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Awaiting site gate delivery</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="text-xs text-slate-500 font-medium">Godown Cement Inventory</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {godownStock.find((i) => i.material_name.toLowerCase().includes("cement"))?.current_stock?.toLocaleString() || "1,320"} Bags
            </div>
            <div className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OPC 53 Grade (UltraTech)</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="text-xs text-slate-500 font-medium">Godown TMT Steel Inventory</div>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {godownStock.find((i) => i.material_name.toLowerCase().includes("steel") || i.material_name.toLowerCase().includes("rebar"))?.current_stock || "45.5"} MT
            </div>
            <div className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5" />
              <span>Fe-550D Primary Steel</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="text-xs text-slate-500 font-medium">Over-Delivery Guard</div>
            <div className="text-2xl font-bold text-[#122b45] mt-1">Max +5% Tolerance</div>
            <div className="text-[11px] text-indigo-600 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
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
                <h3 className="text-base font-bold text-[#122b45] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                  Dispatched Purchase Orders
                </h3>
                <p className="text-xs text-slate-500">Approved by Finance & released to vendor</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                {dispatchedPOs.length} Active
              </span>
            </div>

            {loading ? (
              <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-400 text-xs shadow-sm">
                Loading dispatched POs...
              </div>
            ) : dispatchedPOs.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-xs shadow-sm">
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
                      className={`p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 text-sm">{po.po_number}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Dispatched
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 mt-1">{po.material_name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Vendor: {po.vendor_name}</div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-mono text-slate-600">
                            Ordered: <span className="font-bold text-slate-900">{po.ordered_quantity}</span> {po.uom}
                          </div>
                          <div className="text-[11px] font-mono text-amber-700 mt-1 font-semibold">
                            Pending: <span>{po.pending_delivery_quantity}</span> {po.uom}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">
                          Net Received: <strong className="text-emerald-700">{po.net_received_quantity} {po.uom}</strong>
                        </span>
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isSelected
                              ? "bg-amber-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-[#122b45] flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-amber-600" />
                    Physical Gate Delivery Inward (GRN Entry)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify transporter documents, weighment slip, count physical units, and generate GRN
                  </p>
                </div>
                {selectedPO && (
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                      PO: {selectedPO.po_number}
                    </span>
                  </div>
                )}
              </div>

              {grnSuccessMsg && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-800">
                      Goods Receipt Note ({grnSuccessMsg.grn_id}) Created & Stock Credited!
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      Transporter challan <strong>{grnSuccessMsg.challan}</strong> (Truck: {grnSuccessMsg.truck}) logged. Net verified inventory of <strong>{grnSuccessMsg.net_qty} {grnSuccessMsg.uom}</strong> added to live godown warehouse balance.
                    </p>
                  </div>
                </div>
              )}

              {grnErrorMsg && (
                <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-rose-800">Gate Verification Error</div>
                    <p className="text-slate-600 mt-0.5">{grnErrorMsg}</p>
                  </div>
                </div>
              )}

              {!selectedPO ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Please select an active dispatched purchase order from the left column to begin gate verification.
                </div>
              ) : (
                <form onSubmit={handleRecordGRN} className="space-y-4" suppressHydrationWarning>
                  {/* Selected PO Summary Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Target Material:</span>{" "}
                      <strong className="text-slate-800">{selectedPO.material_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Vendor:</span>{" "}
                      <strong className="text-slate-800">{selectedPO.vendor_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Expected Balance:</span>{" "}
                      <strong className="text-amber-700 font-bold">{selectedPO.pending_delivery_quantity} {selectedPO.uom}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transporter Delivery Challan No. <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        suppressHydrationWarning
                        value={challanNumber}
                        onChange={(e) => setChallanNumber(e.target.value)}
                        placeholder="e.g. CHAL-2026-0092"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Commercial Truck / Vehicle Registration <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        suppressHydrationWarning
                        value={truckNumber}
                        onChange={(e) => setTruckNumber(e.target.value)}
                        placeholder="e.g. MH-04-AZ-9988"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:outline-none focus:border-blue-500 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delivered Gross Quantity ({selectedPO.uom}) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        suppressHydrationWarning
                        value={grossQuantity}
                        onChange={(e) => setGrossQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Damaged / Rejected Units ({selectedPO.uom})
                      </label>
                      <input
                        type="number"
                        step="any"
                        suppressHydrationWarning
                        value={damagedQuantity}
                        onChange={(e) => setDamagedQuantity(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Net Accepted Stock Calculated Card */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-700 font-medium">Net Usable Quantity to Stock in Godown:</span>
                      <p className="text-[11px] text-slate-500">Gross delivered minus rejected / transit damaged units</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg font-extrabold text-emerald-700">
                        {netAcceptedQty.toLocaleString()} {selectedPO.uom}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Physical Challan Photo Proof (S3 / Camera Upload URL)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={challanPhotoUrl}
                        onChange={(e) => setChallanPhotoUrl(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setChallanPhotoUrl(
                            `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d`
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold shadow-sm"
                      >
                        Sample URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gate Weighbridge & Physical Condition Notes
                    </label>
                    <textarea
                      rows={2}
                      value={gateNotes}
                      onChange={(e) => setGateNotes(e.target.value)}
                      placeholder="e.g. Weighbridge slip verified. Batch number stamps inspected on cement bags."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingGRN}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#122b45] flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Live Godown Warehouse Physical Inventory
              </h3>
              <p className="text-xs text-slate-500">
                Synchronized with verified gate inward GRNs and physical store balances
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              ● Live Warehouse Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Material Classification</th>
                  <th className="py-2.5 px-4 font-semibold">Current On-Hand Stock</th>
                  <th className="py-2.5 px-4 font-semibold">Unit of Measure</th>
                  <th className="py-2.5 px-4 font-semibold">Warehouse Status</th>
                  <th className="py-2.5 px-4 font-semibold">Last Inward Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {godownStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>{item.material_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-emerald-700">
                      {item.current_stock?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.uom}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        Adequate Stock
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {item.last_updated
                          ? new Date(item.last_updated).toLocaleString("en-IN")
                          : "Today, 18:30 IST"}
                      </span>
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
