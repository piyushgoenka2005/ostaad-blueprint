"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Download,
  Building,
  ArrowRight,
  TrendingDown,
  Clock,
  X,
  FileCheck2,
  DollarSign,
} from "lucide-react";
import {
  BankDisbursementRecord,
  AuthorisedPurchaseOrder,
  DEFAULT_PAYMENTS_LEDGER,
} from "@/lib/commercial-finance";

interface StagedPaymentBankLedgerProps {
  payments: BankDisbursementRecord[];
  orders: AuthorisedPurchaseOrder[];
  onUpdatePayments: (payments: BankDisbursementRecord[]) => void;
}

export default function StagedPaymentBankLedger({
  payments,
  orders,
  onUpdatePayments,
}: StagedPaymentBankLedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("ALL");
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // New Payment Form State
  const [newPayment, setNewPayment] = useState({
    transactionRefUTR: `HDFCR52026030${Date.now().toString().slice(-5)}`,
    poNumber: orders[0]?.poNumber || "PO-2026-PUN-0101",
    paymentType: "PROGRESSIVE_STAGE" as const,
    amountINR: 500000,
    paymentMode: "RTGS" as const,
    notes: "Progressive stage milestone disbursement approved by Finance.",
  });

  const selectedTargetPO = useMemo(() => {
    return orders.find((o) => o.poNumber === newPayment.poNumber) || orders[0];
  }, [orders, newPayment.poNumber]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.transactionRefUTR.toLowerCase().includes(q) ||
        p.poNumber.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q);
      const matchesType = paymentTypeFilter === "ALL" || p.paymentType === paymentTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [payments, searchQuery, paymentTypeFilter]);

  const totalDisbursedINR = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amountINR, 0);
  }, [payments]);

  const totalAdvanceINR = useMemo(() => {
    return payments
      .filter((p) => p.paymentType === "ADVANCE_PAYMENT")
      .reduce((sum, p) => sum + p.amountINR, 0);
  }, [payments]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetPO || !newPayment.amountINR) return;

    const record: BankDisbursementRecord = {
      id: `pay-${Date.now()}`,
      transactionRefUTR: newPayment.transactionRefUTR,
      poNumber: selectedTargetPO.poNumber,
      vendorName: selectedTargetPO.vendorName,
      vendorGstin: selectedTargetPO.vendorGstin,
      bankName: "HDFC Bank Ltd (Corporate Client A/C)",
      beneficiaryAccountNo: selectedTargetPO.vendorBankDetails,
      paymentType: newPayment.paymentType,
      amountINR: Number(newPayment.amountINR),
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMode: newPayment.paymentMode,
      status: "SETTLED",
      approvedBy: "Sunil K. Mehta (CFO)",
      notes: newPayment.notes,
    };

    onUpdatePayments([record, ...payments]);
    setShowAddPaymentModal(false);
  };

  const exportPaymentsCSV = () => {
    const headers = [
      "Bank UTR Ref",
      "PO Number",
      "Supplier Name",
      "Supplier GSTIN",
      "Payment Type",
      "Amount (INR)",
      "Payment Date",
      "Mode",
      "Status",
      "Authorised By",
      "Notes",
    ];
    const rows = payments.map((p) => [
      p.transactionRefUTR,
      p.poNumber,
      `"${p.vendorName}"`,
      p.vendorGstin,
      p.paymentType,
      p.amountINR,
      p.paymentDate,
      p.paymentMode,
      p.status,
      `"${p.approvedBy}"`,
      `"${p.notes}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bank_Disbursements_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
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
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sub-Module 6.4
            </span>
            <span className="text-xs text-slate-500 font-medium">Immutable Bank Transaction Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Staged Payments, Mobilization Advances & Bank Ledger
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Audit-compliant tracking of RTGS/NEFT disbursements linked to approved Purchase Orders and bank UTR reference numbers.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportPaymentsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddPaymentModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Bank Outflow</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Settled Outflows</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalDisbursedINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">All Bank UTRs Reconciled</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Mobilization Advance Deposits</div>
            <div className="text-xl font-bold text-amber-700">
              ₹{(totalAdvanceINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-slate-500">Amortized against running bills</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Processed Transactions</div>
            <div className="text-xl font-bold text-[#122b45]">{payments.length} Payments</div>
            <div className="text-[11px] text-slate-500">RTGS / NEFT Real-Time Clearing</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search UTR number, PO number, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Payment Types</option>
            <option value="ADVANCE_PAYMENT">Mobilization Advance Only</option>
            <option value="PROGRESSIVE_STAGE">Progressive Stage Invoices</option>
            <option value="RETENTION_RELEASE">Retention Releases</option>
            <option value="FINAL_SETTLEMENT">Final Settlements</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-36">Bank UTR Number</th>
                <th className="py-3 px-3 w-28">PO Number</th>
                <th className="py-3 px-4 min-w-[200px]">Beneficiary Vendor</th>
                <th className="py-3 px-3 w-32">Payment Type</th>
                <th className="py-3 px-3 w-28 text-center">Mode</th>
                <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">Disbursed (₹)</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-4 min-w-[200px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {pay.transactionRefUTR}
                    <div className="text-[10px] text-slate-400 font-sans font-normal">{pay.paymentDate}</div>
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                    {pay.poNumber}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{pay.vendorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">GST: {pay.vendorGstin}</div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        pay.paymentType === "ADVANCE_PAYMENT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {pay.paymentType.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                    {pay.paymentMode}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 text-sm bg-blue-50/30">
                    ₹{pay.amountINR.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{pay.status}</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-600 text-[11px] leading-snug">
                    {pay.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RECORD BANK DISBURSEMENT                                           */}
      {/* ========================================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Record Bank Outflow & UTR Entry</h3>
              </div>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Purchase Order</label>
                <select
                  value={newPayment.poNumber}
                  onChange={(e) => setNewPayment({ ...newPayment, poNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.poNumber}>
                      {o.poNumber} — {o.vendorName} ({o.materialName})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTargetPO && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <div>Vendor: <strong>{selectedTargetPO.vendorName}</strong></div>
                  <div>Account: <strong className="font-mono">{selectedTargetPO.vendorBankDetails}</strong></div>
                  <div>Order Value: <strong className="font-mono">₹{selectedTargetPO.totalOrderValueINR.toLocaleString("en-IN")}</strong></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank UTR Transaction Ref</label>
                  <input
                    type="text"
                    required
                    value={newPayment.transactionRefUTR}
                    onChange={(e) => setNewPayment({ ...newPayment, transactionRefUTR: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursement Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPayment.amountINR}
                    onChange={(e) => setNewPayment({ ...newPayment, amountINR: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Stage Type</label>
                  <select
                    value={newPayment.paymentType}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentType: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="ADVANCE_PAYMENT">Mobilization Advance Deposit</option>
                    <option value="PROGRESSIVE_STAGE">Progressive Stage Milestone</option>
                    <option value="RETENTION_RELEASE">Retention Release</option>
                    <option value="FINAL_SETTLEMENT">Final Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={newPayment.paymentMode}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMode: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  >
                    <option value="RTGS">RTGS Real-Time Gross Settlement</option>
                    <option value="NEFT">NEFT National Electronic Funds Transfer</option>
                    <option value="CHEQUE">Corporate Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Finance Auditable Note</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cleared via HDFC Bank corporate portal after resident engineer site verification..."
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Save Transaction Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

