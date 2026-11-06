"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Shield,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  HardDrive,
  Download,
  Search,
  Plus,
  RefreshCw,
  Building2,
  Lock,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  XCircle,
  FileCheck2,
  DollarSign,
  Activity,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { RoleBadge } from "@/components/RoleGate";
import {
  getAuthSession,
  getRegisteredUsers,
  getVendors,
  createVendor,
  UserProfile,
  Vendor,
} from "@/lib/api";

import CSuiteExecutiveDashboard from "@/components/reporting/CSuiteExecutiveDashboard";
import ProcurementSpendAnalytics from "@/components/reporting/ProcurementSpendAnalytics";
import SystemAuditSecurityLogs from "@/components/reporting/SystemAuditSecurityLogs";
import DataExportBackupCenter from "@/components/reporting/DataExportBackupCenter";

type AdminUser = { id: string; email: string; full_name: string; role: string };

const roleNames: Record<string, string> = {
  OPERATIONS: "Project Management & Planning",
  FINANCE: "Commercial Finance & PO Gate",
  SITE_STORE: "Site Store & Weighbridge Gate",
  ADMIN: "System Administration",
  SUPERADMIN: "Executive Managing Authority",
};

export default function AdminReportingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "c-suite" | "procurement" | "audit" | "export-backups" | "users"
  >("c-suite");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Vendor quick addition modal
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    gstin: "",
    phone: "",
    city: "",
    category: "",
  });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [userData, vendorData] = await Promise.all([getRegisteredUsers(), getVendors()]);
      setUsers(userData);
      setVendors(vendorData);
    } catch (error: any) {
      setMessage(error.message || "Could not load administrative data.");
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
    loadData();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((item) =>
      [item.full_name, item.email, item.role, roleNames[item.role]].some((val) =>
        val?.toLowerCase().includes(query)
      )
    );
  }, [users, search]);

  const handleCreateVendor = async () => {
    if (Object.values(vendorForm).some((v) => !v.trim())) {
      setMessage("Please complete every vendor field before saving.");
      return;
    }
    try {
      await createVendor(vendorForm);
      setVendorForm({ vendor_name: "", gstin: "", phone: "", city: "", category: "" });
      setShowVendorForm(false);
      await loadData();
      setMessage("Vendor registered successfully in the master directory.");
    } catch (error: any) {
      setMessage(error.message || "Vendor registration could not be saved.");
    }
  };

  return (
    <AppShell
      title="Executive Reporting, Audit & Governance"
      subtitle="Module 8: C-Suite KPI Dashboards, Procurement Spend Analytics, System Audit & Activity Logs, and Cloudflare D1/R2 Backup Engine"
      breadcrumbs={[
        { label: "Ostaad ERP", href: "/dashboard" },
        { label: "Module 8: Reporting & Governance" },
      ]}
      activeNav="admin"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Sync Data"}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* User Alert Message */}
        {message && (
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-blue-500 hover:text-blue-800">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* MODULE 8 SUB-MODULE NAVIGATION TABS                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-2.5 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab("c-suite")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "c-suite"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Sub-Module 8.1: C-Suite KPI Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("procurement")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "procurement"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Sub-Module 8.2: Spend & Landed Cost Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "audit"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Sub-Module 8.3: System Audit & Activity Logs</span>
          </button>

          <button
            onClick={() => setActiveTab("export-backups")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "export-backups"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>Sub-Module 8.4: Data Export & Cloudflare D1/R2 Backups</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User & RBAC Permissions Directory</span>
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SUB-MODULE 8.1: EXECUTIVE C-SUITE DASHBOARD                        */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "c-suite" && (
          <div>
            <CSuiteExecutiveDashboard />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUB-MODULE 8.2: PROCUREMENT & LANDED COST ANALYSIS REPORTS         */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "procurement" && (
          <div>
            <ProcurementSpendAnalytics />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUB-MODULE 8.3: IMMUTABLE AUDIT TRAIL & SYSTEM SECURITY EVENT LOGS */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "audit" && (
          <div>
            <SystemAuditSecurityLogs />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SUB-MODULE 8.4: DATA EXPORT CENTER & CLOUDFLARE D1/R2 BACKUPS      */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "export-backups" && (
          <div>
            <DataExportBackupCenter />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* USERS & ACCESS GOVERNANCE DIRECTORY                                */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h2 className="text-base font-bold text-[#122b45]">
                      Authorised User Directory & RBAC Security Roles
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Granular permission boundaries governing access across Planning, BOQ, Finance, and Site Store modules.
                  </p>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users or departments..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Full Name</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Department Scope</th>
                      <th className="px-4 py-3">Role Policy</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Dual Control Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700 font-bold">
                            {item.full_name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                          {item.full_name}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{item.email}</td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">{roleNames[item.role] || item.role}</td>
                        <td className="px-4 py-3.5">
                          <RoleBadge role={item.role} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            Enforced
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Department RBAC Permission Matrix */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#122b45] mb-1">
                Departmental Role & Permission Boundary Matrix
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Strict separation of powers preventing conflict of interest across engineering estimation and cash release.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">System Capability</th>
                      <th className="px-4 py-2.5 text-center">Site Store</th>
                      <th className="px-4 py-2.5 text-center">Operations & QS</th>
                      <th className="px-4 py-2.5 text-center">Finance Approver</th>
                      <th className="px-4 py-2.5 text-center">Managing Authority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["BOQ Hierarchical Item Entry", false, true, false, true],
                      ["Material Indent & Issue Slips", true, true, false, true],
                      ["Gate Weighbridge GRN Logging", true, false, false, true],
                      ["Vendor RFQ Sourcing & Bidding", false, true, false, true],
                      ["Commercial PO Dual-Control Approval", false, false, true, true],
                      ["Bank UTR Payout Disbursement", false, false, true, true],
                      ["3-Way Invoice Reconciliation", false, false, true, true],
                      ["Budget Pool Guardrail Override", false, false, false, true],
                      ["Cloudflare D1 & R2 Snapshot Trigger", false, false, false, true],
                    ].map(([permission, store, ops, fin, admin]) => (
                      <tr key={String(permission)} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{permission}</td>
                        <td className="px-4 py-2.5 text-center">
                          {store ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {ops ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {fin ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {admin ? (
                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
