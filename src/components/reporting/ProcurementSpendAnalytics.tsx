"use client";

import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  PieChart,
  ShieldCheck,
  Package,
} from "lucide-react";
import {
  SupplierSpendMetric,
  CategoryProcurementSpend,
  MaterialPriceTrend,
  DEFAULT_SUPPLIER_SPEND,
  DEFAULT_CATEGORY_SPEND,
  DEFAULT_MATERIAL_PRICE_TRENDS,
  formatINR,
  formatCrores,
  generateCSV,
  downloadCSVFile,
} from "@/lib/reporting-audit-governance";

export default function ProcurementSpendAnalytics() {
  const [suppliers] = useState<SupplierSpendMetric[]>(DEFAULT_SUPPLIER_SPEND);
  const [categories] = useState<CategoryProcurementSpend[]>(DEFAULT_CATEGORY_SPEND);
  const [priceTrends] = useState<MaterialPriceTrend[]>(DEFAULT_MATERIAL_PRICE_TRENDS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const totalProcurementSpend = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.totalSpend, 0),
    [suppliers]
  );

  const avgOnTime = useMemo(
    () => (suppliers.reduce((sum, s) => sum + s.onTimeDeliveryPct, 0) / suppliers.length).toFixed(1),
    [suppliers]
  );

  const avgQuality = useMemo(
    () => (suppliers.reduce((sum, s) => sum + s.qualityAcceptancePct, 0) / suppliers.length).toFixed(1),
    [suppliers]
  );

  const handleExportSpendCSV = () => {
    const headers = [
      "Vendor ID",
      "Vendor Name",
      "Category",
      "Total Spend (INR)",
      "PO Count",
      "On-Time Delivery %",
      "Quality Acceptance %",
      "Avg Lead Days",
      "Credit Days",
      "Market Share %",
    ];

    const rows = suppliers.map((s) => [
      s.vendorId,
      s.vendorName,
      s.category,
      s.totalSpend,
      s.poCount,
      s.onTimeDeliveryPct,
      s.qualityAcceptancePct,
      s.averageLeadDays,
      s.paymentCreditDays,
      s.marketSharePct,
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSVFile(`Procurement_Spend_Analysis_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportPricesCSV = () => {
    const headers = [
      "Material Code",
      "Material Name",
      "Unit",
      "Current Rate (INR)",
      "Prev Quarter Rate (INR)",
      "YoY Change %",
      "Q1 Forecast (INR)",
      "Procurement Strategy",
    ];

    const rows = priceTrends.map((p) => [
      p.materialCode,
      p.materialName,
      p.unit,
      p.currentRate,
      p.prevQuarterRate,
      p.yoyChangePct,
      p.forecastQ1,
      p.procurementRecommendation,
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSVFile(`Material_Price_Index_Trends_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SOURCING & SPEND TOP METRICS                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sourcing Spend</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[#122b45]">{formatCrores(totalProcurementSpend)}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span>69 Purchase Orders Released</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">On-Time Delivery</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">{avgOnTime}%</div>
          <div className="mt-1 text-xs text-slate-500">Average Lead Time: 4.9 Days</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Quality Acceptance</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-sky-700">{avgQuality}%</div>
          <div className="mt-1 text-xs text-slate-500">Gate Weighbridge & Physical Inspection</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Weighted Inflation</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600">+8.4% YoY</div>
          <div className="mt-1 text-xs text-slate-500">Rebar & Cement index pressure</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CATEGORY PROCUREMENT SPEND & BUDGET VARIANCE                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-[#122b45]">Category-Wise Procurement Distribution & Budget Variance</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Allocated package procurement ceilings versus awarded commitments across trades.
            </p>
          </div>
          <button
            onClick={handleExportSpendCSV}
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Category Spend
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const isOverBudget = cat.variancePct > 0;
            const pctUsed = Math.min(100, (cat.spend / cat.budget) * 100);

            return (
              <div key={cat.category} className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {cat.itemCount.toLocaleString()} Units Sourced
                    </span>
                    <h3 className="text-sm font-bold text-[#122b45] mt-0.5">{cat.category}</h3>
                  </div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      isOverBudget
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isOverBudget ? `+${cat.variancePct}% Over` : `${cat.variancePct}% Savings`}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Committed Spend:</span>
                    <span className="font-mono font-bold text-[#122b45]">{formatCrores(cat.spend)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Package Budget:</span>
                    <span className="font-mono text-slate-600">{formatCrores(cat.budget)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isOverBudget ? "bg-rose-500" : "bg-blue-600"}`}
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
                  <span>Lead Partner:</span>
                  <span className="font-semibold text-slate-700">{cat.topSupplier}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MATERIAL PRICE TRENDS & INFLATION INDEX                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-[#122b45]">Construction Material Landed Cost Trends (5 Quarters)</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Tracking net delivered rate movements ($Base + Freight + GST$) with AI procurement recommendations.
            </p>
          </div>
          <button
            onClick={handleExportPricesCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Price Index
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Material / Unit</th>
                <th className="px-4 py-3 text-right">Q1 2025</th>
                <th className="px-4 py-3 text-right">Q2 2025</th>
                <th className="px-4 py-3 text-right">Q3 2025</th>
                <th className="px-4 py-3 text-right">Q4 2025</th>
                <th className="px-4 py-3 text-right">Current Landed</th>
                <th className="px-4 py-3 text-center">YoY Shift</th>
                <th className="px-4 py-3 text-right">Forecast (Q1 26)</th>
                <th className="px-5 py-3 text-center">Procurement Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priceTrends.map((item) => (
                <tr key={item.materialCode} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#122b45]">{item.materialName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.materialCode} · Per {item.unit}
                    </div>
                  </td>
                  {item.history.slice(0, 4).map((h) => (
                    <td key={h.period} className="px-4 py-3.5 text-right font-mono text-slate-600">
                      ₹{h.landedRate.toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700">
                    ₹{item.currentRate.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.yoyChangePct > 0
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {item.yoyChangePct > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      +{item.yoyChangePct}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                    ₹{item.forecastQ1.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.procurementRecommendation === "STRATEGIC_STOCKPILE"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : item.procurementRecommendation === "STANDARD_ORDER"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {item.procurementRecommendation === "STRATEGIC_STOCKPILE" && "⚡ Stockpile Early"}
                      {item.procurementRecommendation === "STANDARD_ORDER" && "✓ Routine Batch"}
                      {item.procurementRecommendation === "DELAY_ACQUISITION" && "⏳ Defer Delivery"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MASTER VENDOR PERFORMANCE & SPEND MATRIX                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-[#122b45]">Key Supplier Spend & Fulfillment Matrix</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluated supplier delivery adherence, quality acceptance at gate, and total committed disbursements.
            </p>
          </div>
          <button
            onClick={handleExportSpendCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Vendors
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Vendor / Material Profile</th>
                <th className="px-4 py-3 text-right">Total Spend</th>
                <th className="px-4 py-3 text-center">Market Share</th>
                <th className="px-4 py-3 text-center">PO Releases</th>
                <th className="px-4 py-3 text-center">On-Time %</th>
                <th className="px-4 py-3 text-center">Gate Acceptance %</th>
                <th className="px-4 py-3 text-center">Avg Lead</th>
                <th className="px-5 py-3 text-center">Payment Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((vendor) => (
                <tr key={vendor.vendorId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-[#122b45]">{vendor.vendorName}</div>
                    <div className="text-[11px] text-slate-500">{vendor.category}</div>
                    <div className="text-[10px] font-mono text-slate-400">{vendor.vendorId}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-[#122b45]">
                    {formatCrores(vendor.totalSpend)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="w-24 mx-auto">
                      <div className="text-[10px] font-bold text-center text-blue-700 mb-1">
                        {vendor.marketSharePct}%
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${vendor.marketSharePct * 2}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                    {vendor.poCount} Orders
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-semibold text-emerald-700">{vendor.onTimeDeliveryPct}%</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="font-semibold text-sky-700">{vendor.qualityAcceptancePct}%</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono text-slate-600">
                    {vendor.averageLeadDays} Days
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {vendor.paymentCreditDays} Days Credit
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
