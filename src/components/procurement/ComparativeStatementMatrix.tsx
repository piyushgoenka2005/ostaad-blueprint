"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  TrendingDown,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  Printer,
  Download,
  AlertCircle,
  X,
  FileCheck2,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  MaterialRFQItem,
  VendorQuotationBid,
  VerifiedVendorProfile,
  generateComparativeStatement,
  ComparativeStatementSummary,
} from "@/lib/procurement-sourcing";

interface ComparativeStatementMatrixProps {
  rfqs: MaterialRFQItem[];
  bids: VendorQuotationBid[];
  vendors: VerifiedVendorProfile[];
  initialSelectedRFQId?: string;
  onSubmitRecommendationToFinance?: (dossier: ComparativeStatementSummary) => void;
}

export default function ComparativeStatementMatrix({
  rfqs,
  bids,
  vendors,
  initialSelectedRFQId,
  onSubmitRecommendationToFinance,
}: ComparativeStatementMatrixProps) {
  const [selectedRFQId, setSelectedRFQId] = useState<string>(
    initialSelectedRFQId || rfqs[0]?.id || "rfq-01"
  );
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [submissionSuccessNotice, setSubmissionSuccessNotice] = useState(false);

  const activeRFQ = useMemo(() => {
    return rfqs.find((r) => r.id === selectedRFQId) || rfqs[0];
  }, [rfqs, selectedRFQId]);

  // Baseline unit budgets for comparison:
  // Cement: ₹385/bag, Steel: ₹70,000/MT, Aggregates: ₹1,550/cum
  const baselineRate = useMemo(() => {
    if (!activeRFQ) return 400;
    if (activeRFQ.category === "CEMENT") return 385;
    if (activeRFQ.category === "STEEL_REBAR") return 70000;
    return 1550;
  }, [activeRFQ]);

  // Generate automated comparative statement
  const comparativeSummary = useMemo(() => {
    if (!activeRFQ) return null;
    return generateComparativeStatement(activeRFQ, bids, vendors, baselineRate);
  }, [activeRFQ, bids, vendors, baselineRate]);

  const [recommendationText, setRecommendationText] = useState(
    comparativeSummary?.recommendationNote || ""
  );

  const l1Bid = comparativeSummary?.rankedBids[0];
  const baselineTotalBudget = comparativeSummary?.engineeringBudgetLandedINR || 0;
  const l1TotalCost = l1Bid?.totalContractCostINR || 0;
  const totalSavings = baselineTotalBudget - l1TotalCost;
  const savingsPct = baselineTotalBudget > 0 ? (totalSavings / baselineTotalBudget) * 100 : 0;

  const handleSubmitToFinance = () => {
    if (!comparativeSummary) return;
    const finalDossier: ComparativeStatementSummary = {
      ...comparativeSummary,
      recommendationNote: recommendationText || comparativeSummary.recommendationNote,
      managingAuthorityStatus: "SUBMITTED_TO_FINANCE",
      recommendedBy: "Rajesh Sharma (Project Manager)",
      submittedDate: new Date().toISOString().split("T")[0],
    };

    setSubmissionSuccessNotice(true);
    if (onSubmitRecommendationToFinance) {
      onSubmitRecommendationToFinance(finalDossier);
    }
    setTimeout(() => setSubmissionSuccessNotice(false), 5000);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Sub-Modules 5.4 & 5.5
            </span>
            <span className="text-xs text-slate-500 font-medium">Multi-Criteria Evaluation & L1 to Ln Ranking</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Automated Comparative Statement Matrix & Award Workflow
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Transparent side-by-side bidder benchmarking, weighted composite scoring, and formal Finance recommendation.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* RFQ Package Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-500 font-medium">Requisition:</span>
            <select
              value={selectedRFQId}
              onChange={(e) => setSelectedRFQId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none"
            >
              {rfqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rfqNumber} — {r.materialName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowDossierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Official Dossier</span>
          </button>

          <button
            onClick={handleSubmitToFinance}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Recommend to Finance (PO Gate)</span>
          </button>
        </div>
      </div>

      {/* Submission Success Alert */}
      {submissionSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Award Recommendation Dispatched to Finance Approver!</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">
                The comparative statement and Project Manager justification have been queued in Module 6 (Commercial Gatekeeping & PO Generation).
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-200/60 px-2 py-1 rounded text-emerald-800">
            Handoff to Module 6
          </span>
        </div>
      )}

      {/* Requisition Commercial Overview Banner */}
      {activeRFQ && comparativeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Engineering Budget (EAC)</div>
              <div className="text-xl font-bold text-[#122b45]">
                ₹{(baselineTotalBudget / 100000).toFixed(2)} Lakhs
              </div>
              <div className="text-[11px] text-slate-500">₹{baselineRate.toLocaleString("en-IN")}/{activeRFQ.standardUOM} baseline</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">L1 Lowest Quoted Outlay</div>
              <div className="text-xl font-bold text-emerald-700">
                ₹{(l1TotalCost / 100000).toFixed(2)} Lakhs
              </div>
              <div className="text-[11px] text-emerald-600 font-medium">
                {l1Bid?.vendorName || "No Bids"}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Cost Savings vs Budget</div>
              <div className="text-xl font-bold text-amber-700">
                {totalSavings >= 0 ? `₹${(totalSavings / 100000).toFixed(2)} Lakhs` : "Over budget"}
              </div>
              <div className="text-[11px] text-slate-500">
                {savingsPct > 0 ? `${savingsPct.toFixed(1)}% savings` : "Premium"}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">Commercial Status</div>
              <div className="text-sm font-bold text-purple-800 mt-0.5">
                {comparativeSummary.managingAuthorityStatus.replace(/_/g, " ")}
              </div>
              <div className="text-[11px] text-slate-500">PM Sign-off Complete</div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparative Statement Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Side-by-Side Multi-Criteria Bid Ranking — {activeRFQ?.rfqNumber}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Weighted Score: Price (50%) + Lead Time (20%) + Credit Terms (15%) + Quality (15%)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-16 text-center">Rank</th>
                <th className="py-3 px-4 min-w-[200px]">Supplier & Prequalification Tier</th>
                <th className="py-3 px-3 text-right">Net Landed Rate</th>
                <th className="py-3 px-4 text-right">Total Landed Contract Cost</th>
                <th className="py-3 px-3 text-right">Delta vs L1</th>
                <th className="py-3 px-3 text-center">Lead Time</th>
                <th className="py-3 px-3 min-w-[140px]">Credit Terms</th>
                <th className="py-3 px-3 text-center">QC Score</th>
                <th className="py-3 px-3 text-center bg-blue-50/60 text-blue-900">Score / 100</th>
                <th className="py-3 px-3 text-center">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {comparativeSummary?.rankedBids.map((bid) => {
                const isL1 = bid.rank === 1;

                return (
                  <tr
                    key={bid.bidId}
                    className={`hover:bg-slate-50/80 transition ${
                      isL1 ? "bg-emerald-50/30" : "bg-white"
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs ${
                          isL1
                            ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200"
                            : bid.rank === 2
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        L{bid.rank}
                      </span>
                    </td>

                    {/* Supplier Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{bid.vendorName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {bid.vendorTier.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    {/* Net Landed Rate */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{bid.netLandedRateINR.toLocaleString("en-IN")}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45] text-sm">
                      ₹{bid.totalContractCostINR.toLocaleString("en-IN")}
                    </td>

                    {/* Delta vs L1 */}
                    <td className="py-3 px-3 text-right font-mono">
                      {isL1 ? (
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                          L1 Champion
                        </span>
                      ) : (
                        <span className="text-rose-700 font-semibold text-[11px]">
                          +₹{bid.costDeltaL1INR.toLocaleString("en-IN")} (+{bid.costDeltaPercent}%)
                        </span>
                      )}
                    </td>

                    {/* Lead Days */}
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {bid.deliveryLeadTimeDays} days
                    </td>

                    {/* Credit Terms */}
                    <td className="py-3 px-3 text-slate-700 text-[11px]">
                      {bid.paymentCreditTerms}
                    </td>

                    {/* QC Score */}
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                      {bid.vendorQualityRating.toFixed(1)} / 5.0
                    </td>

                    {/* Composite Score */}
                    <td className="py-3 px-3 text-center bg-blue-50/30">
                      <span className="font-mono font-bold text-blue-900 text-sm">
                        {bid.compositeScore}
                      </span>
                    </td>

                    {/* Recommendation Badge */}
                    <td className="py-3 px-3 text-center">
                      {isL1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>RECOMMENDED</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Alternative</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Project Manager Justification Box */}
        <div className="border-t border-slate-200 p-5 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Project Manager Formal Award Justification Note (for Finance Approver):</span>
            </div>
            <span className="text-[11px] text-slate-500">Sign-off: Rajesh Sharma (Project Manager)</span>
          </div>

          <textarea
            rows={2}
            value={recommendationText}
            onChange={(e) => setRecommendationText(e.target.value)}
            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Approving this recommendation automatically forwards the purchase commitment to Module 6 for PO issuance.</span>
            </div>

            <button
              onClick={handleSubmitToFinance}
              className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700 text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Forward to Executive Finance Gate</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL COMPARATIVE STATEMENT DOSSIER                             */}
      {/* ========================================================================= */}
      {showDossierModal && activeRFQ && comparativeSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  Official Commercial Comparative Statement & Award Recommendation Dossier
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDossier}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  onClick={() => setShowDossierModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-6 text-xs text-slate-800 font-sans border p-6 rounded-lg bg-white shadow-sm">
              <div className="text-center pb-4 border-b-2 border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-[#10263d]">OSTAAD INFRASTRUCTURE DEVELOPERS LTD.</h1>
                <p className="text-[11px] text-slate-600">CIN: L45200MH2021PLC345981 • Commercial Procurement & Sourcing Division</p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-bold uppercase tracking-wider text-xs">
                  COMMERCIAL COMPARATIVE STATEMENT & AWARD EVALUATION
                </div>
              </div>

              {/* Meta Data */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <div>Requisition Code: <strong className="font-mono">{activeRFQ.rfqNumber}</strong></div>
                  <div>Material Package: <strong>{activeRFQ.materialName}</strong></div>
                  <div>Requisition Quantity: <strong className="font-mono">{activeRFQ.requiredQuantity.toLocaleString("en-IN")} {activeRFQ.standardUOM}</strong></div>
                </div>
                <div className="text-right">
                  <div>Project: <strong>Commercial Complex — Tower B</strong></div>
                  <div>Evaluation Date: <strong>{new Date().toISOString().split("T")[0]}</strong></div>
                  <div>Approved Baseline Budget: <strong className="font-mono">₹{baselineTotalBudget.toLocaleString("en-IN")}</strong></div>
                </div>
              </div>

              {/* Bid Comparison Matrix Table */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-2">Bidder Evaluation Matrix:</h4>
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-center">Rank</th>
                      <th className="p-2">Supplier Name</th>
                      <th className="p-2 text-right">Landed Rate</th>
                      <th className="p-2 text-right">Total Outlay</th>
                      <th className="p-2 text-center">Lead Days</th>
                      <th className="p-2">Payment Terms</th>
                      <th className="p-2 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparativeSummary.rankedBids.map((b) => (
                      <tr key={b.bidId} className={b.rank === 1 ? "bg-emerald-50/50 font-semibold" : ""}>
                        <td className="p-2 text-center font-mono">L{b.rank}</td>
                        <td className="p-2">{b.vendorName}</td>
                        <td className="p-2 text-right font-mono">₹{b.netLandedRateINR.toLocaleString("en-IN")}</td>
                        <td className="p-2 text-right font-mono">₹{b.totalContractCostINR.toLocaleString("en-IN")}</td>
                        <td className="p-2 text-center font-mono">{b.deliveryLeadTimeDays}d</td>
                        <td className="p-2 text-[11px]">{b.paymentCreditTerms}</td>
                        <td className="p-2 text-center font-mono font-bold">{b.compositeScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Justification note */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">Project Manager Recommendation Justification:</div>
                <p className="text-slate-700 italic leading-relaxed">&quot;{recommendationText}&quot;</p>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 mt-8">
                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Rajesh Sharma
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Project Manager
                  </div>
                  <div className="text-[10px] text-slate-500">Commercial Evaluation Done</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center font-mono text-slate-500 italic text-[11px]">
                    Signed by Vikram Kulkarni
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Lead Resident Engineer
                  </div>
                  <div className="text-[10px] text-slate-500">IS Specs Confirmed</div>
                </div>

                <div>
                  <div className="h-14 flex items-end justify-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[10px]">
                      AWAITING PO RELEASE
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Finance Approver (Module 6)
                  </div>
                  <div className="text-[10px] text-slate-500">Dual Control PO Gate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
