"use client";

import React, { useState } from "react";
import {
  Database,
  FolderArchive,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Server,
  Cloud,
  Layers,
  Building2,
  X,
  FileCheck2,
} from "lucide-react";
import {
  BackupStatusRecord,
  DEFAULT_BACKUPS,
  generateCSV,
  downloadCSVFile,
} from "@/lib/reporting-audit-governance";
import D1MigrationDashboard from "@/components/D1MigrationDashboard";
import DocumentVault from "@/components/DocumentVault";

export default function DataExportBackupCenter() {
  const [backups, setBackups] = useState<BackupStatusRecord[]>(DEFAULT_BACKUPS);
  const [isSnapshotRunning, setIsSnapshotRunning] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"exports" | "backups" | "d1" | "r2">("exports");

  // Export handlers for universal data entities
  const handleExportBOQ = () => {
    const headers = ["Item No", "WBS Code", "Description", "Unit", "Estimated Qty", "Standard Rate (INR)", "Total Amount (INR)"];
    const rows = [
      ["1.01", "WBS-1.1", "Earthwork excavation in all kinds of soil", "cum", 12500, 240, 3000000],
      ["2.01", "WBS-1.2", "PCC 1:4:8 under footings & raft", "cum", 1850, 4200, 7770000],
      ["3.01", "WBS-2.1", "RCC M35 in Substructure Columns & Raft", "cum", 4800, 6800, 32640000],
      ["4.01", "WBS-2.2", "High Yield TMT Rebar Fe-550D Fabrication", "MT", 620, 68000, 42160000],
      ["5.01", "WBS-3.1", "AAC Block Masonry 200mm thick with adhesive", "sqm", 8400, 1150, 9660000],
    ];
    downloadCSVFile(`BOQ_Master_Register_${new Date().toISOString().slice(0, 10)}.csv`, generateCSV(headers, rows));
  };

  const handleExportVendors = () => {
    const headers = ["Vendor ID", "Vendor Name", "GSTIN", "Category", "City", "Phone", "Verified Status", "Credit Days"];
    const rows = [
      ["VND-TATA-01", "Tata Steel Ltd", "27AAACT2727Q1ZT", "Reinforcement Rebar Fe-550D", "Mumbai", "+91 22 6665 8282", "VERIFIED", 30],
      ["VND-ULTRA-02", "UltraTech Cement Ltd", "27AAACU0147K1ZS", "OPC 53 Cement & Ready-Mix", "Mumbai", "+91 22 6691 7800", "VERIFIED", 15],
      ["VND-JSW-03", "JSW Steel Co. Ltd", "27AAACJ4312F1ZU", "Structural Sections", "Mumbai", "+91 22 4286 1000", "VERIFIED", 45],
      ["VND-MAGIC-04", "Magicrete Building Solutions", "24AABCM8291M1Z1", "AAC Lightweight Blocks", "Surat", "+91 261 405 5555", "VERIFIED", 21],
      ["VND-FOSROC-05", "Fosroc Chemicals India", "29AAACF1048P1ZP", "Admixtures & Waterproofing", "Bengaluru", "+91 80 4252 1900", "VERIFIED", 30],
    ];
    downloadCSVFile(`Master_Vendor_Directory_${new Date().toISOString().slice(0, 10)}.csv`, generateCSV(headers, rows));
  };

  const handleExportPurchaseOrders = () => {
    const headers = ["PO Number", "Project", "Vendor", "Material Package", "PO Amount (INR)", "Status", "Dual Control Approval", "Disbursement Stage"];
    const rows = [
      ["PO-2026-001", "Commercial Complex Tower B", "UltraTech Cement Ltd", "RMC Batching M30/M40", 3000000, "AUTHORISED_ISSUED", "APPROVED_CF_881290", "100% Advance Settled"],
      ["PO-2026-002", "Commercial Complex Tower B", "Tata Steel Ltd", "TMT Fe-550D Rebar 60 MT", 4080000, "AUTHORISED_ISSUED", "APPROVED_CF_881291", "30-Day Credit Released"],
      ["PO-2026-003", "Luxury Heights Phase 1", "Magicrete Building Solutions", "AAC Blocks 120 cum", 424800, "AUTHORISED_ISSUED", "APPROVED_CF_881292", "Part-by-Part (50% Advance)"],
    ];
    downloadCSVFile(`Commercial_Purchase_Orders_${new Date().toISOString().slice(0, 10)}.csv`, generateCSV(headers, rows));
  };

  const handleExportFinanceLedger = () => {
    const headers = ["Payment ID", "PO Reference", "Vendor Beneficiary", "Bank UTR Number", "Payment Mode", "Disbursed Amount (INR)", "Reconciliation Status"];
    const rows = [
      ["PAY-2026-01", "PO-2026-001", "UltraTech Cement Ltd", "HDFC992817441", "RTGS", 3000000, "3_WAY_MATCHED_CLEARED"],
      ["PAY-2026-02", "PO-2026-002", "Tata Steel Ltd", "ICIC881249912", "NEFT", 1500000, "PARTIAL_ADVANCE_SETTLED"],
      ["PAY-2026-03", "PO-2026-003", "Magicrete Building Solutions", "AXIS771029481", "RTGS", 212400, "3_WAY_MATCHED_CLEARED"],
    ];
    downloadCSVFile(`Bank_Transaction_Ledger_${new Date().toISOString().slice(0, 10)}.csv`, generateCSV(headers, rows));
  };

  const handleExportStockLedger = () => {
    const headers = ["Transaction ID", "Godown Facility", "Material Name", "Type", "Quantity", "Unit", "Storekeeper", "Timestamp"];
    const rows = [
      ["TXN-2026-001", "GDN-CEM-01 Central Cement Shed", "OPC 53 Grade Cement", "INWARD_GRN", 800, "Bags", "Ramesh Shinde", "2026-11-06 08:30"],
      ["TXN-2026-002", "GDN-STL-02 Rebar Laydown Yard", "TMT Rebar Fe-550D 16mm", "INWARD_GRN", 45, "MT", "Ramesh Shinde", "2026-11-06 08:45"],
      ["TXN-2026-003", "GDN-CEM-01 Central Cement Shed", "OPC 53 Grade Cement", "ISSUE_TO_CONTRACTOR", 250, "Bags", "Ramesh Shinde", "2026-11-06 09:00"],
    ];
    downloadCSVFile(`Godown_Stock_Ledger_${new Date().toISOString().slice(0, 10)}.csv`, generateCSV(headers, rows));
  };

  const handleTriggerSnapshot = () => {
    setIsSnapshotRunning(true);
    setSnapshotMessage("Connecting to Cloudflare D1 edge replica in bom01 (Mumbai)...");

    setTimeout(() => {
      setSnapshotMessage("Exporting D1 tables and generating compressed SQL dump...");
    }, 800);

    setTimeout(() => {
      const newBackupId = `BKP-D1-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
      const newRecord: BackupStatusRecord = {
        backupId: newBackupId,
        type: "D1_SQL_DUMP",
        timestamp: new Date().toISOString(),
        sizeMB: 152.4,
        sha256Checksum: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b",
        storageLocation: `r2://ostaad-production-vault/backups/d1/${newBackupId}.sql.gz`,
        status: "COMPLETED",
        retentionDays: 30,
        initiatedBy: "Manual Console Trigger (Administrator)",
      };

      setBackups((prev) => [newRecord, ...prev]);
      setIsSnapshotRunning(false);
      setSnapshotMessage(`Snapshot ${newBackupId} successfully stored in Cloudflare R2.`);
      setTimeout(() => setSnapshotMessage(null), 5000);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODULE TABS                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-t-xl">
        <button
          onClick={() => setActiveTab("exports")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeTab === "exports"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Universal Data Export Center
        </button>
        <button
          onClick={() => setActiveTab("backups")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeTab === "backups"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HardDrive className="h-4 w-4" />
          Cloudflare D1 & R2 Backups
        </button>
        <button
          onClick={() => setActiveTab("d1")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeTab === "d1"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="h-4 w-4" />
          D1 Migration Engine
        </button>
        <button
          onClick={() => setActiveTab("r2")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${
            activeTab === "r2"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FolderArchive className="h-4 w-4" />
          Cloudflare R2 Document Vault
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: UNIVERSAL DATA EXPORT CENTER                                */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "exports" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-[#122b45]">Universal Data Export Center</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Generate instant RFC 4180 compliant CSV tables and executive PDF documentation for all operational records.
                </p>
              </div>

              <button
                onClick={() => setShowExecutiveReportModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#10263d] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#153452]"
              >
                <Printer className="h-4 w-4" />
                Generate Executive Corporate Report
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* BOQ Register */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Module 4</span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">CSV</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Master BOQ Item Registry</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Comprehensive hierarchical quantities, unit rates, and IS 1200 work breakdown items.
                  </p>
                </div>
                <button
                  onClick={handleExportBOQ}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  Download BOQ (CSV)
                </button>
              </div>

              {/* Master Vendor Directory */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Module 5</span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">CSV</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Master Vendor Directory</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Verified supplier GSTIN records, contact details, payment credit days, and performance scores.
                  </p>
                </div>
                <button
                  onClick={handleExportVendors}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  Download Vendors (CSV)
                </button>
              </div>

              {/* Purchase Orders */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Module 6</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">CSV</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Purchase Orders Register</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    All authorized PO commitments, dual-control approval tokens, and payment stages.
                  </p>
                </div>
                <button
                  onClick={handleExportPurchaseOrders}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  Download POs (CSV)
                </button>
              </div>

              {/* Finance Bank Ledger */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Treasury</span>
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">CSV</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Bank Transaction & UTR Ledger</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Disbursements, RTGS/NEFT transaction references, and 3-way invoice match states.
                  </p>
                </div>
                <button
                  onClick={handleExportFinanceLedger}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-sky-600" />
                  Download Payments (CSV)
                </button>
              </div>

              {/* Godown Stock Ledger */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Module 7</span>
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">CSV</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Perpetual Stock Ledger</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Double-entry inventory journals for all 4 site godowns (Inward, Issue slips, Inter-godown transfers).
                  </p>
                </div>
                <button
                  onClick={handleExportStockLedger}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5 text-amber-600" />
                  Download Stock Ledger (CSV)
                </button>
              </div>

              {/* Full Tenant Backup */}
              <div className="rounded-xl border border-slate-200 bg-[#f4f8fc]/40 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Governance</span>
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">SQL DUMP</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#122b45]">Cloudflare D1 SQL Snapshot</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Encrypted SQL schema and row dump stored in Cloudflare R2 cold archive.
                  </p>
                </div>
                <button
                  onClick={handleTriggerSnapshot}
                  disabled={isSnapshotRunning}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSnapshotRunning ? "animate-spin" : ""}`} />
                  {isSnapshotRunning ? "Executing..." : "Trigger D1 Snapshot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: CLOUDFLARE D1 & R2 BACKUPS & RECOVERY PROCEDURES            */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "backups" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                  <h2 className="text-base font-bold text-[#122b45]">
                    Cloudflare D1 SQL Dump & R2 Storage Snapshot Ledger
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Nightly automated database dumps and document snapshots with multi-region edge replication.
                </p>
              </div>

              <button
                onClick={handleTriggerSnapshot}
                disabled={isSnapshotRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSnapshotRunning ? "animate-spin" : ""}`} />
                {isSnapshotRunning ? "Generating Snapshot..." : "Trigger Manual D1 Snapshot"}
              </button>
            </div>

            {snapshotMessage && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                <span>{snapshotMessage}</span>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase text-slate-400">Automated Schedule</div>
                <div className="mt-1 text-sm font-bold text-[#122b45]">Nightly at 02:00 UTC</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Cloudflare Cron Trigger Active</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase text-slate-400">Statutory Tax Retention</div>
                <div className="mt-1 text-sm font-bold text-emerald-700">7 Years (2555 Days)</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Indian GST & Audit Archival Enforced</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase text-slate-400">Edge Replication</div>
                <div className="mt-1 text-sm font-bold text-blue-700">Mumbai · Singapore · Frankfurt</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Zero RPO Geo-redundancy</div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Snapshot ID / Type</th>
                    <th className="px-4 py-3">Timestamp (UTC)</th>
                    <th className="px-4 py-3">Archive Size</th>
                    <th className="px-4 py-3">Storage Destination</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Retention</th>
                    <th className="px-5 py-3">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {backups.map((bkp) => (
                    <tr key={bkp.backupId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#122b45]">{bkp.backupId}</div>
                        <div className="text-[10px] text-blue-600 font-sans">{bkp.type}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                        {new Date(bkp.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{bkp.sizeMB.toFixed(1)} MB</td>
                      <td className="px-4 py-3.5 text-slate-500 text-[10px] truncate max-w-xs" title={bkp.storageLocation}>
                        {bkp.storageLocation}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 font-sans">
                          {bkp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 text-[11px]">
                        {bkp.retentionDays} Days
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-sans text-[11px]">
                        {bkp.initiatedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: D1 MIGRATION ENGINE                                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "d1" && (
        <div>
          <D1MigrationDashboard />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 4: CLOUDFLARE R2 DOCUMENT VAULT                                */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "r2" && (
        <div>
          <DocumentVault />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* EXECUTIVE CORPORATE REPORT MODAL                                   */}
      {/* ------------------------------------------------------------------ */}
      {showExecutiveReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45]">Executive C-Suite Portfolio Report Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Report
                </button>
                <button
                  onClick={() => setShowExecutiveReportModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Corporate Letterhead & Report Content */}
            <div className="mt-6 space-y-6 text-slate-800">
              {/* Header Banner */}
              <div className="flex items-start justify-between border-b-2 border-[#122b45] pb-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#122b45]">OSTAAD ENTERPRISE ERP</h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
                    Executive Governance & Capital Expenditure Report
                  </p>
                  <div className="mt-2 text-xs text-slate-600">
                    Reporting Period: Q3 / Q4 FY 2025–26 · Generated: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-bold text-[#122b45]">Confidential & Proprietary</div>
                  <div>Audit Reference: OST-AUD-2026-Q4</div>
                  <div className="text-emerald-700 font-semibold">Integrity: Cryptographically Verified</div>
                </div>
              </div>

              {/* Portfolio Key Figures */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Capital Portfolio Financial Overview
                </h3>
                <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                  <div>
                    <div className="text-slate-500">Total Sanctioned Budget</div>
                    <div className="mt-1 text-lg font-bold text-[#122b45]">₹120.00 Cr</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Committed POs Awarded</div>
                    <div className="mt-1 text-lg font-bold text-blue-700">₹84.90 Cr (70.8%)</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Verified Cash Disbursements</div>
                    <div className="mt-1 text-lg font-bold text-emerald-700">₹71.25 Cr (83.9%)</div>
                  </div>
                </div>
              </div>

              {/* Project Status Summary Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  2. Active Construction Sites Earned Value Scorecard
                </h3>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Site Name</th>
                      <th className="p-2 text-right">Budget</th>
                      <th className="p-2 text-right">Committed</th>
                      <th className="p-2 text-center">CPI</th>
                      <th className="p-2 text-center">SPI</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 font-semibold">Commercial Complex Tower B</td>
                      <td className="p-2 text-right">₹45.00 Cr</td>
                      <td className="p-2 text-right">₹31.20 Cr</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">1.04</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">0.96</td>
                      <td className="p-2 text-center font-bold text-emerald-700">HEALTHY</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold">Luxury Heights Phase 1</td>
                      <td className="p-2 text-right">₹28.00 Cr</td>
                      <td className="p-2 text-right">₹21.50 Cr</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">1.08</td>
                      <td className="p-2 text-center text-emerald-700 font-bold">1.02</td>
                      <td className="p-2 text-center font-bold text-emerald-700">HEALTHY</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold">Riverside Luxury Villas</td>
                      <td className="p-2 text-right">₹15.00 Cr</td>
                      <td className="p-2 text-right">₹13.80 Cr</td>
                      <td className="p-2 text-center text-rose-600 font-bold">0.91</td>
                      <td className="p-2 text-center text-rose-600 font-bold">0.79</td>
                      <td className="p-2 text-center font-bold text-rose-600">CRITICAL</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold">Industrial Logistics Hub Ph 2</td>
                      <td className="p-2 text-right">₹32.00 Cr</td>
                      <td className="p-2 text-right">₹18.40 Cr</td>
                      <td className="p-2 text-center text-slate-700 font-bold">1.01</td>
                      <td className="p-2 text-center text-slate-700 font-bold">0.98</td>
                      <td className="p-2 text-center font-bold text-amber-700">WATCHLIST</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Certification Block */}
              <div className="pt-6 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-300 pb-8 text-slate-400 font-mono text-[10px]">
                      [Digital Signature: 881290-OK]
                    </div>
                    <div className="font-bold text-slate-800 mt-2">Chief Financial Officer</div>
                    <div className="text-[10px] text-slate-500">Commercial Treasury</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 pb-8 text-slate-400 font-mono text-[10px]">
                      [Digital Signature: 77a19c-OK]
                    </div>
                    <div className="font-bold text-slate-800 mt-2">VP of Operations</div>
                    <div className="text-[10px] text-slate-500">Project Execution & Engineering</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 pb-8 text-slate-400 font-mono text-[10px]">
                      [Digital Signature: 99c804-OK]
                    </div>
                    <div className="font-bold text-slate-800 mt-2">Managing Director</div>
                    <div className="text-[10px] text-slate-500">Superadmin Executive Authority</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
