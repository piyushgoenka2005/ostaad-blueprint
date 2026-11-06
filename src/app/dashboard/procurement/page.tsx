"use client";

import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Building2,
  FileText,
  Receipt,
  Award,
  ShoppingCart,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_VERIFIED_VENDORS,
  DEFAULT_RFQS,
  DEFAULT_VENDOR_BIDS,
  VerifiedVendorProfile,
  MaterialRFQItem,
  VendorQuotationBid,
  ComparativeStatementSummary,
} from "@/lib/procurement-sourcing";

// Sub-Module UI Components
import MasterVendorDirectory from "@/components/procurement/MasterVendorDirectory";
import MaterialRFQGenerator from "@/components/procurement/MaterialRFQGenerator";
import VendorQuotationEntry from "@/components/procurement/VendorQuotationEntry";
import ComparativeStatementMatrix from "@/components/procurement/ComparativeStatementMatrix";

export default function ProcurementSourcingDashboard() {
  const [activeTab, setActiveTab] = useState<
    "vendors" | "rfqs" | "quotations" | "comparative"
  >("vendors");

  // Shared state
  const [vendors, setVendors] = useState<VerifiedVendorProfile[]>(DEFAULT_VERIFIED_VENDORS);
  const [rfqs, setRfqs] = useState<MaterialRFQItem[]>(DEFAULT_RFQS);
  const [bids, setBids] = useState<VendorQuotationBid[]>(DEFAULT_VENDOR_BIDS);
  const [selectedRFQForComparison, setSelectedRFQForComparison] = useState<string>("rfq-01");

  const handleSelectRFQForBids = (rfqId: string) => {
    setSelectedRFQForComparison(rfqId);
    setActiveTab("quotations");
  };

  const handleSelectBidForComparison = (rfqId: string) => {
    setSelectedRFQForComparison(rfqId);
    setActiveTab("comparative");
  };

  return (
    <AppShell
      title="Vendor Management & Sourcing Procurement"
      subtitle="Module 5 — Master Vendor Directory, Material RFQs, Landed Cost Quotations & Comparative Ranking"
      activeNav="procurement"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Supply Chain & Sourcing", href: "/dashboard/procurement" },
        { label: "Vendor Sourcing Hub", href: "/dashboard/procurement" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span>Commercial Complex — Tower B</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("vendors")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "vendors"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Master Vendor Directory</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "vendors" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {vendors.length} Verified
            </span>
          </button>

          <button
            onClick={() => setActiveTab("rfqs")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "rfqs"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Material RFQ Generation</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "rfqs" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
              }`}
            >
              {rfqs.length} RFQs
            </span>
          </button>

          <button
            onClick={() => setActiveTab("quotations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "quotations"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>3. Vendor Quotation Landed Breakdown</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "quotations"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {bids.length} Bids
            </span>
          </button>

          <button
            onClick={() => setActiveTab("comparative")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "comparative"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>4. Automated Comparative Statement (L1 to Ln)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "comparative"
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              Award Workflow
            </span>
          </button>
        </div>

        {/* Tab 1: Master Vendor Directory */}
        {activeTab === "vendors" && (
          <MasterVendorDirectory vendors={vendors} onUpdateVendors={setVendors} />
        )}

        {/* Tab 2: Material RFQ Generation */}
        {activeTab === "rfqs" && (
          <MaterialRFQGenerator
            rfqs={rfqs}
            vendors={vendors}
            onUpdateRFQs={setRfqs}
            onSelectRFQForBids={handleSelectRFQForBids}
          />
        )}

        {/* Tab 3: Vendor Quotations & Landed Cost Breakdown */}
        {activeTab === "quotations" && (
          <VendorQuotationEntry
            rfqs={rfqs}
            vendors={vendors}
            bids={bids}
            onUpdateBids={setBids}
            onSelectBidForComparison={handleSelectBidForComparison}
          />
        )}

        {/* Tab 4: Comparative Statement & Award Recommendation */}
        {activeTab === "comparative" && (
          <ComparativeStatementMatrix
            rfqs={rfqs}
            bids={bids}
            vendors={vendors}
            initialSelectedRFQId={selectedRFQForComparison}
          />
        )}
      </div>
    </AppShell>
  );
}
