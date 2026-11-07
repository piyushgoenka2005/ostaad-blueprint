"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import {
  PackageCheck,
  Boxes,
  FileText,
  Warehouse,
  Building2,
  Truck,
  ShieldCheck,
  Scale,
} from "lucide-react";
import {
  DEFAULT_GODOWNS,
  DEFAULT_GRN_LOGS,
  DEFAULT_STOCK_LEDGER,
  DEFAULT_MATERIAL_INDENTS,
  GodownStorageLocation,
  GoodsReceiptNote,
  StockLedgerEntry,
  MaterialIndentIssueSlip,
} from "@/lib/site-store-operations";
import { DEFAULT_AUTHORISED_POS, AuthorisedPurchaseOrder } from "@/lib/commercial-finance";

// Sub-Module UI Components
import GRNInwardGateLog from "@/components/site-store/GRNInwardGateLog";
import ImmutableStockLedger from "@/components/site-store/ImmutableStockLedger";
import MaterialIndentWastageTracker from "@/components/site-store/MaterialIndentWastageTracker";
import MultiGodownManagement from "@/components/site-store/MultiGodownManagement";

export default function SiteStoreDashboard() {
  const [activeTab, setActiveTab] = useState<
    "grn" | "ledger" | "indent" | "godowns"
  >("grn");

  const [activeProjectName, setActiveProjectName] = useState("Active Project Workspace");

  useEffect(() => {
    try {
      const master = localStorage.getItem("ostaad_project_master");
      if (master) {
        const p = JSON.parse(master);
        if (p.name) {
          setActiveProjectName(p.name);
          return;
        }
      }
      const opName = localStorage.getItem("ostaad_operations_project_name");
      if (opName) {
        setActiveProjectName(opName);
      }
    } catch {}
  }, []);

  // Shared State
  const [godowns, setGodowns] = useState<GodownStorageLocation[]>(DEFAULT_GODOWNS);
  const [grnLogs, setGrnLogs] = useState<GoodsReceiptNote[]>(DEFAULT_GRN_LOGS);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>(DEFAULT_STOCK_LEDGER);
  const [indents, setIndents] = useState<MaterialIndentIssueSlip[]>(DEFAULT_MATERIAL_INDENTS);
  const [orders] = useState<AuthorisedPurchaseOrder[]>(DEFAULT_AUTHORISED_POS);

  // When a GRN is received at the gate, automatically credit the double-entry stock ledger & update godown capacity
  const handleStockInward = (grn: GoodsReceiptNote) => {
    // 1. Credit Immutable Stock Ledger
    const targetGdn = godowns.find((g) => g.id === grn.targetGodownId) || godowns[0];
    const newBalance = targetGdn.currentStockQuantity + grn.netAcceptedQuantity;

    const newLedgerEntry: StockLedgerEntry = {
      id: `stk-${Date.now()}`,
      timestamp: `${grn.inwardDate} ${grn.inwardTime}`,
      movementType: "INWARD_GRN",
      materialName: grn.materialName,
      godownName: grn.targetGodownName,
      quantityIn: grn.netAcceptedQuantity,
      quantityOut: 0,
      balanceQuantityAfter: newBalance,
      standardUOM: grn.standardUOM,
      referenceDocNumber: grn.grnNumber,
      recipientOrTransporter: `${grn.transporterName} (Truck ${grn.vehicleTruckNumber})`,
      operatorStorekeeper: grn.storekeeperName,
    };

    setLedgerEntries((prev) => [newLedgerEntry, ...prev]);

    // 2. Update Godown Storage capacity
    setGodowns((prevGodowns) =>
      prevGodowns.map((g) => {
        if (g.id === grn.targetGodownId) {
          const updatedCurrent = g.currentStockQuantity + grn.netAcceptedQuantity;
          const updatedUtil = Math.round((updatedCurrent / g.maxCapacityQuantity) * 1000) / 10;
          return {
            ...g,
            currentStockQuantity: updatedCurrent,
            utilizationPercent: updatedUtil,
          };
        }
        return g;
      })
    );
  };

  return (
    <AppShell
      title="Site Operations, Godown & Stock Ledger"
      subtitle="Module 7 — Gate GRN Inward, +5% Over-Delivery Guardrail, Immutable Stock Ledger & Wastage Monitor"
      activeNav="site-store"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Supply Chain & Sourcing", href: "/dashboard/procurement" },
        { label: "Site Store Operations", href: "/dashboard/site-store" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span>{activeProjectName}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("grn")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "grn"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>1. Gate GRN Inward (+5% Tolerance)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "grn" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {grnLogs.length} GRNs
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "ledger"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>2. Immutable Double-Entry Ledger</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "ledger" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
              }`}
            >
              Perpetual Stock
            </span>
          </button>

          <button
            onClick={() => setActiveTab("indent")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "indent"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Contractor Indents & Wastage</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "indent" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              IS 456 Norms
            </span>
          </button>

          <button
            onClick={() => setActiveTab("godowns")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "godowns"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>4. Multi-Godown Storage Locations</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "godowns" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {godowns.length} Yards
            </span>
          </button>
        </div>

        {/* Tab 1: Gate GRN Inward & Weighbridge Log (+5% Tolerance) */}
        {activeTab === "grn" && (
          <GRNInwardGateLog
            grnLogs={grnLogs}
            godowns={godowns}
            orders={orders}
            onUpdateGRNLogs={setGrnLogs}
            onStockInward={handleStockInward}
          />
        )}

        {/* Tab 2: Double-Entry Immutable Stock Ledger */}
        {activeTab === "ledger" && (
          <ImmutableStockLedger
            ledgerEntries={ledgerEntries}
            godowns={godowns}
            onUpdateLedger={setLedgerEntries}
          />
        )}

        {/* Tab 3: Contractor Material Indents & Wastage Monitor */}
        {activeTab === "indent" && (
          <MaterialIndentWastageTracker
            indents={indents}
            onUpdateIndents={setIndents}
          />
        )}

        {/* Tab 4: Multi-Godown Storage Locations */}
        {activeTab === "godowns" && (
          <MultiGodownManagement
            godowns={godowns}
            onUpdateGodowns={setGodowns}
          />
        )}
      </div>
    </AppShell>
  );
}
