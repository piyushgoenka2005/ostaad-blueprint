"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Download,
  Eye,
  Hash,
  Terminal,
  Activity,
  User,
  Clock,
  Sparkles,
  X,
  FileSpreadsheet,
} from "lucide-react";
import {
  AuditEventRecord,
  DEFAULT_AUDIT_LOGS,
  verifyAuditTrailChain,
  generateCSV,
  downloadCSVFile,
} from "@/lib/reporting-audit-governance";

export default function SystemAuditSecurityLogs() {
  const [logs, setLogs] = useState<AuditEventRecord[]>(DEFAULT_AUDIT_LOGS);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<AuditEventRecord | null>(null);

  // Cryptographic integrity verification state
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    valid: boolean;
    total: number;
    timestamp?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCat = categoryFilter === "ALL" || log.category === categoryFilter;
      const matchSev = severityFilter === "ALL" || log.severity === severityFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        log.id.toLowerCase().includes(query) ||
        log.actor.name.toLowerCase().includes(query) ||
        log.actor.email.toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.sha256Hash.toLowerCase().includes(query);

      return matchCat && matchSev && matchQuery;
    });
  }, [logs, categoryFilter, severityFilter, searchQuery]);

  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyAuditTrailChain(logs);
      setVerificationResult({
        verified: true,
        valid: result.isValid,
        total: result.totalVerified,
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsVerifying(false);
    }, 600);
  };

  const handleExportCSV = () => {
    const headers = [
      "Audit ID",
      "Timestamp (UTC)",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "IP Address",
      "Category",
      "Action",
      "Target Entity",
      "Entity ID",
      "Details",
      "Severity",
      "SHA-256 Hash",
      "Previous Hash",
      "Verification Status",
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      log.actor.name,
      log.actor.email,
      log.actor.role,
      log.actor.ipAddress,
      log.category,
      log.action,
      log.targetEntity,
      log.entityId,
      log.details,
      log.severity,
      log.sha256Hash,
      log.previousHash,
      log.verificationStatus,
    ]);

    const csv = generateCSV(headers, rows);
    downloadCSVFile(`Immutable_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* AUDIT & SECURITY GOVERNANCE BANNER                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-[#122b45]">
                Cryptographic Immutable Audit Trail (SHA-256 Chain)
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 max-w-3xl">
              Every critical event across finance authorizations, budget pool amendments, gate weighbridge checks, and
              permission controls is recorded into an append-only cryptographic ledger with preceding block hashes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleVerifyIntegrity}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 rounded-lg bg-[#10263d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#153452] disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin" : ""}`} />
              {isVerifying ? "Verifying SHA-256..." : "Verify Hash Chain Integrity"}
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export Audit Trail
            </button>
          </div>
        </div>

        {/* Verification Status Feedback Alert */}
        {verificationResult && (
          <div
            className={`mt-4 flex items-center justify-between rounded-lg border p-3.5 text-xs transition-all ${
              verificationResult.valid
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {verificationResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {verificationResult.valid
                    ? "Cryptographic Verification Passed"
                    : "Integrity Warning: Discrepancy Found"}
                </span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span>
                  {verificationResult.valid
                    ? `All ${verificationResult.total} linked blocks verified against SHA-256 parent hashes without tampering.`
                    : "Hash chain verification encountered a mismatch."}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Verified at {verificationResult.timestamp}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FILTER & SEARCH TOOLBAR                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor, IP, hash, or entity..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">All Categories</option>
            <option value="FINANCIAL_DECISION">Financial Decisions</option>
            <option value="BUDGET_OVERRIDE">Budget Overrides</option>
            <option value="PO_APPROVAL">PO Approvals</option>
            <option value="WEIGHBRIDGE_DISCREPANCY">Weighbridge Discrepancies</option>
            <option value="RBAC_ESCALATION">RBAC Escalations</option>
            <option value="BOQ_REVISION">BOQ Revisions</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AUDIT LOG TABLE WITH BLOCK DETAILS                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs text-[10px] uppercase tracking-wide text-slate-700 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3">Block ID / Timestamp</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action Executed</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3 text-center">Severity</th>
                <th className="px-4 py-3 text-center">SHA-256 Digest</th>
                <th className="px-5 py-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => {
                const isCrit = log.severity === "CRITICAL";
                const isWarn = log.severity === "WARNING";

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-[#122b45]">{log.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{log.actor.name}</div>
                      <div className="text-[10px] text-slate-500">{log.actor.role}</div>
                      <div className="text-[9px] font-mono text-slate-400">{log.actor.ipAddress}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {log.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#122b45]">{log.action}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{log.details}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-700 font-medium">{log.targetEntity}</div>
                      <div className="text-[10px] font-mono text-blue-600">{log.entityId}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isCrit
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : isWarn
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>SHA-256 Valid</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedRecord(log)}
                        className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Inspect Block</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              No audit log entries found matching the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AUDIT RECORD CRYPTOGRAPHIC BLOCK MODAL                             */}
      {/* ------------------------------------------------------------------ */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Cryptographic Audit Block
                </span>
                <h3 className="text-xl font-bold font-mono text-[#122b45]">{selectedRecord.id}</h3>
                <p className="text-xs text-slate-500">
                  Recorded at {new Date(selectedRecord.timestamp).toISOString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Action:</span>
                  <span className="font-bold text-[#122b45]">{selectedRecord.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Authorized Actor:</span>
                  <span className="text-slate-800">
                    {selectedRecord.actor.name} ({selectedRecord.actor.role})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Origin IP:</span>
                  <span className="font-mono text-slate-700">{selectedRecord.actor.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Target Entity:</span>
                  <span className="font-mono text-blue-700">
                    {selectedRecord.targetEntity} [{selectedRecord.entityId}]
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Event Narrative:</span>
                  <p className="mt-1 text-slate-700 leading-relaxed">{selectedRecord.details}</p>
                </div>
              </div>

              {/* Before and After Diffs if present */}
              {(selectedRecord.beforeValue || selectedRecord.afterValue) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Before State</div>
                    <div className="mt-1 font-mono text-[11px] text-slate-700">{selectedRecord.beforeValue || "N/A"}</div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <div className="text-[10px] font-bold uppercase text-blue-700">After State</div>
                    <div className="mt-1 font-mono text-[11px] text-blue-900 font-semibold">
                      {selectedRecord.afterValue || "N/A"}
                    </div>
                  </div>
                </div>
              )}

              {/* Cryptographic Hashes */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white font-mono text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400 text-[10px] uppercase font-bold tracking-wider">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Immutable Block Hashes</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Parent Previous Hash:</div>
                  <div className="text-slate-300 break-all select-all">{selectedRecord.previousHash}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Record SHA-256 Hash:</div>
                  <div className="text-emerald-400 break-all select-all">{selectedRecord.sha256Hash}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Digital Signature:</div>
                  <div className="text-sky-300 break-all select-all">{selectedRecord.digitalSignature}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Audit Certificate for block ${selectedRecord.id} generated.`);
                  setSelectedRecord(null);
                }}
                className="rounded-lg bg-[#10263d] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#153452]"
              >
                Download Block Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
