"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Download,
  Building2,
  Calendar,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Award,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { AuthorisedPurchaseOrder } from "@/lib/commercial-finance";

interface AuthorisedPOGeneratorProps {
  orders: AuthorisedPurchaseOrder[];
}

export default function AuthorisedPOGenerator({ orders }: AuthorisedPOGeneratorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPO, setSelectedPO] = useState<AuthorisedPurchaseOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      return (
        o.poNumber.toLowerCase().includes(q) ||
        o.vendorName.toLowerCase().includes(q) ||
        o.materialName.toLowerCase().includes(q) ||
        o.costCode.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  const totalPOValue = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.totalOrderValueINR, 0);
  }, [orders]);

  const handlePrintPO = () => {
    window.print();
  };

  const exportPOsCSV = () => {
    const headers = [
      "PO Number",
      "PO Date",
      "Supplier Name",
      "Supplier GSTIN",
      "Cost Code",
      "Material Name",
      "Quantity",
      "UOM",
      "Landed Rate (INR)",
      "Total Value (INR)",
      "Payment Terms",
      "Delivery Site",
      "Status",
      "Authorised By",
    ];
    const rows = orders.map((o) => [
      o.poNumber,
      o.poDate,
      `"${o.vendorName}"`,
      o.vendorGstin,
      o.costCode,
      `"${o.materialName}"`,
      o.quantity,
      o.standardUOM,
      o.netLandedRateINR,
      o.totalOrderValueINR,
      `"${o.paymentTerms}"`,
      `"${o.deliverySiteGodown}"`,
      o.status,
      `"${o.authorisedByFinance}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Authorised_Purchase_Orders_${new Date().toISOString().split("T")[0]}.csv`);
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
              Sub-Module 6.3
            </span>
            <span className="text-xs text-slate-500 font-medium">Legally Binding Contract Orders</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Authorised Purchase Order (PO) Registry & Dispatch
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Auto-generated upon Finance approval with GSTIN compliance, delivery schedules, liquidated damages clauses, and digital stamps.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportPOsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Purchase Orders Released</div>
            <div className="text-xl font-bold text-[#122b45]">{orders.length} Legally Binding POs</div>
            <div className="text-[11px] text-slate-500">100% Finance Dual-Control Verified</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Order Value Released</div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{(totalPOValue / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">₹{totalPOValue.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Active Field Deliveries</div>
            <div className="text-xl font-bold text-amber-700">
              {orders.filter((o) => o.status === "PARTIALLY_DELIVERED" || o.status === "RELEASED_TO_VENDOR").length} Orders
            </div>
            <div className="text-[11px] text-slate-500">Linked to Site Gate GRN module</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO number, supplier, or material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-32">PO Number</th>
                <th className="py-3 px-3 w-28">PO Date</th>
                <th className="py-3 px-4 min-w-[200px]">Supplier Details</th>
                <th className="py-3 px-4 min-w-[220px]">Material & Quantity</th>
                <th className="py-3 px-3 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">Total Order Value (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    {order.poNumber}
                  </td>

                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {order.poDate}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{order.vendorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">GSTIN: {order.vendorGstin}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{order.materialName}</div>
                    <div className="text-[11px] text-blue-700 font-mono mt-0.5">
                      {order.quantity.toLocaleString("en-IN")} {order.standardUOM}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{order.netLandedRateINR.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45] text-sm bg-blue-50/30">
                    ₹{order.totalOrderValueINR.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.status === "PARTIALLY_DELIVERED"
                          ? "bg-amber-100 text-amber-800"
                          : order.status === "RELEASED_TO_VENDOR"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => setSelectedPO(order)}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition"
                    >
                      View PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL PURCHASE ORDER CERTIFICATE                                */}
      {/* ========================================================================= */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Official Authorised Purchase Order — {selectedPO.poNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPO}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO</span>
                </button>
                <button
                  onClick={() => setSelectedPO(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans border p-6 rounded-lg bg-white shadow-sm">
              {/* Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-[#10263d]">OSTAAD INFRASTRUCTURE DEVELOPERS LTD.</h1>
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • GSTIN: 27AABCO1234F1Z8</p>
                <p className="text-[11px] text-slate-500">Corporate Tower B, 14th Floor, Senapati Bapat Marg, Pune, Maharashtra 411016</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  AUTHORISED PURCHASE ORDER (COMMERCIAL COMMITMENT)
                </div>
              </div>

              {/* Meta Data */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>PO Number: <strong className="font-mono">{selectedPO.poNumber}</strong></div>
                  <div>PO Date: <strong>{selectedPO.poDate}</strong></div>
                  <div>Project: <strong>{selectedPO.projectName}</strong> ({selectedPO.projectCode})</div>
                  <div>Cost Code: <strong className="font-mono">{selectedPO.costCode}</strong></div>
                </div>
                <div>
                  <div>Vendor: <strong>{selectedPO.vendorName}</strong></div>
                  <div>Vendor GSTIN: <strong className="font-mono">{selectedPO.vendorGstin}</strong></div>
                  <div>Delivery Site: <strong>{selectedPO.deliverySiteGodown}</strong></div>
                  <div>Bank Mandate: <strong>{selectedPO.vendorBankDetails}</strong></div>
                </div>
              </div>

              {/* Item Details Table */}
              <div>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2">Item Description & Specification</th>
                      <th className="p-2 text-center">Qty / UOM</th>
                      <th className="p-2 text-right">Base Rate</th>
                      <th className="p-2 text-right">Freight</th>
                      <th className="p-2 text-center">GST %</th>
                      <th className="p-2 text-right">Net Landed Rate</th>
                      <th className="p-2 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2">
                        <div className="font-bold">{selectedPO.materialName}</div>
                        <div className="text-[11px] text-slate-500">{selectedPO.technicalSpecification}</div>
                      </td>
                      <td className="p-2 text-center font-mono font-bold">
                        {selectedPO.quantity.toLocaleString("en-IN")} {selectedPO.standardUOM}
                      </td>
                      <td className="p-2 text-right font-mono">₹{selectedPO.baseRateINR.toLocaleString("en-IN")}</td>
                      <td className="p-2 text-right font-mono">₹{selectedPO.freightINR.toLocaleString("en-IN")}</td>
                      <td className="p-2 text-center font-mono">{selectedPO.gstPercent}%</td>
                      <td className="p-2 text-right font-mono font-bold">₹{selectedPO.netLandedRateINR.toLocaleString("en-IN")}</td>
                      <td className="p-2 text-right font-mono font-bold text-sm">₹{selectedPO.totalOrderValueINR.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Commercial Terms */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">Commercial Terms & Conditions:</div>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5 text-[11px]">
                  <li><strong>Payment Schedule:</strong> {selectedPO.paymentTerms}.</li>
                  <li><strong>Delivery Terms:</strong> {selectedPO.deliverySchedule}. Delivered at {selectedPO.deliverySiteGodown}.</li>
                  <li><strong>Quality & Test Certificates:</strong> NABL accredited batch test certificates must accompany each transit vehicle.</li>
                  <li><strong>Liquidated Damages:</strong> 0.5% per week of delay subject to a maximum of 5% of order value.</li>
                  <li><strong>Weighbridge Inspection:</strong> Net payable quantity determined strictly by Site Gate weighbridge GRN.</li>
                </ul>
              </div>

              {/* Digital Stamp Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200 mt-8">
                <div>
                  <div className="h-16 flex items-end font-mono text-slate-500 italic text-[11px]">
                    Accepted & Acknowledged by Vendor
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Authorized Signatory (Supplier)
                  </div>
                  <div className="text-[10px] text-slate-500">Stamp & Seal Required upon receipt</div>
                </div>

                <div className="text-right">
                  <div className="h-16 flex flex-col justify-end items-end">
                    <span className="inline-block px-3 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold font-mono text-[10px]">
                      {selectedPO.digitalStampCode}
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    {selectedPO.authorisedByFinance}
                  </div>
                  <div className="text-[10px] text-slate-500">Chief Financial Controller • Dual-Control Approved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
