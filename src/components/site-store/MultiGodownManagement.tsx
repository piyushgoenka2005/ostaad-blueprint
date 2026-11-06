"use client";

import React, { useState, useMemo } from "react";
import {
  Warehouse,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Download,
  Building2,
  Truck,
  Layers,
  MapPin,
  Phone,
  User,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  GodownStorageLocation,
  DEFAULT_GODOWNS,
} from "@/lib/site-store-operations";

interface MultiGodownManagementProps {
  godowns: GodownStorageLocation[];
  onUpdateGodowns: (godowns: GodownStorageLocation[]) => void;
}

export default function MultiGodownManagement({
  godowns,
  onUpdateGodowns,
}: MultiGodownManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Godown Form State
  const [newGodown, setNewGodown] = useState<Partial<GodownStorageLocation>>({
    godownCode: `GDN-MEP-0${godowns.length + 1}`,
    name: "MEP Conduit & Fittings Store",
    category: "MEP_FITTING_GODOWN",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    physicalLocation: "Basement 1 Secure Storage Bay B-12",
    maxCapacityQuantity: 10000,
    capacityUOM: "rmt",
    currentStockQuantity: 1500,
    storekeeperName: "Mahesh Patil (Storekeeper)",
    storekeeperPhone: "+91 98221 44021",
    status: "ACTIVE",
  });

  const filteredGodowns = useMemo(() => {
    return godowns.filter((g) => {
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.godownCode.toLowerCase().includes(q) ||
        g.physicalLocation.toLowerCase().includes(q)
      );
    });
  }, [godowns, searchQuery]);

  const handleAddGodown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGodown.name || !newGodown.maxCapacityQuantity) return;

    const maxCap = Number(newGodown.maxCapacityQuantity);
    const curr = Number(newGodown.currentStockQuantity || 0);
    const util = Math.round((curr / maxCap) * 1000) / 10;

    const created: GodownStorageLocation = {
      id: `gdn-${Date.now()}`,
      godownCode: newGodown.godownCode || `GDN-0${godowns.length + 1}`,
      name: newGodown.name,
      category: newGodown.category || "CEMENT_SHED",
      projectCode: "PRJ-PUN-2026-TWR-B",
      projectName: "Commercial Complex — Tower B",
      physicalLocation: newGodown.physicalLocation || "Site Perimeter",
      maxCapacityQuantity: maxCap,
      capacityUOM: newGodown.capacityUOM || "Units",
      currentStockQuantity: curr,
      utilizationPercent: util,
      storekeeperName: newGodown.storekeeperName || "Mahesh Patil",
      storekeeperPhone: newGodown.storekeeperPhone || "+91 98221 44021",
      status: "ACTIVE",
    };

    onUpdateGodowns([...godowns, created]);
    setShowAddModal(false);
  };

  const exportGodownsCSV = () => {
    const headers = [
      "Godown Code",
      "Godown Name",
      "Category",
      "Physical Location",
      "Max Capacity",
      "Current Stock",
      "UOM",
      "Utilization %",
      "Storekeeper",
      "Status",
    ];
    const rows = godowns.map((g) => [
      g.godownCode,
      `"${g.name}"`,
      g.category,
      `"${g.physicalLocation}"`,
      g.maxCapacityQuantity,
      g.currentStockQuantity,
      g.capacityUOM,
      `${g.utilizationPercent}%`,
      `"${g.storekeeperName}"`,
      g.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Site_Godown_Locations_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Sub-Module 7.1
            </span>
            <span className="text-xs text-slate-500 font-medium">Physical Warehouse & Laydown Yards</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Multi-Godown Storage Locations & Capacity Infrastructure
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Physical demarcation of storage sheds, aggregate bins, rebar fabrication yards, and high-security MEP storage.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportGodownsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Storage Location</span>
          </button>
        </div>
      </div>

      {/* Godown Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGodowns.map((g) => {
          const isHighUtil = g.utilizationPercent >= 80;
          return (
            <div
              key={g.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {g.godownCode}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {g.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#122b45] mt-1.5">{g.name}</h3>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                  <Warehouse className="w-5 h-5" />
                </div>
              </div>

              {/* Physical Location */}
              <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{g.physicalLocation}</span>
              </div>

              {/* Capacity Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Occupied Storage:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {g.currentStockQuantity.toLocaleString("en-IN")} / {g.maxCapacityQuantity.toLocaleString("en-IN")} {g.capacityUOM}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isHighUtil ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(100, g.utilizationPercent)}%` }}
                  ></div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono mt-1">
                  {g.utilizationPercent}% Capacity Utilized
                </div>
              </div>

              {/* Storekeeper Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{g.storekeeperName}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{g.storekeeperPhone}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD STORAGE LOCATION                                               */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Add Site Storage Location</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddGodown} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Godown Code</label>
                  <input
                    type="text"
                    required
                    value={newGodown.godownCode}
                    onChange={(e) => setNewGodown({ ...newGodown, godownCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newGodown.category}
                    onChange={(e) => setNewGodown({ ...newGodown, category: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    <option value="CEMENT_SHED">Cement Shed (Weatherproof)</option>
                    <option value="REBAR_YARD">Rebar Fabrication Yard</option>
                    <option value="AGGREGATE_BINS">Aggregate Storage Bins</option>
                    <option value="AAC_BLOCK_YARD">AAC Block Laydown</option>
                    <option value="MEP_FITTING_GODOWN">MEP Secured Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={newGodown.name}
                  onChange={(e) => setNewGodown({ ...newGodown, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Site Coordinates / Area</label>
                <input
                  type="text"
                  required
                  value={newGodown.physicalLocation}
                  onChange={(e) => setNewGodown({ ...newGodown, physicalLocation: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Capacity Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newGodown.maxCapacityQuantity}
                    onChange={(e) => setNewGodown({ ...newGodown, maxCapacityQuantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={newGodown.capacityUOM}
                    onChange={(e) => setNewGodown({ ...newGodown, capacityUOM: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Storekeeper In-Charge</label>
                  <input
                    type="text"
                    required
                    value={newGodown.storekeeperName}
                    onChange={(e) => setNewGodown({ ...newGodown, storekeeperName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={newGodown.storekeeperPhone}
                    onChange={(e) => setNewGodown({ ...newGodown, storekeeperPhone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Save Storage Yard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
