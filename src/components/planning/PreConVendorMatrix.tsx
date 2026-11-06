"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Award,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Clock,
  CreditCard,
  Truck,
  CheckCircle2,
  FileText,
  Printer,
  ChevronRight,
  Star,
  Info,
  DollarSign,
  Package,
} from "lucide-react";
import {
  VendorPackageType,
  VendorBid,
  BENCHMARK_PACKAGES,
  evaluateVendorBids,
  EvaluatedVendorBid,
} from "@/lib/planning/boq-vendor";

interface PreConVendorMatrixProps {
  className?: string;
  onAwardVendor?: (packageId: VendorPackageType, vendor: EvaluatedVendorBid) => void;
}

export default function PreConVendorMatrix({
  className = "",
  onAwardVendor,
}: PreConVendorMatrixProps) {
  const [packages, setPackages] = useState(BENCHMARK_PACKAGES);
  const [activePackageId, setActivePackageId] = useState<VendorPackageType>("CEMENT");

  // Get current active package
  const activePackage = useMemo(() => {
    return packages.find((p) => p.id === activePackageId) || packages[0];
  }, [packages, activePackageId]);

  // Evaluated bids for current active package
  const evaluatedBids: EvaluatedVendorBid[] = useMemo(() => {
    return evaluateVendorBids(activePackage.bids);
  }, [activePackage]);

  // Find L1 and Best Value
  const l1Bid = useMemo(() => evaluatedBids.find((b) => b.isL1LowestCost), [evaluatedBids]);
  const bestValueBid = useMemo(() => evaluatedBids.find((b) => b.isBestValue), [evaluatedBids]);

  // Format currency
  const formatINR = (amt: number) => `₹${amt.toLocaleString("en-IN")}`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-orange-700 text-white shadow-md shadow-amber-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Pre-Construction Vendor Comparison Matrix & Benchmarking (Tool 7)
                </h3>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  L1 vs V1 Best Value Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Multi-supplier landed cost breakdown (Base + Freight + Unloading + GST), credit days, and delivery turnaround benchmarking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export Comparative Statement</span>
            </button>
          </div>
        </div>

        {/* Package Selector Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setActivePackageId(pkg.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activePackageId === pkg.id
                  ? "bg-[#122b45] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Package className="h-3.5 w-3.5 text-amber-400" />
              <span>{pkg.packageName}</span>
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">
                {pkg.bids.length} Bidders
              </span>
            </button>
          ))}
        </div>

        {/* Executive Recommendation Banner */}
        {bestValueBid && (
          <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                      Recommended Award: V1 Best Value
                    </span>
                    <span className="text-xs font-bold text-indigo-950">
                      Composite Score: {bestValueBid.compositeScore} / 100
                    </span>
                  </div>
                  <h4 className="font-bold text-[#122b45] text-base mt-1">
                    {bestValueBid.bid.vendorName} — {bestValueBid.bid.brandOrGrade}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Recommended due to optimal balance of landed rate ({formatINR(bestValueBid.landedRateINR)}/{activePackage.uom}),{" "}
                    {bestValueBid.bid.creditPeriodDays} days commercial credit terms, and {bestValueBid.bid.leadTimeDays}-day delivery turnaround.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-center shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium">Landed Rate</div>
                  <div className="text-sm font-bold text-[#122b45]">
                    {formatINR(bestValueBid.landedRateINR)}
                    <span className="text-[10px] font-normal text-slate-500">/{activePackage.uom}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-center shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium">Total Outlay</div>
                  <div className="text-sm font-bold text-indigo-700">
                    {formatINR(bestValueBid.landedRateINR * activePackage.projectEstimatedQuantity)}
                  </div>
                </div>

                {onAwardVendor && (
                  <button
                    onClick={() => onAwardVendor(activePackage.id, bestValueBid)}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                  >
                    Select for PO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {evaluatedBids.map((item, idx) => {
          const { bid, landedRateINR, isL1LowestCost, isBestValue, compositeScore } = item;
          const totalOutlay = landedRateINR * activePackage.projectEstimatedQuantity;

          return (
            <div
              key={bid.id}
              className={`rounded-2xl border bg-white p-5 flex flex-col justify-between transition-all duration-200 shadow-sm ${
                isBestValue
                  ? "border-indigo-400 ring-2 ring-indigo-400/20"
                  : isL1LowestCost
                  ? "border-emerald-300 ring-1 ring-emerald-300/30"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    {isBestValue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-800">
                        <Award className="h-3 w-3" />
                        V1 Best Value
                      </span>
                    )}
                    {isL1LowestCost && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                        <TrendingDown className="h-3 w-3" />
                        L1 Lowest Cost
                      </span>
                    )}
                    {!isBestValue && !isL1LowestCost && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Bidder #{idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{bid.qualityRatingStars}</span>
                  </div>
                </div>

                {/* Vendor & Brand */}
                <div className="mt-3">
                  <h4 className="font-bold text-[#122b45] text-sm leading-snug">
                    {bid.vendorName}
                  </h4>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    {bid.brandOrGrade}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    <span>{bid.plantLocation} ({bid.distanceKm} km lead)</span>
                  </div>
                </div>

                {/* Landed Rate Highlight Box */}
                <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-center">
                  <div className="text-[10px] text-slate-500 font-medium">All-Inclusive Landed Rate</div>
                  <div className="text-xl font-black text-[#122b45] mt-0.5">
                    {formatINR(landedRateINR)}
                    <span className="text-xs font-normal text-slate-500"> / {activePackage.uom}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Total: <strong className="text-slate-800">{formatINR(totalOutlay)}</strong>
                  </div>
                </div>

                {/* Cost Breakdown Details */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-500">
                    <span>Base Ex-Factory:</span>
                    <span className="font-mono font-medium text-slate-800">{formatINR(bid.baseRateINR)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Freight / Cartage:</span>
                    <span className="font-mono font-medium text-slate-800">+{formatINR(bid.freightINR)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Unloading / Stacking:</span>
                    <span className="font-mono font-medium text-slate-800">+{formatINR(bid.unloadingINR)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST ({bid.gstPercent}%):</span>
                    <span className="font-mono font-medium text-slate-800">
                      +{formatINR(item.gstAmountINR)}
                    </span>
                  </div>
                </div>

                {/* Commercial Terms & Verification */}
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                      Payment Credit:
                    </span>
                    <span className="font-bold text-[#122b45]">
                      {bid.creditPeriodDays === 0 ? "Advance Required" : `${bid.creditPeriodDays} Days`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Lead Time:
                    </span>
                    <span className="font-bold text-[#122b45]">{bid.leadTimeDays} Days</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      BIS IS License:
                    </span>
                    <span className="font-bold text-emerald-700">
                      {bid.bisCertified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Composite Score Footer */}
              <div className="mt-5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Composite Score:</span>
                  <span className="font-mono font-black text-sm text-indigo-900">
                    {compositeScore} <span className="text-[10px] font-normal text-slate-400">/100</span>
                  </span>
                </div>
                {/* Score bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isBestValue
                        ? "bg-indigo-600"
                        : isL1LowestCost
                        ? "bg-emerald-600"
                        : "bg-slate-400"
                    }`}
                    style={{ width: `${compositeScore}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparative Evaluation Statement Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          Comparative Statement Summary ({activePackage.packageName})
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Brand / Spec</th>
                <th className="py-2.5 px-3 text-right">Base (₹)</th>
                <th className="py-2.5 px-3 text-right">Freight (₹)</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-right font-bold text-[#122b45]">Landed (₹)</th>
                <th className="py-2.5 px-3 text-center">Credit Days</th>
                <th className="py-2.5 px-3 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluatedBids.map(({ bid, landedRateINR, isL1LowestCost, isBestValue, compositeScore }) => (
                <tr key={bid.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#122b45]">{bid.vendorName}</td>
                  <td className="py-3 px-3 text-slate-600">{bid.brandOrGrade}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(bid.baseRateINR)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">+{formatINR(bid.freightINR)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{bid.gstPercent}%</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#122b45]">
                    {formatINR(landedRateINR)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-semibold text-slate-700">{bid.creditPeriodDays}d</span>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{bid.leadTimeDays}d</td>
                  <td className="py-3 px-3 text-center font-bold text-indigo-700">
                    {compositeScore}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isBestValue ? (
                      <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        V1 AWARD
                      </span>
                    ) : isL1LowestCost ? (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        L1 PRICE
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        BIDDER
                      </span>
                    )}
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

