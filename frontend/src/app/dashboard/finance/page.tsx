"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeIndianRupee,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  X,
  XCircle,
} from "lucide-react";
import {
  approveFinancePO,
  clearAuthSession,
  getAuthSession,
  getFinanceOrders,
  PendingPO,
  rejectFinancePO,
  requestFinanceClarification,
  UserProfile,
} from "@/lib/api";

type DecisionAction = "reject" | "clarification" | null;

const statusLabels: Record<string, string> = {
  PENDING_FINANCE_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function money(value: number | undefined) {
  return value == null ? "Not available" : `₹${value.toLocaleString("en-IN")}`;
}

export default function FinanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<PendingPO[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PendingPO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmApproval, setConfirmApproval] = useState(false);
  const [decisionAction, setDecisionAction] = useState<DecisionAction>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [paymentStructure, setPaymentStructure] = useState<"PART_BY_PART" | "ADVANCE_ONLY">("PART_BY_PART");
  const [advancePct, setAdvancePct] = useState(0);
  const [requestView, setRequestView] = useState<"all" | "pending" | "history" | "purchase-orders">("all");

  const loadOrders = async () => {
    setRefreshing(true);
    try {
      const data = await getFinanceOrders();
      setOrders(data);
      setSelectedOrder((current) => data.find((order) => order.id === current?.id) || data.find((order) => order.status === "PENDING_FINANCE_APPROVAL") || data[0] || null);
    } catch (error: any) {
      setFeedback({ type: "error", message: error.message || "Unable to load Finance approvals." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const session = getAuthSession();
    if (!session.token || !session.user) {
      router.push("/login");
      return;
    }
    setUser(session.user);
    loadOrders();
  }, [router]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesView = requestView === "all"
        || (requestView === "pending" && order.status === "PENDING_FINANCE_APPROVAL")
        || (requestView === "history" && order.status !== "PENDING_FINANCE_APPROVAL")
        || (requestView === "purchase-orders" && order.status === "APPROVED");
      const matchesSearch = !query || [order.po_number, order.project_id, order.material_name, order.vendor_name].some((value) => value?.toLowerCase().includes(query));
      return matchesView && matchesSearch;
    });
  }, [orders, requestView, search]);

  const pending = orders.filter((order) => order.status === "PENDING_FINANCE_APPROVAL");
  const approved = orders.filter((order) => order.status === "APPROVED");
  const rejected = orders.filter((order) => order.status === "REJECTED");
  const pendingValue = pending.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const chooseOrder = (order: PendingPO) => {
    setSelectedOrder(order);
    setFeedback(null);
  };

  const approveSelected = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await approveFinancePO({
        po_id: selectedOrder.id,
        finance_user_id: user?.id || "user-fin-01",
        payment_structure: paymentStructure,
        advance_percentage: advancePct,
      });
      setConfirmApproval(false);
      setFeedback({ type: "success", message: `${selectedOrder.po_number} approved. Awaiting purchase order creation.` });
      await loadOrders();
    } catch (error: any) {
      setFeedback({ type: "error", message: error.message || "Approval could not be completed." });
    } finally {
      setActionLoading(false);
    }
  };

  const submitDecisionRequest = async () => {
    if (!selectedOrder || !decisionAction || !decisionReason.trim()) return;
    setActionLoading(true);
    try {
      if (decisionAction === "reject") {
        await rejectFinancePO({ po_id: selectedOrder.id, finance_user_id: user?.id || "user-fin-01", rejection_reason: decisionReason.trim() });
        setFeedback({ type: "success", message: `${selectedOrder.po_number} rejected and returned with the recorded reason.` });
      } else {
        await requestFinanceClarification({ po_id: selectedOrder.id, finance_user_id: user?.id || "user-fin-01", clarification_reason: decisionReason.trim() });
        setFeedback({ type: "success", message: `Clarification requested for ${selectedOrder.po_number}. The order remains pending.` });
      }
      setDecisionAction(null);
      setDecisionReason("");
      await loadOrders();
    } catch (error: any) {
      setFeedback({ type: "error", message: error.message || "The decision could not be recorded." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleNav = (view: typeof requestView) => {
    setRequestView(view);
    setMobileNav(false);
    document.getElementById(view === "all" ? "finance-top" : "approval-requests")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sidebar = (
    <aside className={`${mobileNav ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-[#10263d] text-white`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#12304c]"><BuildingIcon /></div>
        <div><div className="text-lg font-bold tracking-tight">Ostaad</div><div className="text-[10px] text-slate-300">Construction ERP</div></div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5 text-sm">
        <NavItem icon={LayoutDashboard} label="Finance Dashboard" active={requestView === "all"} onClick={() => handleNav("all")} />
        <NavItem icon={Clock3} label="Pending Approvals" count={pending.length} active={requestView === "pending"} onClick={() => handleNav("pending")} />
        <NavItem icon={History} label="Approval History" active={requestView === "history"} onClick={() => handleNav("history")} />
        <NavItem icon={ShoppingCart} label="Purchase Orders" active={requestView === "purchase-orders"} onClick={() => handleNav("purchase-orders")} />
        <NavItem icon={BadgeIndianRupee} label="Budgets" onClick={() => { setFeedback({ type: "error", message: "Budget records are not available for this request." }); setMobileNav(false); }} />
        <NavItem icon={ReceiptText} label="Reports" onClick={() => { setFeedback({ type: "error", message: "Finance reports are not available for this request." }); setMobileNav(false); }} />
      </nav>
      <div className="border-t border-white/10 p-5 text-[11px] text-slate-300">Finance control centre<br /><span className="text-slate-400">Approval decisions are auditable</span></div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-800">
      {sidebar}
      {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" />}
      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
            <div className="relative hidden w-[360px] md:block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO, project, vendor..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></div>
          </div>
          <div className="flex items-center gap-4"><button className="relative text-slate-500"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="hidden text-right sm:block"><div className="text-xs font-semibold text-slate-800">{user?.full_name || "Finance Manager"}</div><div className="text-[10px] text-slate-500">Finance Approver</div></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#12304c] text-xs font-bold text-white">{(user?.full_name || "FM").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><button onClick={() => { clearAuthSession(); router.push("/login"); }} className="text-slate-400 hover:text-rose-500" title="Sign out"><LogOut className="h-4 w-4" /></button></div>
        </header>

        <main id="finance-top" className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><div className="mb-1 flex items-center gap-2 text-xs text-slate-500"><span>Finance Department</span><ChevronRight className="h-3 w-3" /><span>Procurement Approval</span></div><h1 className="text-2xl font-bold tracking-tight text-[#122b45]">Procurement Approval</h1><p className="mt-1 text-sm text-slate-500">Review vendor selections, verify financial commitments, and approve before purchase orders are created.</p></div><button onClick={loadOrders} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">{refreshing ? "Refreshing..." : "Refresh approvals"}</button></div>
          {feedback && <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}><AlertCircle className="h-4 w-4" />{feedback.message}</div>}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Clock3} label="Pending Approval Requests" value={pending.length} tone="amber" note="Awaiting Finance review" />
            <SummaryCard icon={CheckCircle2} label="Approved Requests" value={approved.length} tone="emerald" note="Released to procurement" />
            <SummaryCard icon={XCircle} label="Rejected Requests" value={rejected.length} tone="rose" note="Returned with reason" />
            <SummaryCard icon={BadgeIndianRupee} label="Total Value Awaiting Approval" value={money(pendingValue)} tone="blue" note="From current PO records" />
          </section>

          <section id="approval-requests" className="scroll-mt-24 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(460px,0.9fr)]">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-[#122b45]">Approval Requests</h2><p className="mt-1 text-xs text-slate-500">Every submitted material PO is reviewed independently.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">{filteredOrders.length} records</span></div>
              <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Request / PO</th><th className="px-4 py-3">Material / Vendor</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredOrders.map((order) => <tr key={order.id} className={selectedOrder?.id === order.id ? "bg-blue-50/60" : "hover:bg-slate-50"}><td className="px-4 py-4"><button onClick={() => chooseOrder(order)} className="font-semibold text-blue-700 hover:underline">{order.po_number}</button><div className="mt-1 text-[10px] text-slate-400">Project {order.project_id}</div></td><td className="px-4 py-4"><div className="font-medium text-slate-700">{order.material_name || "Not available"}</div><div className="mt-1 text-[10px] text-slate-500">{order.vendor_name}</div></td><td className="px-4 py-4 font-semibold text-slate-700">{money(order.total_amount)}</td><td className="px-4 py-4"><StatusPill status={order.status} /></td><td className="px-4 py-4"><button onClick={() => chooseOrder(order)} className="rounded-md border border-blue-200 px-2.5 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">View</button></td></tr>)}</tbody></table></div>
              <div className="space-y-3 p-4 md:hidden">{filteredOrders.map((order) => <button key={order.id} onClick={() => chooseOrder(order)} className="w-full rounded-lg border border-slate-200 p-4 text-left"><div className="flex justify-between"><span className="font-semibold text-blue-700">{order.po_number}</span><StatusPill status={order.status} /></div><div className="mt-2 text-sm font-medium">{order.material_name || "Purchase Order"}</div><div className="mt-1 text-xs text-slate-500">{order.vendor_name} · {money(order.total_amount)}</div></button>)}</div>
              {filteredOrders.length === 0 && <div className="p-12 text-center text-sm text-slate-400">No procurement requests found.</div>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><div className="flex items-center gap-2 text-xs text-blue-700"><button onClick={() => setSelectedOrder(null)} className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="h-3 w-3" />All requests</button></div><h2 className="mt-2 font-bold text-[#122b45]">Approval Detail</h2></div>{selectedOrder && <StatusPill status={selectedOrder.status} />}</div>
              {selectedOrder ? <DetailView order={selectedOrder} onApprove={() => setConfirmApproval(true)} onReject={() => { setDecisionReason(""); setDecisionAction("reject"); }} onClarify={() => { setDecisionReason(""); setDecisionAction("clarification"); }} /> : <div className="flex min-h-[480px] flex-col items-center justify-center p-8 text-center text-slate-400"><FileText className="mb-3 h-10 w-10 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Select an approval request</p><p className="mt-1 max-w-xs text-xs">Review its financial details and supporting source information here.</p></div>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600" /><div><h2 className="font-bold text-[#122b45]">Approval control</h2><p className="text-xs text-slate-500">Purchase orders are not created or released until Finance approves the submitted request.</p></div></div></section>
        </main>
      </div>

      {confirmApproval && selectedOrder && <Modal title="Confirm approval" description={`Approve ${selectedOrder.po_number} for purchase order creation? This decision will be recorded against your Finance account.`} onClose={() => setConfirmApproval(false)}><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-500">Payment structure<select value={paymentStructure} onChange={(event) => setPaymentStructure(event.target.value as "PART_BY_PART" | "ADVANCE_ONLY")} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><option value="PART_BY_PART">Part by part</option><option value="ADVANCE_ONLY">Advance only</option></select></label><label className="text-xs text-slate-500">Advance %<input type="number" min="0" max="100" value={advancePct} onChange={(event) => setAdvancePct(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700" /></label></div><button onClick={approveSelected} disabled={actionLoading} className="mt-5 w-full rounded-lg bg-[#12304c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{actionLoading ? "Recording approval..." : "Approve for Purchase Order Creation"}</button></Modal>}
      {decisionAction && selectedOrder && <Modal title={decisionAction === "reject" ? "Reject procurement request" : "Request clarification"} description={decisionAction === "reject" ? "A reason is required and will be sent back to the managing authority." : "The request will remain pending until the managing authority responds."} onClose={() => setDecisionAction(null)}><textarea autoFocus value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} rows={4} placeholder="Enter the reason..." className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400" /><button onClick={submitDecisionRequest} disabled={actionLoading || !decisionReason.trim()} className={`mt-4 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${decisionAction === "reject" ? "bg-rose-600" : "bg-blue-700"}`}>{actionLoading ? "Recording..." : decisionAction === "reject" ? "Confirm rejection" : "Send clarification request"}</button></Modal>}
    </div>
  );
}

function BuildingIcon() { return <div className="relative h-5 w-5"><div className="absolute bottom-0 left-1 h-4 w-3 rounded-sm bg-current" /><div className="absolute left-0 top-1 h-3 w-2 rounded-sm bg-current opacity-70" /><div className="absolute right-0 top-0 h-5 w-2 rounded-sm bg-current opacity-80" /></div>; }
function NavItem({ icon: Icon, label, active, count, onClick }: { icon: React.ElementType; label: string; active?: boolean; count?: number; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}{count ? <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{count}</span> : null}</button>; }
function SummaryCard({ icon: Icon, label, value, tone, note }: { icon: React.ElementType; label: string; value: string | number; tone: "amber" | "emerald" | "rose" | "blue"; note: string }) { const styles = { amber: "bg-amber-50 text-amber-600 border-amber-200", emerald: "bg-emerald-50 text-emerald-600 border-emerald-200", rose: "bg-rose-50 text-rose-600 border-rose-200", blue: "bg-blue-50 text-blue-600 border-blue-200" }; return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-[#122b45]">{value}</div><div className="mt-1 text-[10px] text-slate-400">{note}</div></div><div className={`rounded-lg border p-2 ${styles[tone]}`}><Icon className="h-4 w-4" /></div></div></div>; }
function StatusPill({ status }: { status?: string }) { const config = status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"; return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${config}`}>{statusLabels[status || ""] || "Unknown"}</span>; }
function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="font-bold text-[#122b45]">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>{children}</div></div>; }
function DetailView({ order, onApprove, onReject, onClarify }: { order: PendingPO; onApprove: () => void; onReject: () => void; onClarify: () => void }) { const pending = order.status === "PENDING_FINANCE_APPROVAL"; const checks = [{ label: "BOQ finalised", value: "Source not available" }, { label: "Quotation recorded", value: order.unit_rate != null ? "Available" : "Not available" }, { label: "Vendor selection complete", value: order.vendor_name ? "Available" : "Not available" }, { label: "Calculations checked", value: order.total_amount != null ? "Amount on PO record" : "Not available" }, { label: "Tax information reviewed", value: "Not available" }, { label: "Budget checked", value: "Budget data not available" }]; return <div className="space-y-5 p-5"><div className="grid grid-cols-2 gap-3"><Info label="Project ID" value={order.project_id} /><Info label="PO / Request" value={order.po_number} /><Info label="Material" value={order.material_name || "Not available"} /><Info label="Status" value={statusLabels[order.status] || "Unknown"} /></div><div className="rounded-lg border border-slate-200"><div className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-[#122b45]">Material-wise financial detail</div><div className="grid grid-cols-2 gap-3 p-4 text-xs"><Info label="Quantity / unit" value={`${order.quantity ?? "Not available"} ${order.uom || ""}`} /><Info label="Selected vendor" value={order.vendor_name || "Not available"} /><Info label="Quoted unit price" value={money(order.unit_rate)} /><Info label="Delivery charge" value="Not available" /><Info label="Tax" value="Not available" /><Info label="Final amount" value={money(order.total_amount)} /></div></div><div className="rounded-lg border border-slate-200"><div className="border-b border-slate-200 px-4 py-3 text-xs font-bold text-[#122b45]">Validation checklist</div><div className="divide-y divide-slate-100">{checks.map((check) => <div key={check.label} className="flex items-center justify-between px-4 py-2.5 text-xs"><span className="text-slate-600">{check.label}</span><span className={check.value === "Available" ? "font-semibold text-emerald-600" : "text-slate-400"}>{check.value === "Available" ? <Check className="mr-1 inline h-3 w-3" /> : null}{check.value}</span></div>)}</div></div><div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500"><div className="flex items-center gap-2 font-semibold text-slate-700"><FolderOpen className="h-4 w-4" />Supporting documents</div><p className="mt-2">No quotation files or supporting documents are attached to this request.</p></div>{order.clarification_reason && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700"><MessageSquareText className="mr-1 inline h-4 w-4" />Clarification requested: {order.clarification_reason}</div>}{pending && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><button onClick={onApprove} className="rounded-lg bg-[#12304c] px-3 py-2.5 text-xs font-semibold text-white"><CheckCircle2 className="mr-1 inline h-4 w-4" />Approve for PO Creation</button><button onClick={onReject} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700"><XCircle className="mr-1 inline h-4 w-4" />Reject</button><button onClick={onClarify} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700"><MessageSquareText className="mr-1 inline h-4 w-4" />Request Clarification</button></div>}{order.status === "APPROVED" && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"><PackageCheck className="mr-1 inline h-4 w-4" />Approved · Awaiting Purchase Order Creation</div>}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 break-words text-xs font-semibold text-slate-700">{value}</div></div>; }
