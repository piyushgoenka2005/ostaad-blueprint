"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  HardHat,
  LogOut,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  PhoneCall,
  Sparkles,
  Send,
  AlertTriangle,
  Layers,
  Phone,
  MapPin,
  FileCheck,
} from "lucide-react";
import {
  getAuthSession,
  clearAuthSession,
  UserProfile,
  BOQItem,
  Vendor,
  NotificationItem,
  getProjectBOQItems,
  updateBOQItem,
  addBOQItem,
  deleteBOQItem,
  verifyAllBOQItems,
  decomposeBOQ,
  getVendors,
  getPMNotifications,
  submitBillProposalToFinance,
} from "@/lib/api";

export default function OperationsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // BOQ Items
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  // Decomposed Materials
  const [decomposed, setDecomposed] = useState<any[] | null>(null);
  const [decomposing, setDecomposing] = useState(false);

  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("vendor-ultra-01");

  // Quotation Entry Form State
  const [quotedBase, setQuotedBase] = useState(345);
  const [quotedFreight, setQuotedFreight] = useState(10);
  const [quotedGST, setQuotedGST] = useState(28);
  const [callerNotes, setCallerNotes] = useState("Direct factory gate quote from Ultratech dispatch desk. 48hr delivery guaranteed.");

  // Proposals & Notifications
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);

  useEffect(() => {
    const { token, user: activeUser } = getAuthSession();
    if (!token || !activeUser) {
      router.push("/login");
      return;
    }
    setUser(activeUser);
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, vList, notifs] = await Promise.all([
        getProjectBOQItems(),
        getVendors(),
        getPMNotifications(),
      ]);
      setBoqItems(items);
      setVendors(vList);
      setNotifications(notifs);
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

  const handleFieldChange = async (itemId: string, field: keyof BOQItem, val: any) => {
    setBoqItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: val };
          updated.total_amount = Math.round(updated.quantity * (updated.unit_rate || 0));
          return updated;
        }
        return item;
      })
    );

    setSavingItem(itemId);
    try {
      await updateBOQItem(itemId, { [field]: val });
    } catch (err: any) {
      alert("Failed to update item: " + err.message);
    } finally {
      setSavingItem(null);
    }
  };

  const handleAddLine = async () => {
    const desc = prompt("Enter Description for new BOQ line item:", "Structural Fe 550D TMT Steel Rebars");
    if (!desc) return;
    const qty = parseFloat(prompt("Enter Quantity:", "15.0") || "1.0") || 1.0;
    const unit = prompt("Enter Unit (e.g. CUM, MT, BAG, NOS):", "MT") || "NOS";
    const rate = parseFloat(prompt("Enter Estimated Unit Rate (₹):", "68000") || "0.0") || 0.0;

    try {
      await addBOQItem({
        project_id: "proj-demo-101",
        wbs_code: "GEN-" + Math.floor(100 + Math.random() * 900),
        description: desc,
        quantity: qty,
        unit: unit,
        unit_rate: rate,
      });
      const items = await getProjectBOQItems();
      setBoqItems(items);
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    }
  };

  const handleDeleteLine = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this line item?")) return;
    try {
      await deleteBOQItem(itemId);
      setBoqItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert("Error deleting item: " + err.message);
    }
  };

  const handleApproveBOQ = async () => {
    try {
      const res = await verifyAllBOQItems("proj-demo-101", user?.id || "user-pm-01");
      alert(`✔ Success! ${res.verified_items_count} BOQ items verified by Project Manager. Procurement is now unlocked!`);
      const items = await getProjectBOQItems();
      setBoqItems(items);
    } catch (err: any) {
      alert("Error approving BOQ: " + err.message);
    }
  };

  const handleDecompose = async () => {
    setDecomposing(true);
    try {
      const res = await decomposeBOQ();
      setDecomposed(res.decomposed_materials || []);
    } catch (err: any) {
      alert("Decomposition failed: " + err.message);
    } finally {
      setDecomposing(false);
    }
  };

  const landedRate = Math.round((quotedBase + quotedFreight) * (1 + quotedGST / 100) * 100) / 100;
  const totalLandedAmount = Math.round(landedRate * 1331 * 100) / 100;

  const handleSubmitProposal = async () => {
    setSubmittingProposal(true);
    setProposalSuccess(null);
    try {
      await submitBillProposalToFinance({
        vendor_id: selectedVendor,
        manager_user_id: user?.id || "user-pm-01",
        justification_notes: callerNotes,
      });
      setProposalSuccess(`✔ Proposal submitted to Finance! PO created in PENDING_FINANCE_APPROVAL status.`);
      setTimeout(() => setProposalSuccess(null), 5000);
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setSubmittingProposal(false);
    }
  };

  const allVerified = boqItems.length > 0 && boqItems.every((i) => i.is_verified);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-sky-500/30">
      {/* Top Navbar */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                Managing Authority (PM)
              </span>
            </div>
            <p className="text-xs text-slate-400">Navi Mumbai International Airport — Terminal 2 (Zone A)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
              RS
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Rajesh Sharma"}</div>
              <div className="text-[10px] text-slate-400">Managing Authority / PM</div>
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
        {/* Decline Notification Alerts */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notif, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 shadow-lg shadow-rose-950/40"
              >
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-rose-300 text-sm">{notif.title}</div>
                  <div className="mt-0.5">{notif.message}</div>
                  {notif.reason && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-950/60 border border-rose-500/20 text-xs font-mono text-rose-300">
                      <strong>Audit Decline Reason:</strong> {notif.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Project Header Banner */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ● Active Master Contract
            </span>
            <h1 className="text-2xl font-bold text-white mt-2">
              Navi Mumbai International Airport - Terminal 2 (Zone A)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Contract Value: <strong>₹25,00,00,000.00</strong> • Tenant: Larsen & Toubro Construction Ltd • District: Raigad
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleApproveBOQ}
              disabled={allVerified}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg transition-all ${
                allVerified
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {allVerified ? "✔ All BOQ Items Approved" : "✔ Approve Final BOQ"}
            </button>
            <button
              onClick={handleAddLine}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Line
            </button>
          </div>
        </div>

        {/* Section 1: BOQ Line Items Grid */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                Bill of Quantities (BOQ) — Baseline Review & Editing
              </h2>
              <p className="text-xs text-slate-400">
                Directly edit line item descriptions, quantities, and rates inline. Click 'Approve Final BOQ' to lock the baseline.
              </p>
            </div>
            {savingItem && (
              <span className="text-[11px] font-mono text-sky-400 animate-pulse">
                Saving changes...
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-3">WBS Code</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">Amount (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {boqItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {item.wbs_code}
                    </td>
                    <td className="py-2.5 px-3 min-w-[280px]">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleFieldChange(item.id, "description", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950/60 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => handleFieldChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-slate-950/60 border border-white/10 rounded text-xs text-white text-right focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-mono text-[10px] border border-sky-500/20">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="10"
                        value={item.unit_rate}
                        onChange={(e) => handleFieldChange(item.id, "unit_rate", parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 bg-slate-950/60 border border-white/10 rounded text-xs text-white text-right focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{item.total_amount?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.is_verified
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {item.is_verified ? "✔ VERIFIED" : "● PENDING"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteLine(item.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors"
                        title="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: IS 456 Material Decomposition */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                IS 456 Material Decomposition Engine
              </h2>
              <p className="text-xs text-slate-400">
                Decomposes verified concrete & masonry line items into standard Indian civil raw materials.
              </p>
            </div>
            <button
              onClick={handleDecompose}
              disabled={decomposing}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {decomposing ? "Calculating..." : "Decompose Materials (IS 456)"}
            </button>
          </div>

          {decomposed && decomposed.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
              {decomposed.map((mat, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {mat.standard_code || "IS 456"}
                  </div>
                  <div className="text-xs font-bold text-white mt-1 truncate">{mat.material_name}</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-400 mt-1">
                    {mat.quantity?.toLocaleString()} <span className="text-xs font-normal text-slate-300">{mat.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Vendor Phone Directory & Telephonic Quotation Entry */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-sky-400" />
              Verified Vendor Phone Directory & Telephonic Quotation Log
            </h2>
            <p className="text-xs text-slate-400">
              Direct supplier contacts for calling interns & managers. Enter telephonic quotes to calculate landed rates and submit proposals to Finance.
            </p>
          </div>

          {/* Vendor Directory Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {vendors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVendor(v.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedVendor === v.id
                    ? "bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10"
                    : "bg-slate-950/60 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    {v.category}
                  </span>
                  {selectedVendor === v.id && (
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  )}
                </div>
                <div className="text-xs font-bold text-white mt-2 truncate">{v.vendor_name}</div>
                <div className="text-[11px] font-mono text-sky-400 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" /> +91 {v.phone}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" /> {v.city} • GST: {v.gstin?.slice(0, 10)}...
                </div>
              </button>
            ))}
          </div>

          {/* Telephonic Quote Entry Form */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                📞 Log Telephonic Quotation (1,331 Bags OPC 53 Cement)
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Calculated Landed Rate: <strong>₹{landedRate} / Bag</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Base Ex-Factory Rate (₹/Bag)</label>
                <input
                  type="number"
                  value={quotedBase}
                  onChange={(e) => setQuotedBase(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Freight & Transit (₹/Bag)</label>
                <input
                  type="number"
                  value={quotedFreight}
                  onChange={(e) => setQuotedFreight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Applicable GST Rate (%)</label>
                <select
                  value={quotedGST}
                  onChange={(e) => setQuotedGST(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white font-mono"
                >
                  <option value={28}>28% (Cement)</option>
                  <option value={18}>18% (Steel / Aggregates)</option>
                  <option value={12}>12% (Bricks / Masonry)</option>
                  <option value={5}>5% (Sand)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Caller Notes & Delivery Commitments</label>
              <textarea
                rows={2}
                value={callerNotes}
                onChange={(e) => setCallerNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Total Landed Summary Bar & Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5">
              <div>
                <div className="text-[11px] text-slate-400">Total Purchase Order Value</div>
                <div className="text-lg font-bold font-mono text-white">
                  ₹{totalLandedAmount.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-emerald-400">
                    (Landed Rate ₹{landedRate} for 1,331 Bags)
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmitProposal}
                disabled={submittingProposal}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submittingProposal ? "Submitting Proposal..." : "📤 Submit Bill Proposal to Finance Department"}
              </button>
            </div>

            {proposalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{proposalSuccess}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
