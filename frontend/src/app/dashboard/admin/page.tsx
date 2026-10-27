"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldAlert,
  LogOut,
  Users,
  Settings,
  ShieldCheck,
  Server,
  Database,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  Activity
} from "lucide-react";
import {
  getAuthSession,
  clearAuthSession,
  UserProfile,
  getRegisteredUsers
} from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const { token, user: activeUser } = getAuthSession();
    if (!token || !activeUser) {
      router.push("/login");
      return;
    }
    setUser(activeUser);
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      setRefreshing(true);
      const data = await getRegisteredUsers();
      setUsersList(data);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OPERATIONS":
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
            Managing Authority (Operations)
          </span>
        );
      case "FINANCE":
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            Finance Department
          </span>
        );
      case "SITE_STORE":
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
            Site Storekeeper (Godown)
          </span>
        );
      case "ADMIN":
      case "SUPERADMIN":
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
            Corporate Administrator
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20 font-semibold">
            {role}
          </span>
        );
    }
  };

  const getDashboardPath = (role: string) => {
    switch (role) {
      case "OPERATIONS":
        return "/dashboard/operations";
      case "FINANCE":
        return "/dashboard/finance";
      case "SITE_STORE":
        return "/dashboard/site-store";
      case "ADMIN":
      case "SUPERADMIN":
        return "/dashboard/admin";
      default:
        return "/dashboard/operations";
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/5 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                Corporate Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400">Tenant Management, Enterprise RBAC & Master System Governance</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadUsers}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-300 transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs">
              AV
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Aditya Verma"}</div>
              <div className="text-[10px] text-slate-400">Corporate Admin</div>
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-white/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                Central Enterprise Governance
              </span>
              <span className="text-xs text-slate-400 font-mono">Tenant: Larsen & Toubro Limited (T-101)</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-2">
              Role-Based Access Control, Organization Directory & Health Audits
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Inspect registered department authorities across Managing Operations, Finance Approvals, and Site Store Inward. Maintain tenant credentials, access tokens, and infrastructure connectivity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Enterprise Users</div>
            <div className="text-2xl font-bold text-white mt-1">{usersList.length || 4} Registered</div>
            <div className="text-[11px] text-purple-400 mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>4 Departments Configured</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Active Tenants</div>
            <div className="text-2xl font-bold text-white mt-1">1 Organization</div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>Larsen & Toubro Ltd</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">FastAPI Backend API</div>
            <div className="text-2xl font-bold text-white mt-1">Online (Port 8000)</div>
            <div className="text-[11px] text-sky-400 mt-2 flex items-center gap-1">
              <Server className="w-3 h-3" />
              <span>Decoupled REST Engine</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Database Engine</div>
            <div className="text-2xl font-bold text-white mt-1">SQLAlchemy ORM</div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>Transactional SQLite (ACID)</span>
            </div>
          </div>
        </div>

        {/* Registered Enterprise Users Directory */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Enterprise Users & Multi-Department Access Directory
              </h3>
              <p className="text-xs text-slate-400">
                Department roles, authorized login credentials, and permission scopes
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
              ● Active Directory
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading enterprise users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 px-4 font-semibold">User Entity Name</th>
                    <th className="py-2.5 px-4 font-semibold">Email Identifier</th>
                    <th className="py-2.5 px-4 font-semibold">Department Assignment</th>
                    <th className="py-2.5 px-4 font-semibold">Account Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Direct Portal Switch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-purple-300">
                          {u.full_name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{u.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Active / Verified</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => router.push(getDashboardPath(u.role))}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1.5 text-xs"
                        >
                          <span>Open Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tenant Organization Governance & Security Policies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Tenant Legal Profile & Organization Credentials
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Organization Name:</span>
                <span className="font-semibold text-white">Larsen & Toubro Limited</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Corporate GSTIN:</span>
                <span className="font-mono text-white">27AAACL1234F1Z1 (Maharashtra)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Enterprise Plan:</span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-mono text-[11px] border border-purple-500/20">
                  BuildBharat Tier 1 Infrastructure Suite
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Authorized Signatory:</span>
                <span className="text-slate-200">Sunita Iyer (VP of Finance)</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              System Architecture & Module Boundaries
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300">Decoupled Full-Stack Architecture</div>
                  <p className="text-slate-400 mt-0.5">
                    Frontend in Next.js 15+ App Router (`frontend/`), Backend in FastAPI Python (`backend/`) with CORS enabled.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300">Multi-Role Security Guard</div>
                  <p className="text-slate-400 mt-0.5">
                    Separate portals for Managing Authority, Finance, Site Storekeeper, and Admin. Role-based routing upon login.
                  </p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
                <KeyRound className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-300">HMAC-SHA256 Token Sessions</div>
                  <p className="text-slate-400 mt-0.5">
                    Cryptographic signature validation on all endpoints with role enforcement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
