"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  BadgeIndianRupee,
  LogOut,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  Building,
  Check,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  Receipt,
} from "lucide-react";
import {
  getAuthSession,
  clearAuthSession,
  UserProfile,
  PendingPO,
  getPendingFinancePOs,
  approveFinancePO,
  rejectFinancePO,
  recordFinancePayment,
  reconcileInvoice,
  settlePOFinalBalance,
} from "@/lib/api";

export default function FinanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Pending POs
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Approval Form State
  const [selectedPO, setSelectedPO] = useState<PendingPO | null>(null);
  const [advancePct, setAdvancePct] = useState(25);
  const [bankName, setBankName] = useState("Axis Bank Corporate - Escrow");
  const [utrNumber, setUtrNumber] = useState("AXIS-UTR-2026-9921");
  const [paymentStructure, setPaymentStructure] = useState<"PART_BY_PART" | "ADVANCE_ONLY">("PART_BY_PART");

  // Rejection Form State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("Budget ceiling exceeded for Q3 concrete packages. Negotiate freight with vendor.");

  // Two-Way Match State
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-ULTRA-8891");
  const [invoiceDate, setInvoiceDate] = useState("2026-10-27");
  const [billedQty, setBilledQty] = useState(1320);
  const [billedRate, setBilledRate] = useState(454.40);
  const [settlementUTR, setSettlementUTR] = useState("HDFC-SETTLE-881923");
  const [settledSuccess, setSettledSuccess] = useState<string | null>(null);

  useEffect(() => {
    const { token, user: activeUser } = getAuthSession();
    if (!token || !activeUser) {
      router.push("/login");
      return;
    }
    setUser(activeUser);
    loadPending();
  }, [router]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const pos = await getPendingFinancePOs();
      setPendingPOs(pos);
      if (pos.length > 0) {
        setSelectedPO(pos[0]);
      } else {
        // Fallback default demo proposal if none in DB
        const demoPO: PendingPO = {
          id: "po-demo-default-01",
          po_number: "PO-7D82D8-0001",
          project_id: "proj-demo-101",
          vendor_name: "Ultratech Cement Ltd",
          total_amount: 604806.40,
          manager_notes: "Direct factory gate quote from Ultratech dispatch desk. 48hr delivery guaranteed.",
          status: "PENDING_FINANCE_APPROVAL",
        };
        setPendingPOs([demoPO]);
        setSelectedPO(demoPO);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const handleApprovePO = async () => {
    if (!selectedPO) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await approveFinancePO({
        po_id: selectedPO.id,
        finance_user_id: user?.id || "user-fin-01",
        payment_structure: paymentStructure,
        advance_percentage: advancePct,
      });

      const advAmount = Math.round((selectedPO.total_amount * advancePct) / 100);
      await recordFinancePayment({
        po_id: selectedPO.id,
        stage_type: "ADVANCE",
        amount: advAmount,
        payment_method: "BANK_TRANSFER_RTGS",
        transaction_ref: utrNumber,
        bank_name: bankName,
        notes: `Initial ${advancePct}% advance disbursed via ${bankName}. UTR: ${utrNumber}`,
      });

      setFeedback({
        type: "success",
        message: `✔ Purchase Order ${selectedPO.po_number} APPROVED! Disbursed ₹${advAmount.toLocaleString()} advance via ${utrNumber}. Dispatched to vendor via mock WhatsApp/Email. Site storekeeper is now unlocked to receive physical goods.`,
      });

      // Reload
      loadPending();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to approve PO.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPO = async () => {
    if (!selectedPO) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await rejectFinancePO({
        po_id: selectedPO.id,
        finance_user_id: user?.id || "user-fin-01",
        rejection_reason: rejectReason,
      });

      setFeedback({
        type: "error",
        message: `PO proposal ${selectedPO.po_number} DECLINED. Rejection reason has been sent as a real-time notification to the Project Manager's portal.`,
      });
      setShowRejectModal(false);
      loadPending();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to reject PO.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconcileAndSettle = async () => {
    setActionLoading(true);
    setSettledSuccess(null);
    try {
      const poId = selectedPO?.id || "po-demo-default-01";
      await reconcileInvoice({
        po_id: poId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        billed_quantity: billedQty,
        billed_unit_rate: billedRate,
        gst_amount: Math.round(billedQty * billedRate * 0.28),
        total_invoice_amount: Math.round(billedQty * billedRate * 1.28),
        verified_by_user_id: user?.id || "user-fin-01",
      });

      await settlePOFinalBalance({
        po_id: poId,
        payment_method: "BANK_TRANSFER_RTGS",
        transaction_ref: settlementUTR,
        bank_name: "Axis Bank Corporate - Escrow",
        settled_by_user_id: user?.id || "user-fin-01",
      });

      setSettledSuccess(`✔ Two-Way Match Reconciliation Complete! Final balance disbursed via UTR ${settlementUTR}. Purchase Order is now FULLY_SETTLED and closed.`);
    } catch (err: any) {
      alert("Reconciliation error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const advanceAmount = selectedPO ? Math.round((selectedPO.total_amount * advancePct) / 100) : 0;
  const balanceRemaining = selectedPO ? selectedPO.total_amount - advanceAmount : 0;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Top Navbar */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Finance Department
              </span>
            </div>
            <p className="text-xs text-slate-400">Budget Clearance, Advance Disbursals & Two-Way Match Reconciliation</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              SI
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Sunita Iyer"}</div>
              <div className="text-[10px] text-slate-400">Head of Finance (CFO)</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-lg ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Section 1: Pending Slip Approval Hub */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                ● Action Required
              </span>
              <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <BadgeIndianRupee className="w-5 h-5 text-emerald-400" />
                Pending Purchase Order Slip Approval Hub
              </h2>
              <p className="text-xs text-slate-400">
                Review proposed supplier quotes submitted by the Managing Authority. Authorize payment terms & advance bank disbursement.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">
              {pendingPOs.length} Pending Proposal(s)
            </span>
          </div>

          {selectedPO ? (
            <div className="p-6 rounded-xl bg-slate-950/80 border border-white/10 space-y-6">
              {/* Proposal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="text-xs text-slate-400 font-mono">PO Number</div>
                  <div className="text-lg font-bold font-mono text-sky-400">{selectedPO.po_number}</div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Supplier: <strong>{selectedPO.vendor_name}</strong> (Rank L1 Preferred)
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs text-slate-400">Proposed Landed Amount</div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    ₹{selectedPO.total_amount?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">Includes 28% GST & Freight</div>
                </div>
              </div>

              {/* PM Notes */}
              {selectedPO.manager_notes && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300">
                  <strong className="text-sky-300 font-mono">Project Manager Justification:</strong> {selectedPO.manager_notes}
                </div>
              )}

              {/* Payment Terms Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Payment Structure</label>
                  <select
                    value={paymentStructure}
                    onChange={(e: any) => setPaymentStructure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                  >
                    <option value="PART_BY_PART">Part-by-Part (Advance + Milestone)</option>
                    <option value="ADVANCE_ONLY">100% Full Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Advance Release Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={advancePct}
                    onChange={(e) => setAdvancePct(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Disbursing Corporate Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bank Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. AXIS-UTR-2026-9921"
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>

              {/* Disbursal Summary */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Immediate Advance Disbursal:</span>{" "}
                  <strong className="text-emerald-400 font-mono text-sm">
                    ₹{advanceAmount.toLocaleString()} ({advancePct}%)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Remaining Balance upon Delivery:</span>{" "}
                  <strong className="text-slate-200 font-mono text-sm">
                    ₹{balanceRemaining.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Approval Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Decline Proposal
                </button>

                <button
                  onClick={handleApprovePO}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {actionLoading ? "Processing..." : "✔ Approve Slip & Release Advance"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No purchase order proposals currently awaiting finance clearance.
            </div>
          )}
        </div>

        {/* Section 2: Two-Way Match Invoice Audit & PO Settlement */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-400" />
              Two-Way Match Reconciliation & PO Final Closure
            </h2>
            <p className="text-xs text-slate-400">
              Match vendor tax invoice against physical net accepted goods at the site store (capping quantity and rate). Disburse remaining balance with bank UTR.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/80 border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Vendor Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Physical Billed Qty (Bags)</label>
                <input
                  type="number"
                  value={billedQty}
                  onChange={(e) => setBilledQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Billed Unit Rate (₹/Bag)</label>
                <input
                  type="number"
                  step="0.1"
                  value={billedRate}
                  onChange={(e) => setBilledRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Final Settlement Bank UTR Reference</label>
              <input
                type="text"
                value={settlementUTR}
                onChange={(e) => setSettlementUTR(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
              <div className="text-xs text-slate-400">
                Net Match Status: <strong className="text-emerald-400">Quantity & Rate Audited • Capped at PO Baseline</strong>
              </div>
              <button
                onClick={handleReconcileAndSettle}
                disabled={actionLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {actionLoading ? "Reconciling..." : "Disburse Final Settlement UTR & Close PO"}
              </button>
            </div>

            {settledSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{settledSuccess}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              Decline Purchase Order Proposal
            </h3>
            <p className="text-xs text-slate-400">
              Provide an audit decline reason. This will be transmitted immediately to the Project Manager's dashboard.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPO}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs text-white font-semibold"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
