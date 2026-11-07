"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import {
  ShieldCheck,
  Wallet,
  FileText,
  CreditCard,
  CheckCircle2,
  Building2,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import {
  DEFAULT_BUDGET_POOLS,
  DEFAULT_PENDING_APPROVALS,
  DEFAULT_AUTHORISED_POS,
  DEFAULT_PAYMENTS_LEDGER,
  DEFAULT_RECONCILIATION_ITEMS,
  DepartmentBudgetPool,
  PendingProcurementApproval,
  AuthorisedPurchaseOrder,
  BankDisbursementRecord,
  ThreeWayReconciliationItem,
} from "@/lib/commercial-finance";

// Sub-Module UI Components
import BudgetPoolGuardrails from "@/components/finance/BudgetPoolGuardrails";
import DualControlPOApproval from "@/components/finance/DualControlPOApproval";
import AuthorisedPOGenerator from "@/components/finance/AuthorisedPOGenerator";
import StagedPaymentBankLedger from "@/components/finance/StagedPaymentBankLedger";
import ThreeWayInvoiceReconciliation from "@/components/finance/ThreeWayInvoiceReconciliation";

export default function CommercialFinanceDashboard() {
  const [activeTab, setActiveTab] = useState<
    "approvals" | "budgets" | "orders" | "payments" | "reconciliation"
  >("approvals");

  const [activeProjectName, setActiveProjectName] = useState("Active Project Workspace");

  useEffect(() => {
    try {
      const master = localStorage.getItem("ostaad_project_master");
      if (master) {
        const p = JSON.parse(master);
        if (p.name) {
          setActiveProjectName(p.name);
          return;
        }
      }
      const opName = localStorage.getItem("ostaad_operations_project_name");
      if (opName) {
        setActiveProjectName(opName);
      }
    } catch {}
  }, []);

  // Shared State
  const [budgetPools, setBudgetPools] = useState<DepartmentBudgetPool[]>(DEFAULT_BUDGET_POOLS);
  const [approvals, setApprovals] = useState<PendingProcurementApproval[]>(DEFAULT_PENDING_APPROVALS);
  const [orders, setOrders] = useState<AuthorisedPurchaseOrder[]>(DEFAULT_AUTHORISED_POS);
  const [payments, setPayments] = useState<BankDisbursementRecord[]>(DEFAULT_PAYMENTS_LEDGER);
  const [reconciliations, setReconciliations] = useState<ThreeWayReconciliationItem[]>(
    DEFAULT_RECONCILIATION_ITEMS
  );

  // When an approval is authorized, automatically generate PO and update budget pool committed spend
  const handlePOApproved = (newPO: AuthorisedPurchaseOrder) => {
    setOrders((prev) => [newPO, ...prev]);

    // Update corresponding budget pool
    setBudgetPools((prevPools) =>
      prevPools.map((p) => {
        if (p.costCode === newPO.costCode) {
          const newCommitted = p.committedSpendINR + newPO.totalOrderValueINR;
          const remaining = p.approvedBudgetINR - newCommitted;
          return {
            ...p,
            committedSpendINR: newCommitted,
            pendingSpendINR: Math.max(0, p.pendingSpendINR - newPO.totalOrderValueINR),
            remainingHeadroomINR: remaining,
            utilizationPercent: Math.round((newCommitted / p.approvedBudgetINR) * 1000) / 10,
            isHardStopTriggered: remaining < 0,
          };
        }
        return p;
      })
    );
  };

  const pendingCount = approvals.filter((a) => a.status === "PENDING_FINANCE_APPROVAL").length;

  return (
    <AppShell
      title="Commercial Gatekeeping, Finance & Accounts"
      subtitle="Module 6 — Budget Guardrails, Dual-Control PO Approval, Staged Disbursements & 3-Way Reconciliation"
      activeNav="finance"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Commercial & Treasury", href: "/dashboard/finance" },
        { label: "Finance Approval Gate", href: "/dashboard/finance" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            <span>{activeProjectName}</span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("approvals")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "approvals"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Dual-Control PO Approvals</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "approvals"
                  ? "bg-white/20 text-white"
                  : pendingCount > 0
                  ? "bg-amber-100 text-amber-800 font-bold"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {pendingCount} Pending
            </span>
          </button>

          <button
            onClick={() => setActiveTab("budgets")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "budgets"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>2. Budget Pools & Guardrails</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "budgets" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {budgetPools.length} Pools
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "orders"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>3. Authorised Purchase Orders</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "orders" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"
              }`}
            >
              {orders.length} POs
            </span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "payments"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Staged Payments & Bank UTR</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "payments" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {payments.length} UTRs
            </span>
          </button>

          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "reconciliation"
                ? "bg-[#10263d] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>5. 3-Way Reconciliation & Settlement</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "reconciliation"
                  ? "bg-white/20 text-white"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              PO-GRN-INV
            </span>
          </button>
        </div>

        {/* Tab 1: Dual-Control PO Approval Inbox */}
        {activeTab === "approvals" && (
          <DualControlPOApproval
            approvals={approvals}
            onUpdateApprovals={setApprovals}
            onPOApproved={handlePOApproved}
          />
        )}

        {/* Tab 2: Budget Pools & Guardrails */}
        {activeTab === "budgets" && (
          <BudgetPoolGuardrails
            budgetPools={budgetPools}
            onUpdateBudgetPools={setBudgetPools}
          />
        )}

        {/* Tab 3: Authorised Purchase Orders */}
        {activeTab === "orders" && <AuthorisedPOGenerator orders={orders} />}

        {/* Tab 4: Staged Payments & Bank UTR Ledger */}
        {activeTab === "payments" && (
          <StagedPaymentBankLedger
            payments={payments}
            orders={orders}
            onUpdatePayments={setPayments}
          />
        )}

        {/* Tab 5: 3-Way Invoice Reconciliation & Final Settlement */}
        {activeTab === "reconciliation" && (
          <ThreeWayInvoiceReconciliation
            items={reconciliations}
            onUpdateItems={setReconciliations}
          />
        )}
      </div>
    </AppShell>
  );
}
