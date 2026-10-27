"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldAlert, LogOut, Users, Settings } from "lucide-react";
import { getAuthSession, clearAuthSession, UserProfile } from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const { token, user } = getAuthSession();
    if (!token || !user) {
      router.push("/login");
      return;
    }
    setUser(user);
  }, [router]);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                System Administrator
              </span>
            </div>
            <p className="text-xs text-slate-400">Tenant Management, Enterprise RBAC & Master System Audits</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
              ● Central Administration
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Enterprise Tenant & Role-Based Access Governance
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage corporate users, department assignments, and audit trails across all projects.
            </p>
          </div>
          <ShieldAlert className="w-10 h-10 text-purple-400 opacity-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Registered Enterprise Users</div>
            <div className="text-xl font-bold text-white mt-1">4 Active Entities</div>
            <div className="text-[11px] text-purple-400 mt-2">Managing Authority, Finance, Store, Admin</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Active Tenants</div>
            <div className="text-xl font-bold text-white mt-1">1 Organization</div>
            <div className="text-[11px] text-emerald-400 mt-2">Larsen & Toubro Ltd (GSTIN: 27AAACL1234F1Z1)</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">System Health</div>
            <div className="text-xl font-bold text-white mt-1">All Services Operational</div>
            <div className="text-[11px] text-sky-400 mt-2">FastAPI Backend: Online</div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/30 border border-white/10 text-center space-y-3">
          <Users className="w-12 h-12 text-purple-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Administrator Portal Ready</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Authentication successfully verified. In the next milestone, user management and system audit log tables will be displayed here.
          </p>
        </div>
      </main>
    </div>
  );
}
