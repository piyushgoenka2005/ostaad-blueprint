"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, BadgeIndianRupee, LogOut, CheckCircle2, ShieldAlert } from "lucide-react";
import { getAuthSession, clearAuthSession, UserProfile } from "@/lib/api";

export default function FinanceDashboard() {
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ● Financial Gatekeeping
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Pending PO Budget Approvals & Bank UTR Disbursements
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized to approve payment tranches, log bank UTRs, and execute two-way invoice match settlements.
            </p>
          </div>
          <BadgeIndianRupee className="w-10 h-10 text-emerald-400 opacity-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Pending Slip Proposals</div>
            <div className="text-xl font-bold text-white mt-1">1 Slip Awaiting Clearance</div>
            <div className="text-[11px] text-amber-400 mt-2">PO-7D82D8-0001 (Ultratech Cement)</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Disbursed Advance Tranches</div>
            <div className="text-xl font-bold text-white mt-1">₹1,51,201.60</div>
            <div className="text-[11px] text-emerald-400 mt-2">UTR: AXIS-UTR-2026-9921</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Fully Settled POs</div>
            <div className="text-xl font-bold text-white mt-1">0 Orders</div>
            <div className="text-[11px] text-slate-500 mt-2">Awaiting site store delivery</div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/30 border border-white/10 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Finance Department Portal Active</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Authentication successfully verified. In the next milestone, the interactive PO approval decision gate, advance UTR disbursement form, and two-way match invoice reconciliation module will be rendered here.
          </p>
        </div>
      </main>
    </div>
  );
}
