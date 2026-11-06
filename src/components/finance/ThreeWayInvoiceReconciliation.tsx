"use client";

import React, { useState, useMemo } from "react";
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Download,
  Printer,
  ShieldCheck,
  Building,
  CreditCard,
  DollarSign,
  ArrowRight,
  Info,
  X,
  FileSpreadsheet,
} from "lucide-react";
import {
  ThreeWayReconciliationItem,
  DEFAULT_RECONCILIATION_ITEMS,
} from "@/lib/commercial-finance";

interface ThreeWayInvoiceReconciliationProps {
  items: ThreeWayReconciliationItem[];
  onUpdateItems: (items: ThreeWayReconciliationItem[]) => void;
}

export default function ThreeWayInvoiceReconciliation({
  items,
  onUpdateItems,
}: ThreeWayInvoiceReconciliationProps) {
  const [selectedItem, setSelectedItem] = useState<ThreeWayReconciliationItem | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const matchedCount = useMemo(() => {
    return items.filter((i) => i.reconciliationStatus === "PERFECT_MATCH").length;
  }, [items]);

  const flaggedCount = useMemo(() => {
    return items.filter((i) => i.reconciliationStatus === "VARIANCE_FLAGGED").length;
  }, [items]);

  const totalNetPayable = useMemo(() => {
    return items.reduce((sum, i) => sum + i.netPayableToVendorINR, 0);
  }, [items]);

  const handlePrintCertificate = () => {
    window.print();
  };

  const exportReconciliationsCSV = () => {
    const headers = [
      "PO Number",
      "GRN Number",
      "Invoice Number",
      "Vendor Name",
      "Material Name",
      "PO Qty",
      "GRN Qty",
      "Invoice Qty",
      "PO Rate",
      "Invoice Rate",
      "Status",
      "Quantity Variance",
      "Net Payable (INR)",
    ];
    const rows = items.map((i) => [
      i.poNumber,
      i.grnNumber,
      i.vendorInvoiceNumber,
      `"${i.vendorName}"`,
      `"${i.materialName}"`,
      i.poOrderedQuantity,
      i.grnAcceptedQuantity,
      i.invoiceBilledQuantity,
      i.poApprovedRateINR,
      i.invoiceBilledRateINR,
      i.reconciliationStatus,
      i.quantityVariance,
      i.netPayableToVendorINR,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `3_Way_Reconciliation_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Sub-Modules 6.5 & 6.6
            </span>
            <span className="text-xs text-slate-500 font-medium">PO vs. GRN vs. Vendor Invoice 3-Way Match</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Automated 3-Way Invoice Reconciliation & Final Settlement
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Cross-verifies legal Purchase Orders, Gate Weighbridge GRNs, and Vendor Invoices to eliminate over-billing, rate inflation, and tare losses.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportReconciliationsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Perfect 3-Way Matches</div>
            <div className="text-xl font-bold text-emerald-700">{matchedCount} Invoices</div>
            <div className="text-[11px] text-slate-500">100% Rate & Qty Alignment</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Discrepancies Flagged</div>
            <div className="text-xl font-bold text-rose-700">{flaggedCount} Flagged</div>
            <div className="text-[11px] text-slate-500">Tare/Overbill Docking Active</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Tolerance Guardrail</div>
            <div className="text-xl font-bold text-[#122b45]">0% Price / +5% Gate</div>
            <div className="text-[11px] text-slate-500">CPWD DSR Strict Norms</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Net Reconciled Outflow</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalNetPayable / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-purple-700 font-medium">After Retention & Advances</div>
          </div>
        </div>
      </div>

      {/* 3-Way Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Three-Way Matching Ledger (PO vs. Gate GRN vs. Vendor Invoice)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Automated verification of rates and quantities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-28">PO Number</th>
                <th className="py-3 px-3 w-28">GRN Number</th>
                <th className="py-3 px-3 w-28">Invoice No</th>
                <th className="py-3 px-4 min-w-[180px]">Supplier & Material</th>
                <th className="py-3 px-3 text-right">PO Qty</th>
                <th className="py-3 px-3 text-right">Gate Accepted</th>
                <th className="py-3 px-3 text-right">Invoice Qty</th>
                <th className="py-3 px-3 text-right">Unit Rate</th>
                <th className="py-3 px-3 text-center">Match Status</th>
                <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">Net Payable (₹)</th>
                <th className="py-3 px-3 text-center">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {items.map((row) => {
                const isMatch = row.reconciliationStatus === "PERFECT_MATCH";
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{row.poNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{row.grnNumber}</td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">{row.vendorInvoiceNumber}</td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{row.vendorName}</div>
                      <div className="text-[11px] text-slate-500">{row.materialName}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {row.poOrderedQuantity}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {row.grnAcceptedQuantity}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {row.invoiceBilledQuantity}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      ₹{row.invoiceBilledRateINR.toLocaleString("en-IN")}
                    </td>

                    {/* Match Status */}
                    <td className="py-3 px-3 text-center">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>3-WAY MATCH</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>VARIANCE (+{row.quantityVariance})</span>
                        </span>
                      )}
                    </td>

                    {/* Net Payable */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45] text-sm bg-blue-50/30">
                      ₹{row.netPayableToVendorINR.toLocaleString("en-IN")}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedItem(row);
                          setShowCertificateModal(true);
                        }}
                        className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                      >
                        Settlement
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Alert Callout Box */}
      {items.some((i) => i.reconciliationStatus === "VARIANCE_FLAGGED") && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Automated Discrepancy & Overbilling Prevention Guardrail Active:</span>
          </div>
          {items
            .filter((i) => i.reconciliationStatus === "VARIANCE_FLAGGED")
            .map((flagged) => (
              <div key={flagged.id} className="bg-white/80 p-3 rounded-lg border border-amber-200">
                <div className="font-semibold text-slate-900">
                  {flagged.vendorName} ({flagged.vendorInvoiceNumber} vs. {flagged.grnNumber}):
                </div>
                <div className="text-slate-700 mt-0.5 leading-relaxed">
                  {flagged.discrepancyNote}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FINAL COMMERCIAL SETTLEMENT & RETENTION RELEASE CERTIFICATE         */}
      {/* ========================================================================= */}
      {showCertificateModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Final Commercial Settlement & Payment Certificate — {selectedItem.vendorInvoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCertificate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans border p-6 rounded-lg bg-white shadow-sm">
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-[#10263d]">OSTAAD INFRASTRUCTURE DEVELOPERS LTD.</h1>
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • Commercial Finance & Accounts Division</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  FINAL COMMERCIAL SETTLEMENT & RTGS PAYMENT AUTHORIZATION
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>Vendor: <strong>{selectedItem.vendorName}</strong></div>
                  <div>Invoice Ref: <strong className="font-mono">{selectedItem.vendorInvoiceNumber}</strong></div>
                  <div>PO Number: <strong className="font-mono">{selectedItem.poNumber}</strong></div>
                </div>
                <div className="text-right">
                  <div>Gate GRN Ref: <strong className="font-mono">{selectedItem.grnNumber}</strong></div>
                  <div>Material: <strong>{selectedItem.materialName}</strong></div>
                  <div>Reconciliation: <strong className="text-emerald-700">{selectedItem.reconciliationStatus}</strong></div>
                </div>
              </div>

              {/* Deduction & Settlement Table */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Final Valuation Ledger:</h4>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 font-medium">1. Gross Gate Accepted Value ({selectedItem.grnAcceptedQuantity} units @ ₹{selectedItem.invoiceBilledRateINR}):</td>
                      <td className="p-2 text-right font-mono font-bold">₹{selectedItem.grnAcceptedValueINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">2. Less: Retention Money Withheld (5.00%):</td>
                      <td className="p-2 text-right font-mono text-rose-700">-₹{selectedItem.retentionDeductionINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">3. Less: Mobilization Advance Recovery:</td>
                      <td className="p-2 text-right font-mono text-rose-700">-₹{selectedItem.advanceAdjustedINR.toLocaleString("en-IN")}</td>
                    </tr>
                    {selectedItem.quantityVariance > 0 && (
                      <tr className="bg-amber-50">
                        <td className="p-2 font-medium text-amber-900">4. Less: Overbilled Quantity Docking ({selectedItem.quantityVariance} units):</td>
                        <td className="p-2 text-right font-mono text-amber-900 font-bold">-₹{(selectedItem.quantityVariance * selectedItem.invoiceBilledRateINR).toLocaleString("en-IN")}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-sm text-slate-900">NET AMOUNT RELEASED FOR BANK RTGS:</td>
                      <td className="p-2.5 text-right font-mono text-base text-[#122b45]">
                        ₹{selectedItem.netPayableToVendorINR.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 mt-8">
                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Rajesh Sharma
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Project Manager
                  </div>
                  <div className="text-[10px] text-slate-500">Commercial Verified</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Gate Storekeeper
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Site Storekeeper
                  </div>
                  <div className="text-[10px] text-slate-500">Weighbridge GRN Match</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                      AUTHORIZED FOR RTGS
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Chief Financial Officer
                  </div>
                  <div className="text-[10px] text-slate-500">Bank Disbursement Released</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
