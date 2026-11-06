"use client";

import React, { useState, useMemo } from "react";
import {
  FileCheck2,
  Receipt,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Percent,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Check,
  X,
  FileSpreadsheet,
  Award,
} from "lucide-react";
import {
  RunningAccountBillSummary,
  RABillLineMeasurement,
  DEFAULT_RA_BILL_04,
} from "@/lib/boq-cost-control";

interface RABillingMeasurementSheetProps {
  initialBill?: RunningAccountBillSummary;
}

export default function RABillingMeasurementSheet({
  initialBill = DEFAULT_RA_BILL_04,
}: RABillingMeasurementSheetProps) {
  const [bill, setBill] = useState<RunningAccountBillSummary>(initialBill);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [isSignOffComplete, setIsSignOffComplete] = useState(false);

  // Update a line's current executed quantity
  const handleCurrentQtyChange = (boqItemId: string, newCurrentQty: number) => {
    const updatedLines = bill.lines.map((line) => {
      if (line.boqItemId === boqItemId) {
        const cumulativeQty = line.previousExecutedQuantity + newCurrentQty;
        const progressPct = Math.min(
          100,
          Math.round((cumulativeQty / (line.tenderQuantity || 1)) * 1000) / 10
        );
        const currentAmount = Math.round(newCurrentQty * line.approvedRateINR);
        const cumulativeAmount = Math.round(cumulativeQty * line.approvedRateINR);

        return {
          ...line,
          currentExecutedQuantity: newCurrentQty,
          cumulativeExecutedQuantity: cumulativeQty,
          cumulativeProgressPercent: progressPct,
          currentAmountINR: currentAmount,
          cumulativeAmountINR: cumulativeAmount,
        };
      }
      return line;
    });

    // Recompute bill financials
    const newGrossCurrent = updatedLines.reduce((sum, l) => sum + l.currentAmountINR, 0);
    const retention = Math.round((newGrossCurrent * bill.retentionMoneyDeductionPercent) / 100);
    const mobAdvance = Math.round((newGrossCurrent * bill.mobilizationAdvanceRecoveryPercent) / 100);
    const tds = Math.round((newGrossCurrent * bill.taxDeductionAtSourceTDSPercent) / 100);
    const gst = Math.round((newGrossCurrent * bill.gstWorksContractPercent) / 100);
    const netPayable = newGrossCurrent - retention - mobAdvance - tds + gst;

    setBill({
      ...bill,
      grossCurrentAmountINR: newGrossCurrent,
      retentionMoneyDeductionINR: retention,
      mobilizationAdvanceRecoveryINR: mobAdvance,
      taxDeductionAtSourceTDSINR: tds,
      gstWorksContractINR: gst,
      netPayableToContractorINR: netPayable,
      lines: updatedLines,
    });
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const exportRABillToCSV = () => {
    const headers = [
      "WBS Code",
      "Item Description",
      "Unit",
      "Approved Rate (INR)",
      "Tender Qty",
      "Prev Exec Qty",
      "Current Exec Qty",
      "Cumulative Qty",
      "Progress %",
      "Current Amount (INR)",
      "Cumulative Amount (INR)",
    ];
    const rows = bill.lines.map((l) => [
      l.wbsCode,
      `"${l.description}"`,
      l.unit,
      l.approvedRateINR,
      l.tenderQuantity,
      l.previousExecutedQuantity,
      l.currentExecutedQuantity,
      l.cumulativeExecutedQuantity,
      `${l.cumulativeProgressPercent}%`,
      l.currentAmountINR,
      l.cumulativeAmountINR,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${bill.billNumber}_Measurement_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Contractor Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Sub-Module 4.5
            </span>
            <span className="text-xs text-slate-500 font-medium">Running Account (RA) Progressive Billing</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Running Account Bill & Client Measurement Book (MB)
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
            <span>
              Bill No: <strong className="text-slate-900 font-mono">{bill.billNumber}</strong>
            </span>
            <span>•</span>
            <span>
              Contractor: <strong className="text-slate-900">{bill.contractorName}</strong>
            </span>
            <span>•</span>
            <span>
              Period: <strong className="text-slate-900">{bill.measurementPeriod}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportRABillToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Measurement CSV</span>
          </button>

          <button
            onClick={() => setShowCertificateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>View Tax Invoice Certificate</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Gross Value of Work Done</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(bill.grossCurrentAmountINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-slate-500">Current Period (Feb 2026)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Statutory & Adv. Deductions</div>
            <div className="text-xl font-bold text-amber-700">
              -₹{((bill.retentionMoneyDeductionINR + bill.mobilizationAdvanceRecoveryINR + bill.taxDeductionAtSourceTDSINR) / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-slate-500">5% Ret. + 10% Adv. + 2% TDS</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Works Contract GST (18%)</div>
            <div className="text-xl font-bold text-purple-700">
              +₹{(bill.gstWorksContractINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-slate-500">CGST 9% + SGST 9%</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Net Payable to Contractor</div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{(bill.netPayableToContractorINR / 100000).toFixed(2)} Lakhs
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Ready for RTGS Disbursement</div>
          </div>
        </div>
      </div>

      {/* Measurement Book (MB) Lines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Progressive Measurement Book (MB) Entries — {bill.billNumber}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Edit Current Qty to recalculate deductions and net payable
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-20">WBS Code</th>
                <th className="py-3 px-4 min-w-[240px]">Item Description</th>
                <th className="py-3 px-3 w-16 text-center">Unit</th>
                <th className="py-3 px-3 w-24 text-right">Tender Qty</th>
                <th className="py-3 px-3 w-24 text-right">Prev Exec</th>
                <th className="py-3 px-3 w-28 text-right bg-blue-50/60 text-blue-900">Current Exec</th>
                <th className="py-3 px-3 w-24 text-right">Cumul Qty</th>
                <th className="py-3 px-3 w-24 text-center">Progress %</th>
                <th className="py-3 px-3 w-28 text-right">Rate (₹)</th>
                <th className="py-3 px-4 w-32 text-right">Current Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {bill.lines.map((line) => (
                <tr key={line.boqItemId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-800">{line.wbsCode}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 leading-snug">{line.description}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-700">{line.unit}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {line.tenderQuantity.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {line.previousExecutedQuantity.toLocaleString("en-IN")}
                  </td>

                  {/* Inline Editable Current Executed Quantity */}
                  <td className="py-3 px-3 text-right bg-blue-50/30">
                    <input
                      type="number"
                      min={0}
                      value={line.currentExecutedQuantity}
                      onChange={(e) => handleCurrentQtyChange(line.boqItemId, Number(e.target.value))}
                      className="w-20 text-right px-1.5 py-0.5 bg-white border border-blue-400 rounded text-xs font-mono font-bold text-blue-900"
                    />
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                    {line.cumulativeExecutedQuantity.toLocaleString("en-IN")}
                  </td>

                  {/* Progress % Bar */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-800">
                        {line.cumulativeProgressPercent}%
                      </span>
                    </div>
                    <div className="w-16 h-1 bg-slate-200 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(100, line.cumulativeProgressPercent)}%` }}
                      ></div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{line.approvedRateINR.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45]">
                    ₹{line.currentAmountINR.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Deductions & Statutory Taxes Calculation Table */}
        <div className="border-t border-slate-200 p-5 bg-slate-50/50">
          <div className="max-w-xl ml-auto space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200 font-semibold text-slate-800">
              <span>Gross Current Period Value:</span>
              <span className="font-mono font-bold text-[#122b45] text-sm">
                ₹{bill.grossCurrentAmountINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>Less: Retention Money (5.00%):</span>
              <span className="font-mono text-rose-700">
                -₹{bill.retentionMoneyDeductionINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>Less: Mobilization Advance Recovery (10.00%):</span>
              <span className="font-mono text-rose-700">
                -₹{bill.mobilizationAdvanceRecoveryINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>Less: TDS u/s 194C on Works Contract (2.00%):</span>
              <span className="font-mono text-rose-700">
                -₹{bill.taxDeductionAtSourceTDSINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 text-slate-600 border-b border-slate-200 pb-2">
              <span>Add: Works Contract GST (18.00%):</span>
              <span className="font-mono text-emerald-700">
                +₹{bill.gstWorksContractINR.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 bg-emerald-50 px-3 rounded-lg border border-emerald-200">
              <span className="font-bold text-emerald-950 text-sm">Net Payable to Contractor:</span>
              <span className="font-mono font-bold text-emerald-800 text-base">
                ₹{bill.netPayableToContractorINR.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL RA BILL TAX INVOICE CERTIFICATE                           */}
      {/* ========================================================================= */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar for Modal */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Official Running Account Bill Tax Invoice Certificate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCertificate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans border p-6 rounded-lg bg-white shadow-sm">
              {/* Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-[#10263d]">OSTAAD INFRASTRUCTURE DEVELOPERS LTD.</h1>
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • GSTIN: 27AABCO1234F1Z8</p>
                <p className="text-[11px] text-slate-500">Corporate Tower B, 14th Floor, Senapati Bapat Marg, Pune, Maharashtra 411016</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  INTERIM RUNNING ACCOUNT PAYMENT CERTIFICATE
                </div>
              </div>

              {/* Certificate Details Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>Project: <strong>{bill.projectName}</strong></div>
                  <div>Project Code: <strong className="font-mono">{bill.projectCode}</strong></div>
                  <div>Contractor: <strong>{bill.contractorName}</strong></div>
                </div>
                <div className="text-right">
                  <div>Certificate Ref: <strong className="font-mono">{bill.billNumber}</strong></div>
                  <div>Date of Certification: <strong>{bill.billDate}</strong></div>
                  <div>Measurement Period: <strong>{bill.measurementPeriod}</strong></div>
                </div>
              </div>

              {/* Certified Financial Breakdown */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Interim Valuation Breakdown:</h4>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 font-medium">1. Gross Current Value of Work Measured:</td>
                      <td className="p-2 text-right font-mono font-bold">₹{bill.grossCurrentAmountINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">2. Less: Retention Money Deducted (5.00%):</td>
                      <td className="p-2 text-right font-mono text-rose-700">-₹{bill.retentionMoneyDeductionINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">3. Less: Mobilization Advance Recovery (10.00%):</td>
                      <td className="p-2 text-right font-mono text-rose-700">-₹{bill.mobilizationAdvanceRecoveryINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">4. Less: Tax Deducted at Source (TDS 194C @ 2.00%):</td>
                      <td className="p-2 text-right font-mono text-rose-700">-₹{bill.taxDeductionAtSourceTDSINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">5. Add: Works Contract GST (18.00%):</td>
                      <td className="p-2 text-right font-mono text-emerald-700">+₹{bill.gstWorksContractINR.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-2.5 text-sm text-slate-900">NET AMOUNT CERTIFIED FOR PAYMENT:</td>
                      <td className="p-2.5 text-right font-mono text-base text-[#122b45]">
                        ₹{bill.netPayableToContractorINR.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures & Seal Section */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 mt-8">
                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Rajesh Sharma
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Project Manager (PMC)
                  </div>
                  <div className="text-[10px] text-slate-500">Verified & Approved</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by V. Kulkarni
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Lead Resident Engineer
                  </div>
                  <div className="text-[10px] text-slate-500">Measurements Checked</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                      PASSED FOR PAYMENT
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Finance Controller
                  </div>
                  <div className="text-[10px] text-slate-500">Bank RTGS Authorized</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
