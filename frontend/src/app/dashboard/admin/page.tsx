"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertCircle, BadgeCheck, Bell, Building2, CheckCircle2, ChevronRight,
  CircleUserRound, Database, FileCheck2, FileText, FolderKanban, KeyRound, LayoutDashboard,
  LogOut, Menu, Plus, RefreshCw, Search, Settings, Shield, ShieldCheck, ShoppingCart,
  SlidersHorizontal, Truck, Users, XCircle,
} from "lucide-react";
import { clearAuthSession, createVendor, getAuthSession, getRegisteredUsers, getVendors, UserProfile, Vendor } from "@/lib/api";

type AdminUser = { id: string; email: string; full_name: string; role: string };

const roleNames: Record<string, string> = {
  OPERATIONS: "Project Management",
  FINANCE: "Finance",
  SITE_STORE: "Site Store",
  ADMIN: "Administration",
  SUPERADMIN: "Administration",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ vendor_name: "", gstin: "", phone: "", city: "", category: "" });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [userData, vendorData] = await Promise.all([getRegisteredUsers(), getVendors()]);
      setUsers(userData); setVendors(vendorData);
    } catch (error: any) {
      setMessage(error.message || "Could not load administration data.");
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    const session = getAuthSession();
    if (!session.token || !session.user) { router.push("/login"); return; }
    setUser(session.user); loadData();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((item) => [item.full_name, item.email, item.role, roleNames[item.role]].some((value) => value?.toLowerCase().includes(query)));
  }, [users, search]);
  const filteredVendors = useMemo(() => {
    const query = search.toLowerCase();
    return vendors.filter((item) => [item.vendor_name, item.category, item.city, item.phone].some((value) => value?.toLowerCase().includes(query)));
  }, [vendors, search]);
  const activeUsers = users.length;
  const activeVendors = vendors.length;

  const nav = (value: string) => {
    setSection(value); setMessage(null);
    const target = document.getElementById(value);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const logout = () => { clearAuthSession(); router.push("/login"); };

  const handleCreateVendor = async () => {
    if (Object.values(vendorForm).some((value) => !value.trim())) { setMessage("Complete every vendor field before saving."); return; }
    try { await createVendor(vendorForm); setVendorForm({ vendor_name: "", gstin: "", phone: "", city: "", category: "" }); setShowVendorForm(false); await loadData(); setMessage("Vendor added to the shared directory."); }
    catch (error: any) { setMessage(error.message || "Vendor could not be added."); }
  };

  return <div className="min-h-screen bg-[#f4f8fc] text-slate-700">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#10263d] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#12304c]"><ShieldCheck className="h-6 w-6" /></div><div><div className="text-lg font-bold">BuildTrack ERP</div><div className="text-[10px] text-slate-300">Construction · Procurement · Finance</div></div></div>
      <nav className="space-y-1 px-3 py-5 text-xs"><Nav icon={LayoutDashboard} label="Dashboard" active={section === "dashboard"} onClick={() => nav("dashboard")} /><Nav icon={FolderKanban} label="Projects" onClick={() => showUnsupported(setMessage, "Project provisioning is not available in the current API.")} /><Nav icon={ShoppingCart} label="Procurement" onClick={() => showUnsupported(setMessage, "Procurement controls remain with Operations and Finance.")} /><Nav icon={BadgeCheck} label="Finance" onClick={() => router.push("/dashboard/finance")} /><Nav icon={Truck} label="Vendors" active={section === "vendors"} onClick={() => nav("vendors")} /><Nav icon={Users} label="Users & Access" active={section === "users"} onClick={() => nav("users")} /><Nav icon={FileText} label="Reports" onClick={() => showUnsupported(setMessage, "Reports are not available in the current API.")} /><Nav icon={Shield} label="Administration & Audit" active={section === "dashboard"} onClick={() => nav("dashboard")} /></nav>
      <div className="mt-auto border-t border-white/10 p-5 text-[11px] text-slate-300"><KeyRound className="mr-1 inline h-3 w-3" />Secure · Traceable<br /><span className="text-slate-400">Financial approvals cannot be bypassed</span></div>
    </aside>

    <div className="lg:ml-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-sm backdrop-blur md:px-8"><div className="relative w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users, vendors, projects, or records..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></div><div className="flex items-center gap-4"><button className="relative text-slate-500"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="hidden text-right sm:block"><div className="text-xs font-semibold text-slate-800">{user?.full_name || "System Administrator"}</div><div className="text-[10px] text-slate-500">System Administrator</div></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#12304c] text-xs font-bold text-white">{(user?.full_name || "SA").split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><button onClick={logout} className="text-slate-400 hover:text-rose-500" title="Sign out"><LogOut className="h-4 w-4" /></button></div></header>

      <main id="dashboard" className="mx-auto max-w-[1500px] space-y-6 p-4 md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-1 flex items-center gap-2 text-xs text-slate-500">Administration <ChevronRight className="h-3 w-3" /> Audit & Access</div><h1 className="text-2xl font-bold tracking-tight text-[#122b45]">Administration & Audit</h1><p className="mt-1 text-sm text-slate-500">Manage authorised users, roles, vendors, access, and traceability across construction operations.</p></div><button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"> <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Refreshing..." : "Refresh data"}</button></div>
        {message && <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"><span>{message}</span><button onClick={() => setMessage(null)}><XCircle className="h-4 w-4" /></button></div>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"><Summary icon={Users} label="Active Users" value={activeUsers} note="Authorised accounts" tone="blue" /><Summary icon={FolderKanban} label="Active Projects" value="Not available" note="Project API not connected" tone="teal" /><Summary icon={Truck} label="Registered Vendors" value={activeVendors} note="Database directory" tone="violet" /><Summary icon={CircleUserRound} label="Pending Access Requests" value="Not available" note="Access-request API not connected" tone="orange" /><Summary icon={Shield} label="Recent Security Events" value="Not available" note="Audit API not connected" tone="rose" /></section>

        <section id="users" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={Users} title="User Management" subtitle="Manage authorised users, department roles, and portal access." action="Add User" onAction={() => showUnsupported(setMessage, "User creation and editing are not available in the current API.")} /><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Assigned Projects</th><th className="px-4 py-3">Account Status</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700">{item.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>{item.full_name}</td><td className="px-4 py-3 text-slate-500">{item.email}</td><td className="px-4 py-3">{roleNames[item.role] || item.role}</td><td className="px-4 py-3"><RoleBadge role={item.role} /></td><td className="px-4 py-3 text-slate-400">Not available</td><td className="px-4 py-3"><Status text="Active" tone="green" /></td><td className="px-4 py-3 text-slate-400">Not available</td><td className="px-4 py-3"><button onClick={() => showUnsupported(setMessage, "Role editing and deactivation are not available in the current API.")} className="rounded border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Manage</button></td></tr>)}</tbody></table>{!loading && !filteredUsers.length && <Empty text="No authorised users match this search." />}</div></section>

        <section id="vendors" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={Truck} title="Vendor Directory" subtitle="Review vendor categories, contact information, locations, and verification state." action="Add Vendor" onAction={() => setShowVendorForm(true)} /><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Vendor Name</th><th className="px-4 py-3">Materials Supplied</th><th className="px-4 py-3">Contact Person</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredVendors.map((vendor) => <tr key={vendor.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{vendor.vendor_name}</td><td className="px-4 py-3 text-slate-600">{vendor.category}</td><td className="px-4 py-3 text-slate-400">Not available</td><td className="px-4 py-3 text-blue-700">+91 {vendor.phone}</td><td className="px-4 py-3">{vendor.city}</td><td className="px-4 py-3"><Status text="Active" tone="green" /></td><td className="px-4 py-3"><Status text="Not available" tone="amber" /></td><td className="px-4 py-3"><button onClick={() => showUnsupported(setMessage, "Vendor editing is not available in the current API.")} className="rounded border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Manage</button></td></tr>)}</tbody></table>{!loading && !filteredVendors.length && <Empty text="No registered vendors are currently available." />}</div></section>
          <section id="vendors" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={Truck} title="Vendor Directory" subtitle="Review vendor categories, contact information, locations, and verification state." action="Add Vendor" onAction={() => showUnsupported(setMessage, "Vendor creation and editing are not available in the current API.")} /><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Vendor Name</th><th className="px-4 py-3">Materials Supplied</th><th className="px-4 py-3">Contact Person</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredVendors.map((vendor) => <tr key={vendor.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{vendor.vendor_name}</td><td className="px-4 py-3 text-slate-600">{vendor.category}</td><td className="px-4 py-3 text-slate-400">Not available</td><td className="px-4 py-3 text-blue-700">+91 {vendor.phone}</td><td className="px-4 py-3">{vendor.city}</td><td className="px-4 py-3"><Status text="Active" tone="green" /></td><td className="px-4 py-3"><Status text="Not available" tone="amber" /></td><td className="px-4 py-3"><button onClick={() => showUnsupported(setMessage, "Vendor editing is not available in the current API.")} className="rounded border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Manage</button></td></tr>)}</tbody></table>{!loading && !filteredVendors.length && <Empty text="No registered vendors are currently available." />}</div></section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr_0.9fr]"><div className="rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={ShieldCheck} title="Role & Permission Management" subtitle="View protected workflow boundaries." action="Add Role" onAction={() => showUnsupported(setMessage, "Custom roles are not available in the current API.")} /><div className="overflow-x-auto"><table className="w-full text-left text-[10px]"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Permission</th><th className="px-2 py-3">Ops</th><th className="px-2 py-3">Finance</th><th className="px-2 py-3">Admin</th></tr></thead><tbody className="divide-y divide-slate-100">{[["Project Management", true, false, true], ["BOQ Review", true, false, true], ["Vendor Quotations", true, false, true], ["Finance Approval", false, true, true], ["Purchase Order Creation", false, true, true], ["Vendor Portal", false, false, true], ["Administration", false, false, true]].map(([label, ops, finance, admin]) => <tr key={String(label)}><td className="px-4 py-3 font-medium">{label}</td><td className="px-2 py-3 text-center">{ops ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" /> : <span className="text-slate-300">—</span>}</td><td className="px-2 py-3 text-center">{finance ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" /> : <span className="text-slate-300">—</span>}</td><td className="px-2 py-3 text-center">{admin ? <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-emerald-500" /> : <span className="text-slate-300">—</span>}</td></tr>)}</tbody></table></div></div>

        <div id="audit" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={FileCheck2} title="Audit Log" subtitle="Traceability events from procurement and finance decisions." action="Filter" onAction={() => showUnsupported(setMessage, "Audit filtering is not available in the current API.")} /><div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center"><Activity className="mb-3 h-9 w-9 text-slate-300" /><div className="text-sm font-semibold text-slate-600">Audit events are not available</div><p className="mt-1 max-w-xs text-xs text-slate-400">The current backend does not expose an audit-log endpoint, so no activity is fabricated here.</p></div></div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={Settings} title="System Settings" subtitle="Workflow controls supported by the current application boundary." action="Save Settings" onAction={() => showUnsupported(setMessage, "Settings persistence is not available in the current API.")} /><div className="grid gap-4 p-5 md:grid-cols-2"><Setting label="Finance approval required before PO dispatch" value="Enforced by backend" locked /><Setting label="BOQ verification before procurement" value="Enforced by backend" locked /><Setting label="Role-based portal routing" value="Enforced at login" locked /><Setting label="Audit and notification preferences" value="Not available" /></div></div></section>
        {showVendorForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#122b45]">Add Vendor</h2><p className="mt-1 text-xs text-slate-500">This vendor will be available to Operations for manual quotations.</p></div><button onClick={() => setShowVendorForm(false)}><XCircle className="h-5 w-5 text-slate-400" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{([['vendor_name', 'Vendor name'], ['gstin', 'GSTIN'], ['phone', 'Phone (+91...)'], ['city', 'City'], ['category', 'Materials category']] as const).map(([field, label]) => <label key={field} className="text-xs font-medium text-slate-600">{label}<input value={vendorForm[field]} onChange={(event) => setVendorForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" /></label>)}</div><button onClick={handleCreateVendor} className="mt-5 w-full rounded-lg bg-[#12304c] px-4 py-3 text-sm font-semibold text-white">Save Vendor</button></div></div>}
      </main>
    </div>
  </div>;
}

function showUnsupported(setMessage: React.Dispatch<React.SetStateAction<string | null>>, text: string) { setMessage(text); }
function Nav({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active?: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}</button>; }
function Summary({ icon: Icon, label, value, note, tone }: { icon: React.ElementType; label: string; value: string | number; note: string; tone: string }) { const styles: Record<string, string> = { blue: "bg-blue-50 text-blue-600 border-blue-100", teal: "bg-teal-50 text-teal-600 border-teal-100", violet: "bg-violet-50 text-violet-600 border-violet-100", orange: "bg-orange-50 text-orange-600 border-orange-100", rose: "bg-rose-50 text-rose-600 border-rose-100" }; return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-2"><div><div className="text-[11px] text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-[#122b45]">{value}</div><div className="mt-1 text-[10px] text-slate-400">{note}</div></div><div className={`rounded-lg border p-2 ${styles[tone]}`}><Icon className="h-4 w-4" /></div></div></div>; }
function SectionHeader({ icon: Icon, title, subtitle, action, onAction }: { icon: React.ElementType; title: string; subtitle: string; action: string; onAction: () => void }) { return <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-blue-600" /><div><h2 className="font-bold text-[#122b45]">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div></div><button onClick={onAction} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Plus className="h-3.5 w-3.5" />{action}</button></div>; }
function RoleBadge({ role }: { role: string }) { return <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{roleNames[role] || role}</span>; }
function Status({ text, tone }: { text: string; tone: string }) { const styles: Record<string, string> = { green: "bg-emerald-50 text-emerald-700 border-emerald-200", amber: "bg-amber-50 text-amber-700 border-amber-200", slate: "bg-slate-100 text-slate-500 border-slate-200" }; return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${styles[tone] || styles.slate}`}>{text}</span>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-sm text-slate-400">{text}</div>; }
function Setting({ label, value, locked }: { label: string; value: string; locked?: boolean }) { return <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs"><div><div className="font-semibold text-slate-700">{label}</div><div className="mt-1 text-slate-500">{value}</div></div>{locked ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <SlidersHorizontal className="h-5 w-5 text-slate-400" />}</div>; }
