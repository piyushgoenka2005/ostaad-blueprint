"use client";

import React, { useState, useMemo } from "react";
import {
  Boxes,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  Package,
  ShoppingCart,
  Download,
  AlertCircle,
  Truck,
} from "lucide-react";
import {
  HierarchicalBOQItem,
  DecomposedMaterialBOM,
  calculateMaterialDecomposition,
} from "@/lib/boq-cost-control";

interface MaterialBOMDecompositionEngineProps {
  boqItems: HierarchicalBOQItem[];
  onTriggerProcurementRFQs?: (materials: DecomposedMaterialBOM[]) => void;
}

export default function MaterialBOMDecompositionEngine({
  boqItems,
  onTriggerProcurementRFQs,
}: MaterialBOMDecompositionEngineProps) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [rfqGeneratedNotice, setRfqGeneratedNotice] = useState(false);

  // Compute live decomposition
  const decomposedBOM = useMemo(() => {
    return calculateMaterialDecomposition(boqItems);
  }, [boqItems]);

  // Aggregate Totals
  const totalOutlayINR = useMemo(() => {
    return decomposedBOM.reduce((sum, item) => sum + item.totalEstimatedOutlayINR, 0);
  }, [decomposedBOM]);

  const cementItem = decomposedBOM.find((m) => m.category === "CEMENT");
  const steelItem = decomposedBOM.find((m) => m.category === "STEEL");
  const sandItem = decomposedBOM.find((m) => m.category === "SAND");
  const aggItem = decomposedBOM.find((m) => m.category === "AGGREGATES");

  const handleGenerateRFQs = () => {
    setRfqGeneratedNotice(true);
    if (onTriggerProcurementRFQs) {
      onTriggerProcurementRFQs(decomposedBOM);
    }
    setTimeout(() => {
      setRfqGeneratedNotice(false);
    }, 5000);
  };

  const exportBOMToCSV = () => {
    const headers = [
      "Material ID",
      "Material Name",
      "Category",
      "UOM",
      "Gross Required Qty",
      "Wastage Buffer %",
      "Net Purchase Qty",
      "Benchmark Rate (INR)",
      "Total Estimated Outlay (INR)",
    ];
    const rows = decomposedBOM.map((m) => [
      m.materialId,
      `"${m.materialName}"`,
      m.category,
      m.standardUOM,
      m.requiredGrossQuantity,
      `${m.wastageBufferPercent}%`,
      m.netPurchaseQuantity,
      m.benchmarkLandedRateINR,
      m.totalEstimatedOutlayINR,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IS456_Material_BOM_Decomposition_${new Date().toISOString().split("T")[0]}.csv`);
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
              Sub-Module 4.4
            </span>
            <span className="text-xs text-slate-500 font-medium">IS 456 / IS 1200 Empirical Derivation</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Scientific Material Breakdown & Bill of Materials (BOM)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated transformation of tender structural quantities into bulk raw materials with buffer allowances.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span>Mix Design Constants</span>
          </button>

          <button
            onClick={exportBOMToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export BOM CSV</span>
          </button>

          <button
            onClick={handleGenerateRFQs}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Generate Procurement RFQs</span>
          </button>
        </div>
      </div>

      {/* RFQ Trigger Notice */}
      {rfqGeneratedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Procurement Requisitions Generated Successfully!</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                5 Material Packages (OPC Cement, TMT Steel, M-Sand, Aggregates, AAC Blocks) dispatched to Sourcing Module 5 for multi-vendor comparative quotes.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-200/60 px-2 py-1 rounded text-emerald-800">
            Handoff to Module 5
          </span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cement Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">OPC 53 Cement Bags</div>
            <div className="text-xl font-bold text-[#122b45]">
              {cementItem?.netPurchaseQuantity.toLocaleString("en-IN")} Bags
            </div>
            <div className="text-[11px] text-slate-500">
              ₹{((cementItem?.totalEstimatedOutlayINR || 0) / 100000).toFixed(2)} Lakhs outlay
            </div>
          </div>
        </div>

        {/* Steel Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">TMT Fe 550D Rebar</div>
            <div className="text-xl font-bold text-blue-700">
              {steelItem?.netPurchaseQuantity.toLocaleString("en-IN")} MT
            </div>
            <div className="text-[11px] text-slate-500">
              ₹{((steelItem?.totalEstimatedOutlayINR || 0) / 10000000).toFixed(2)} Cr outlay
            </div>
          </div>
        </div>

        {/* Aggregates & Sand Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Sand & Aggregates</div>
            <div className="text-xl font-bold text-[#122b45]">
              {((sandItem?.netPurchaseQuantity || 0) + (aggItem?.netPurchaseQuantity || 0)).toLocaleString("en-IN")} cum
            </div>
            <div className="text-[11px] text-slate-500">Zone II M-Sand & 20mm Stone</div>
          </div>
        </div>

        {/* Total Outlay */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Material Outlay</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalOutlayINR / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-purple-700 font-medium">Landed at Site Godown</div>
          </div>
        </div>
      </div>

      {/* BOM Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Gross Bill of Materials (BOM) Derivation Schedule
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Based on {boqItems.length} active verified BOQ line items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Material Package & Specification</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Standard UOM</th>
                <th className="py-3 px-3 text-right">Theoretical Qty</th>
                <th className="py-3 px-3 text-right">Wastage Buffer</th>
                <th className="py-3 px-3 text-right">Net Purchase Qty</th>
                <th className="py-3 px-3 text-right">Benchmark Landed Rate</th>
                <th className="py-3 px-4 text-right">Est. Capex Outlay (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {decomposedBOM.map((mat) => (
                <tr key={mat.materialId} className="hover:bg-slate-50/80 transition">
                  {/* Name */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{mat.materialName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Sourced from {mat.sourceBOQItemsCount} BOQ execution items
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {mat.category}
                    </span>
                  </td>

                  {/* UOM */}
                  <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {mat.standardUOM}
                  </td>

                  {/* Gross Qty */}
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {mat.requiredGrossQuantity.toLocaleString("en-IN")}
                  </td>

                  {/* Wastage Buffer */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700">
                    +{mat.wastageBufferPercent}%
                  </td>

                  {/* Net Purchase Qty */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                    {mat.netPurchaseQuantity.toLocaleString("en-IN")}
                  </td>

                  {/* Landed Rate */}
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{mat.benchmarkLandedRateINR.toLocaleString("en-IN")}
                  </td>

                  {/* Capex Outlay */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45]">
                    ₹{mat.totalEstimatedOutlayINR.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Buffers include transport transit losses, rebar cutting/lapping, and concrete placement scrap.</span>
          </div>
          <div className="font-mono font-bold text-slate-900 text-sm">
            Total Material Sourcing Outlay: ₹{totalOutlayINR.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: IS 456 / IS 1200 EMPIRICAL CONSTANTS INSPECTOR                     */}
      {/* ========================================================================= */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-[#122b45] text-base">IS 456 & CPWD Decomposition Ratios</h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">M35 Design Mix Concrete (1 cum)</div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>8.2 Bags OPC 53 Cement (410 kg/cum)</li>
                  <li>0.45 cum Manufactured Sand (Zone II)</li>
                  <li>0.85 cum 20mm & 10mm Graded Aggregates</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">M10 Nominal PCC Levelling (1 cum)</div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>4.4 Bags OPC Cement (220 kg/cum)</li>
                  <li>0.48 cum Coarse Sand</li>
                  <li>0.90 cum 40mm/20mm Graded Stone Aggregates</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">TMT Steel Rebar (1 Metric Tonne)</div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>1.035 MT Gross Purchase Tonnage (3.5% lapping and bend off-cuts)</li>
                  <li>12 kg 18-gauge soft annealed binding wire</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">AAC Block Masonry (1 cum)</div>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>28 Nos 600x200x200mm Autoclaved Aerated Blocks</li>
                  <li>1.2 Bags (40kg) polymer-modified thin-bed block jointing adhesive</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

