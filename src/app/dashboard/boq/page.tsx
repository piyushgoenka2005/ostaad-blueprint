"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import {
  Calculator,
  GitCommit,
  Boxes,
  Receipt,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  DEFAULT_DETAILED_BOQ_ITEMS,
  DEFAULT_CHANGE_ORDERS,
  HierarchicalBOQItem,
  BOQChangeOrder,
  DEFAULT_RA_BILL_04,
} from "@/lib/boq-cost-control";

// Sub-Module UI Components
import HierarchicalBOQRegistry from "@/components/boq/HierarchicalBOQRegistry";
import BOQVariationChangeOrderVault from "@/components/boq/BOQVariationChangeOrderVault";
import MaterialBOMDecompositionEngine from "@/components/boq/MaterialBOMDecompositionEngine";
import RABillingMeasurementSheet from "@/components/boq/RABillingMeasurementSheet";

export default function BOQCostControlDashboard() {
  const [activeTab, setActiveTab] = useState<
    "registry" | "change-orders" | "decomposition" | "ra-billing"
  >("registry");

  const [activeProjectName, setActiveProjectName] = useState("Active Project Workspace");

  useEffect(() => {
    try {
      const master = localStorage.getItem("ostaad_project_master");
      if (master) {
        const p = JSON.parse(master);
        if (p.name) {
          setActiveProjectName(`${p.projectCode ? p.projectCode + " — " : ""}${p.name}`);
          return;
        }
      }
      const opName = localStorage.getItem("ostaad_operations_project_name");
      const opId = localStorage.getItem("ostaad_operations_project_id");
      if (opName) {
        setActiveProjectName(`${opId ? opId + " — " : ""}${opName}`);
      }
    } catch {}
  }, []);

  // Shared state for BOQ Items
  const [boqItems, setBoqItems] = useState<HierarchicalBOQItem[]>(DEFAULT_DETAILED_BOQ_ITEMS);

  // Shared state for Change Orders
  const [changeOrders, setChangeOrders] = useState<BOQChangeOrder[]>(DEFAULT_CHANGE_ORDERS);

  // When a Change Order is approved, update target item in BOQ state
  const handleApplyChangeOrderToBOQ = (co: BOQChangeOrder) => {
    setBoqItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === co.targetItemId) {
          const updatedQty = co.revisedQuantity;
          return {
            ...item,
            tenderQuantity: updatedQty,
            totalAmountINR: Math.round(updatedQty * item.approvedRateINR),
          };
        }
        return item;
      })
    );
  };

  return (
    <AppShell
      title="BOQ, Rate Analysis & Cost Control"
      subtitle="Module 4 — Hierarchical BOQ Registry, Variations, IS 456 BOM Derivation & RA Billing"
      activeNav="boq"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Execution & Engineering", href: "/dashboard/projects" },
        { label: "BOQ & Cost Control", href: "/dashboard/boq" },
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
            onClick={() => setActiveTab("registry")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "registry"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>1. BOQ Master & Column Mapping</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "registry" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {boqItems.length} Items
            </span>
          </button>

          <button
            onClick={() => setActiveTab("change-orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "change-orders"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <GitCommit className="w-4 h-4" />
            <span>2. Variations & Change Orders</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "change-orders"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {changeOrders.length} Logs
            </span>
          </button>

          <button
            onClick={() => setActiveTab("decomposition")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "decomposition"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>3. IS 456 Material Breakdown (BOM)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "decomposition"
                  ? "bg-white/20 text-white"
                  : "bg-purple-100 text-purple-800"
              }`}
            >
              5 Packages
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ra-billing")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "ra-billing"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>4. RA Billing & Measurement Sheets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "ra-billing"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              RA #04
            </span>
          </button>
        </div>

        {/* Tab 1: BOQ Registry & Column Mapping Wizard */}
        {activeTab === "registry" && (
          <HierarchicalBOQRegistry
            items={boqItems}
            onUpdateItems={setBoqItems}
            onSelectForDecomposition={() => setActiveTab("decomposition")}
          />
        )}

        {/* Tab 2: Change Orders Variation Vault */}
        {activeTab === "change-orders" && (
          <BOQVariationChangeOrderVault
            boqItems={boqItems}
            changeOrders={changeOrders}
            onUpdateChangeOrders={setChangeOrders}
            onApplyChangeOrderToBOQ={handleApplyChangeOrderToBOQ}
          />
        )}

        {/* Tab 3: IS 456 Material Decomposition Engine */}
        {activeTab === "decomposition" && (
          <MaterialBOMDecompositionEngine boqItems={boqItems} />
        )}

        {/* Tab 4: RA Billing & Measurement Sheets */}
        {activeTab === "ra-billing" && (
          <RABillingMeasurementSheet initialBill={DEFAULT_RA_BILL_04} />
        )}
      </div>
    </AppShell>
  );
}

