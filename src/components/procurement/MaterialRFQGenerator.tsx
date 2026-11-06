"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Truck,
  Building,
  Download,
  Share2,
  Users,
  Sparkles,
  ArrowRight,
  X,
  Clock,
  Eye,
  FileCheck2,
} from "lucide-react";
import {
  MaterialRFQItem,
  VerifiedVendorProfile,
  VendorCategory,
  DEFAULT_RFQS,
} from "@/lib/procurement-sourcing";

interface MaterialRFQGeneratorProps {
  rfqs: MaterialRFQItem[];
  vendors: VerifiedVendorProfile[];
  onUpdateRFQs: (rfqs: MaterialRFQItem[]) => void;
  onSelectRFQForBids?: (rfqId: string) => void;
}

export default function MaterialRFQGenerator({
  rfqs,
  vendors,
  onUpdateRFQs,
  onSelectRFQForBids,
}: MaterialRFQGeneratorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importedNotice, setImportedNotice] = useState(false);

  // New RFQ form state
  const [newRFQ, setNewRFQ] = useState<Partial<MaterialRFQItem>>({
    materialName: "",
    category: "CEMENT",
    technicalSpecification: "IS 12269:2013 compliant, 53 MPa grade",
    requiredQuantity: 1000,
    standardUOM: "50kg Bags",
    targetDeliveryDate: "2026-03-25",
    deliverySiteGodown: "Central Cement Godown Shed — Tower B Site",
    deliveryStaggeringTerms: "500 bags per weekly drop",
    invitedVendorIds: ["vnd-01", "vnd-02"],
  });

  const filteredRFQs = useMemo(() => {
    return rfqs.filter((r) => {
      const matchesSearch =
        r.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.technicalSpecification.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, searchQuery, statusFilter]);

  const handleCreateRFQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRFQ.materialName || !newRFQ.requiredQuantity) return;

    const created: MaterialRFQItem = {
      id: `rfq-${Date.now()}`,
      rfqNumber: `RFQ-2026-MAT-00${rfqs.length + 1}`,
      projectCode: "PRJ-PUN-2026-TWR-B",
      materialName: newRFQ.materialName,
      category: newRFQ.category || "CEMENT",
      technicalSpecification: newRFQ.technicalSpecification || "IS Standard Specification",
      requiredQuantity: Number(newRFQ.requiredQuantity),
      standardUOM: newRFQ.standardUOM || "Bags",
      targetDeliveryDate: newRFQ.targetDeliveryDate || "2026-03-30",
      deliverySiteGodown: newRFQ.deliverySiteGodown || "Central Site Godown",
      deliveryStaggeringTerms: newRFQ.deliveryStaggeringTerms || "Phased deliveries",
      invitedVendorIds: newRFQ.invitedVendorIds || ["vnd-01"],
      status: "PUBLISHED",
      createdDate: new Date().toISOString().split("T")[0],
      bidsClosingDate: "2026-03-15",
    };

    onUpdateRFQs([created, ...rfqs]);
    setShowCreateModal(false);
  };

  // One-click import from Module 4 BOM
  const handleImportFromModule4BOM = () => {
    const bomImports: MaterialRFQItem[] = [
      {
        id: `rfq-bom-aac`,
        rfqNumber: `RFQ-2026-AAC-004`,
        projectCode: "PRJ-PUN-2026-TWR-B",
        materialName: "Autoclaved Aerated Concrete Blocks (600x200x200mm)",
        category: "AAC_BLOCKS",
        technicalSpecification: "IS 2185 Part 3: Grade 1 AAC blocks, dry density 550-650 kg/m3, compressive strength min 4 N/mm2",
        requiredQuantity: 36050,
        standardUOM: "Blocks (Nos)",
        targetDeliveryDate: "2026-04-05",
        deliverySiteGodown: "Masonry Stacking Yard — Ground Floor",
        deliveryStaggeringTerms: "4,000 blocks per truck drop",
        invitedVendorIds: ["vnd-06"],
        status: "PUBLISHED",
        createdDate: new Date().toISOString().split("T")[0],
        bidsClosingDate: "2026-03-12",
      },
      {
        id: `rfq-bom-agg`,
        rfqNumber: `RFQ-2026-AGG-005`,
        projectCode: "PRJ-PUN-2026-TWR-B",
        materialName: "Crushed Coarse Aggregates (20mm & 10mm Graded)",
        category: "SAND_AGGREGATES",
        technicalSpecification: "IS 383:2016 single-sized and graded hard basalt stone, flakiness index < 15%",
        requiredQuantity: 1680,
        standardUOM: "Cubic Meters (cum)",
        targetDeliveryDate: "2026-03-15",
        deliverySiteGodown: "Aggregate Bins — RMC Batching Yard",
        deliveryStaggeringTerms: "Daily 50 cum tippers",
        invitedVendorIds: ["vnd-05"],
        status: "PUBLISHED",
        createdDate: new Date().toISOString().split("T")[0],
        bidsClosingDate: "2026-03-10",
      },
    ];

    onUpdateRFQs([...rfqs, ...bomImports]);
    setImportedNotice(true);
    setTimeout(() => setImportedNotice(false), 5000);
  };

  const exportRFQsCSV = () => {
    const headers = [
      "RFQ Number",
      "Material Name",
      "Category",
      "Quantity",
      "UOM",
      "Target Date",
      "Delivery Godown",
      "Staggering Terms",
      "Status",
      "Invited Vendors Count",
    ];
    const rows = rfqs.map((r) => [
      r.rfqNumber,
      `"${r.materialName}"`,
      r.category,
      r.requiredQuantity,
      r.standardUOM,
      r.targetDeliveryDate,
      `"${r.deliverySiteGodown}"`,
      `"${r.deliveryStaggeringTerms}"`,
      r.status,
      r.invitedVendorIds.length,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Material_RFQs_Schedule_${new Date().toISOString().split("T")[0]}.csv`);
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
              Sub-Module 5.2
            </span>
            <span className="text-xs text-slate-500 font-medium">BOM-to-RFQ Procurement Engine</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Material Request for Quotation (RFQ) Generation Hub
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Formal procurement requisitions dispatched to pre-qualified vendors with technical specifications and delivery schedules.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleImportFromModule4BOM}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Sync from Module 4 BOM</span>
          </button>

          <button
            onClick={exportRFQsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New RFQ</span>
          </button>
        </div>
      </div>

      {/* Notice after syncing */}
      {importedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>2 New RFQs successfully imported from Module 4 BOM (AAC Blocks & Graded Aggregates).</span>
          </div>
          <span className="font-semibold text-emerald-700">Ready for Quotations</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search RFQ number, material, or specification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published (Awaiting Bids)</option>
            <option value="QUOTATIONS_RECEIVED">Quotations Received</option>
            <option value="AWARDED">Awarded</option>
          </select>
        </div>
      </div>

      {/* RFQ Cards List */}
      <div className="space-y-4">
        {filteredRFQs.map((rfq) => {
          const invitedVendorNames = vendors
            .filter((v) => rfq.invitedVendorIds.includes(v.id))
            .map((v) => v.vendorName);

          return (
            <div
              key={rfq.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      {rfq.rfqNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${rfq.status === "QUOTATIONS_RECEIVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : rfq.status === "PUBLISHED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                    >
                      {rfq.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Bids Close: {rfq.bidsClosingDate}</span>
                  </div>

                  <h3 className="text-base font-bold text-[#122b45] mt-1.5">{rfq.materialName}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    <strong className="text-slate-800">IS Specification:</strong> {rfq.technicalSpecification}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">Requisition Quantity</div>
                    <div className="text-lg font-bold text-blue-700 font-mono">
                      {rfq.requiredQuantity.toLocaleString("en-IN")} {rfq.standardUOM}
                    </div>
                  </div>

                  {onSelectRFQForBids && (
                    <button
                      onClick={() => onSelectRFQForBids(rfq.id)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1.5"
                    >
                      <span>View Quotes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Meta Grid */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Site Godown: <strong className="text-slate-800">{rfq.deliverySiteGodown}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Phasing: <strong className="text-slate-800">{rfq.deliveryStaggeringTerms}</strong></span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Target Start: <strong className="text-slate-800">{rfq.targetDeliveryDate}</strong></span>
                </div>
              </div>

              {/* Invited Vendors Pill Bar */}
              <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Invited Bidders:</span>
                <div className="flex flex-wrap gap-1.5">
                  {invitedVendorNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW RFQ                                                     */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Generate Material Request for Quotation (RFQ)</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRFQ} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ready-Mix Concrete M35"
                    value={newRFQ.materialName}
                    onChange={(e) => setNewRFQ({ ...newRFQ, materialName: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                  <select
                    value={newRFQ.category}
                    onChange={(e) => setNewRFQ({ ...newRFQ, category: e.target.value as VendorCategory })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="CEMENT">Cement (OPC/PPC)</option>
                    <option value="STEEL_REBAR">Steel Rebar (Fe 550D)</option>
                    <option value="RMC_CONCRETE">Ready-Mix Concrete</option>
                    <option value="SAND_AGGREGATES">M-Sand & Aggregates</option>
                    <option value="AAC_BLOCKS">AAC Blocks</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical IS Specification Clause</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. IS 12269:2013 Grade 53 OPC Cement with manufacturer test certificates..."
                  value={newRFQ.technicalSpecification}
                  onChange={(e) => setNewRFQ({ ...newRFQ, technicalSpecification: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Quantity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newRFQ.requiredQuantity}
                    onChange={(e) => setNewRFQ({ ...newRFQ, requiredQuantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    required
                    value={newRFQ.standardUOM}
                    onChange={(e) => setNewRFQ({ ...newRFQ, standardUOM: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={newRFQ.targetDeliveryDate}
                    onChange={(e) => setNewRFQ({ ...newRFQ, targetDeliveryDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Site Godown Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Cement Godown — Tower B"
                    value={newRFQ.deliverySiteGodown}
                    onChange={(e) => setNewRFQ({ ...newRFQ, deliverySiteGodown: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Staggering Terms</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 bags per weekly drop"
                    value={newRFQ.deliveryStaggeringTerms}
                    onChange={(e) => setNewRFQ({ ...newRFQ, deliveryStaggeringTerms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Select Vendors to Invite */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Invite Pre-Qualified Verified Suppliers:
                </label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 space-y-1">
                  {vendors.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-white">
                      <input
                        type="checkbox"
                        checked={newRFQ.invitedVendorIds?.includes(v.id)}
                        onChange={(e) => {
                          const current = newRFQ.invitedVendorIds || [];
                          if (e.target.checked) {
                            setNewRFQ({ ...newRFQ, invitedVendorIds: [...current, v.id] });
                          } else {
                            setNewRFQ({ ...newRFQ, invitedVendorIds: current.filter((id) => id !== v.id) });
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{v.vendorName}</span>
                      <span className="text-[10px] text-slate-500">({v.city})</span>
                    </label>
                  ))}
                </div>
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
                  Publish RFQ to Suppliers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

