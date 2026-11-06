"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  Info,
  Clock,
  IndianRupee,
  Building,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  StructuralOption,
  EvaluationCriterion,
  GateRule,
  DEFAULT_SCORECARD_CRITERIA,
  MANDATORY_HARD_GATES,
  DEFAULT_STRUCTURAL_OPTIONS,
  evaluateOptionsScorecard,
} from "@/lib/planning/finance-scorecard";

interface OptionsScorecardGateMatrixProps {
  className?: string;
  onSelectOption?: (option: StructuralOption) => void;
}

export default function OptionsScorecardGateMatrix({
  className = "",
  onSelectOption,
}: OptionsScorecardGateMatrixProps) {
  const [options, setOptions] = useState<StructuralOption[]>(DEFAULT_STRUCTURAL_OPTIONS);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(DEFAULT_SCORECARD_CRITERIA);
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>("opt-2"); // Mivan default expanded

  // Recalculate evaluation dynamically whenever options or criteria change
  const evaluations = useMemo(() => {
    return evaluateOptionsScorecard(options, criteria, MANDATORY_HARD_GATES);
  }, [options, criteria]);

  // Find top recommended qualified option
  const topRecommended = useMemo(() => {
    return evaluations.find((e) => !e.isDisqualified) || null;
  }, [evaluations]);

  // Handle Gate Toggle
  const toggleGate = (optionId: string, gateId: string) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optionId) return opt;
        const currentVal = opt.gatePasses[gateId] ?? true;
        return {
          ...opt,
          gatePasses: {
            ...opt.gatePasses,
            [gateId]: !currentVal,
          },
        };
      })
    );
  };

  // Handle Score Change
  const updateScore = (optionId: string, criterionId: string, value: number) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optionId) return opt;
        return {
          ...opt,
          scores: {
            ...opt.scores,
            [criterionId]: Math.min(10, Math.max(1, value)),
          },
        };
      })
    );
  };

  // Handle Weight Adjustment
  const updateCriterionWeight = (critId: string, newWeight: number) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === critId ? { ...c, weightPercentage: newWeight } : c))
    );
  };

  // Reset to Defaults
  const resetToDefaults = () => {
    setOptions(DEFAULT_STRUCTURAL_OPTIONS);
    setCriteria(DEFAULT_SCORECARD_CRITERIA);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Project Options Selection Scorecard & Gate Matrix (Tool 14)
                </h3>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  IS 13920 & NBC 2016
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Multi-criteria weighted evaluation matrix with mandatory hard pass/fail gates and schedule-capex delta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              Reset Defaults
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Export Matrix
            </button>
          </div>
        </div>

        {/* Executive Recommendation Pill Box */}
        {topRecommended ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                      Recommended System (Rank #1)
                    </span>
                    <span className="text-xs font-bold text-emerald-950">
                      Weighted Score: {topRecommended.weightedScore} / 10
                    </span>
                  </div>
                  <h4 className="font-bold text-[#122b45] text-sm mt-1">
                    {topRecommended.option.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {topRecommended.option.systemDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <div className="rounded-lg bg-white px-3 py-1.5 border border-emerald-200 text-center shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium">Capex Delta</div>
                  <div className="text-xs font-bold text-[#122b45]">
                    {topRecommended.option.costPerSqFtDeltaINR >= 0 ? "+" : ""}₹
                    {topRecommended.option.costPerSqFtDeltaINR}/sq.ft
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-1.5 border border-emerald-200 text-center shadow-xs">
                  <div className="text-[10px] text-slate-500 font-medium">Schedule Gain</div>
                  <div className="text-xs font-bold text-emerald-700">
                    -{topRecommended.option.timeSavingsMonths} Months
                  </div>
                </div>
                {onSelectOption && (
                  <button
                    onClick={() => onSelectOption(topRecommended.option)}
                    className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                  >
                    Select Option
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
            <p className="text-xs font-bold text-rose-700">
              All structural options have failed mandatory hard gates. Adjust project constraints or site logistics.
            </p>
          </div>
        )}
      </div>

      {/* Mandatory Hard Gates Explanation Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-bold text-[#122b45]">
              Mandatory Hard Pass/Fail Gates (IS 13920 & Logistics Verification)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            A single failure triggers immediate automatic disqualification
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {MANDATORY_HARD_GATES.map((gate, i) => (
            <div
              key={gate.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-[#122b45]">{gate.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {gate.failConditionDescription}
                </p>
              </div>
              <div className="mt-3 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                Strict Disqualification Rule
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Options Evaluation Matrix Cards */}
      <div className="space-y-4">
        {evaluations.map(({ option, weightedScore, isDisqualified, failedGates, rank }) => {
          const isExpanded = expandedOptionId === option.id;

          return (
            <div
              key={option.id}
              className={`rounded-2xl border transition-all duration-200 bg-white overflow-hidden shadow-sm ${
                isDisqualified
                  ? "border-rose-200 bg-rose-50/10"
                  : rank === 1
                  ? "border-emerald-300 ring-1 ring-emerald-400/40"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Option Main Header */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
                      isDisqualified
                        ? "bg-rose-100 text-rose-700"
                        : rank === 1
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    #{rank}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-[#122b45] text-sm sm:text-base">
                        {option.name}
                      </h4>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {option.shortCode}
                      </span>
                      {isDisqualified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" />
                          DISQUALIFIED
                        </span>
                      ) : rank === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          TOP RECOMMENDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                          FEASIBLE ALTERNATIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      {option.systemDescription}
                    </p>

                    {/* Disqualification Banner */}
                    {isDisqualified && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>Failed Gates: {failedGates.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Delta Pills */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap lg:flex-nowrap">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-center min-w-[90px]">
                    <div className="text-[10px] text-slate-500 font-medium">Weighted Score</div>
                    <div
                      className={`text-base font-black ${
                        isDisqualified
                          ? "text-rose-600 line-through"
                          : rank === 1
                          ? "text-emerald-700"
                          : "text-[#122b45]"
                      }`}
                    >
                      {weightedScore} <span className="text-xs font-normal text-slate-400">/10</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-center min-w-[90px]">
                    <div className="text-[10px] text-slate-500 font-medium">Cost Delta</div>
                    <div className="text-xs font-bold text-[#122b45]">
                      {option.costPerSqFtDeltaINR === 0
                        ? "Baseline (₹0)"
                        : `${option.costPerSqFtDeltaINR > 0 ? "+" : ""}₹${option.costPerSqFtDeltaINR}/sq.ft`}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-center min-w-[90px]">
                    <div className="text-[10px] text-slate-500 font-medium">Schedule Gain</div>
                    <div className="text-xs font-bold text-emerald-700">
                      {option.timeSavingsMonths > 0
                        ? `-${option.timeSavingsMonths} Months`
                        : "Baseline"}
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedOptionId(isExpanded ? null : option.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    title={isExpanded ? "Collapse Details" : "Expand Details"}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details: Gate Toggles & Criteria Sliders */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-[#f8fafc] p-5 space-y-6">
                  {/* Gate Verification Row */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                      Mandatory Hard Gates Status (Click to Toggle Compliance)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {MANDATORY_HARD_GATES.map((gate) => {
                        const passed = option.gatePasses[gate.id] ?? true;
                        return (
                          <button
                            key={gate.id}
                            onClick={() => toggleGate(option.id, gate.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                              passed
                                ? "border-emerald-200 bg-white hover:border-emerald-300"
                                : "border-rose-300 bg-rose-50 text-rose-900"
                            }`}
                          >
                            <div className="pr-2">
                              <div className="text-xs font-bold">{gate.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {passed ? "Gate Passed" : "Breached - Disqualified"}
                              </div>
                            </div>
                            {passed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Criteria Sliders */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Weighted Criteria Scoring (1 - 10 Scale)
                      </h5>
                      <span className="text-[11px] text-slate-500">
                        Live score recalculation
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {criteria.map((crit) => {
                        const currentScore = option.scores[crit.id] ?? 5.0;
                        return (
                          <div
                            key={crit.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-[#122b45] mb-1">
                              <span className="truncate pr-2">{crit.name}</span>
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                {currentScore.toFixed(1)}/10
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                              <span>Weight: {crit.weightPercentage}%</span>
                              <span>Impact: {((crit.weightPercentage * currentScore) / 10).toFixed(2)} pts</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="0.5"
                              value={currentScore}
                              onChange={(e) =>
                                updateScore(option.id, crit.id, parseFloat(e.target.value))
                              }
                              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                              <span>1 (Poor)</span>
                              <span>5 (Standard)</span>
                              <span>10 (Benchmark)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision Comparison Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-[#122b45] mb-4">
          Comparative Structural Systems Matrix Summary
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">System Name</th>
                <th className="py-2.5 px-3">Gates Compliance</th>
                <th className="py-2.5 px-3 text-center">Weighted Score</th>
                <th className="py-2.5 px-3 text-right">Capex Delta (₹/sq.ft)</th>
                <th className="py-2.5 px-3 text-right">Schedule Savings</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluations.map(({ option, weightedScore, isDisqualified, rank }) => {
                const totalGates = MANDATORY_HARD_GATES.length;
                const passedGates = MANDATORY_HARD_GATES.filter(
                  (g) => option.gatePasses[g.id] !== false
                ).length;

                return (
                  <tr
                    key={option.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isDisqualified ? "opacity-60 bg-rose-50/20" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-[#122b45]">#{rank}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#122b45]">{option.name}</div>
                      <div className="text-[10px] text-slate-500">{option.shortCode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          passedGates === totalGates
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {passedGates}/{totalGates} Gates Passed
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {isDisqualified ? (
                        <span className="line-through text-slate-400">{weightedScore}</span>
                      ) : (
                        <span>{weightedScore} / 10</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      {option.costPerSqFtDeltaINR === 0
                        ? "₹0 (Base)"
                        : `${option.costPerSqFtDeltaINR > 0 ? "+" : ""}₹${option.costPerSqFtDeltaINR}`}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">
                      {option.timeSavingsMonths > 0 ? `-${option.timeSavingsMonths} Mo` : "0 Mo"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isDisqualified ? (
                        <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
                          DISQUALIFIED
                        </span>
                      ) : rank === 1 ? (
                        <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-xs">
                          RECOMMENDED
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                          FEASIBLE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

