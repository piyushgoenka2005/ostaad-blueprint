"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, HardHat, LogOut, FileText, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { getAuthSession, clearAuthSession, UserProfile } from "@/lib/api";

export default function OperationsDashboard() {
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
      {/* Top Navbar */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Operations Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Navi Mumbai International Airport — Terminal 2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
              RS
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Rajesh Sharma"}</div>
              <div className="text-[10px] text-slate-400">Managing Authority (PM)</div>
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

      {/* Main Body */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ● Active Project Contract
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Navi Mumbai International Airport - Terminal 2 (Zone A)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Contract Value: ₹25,00,00,000.00 • Client: Larsen & Toubro Construction Ltd • District: Raigad
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-medium text-sky-300 flex items-center gap-1.5">
              <HardHat className="w-4 h-4" /> Operations Authority Verified
            </span>
          </div>
        </div>

        {/* Status card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Bill of Quantities (BOQ)</div>
            <div className="text-xl font-bold text-white mt-1">4 Verified Items</div>
            <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Baseline Locked by PM
            </div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Decomposed Raw Materials</div>
            <div className="text-xl font-bold text-white mt-1">1,331 Bags Cement</div>
            <div className="text-[11px] text-sky-400 mt-2 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> IS 456 Compliant
            </div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Procurement Proposals</div>
            <div className="text-xl font-bold text-white mt-1">1 Active Proposal</div>
            <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
              ● Pending Finance Approval
            </div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/30 border border-white/10 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-sky-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Managing Authority Dashboard Ready</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Authentication successfully confirmed. In the next milestone, the complete interactive BOQ editor, IS 456 decomposition table, vendor phone directory, and quote submission forms will be rendered directly on this page.
          </p>
        </div>
      </main>
    </div>
  );
}
