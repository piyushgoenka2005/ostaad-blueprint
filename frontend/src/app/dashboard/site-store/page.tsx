"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Warehouse, LogOut, PackageCheck, Truck } from "lucide-react";
import { getAuthSession, clearAuthSession, UserProfile } from "@/lib/api";

export default function SiteStoreDashboard() {
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">BuildBharat ERP</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Site Storekeeper Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Gate Delivery Inward (GRN), Vehicle Log & Godown Stock Sync</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              RP
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-white">{user?.full_name || "Ramesh Pawar"}</div>
              <div className="text-[10px] text-slate-400">Site Storekeeper (Godown)</div>
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
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              ● Godown Inward Control
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">
              Delivery Challan Verification & Warehouse Stock Balance
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Log truck registrations, inspect physical materials, record damaged bags, and increment live inventory.
            </p>
          </div>
          <Warehouse className="w-10 h-10 text-amber-400 opacity-80" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Godown Cement Inventory</div>
            <div className="text-xl font-bold text-white mt-1">1,320 Bags Available</div>
            <div className="text-[11px] text-emerald-400 mt-2">OPC 53 Grade (Ultratech)</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Active Dispatched POs</div>
            <div className="text-xl font-bold text-white mt-1">1 PO In Transit</div>
            <div className="text-[11px] text-sky-400 mt-2">Truck: MH-04-AZ-9988</div>
          </div>
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10">
            <div className="text-xs text-slate-400 font-medium">Logged Delivery Challans</div>
            <div className="text-xl font-bold text-white mt-1">1 GRN Inward</div>
            <div className="text-[11px] text-slate-400 mt-2">CHAL-2026-0091</div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-slate-900/30 border border-white/10 text-center space-y-3">
          <PackageCheck className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Site Storekeeper Portal Active</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Authentication successfully verified. In the next milestone, the delivery inward form (challan number, gross quantity, damaged quantity) and real-time inventory counter will be rendered here.
          </p>
        </div>
      </main>
    </div>
  );
}
