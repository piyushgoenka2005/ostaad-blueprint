"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Calculator,
  ShieldCheck,
  Building2,
  Layers,
  ArrowRight,
  Printer,
  RotateCcw,
  BadgeAlert,
  ChevronRight,
  HardHat,
  MapPin,
  Calendar,
  DollarSign,
  Download,
  Share2,
  Sliders,
  Check,
  Info,
  Scale,
  Award,
  Sparkles,
  ArrowLeft,
  Ruler,
  FileCheck,
  FolderArchive,
  TrendingUp,
} from "lucide-react";

import CompanySwitcher from "@/components/CompanySwitcher";
import DocumentVault from "@/components/DocumentVault";
import AppShell from "@/components/AppShell";
import PlotGeometryCalculator from "@/components/planning/PlotGeometryCalculator";
import ZoningSetbacksEngine from "@/components/planning/ZoningSetbacksEngine";
import GeotechSoilTracker from "@/components/planning/GeotechSoilTracker";
import PreConstructionCostEstimator from "@/components/planning/PreConstructionCostEstimator";
import FinancialFeasibilityEngine from "@/components/planning/FinancialFeasibilityEngine";
import OptionsScorecardGateMatrix from "@/components/planning/OptionsScorecardGateMatrix";

// ==========================================
// TOOL 1: SITE SURVEY CHECKLIST SPECIFICATION
// ==========================================

interface SurveyQuestion {
  id: string;
  section: string;
  question: string;
  guidance: string;
  weight: number; // out of 10
  isCritical: boolean; // If failed, triggers immediate NO-GO
  status: "pass" | "fail" | "na" | "pending";
  notes?: string;
}

const INITIAL_SURVEY_QUESTIONS: SurveyQuestion[] = [
  // Section 1: Title & Ownership
  {
    id: "q-1-1",
    section: "1. Land Title & Ownership",
    question: "Is there a 30-year clear marketable title search report from legal counsel?",
    guidance: "Must verify 7/12 extract / Patta / revenue records free from litigation.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-1-2",
    section: "1. Land Title & Ownership",
    question: "Are physical site boundary pegs fully demarcated without neighbor encroachments?",
    guidance: "Total Station survey coordinates must match government cadastral map.",
    weight: 8,
    isCritical: false,
    status: "pass",
  },
  {
    id: "q-1-3",
    section: "1. Land Title & Ownership",
    question: "Are there any active court stay orders, tenancy disputes, or pending claims?",
    guidance: "CRITICAL: Any stay order halts construction financing immediately.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },

  // Section 2: Logistics & Heavy Vehicle Access
  {
    id: "q-2-1",
    section: "2. Access & Heavy Logistics",
    question: "Is the site approach road minimum 9.0 meters wide for multi-axle trailers?",
    guidance: "40-foot trailers carrying TMT steel and RMC transit mixers require 9m+ road.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-2-2",
    section: "2. Access & Heavy Logistics",
    question: "Are there overhead height restrictions (low bridges, low cables) under 5.0m?",
    guidance: "Mobile piling rigs and crawler cranes require 5.0m vertical clearance.",
    weight: 8,
    isCritical: false,
    status: "pass",
  },
  {
    id: "q-2-3",
    section: "2. Access & Heavy Logistics",
    question: "Is there sufficient road turning radius (min 15m) at entry gates for concrete pumps?",
    guidance: "Ensures seamless ingress and egress during continuous multi-hour concrete pours.",
    weight: 7,
    isCritical: false,
    status: "pass",
  },

  // Section 3: Ground Topography & Drainage
  {
    id: "q-3-1",
    section: "3. Topography & Drainage",
    question: "Is the site above the 50-year High Flood Level (HFL) of adjacent rivers or drains?",
    guidance: "CRITICAL: Low-lying ground without gravity discharge incurs huge dewatering costs.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-3-2",
    section: "3. Topography & Drainage",
    question: "Does the natural ground slope allow stormwater runoff toward municipal drains?",
    guidance: "Natural gradient reduces need for sump pumps and peripheral retainment.",
    weight: 6,
    isCritical: false,
    status: "pass",
  },

  // Section 4: Geotechnical & Soil Risk
  {
    id: "q-4-1",
    section: "4. Geotechnical & Soil",
    question: "Is the site free from uncompacted filled soil, garbage dumps, or hazardous fill?",
    guidance: "CRITICAL: Contaminated fill requires deep subgrade replacement and decontamination.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-4-2",
    section: "4. Geotechnical & Soil",
    question: "Is subsoil Safe Bearing Capacity (SBC) preliminary estimate above 150 kN/m²?",
    guidance: "Very soft clay (<100 kN/m²) triggers pile foundations, inflating foundation budget by 40%.",
    weight: 8,
    isCritical: false,
    status: "pass",
  },

  // Section 5: Utilities & Overhead Hazards
  {
    id: "q-5-1",
    section: "5. Utilities & Hazards",
    question: "Are there High Tension (HT) overhead electrical transmission lines over the plot?",
    guidance: "CRITICAL: HT lines require 15m–30m statutory horizontal corridor setback.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-5-2",
    section: "5. Utilities & Hazards",
    question: "Is temporary 3-phase commercial electrical supply available within 500m?",
    guidance: "Piling, lighting, and fabrication require reliable 100 kVA temporary connection.",
    weight: 7,
    isCritical: false,
    status: "pass",
  },
  {
    id: "q-5-3",
    section: "5. Utilities & Hazards",
    question: "Is construction-quality groundwater available (TDS < 2000 ppm, pH 6.0–8.5)?",
    guidance: "High sulfates or chlorides damage rebar corrosion and concrete strength.",
    weight: 7,
    isCritical: false,
    status: "pass",
  },

  // Section 6: Environmental & Statutory Zoning
  {
    id: "q-6-1",
    section: "6. Environmental & Zoning",
    question: "Is the land zoned for Commercial / Industrial / Mixed construction in Master Plan?",
    guidance: "CRITICAL: Agricultural zone requires NA conversion before municipal sanction.",
    weight: 10,
    isCritical: true,
    status: "pass",
  },
  {
    id: "q-6-2",
    section: "6. Environmental & Zoning",
    question: "Is the boundary beyond statutory buffer zones (CRZ, lake buffer 30m, forest 100m)?",
    guidance: "Violations trigger National Green Tribunal (NGT) work stoppage orders.",
    weight: 9,
    isCritical: false,
    status: "pass",
  },

  // Section 7: Neighboring Structures & Shoring Risk
  {
    id: "q-7-1",
    section: "7. Neighboring Shoring",
    question: "Are adjacent buildings sound and set back at least 3m from the boundary line?",
    guidance: "Zero-setback old masonry structures require expensive soldier pile shoring.",
    weight: 8,
    isCritical: false,
    status: "pass",
  },
  {
    id: "q-7-2",
    section: "7. Neighboring Shoring",
    question: "Are boundary walls shared or exclusively within this property boundary?",
    guidance: "Shared party walls require formal NOC and indemnification agreements.",
    weight: 6,
    isCritical: false,
    status: "pass",
  },

  // Section 8: Site Establishment & Batching Plant
  {
    id: "q-8-1",
    section: "8. Site Establishment",
    question: "Is there designated flat area (min 1,500 sqm) for steel yard, cement godown & offices?",
    guidance: "Prevents double-handling of materials and optimizes site turnaround times.",
    weight: 7,
    isCritical: false,
    status: "pass",
  },
  {
    id: "q-8-2",
    section: "8. Site Establishment",
    question: "Is local labor accommodation permitted on-site by municipal sanitary authorities?",
    guidance: "If banned, off-site worker transit logistics must be budgeted.",
    weight: 6,
    isCritical: false,
    status: "pass",
  },
];

// ==========================================
// TOOL 6: LAND UNIT CONVERSIONS & CONSTANTS
// ==========================================

const UNIT_CONVERSIONS = {
  sqft: 1,
  sqm: 10.7639,
  gaj: 9.0, // 1 Gaj = 9 sq.ft
  guntha: 1089.0, // 1 Guntha = 1089 sq.ft (33ft x 33ft)
  bigha_pucca: 27225.0, // 1 Pucca Bigha = 27,225 sq.ft (approx 0.625 Acre)
  acre: 43560.0, // 1 Acre = 43,560 sq.ft
  hectare: 107639.1, // 1 Hectare = 10,000 sqm
};

export default function PreConstructionEngine() {
  const router = useRouter();

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<
    "survey" | "geometry" | "zoning" | "soil" | "cost" | "feasibility" | "options" | "permits" | "vault"
  >("survey");

  // Project Meta State
  const [projectName, setProjectName] = useState("Commercial Complex — Tower B");
  const [projectLocation, setProjectLocation] = useState("Kalyani Nagar, Pune, Maharashtra");
  const [surveyorName, setSurveyorName] = useState("Rajesh Sharma, Senior PM");

  // ----------------------------------------------------
  // TOOL 1 STATE: SITE SURVEY
  // ----------------------------------------------------
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>(INITIAL_SURVEY_QUESTIONS);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  const toggleQuestionStatus = (id: string, status: "pass" | "fail" | "na") => {
    setSurveyQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    );
  };

  const surveyMetrics = useMemo(() => {
    let totalPossibleWeight = 0;
    let earnedWeight = 0;
    let criticalFailures: SurveyQuestion[] = [];

    surveyQuestions.forEach((q) => {
      if (q.status !== "na") {
        totalPossibleWeight += q.weight;
        if (q.status === "pass") {
          earnedWeight += q.weight;
        } else if (q.status === "fail" && q.isCritical) {
          criticalFailures.push(q);
        }
      }
    });

    const scorePercentage = totalPossibleWeight > 0 ? Math.round((earnedWeight / totalPossibleWeight) * 100) : 0;
    const isCriticalFailed = criticalFailures.length > 0;
    const isApproved = !isCriticalFailed && scorePercentage >= 75;

    return {
      totalPossibleWeight,
      earnedWeight,
      scorePercentage,
      criticalFailures,
      isCriticalFailed,
      isApproved,
      recommendation: isCriticalFailed
        ? "NO-GO (CRITICAL GATE FAILURE)"
        : scorePercentage >= 85
        ? "CLEAR GO (IMMEDIATE MOBILIZATION)"
        : scorePercentage >= 75
        ? "CONDITIONAL GO (RISK MITIGATION MANDATORY)"
        : "HOLD / RE-EVALUATE",
    };
  }, [surveyQuestions]);

  // ----------------------------------------------------
  // TOOL 6 STATE: PLOT AREA & GEOMETRY CALCULATOR
  // ----------------------------------------------------
  const [plotLengthFt, setPlotLengthFt] = useState<number>(250);
  const [plotWidthFt, setPlotWidthFt] = useState<number>(180);
  const [setbackFrontFt, setSetbackFrontFt] = useState<number>(30); // NBC Front Setback
  const [setbackRearFt, setSetbackRearFt] = useState<number>(20);
  const [setbackSideLeftFt, setSetbackSideLeftFt] = useState<number>(15);
  const [setbackSideRightFt, setSetbackSideRightFt] = useState<number>(15);

  const geometryMetrics = useMemo(() => {
    const grossAreaSqFt = plotLengthFt * plotWidthFt;
    const usableLength = Math.max(0, plotLengthFt - (setbackFrontFt + setbackRearFt));
    const usableWidth = Math.max(0, plotWidthFt - (setbackSideLeftFt + setbackSideRightFt));
    const netFootprintSqFt = usableLength * usableWidth;
    const groundCoveragePercent = grossAreaSqFt > 0 ? ((netFootprintSqFt / grossAreaSqFt) * 100).toFixed(1) : "0";
    const boundaryPerimeterFt = 2 * (plotLengthFt + plotWidthFt);

    return {
      grossAreaSqFt,
      netFootprintSqFt,
      groundCoveragePercent,
      boundaryPerimeterFt,
      conversions: {
        sqm: (grossAreaSqFt / UNIT_CONVERSIONS.sqm).toFixed(2),
        gaj: (grossAreaSqFt / UNIT_CONVERSIONS.gaj).toFixed(2),
        guntha: (grossAreaSqFt / UNIT_CONVERSIONS.guntha).toFixed(2),
        bigha: (grossAreaSqFt / UNIT_CONVERSIONS.bigha_pucca).toFixed(3),
        acres: (grossAreaSqFt / UNIT_CONVERSIONS.acre).toFixed(3),
      },
    };
  }, [plotLengthFt, plotWidthFt, setbackFrontFt, setbackRearFt, setbackSideLeftFt, setbackSideRightFt]);

  // ----------------------------------------------------
  // TOOL 5 STATE: PERMITS & STATUTORY NOC TRACKER
  // ----------------------------------------------------
  const [permits, setPermits] = useState([
    {
      id: "p-01",
      name: "Commencement Certificate (CC - Municipal)",
      authority: "PMC Urban Development",
      status: "APPROVED",
      feePaid: 1450000,
      sanctionDate: "2026-01-15",
      expiryDate: "2027-01-14",
      docRef: "CC/PMC/2026/8841",
    },
    {
      id: "p-02",
      name: "State Environmental Clearance (SEIAA / EC)",
      authority: "State Environment Authority",
      status: "APPROVED",
      feePaid: 580000,
      sanctionDate: "2025-11-20",
      expiryDate: "2032-11-19",
      docRef: "SEIAA-MH-2025-1049",
    },
    {
      id: "p-03",
      name: "Provisional Fire Safety NOC",
      authority: "Chief Fire Officer (CFO)",
      status: "APPROVED",
      feePaid: 320000,
      sanctionDate: "2026-02-01",
      expiryDate: "2027-01-31",
      docRef: "CFO/PUN/2026/F-112",
    },
    {
      id: "p-04",
      name: "Aviation Height Clearance (AAI NOC)",
      authority: "Airports Authority of India",
      status: "IN_REVIEW",
      feePaid: 85000,
      sanctionDate: "—",
      expiryDate: "—",
      docRef: "AAI/W-REGION/2026/P-88",
    },
    {
      id: "p-05",
      name: "Temporary 100 kVA Power Load Connection",
      authority: "MSEDCL Electrical Board",
      status: "APPROVED",
      feePaid: 240000,
      sanctionDate: "2026-02-10",
      expiryDate: "2027-02-09",
      docRef: "MSEDCL/NC/88392",
    },
  ]);

  return (
    <AppShell
      title="Pre-Construction Planning Hub"
      subtitle="Comprehensive project feasibility, site survey GO/NO-GO gating, and land geometry analysis"
      breadcrumbs={[
        { label: "Planning Hub", href: "/dashboard/pre-construction" },
        { label: "15 Tools Suite" },
      ]}
      activeNav="pre-construction"
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-semibold text-slate-900">{projectName}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">{projectLocation}</span>
          </div>
          <button
            onClick={() => setShowCertificateModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Clearance Certificate</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("survey")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "survey"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Tool 1: Site Survey GO / NO-GO</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-mono">
                {surveyMetrics.scorePercentage}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab("geometry")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "geometry"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Ruler className="h-4 w-4 text-blue-400" />
              <span>Tool 6: Plot Area & Setbacks</span>
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-mono">
                {geometryMetrics.conversions.acres} Acres
              </span>
            </button>

            <button
              onClick={() => setActiveTab("zoning")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "zoning"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>Tool 12: Zoning & FAR</span>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-mono border border-indigo-200">
                NBC 2016
              </span>
            </button>

            <button
              onClick={() => setActiveTab("soil")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "soil"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Tool 8: Geotech & Strata</span>
              <span className="rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-mono border border-purple-200">
                SBC Advisory
              </span>
            </button>

            <button
              onClick={() => setActiveTab("cost")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "cost"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Calculator className="h-4 w-4 text-emerald-400" />
              <span>Tool 2: Pre-Con Cost Budget</span>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-mono border border-emerald-200">
                CPWD DSR
              </span>
            </button>

            <button
              onClick={() => setActiveTab("feasibility")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "feasibility"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span>Tool 9: Feasibility & Debt</span>
              <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-0.5 text-[10px] font-mono border border-teal-200">
                CF / DSCR
              </span>
            </button>

            <button
              onClick={() => setActiveTab("options")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "options"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Scale className="h-4 w-4 text-indigo-400" />
              <span>Tool 14: Options Gate Matrix</span>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-mono border border-indigo-200">
                IS 13920
              </span>
            </button>

            <button
              onClick={() => setActiveTab("permits")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "permits"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FileCheck className="h-4 w-4 text-amber-500" />
              <span>Tool 5: Statutory NOC Tracker</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-mono">
                4/5 Cleared
              </span>
            </button>

            <button
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "vault"
                  ? "bg-[#122b45] text-white shadow-md shadow-slate-900/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <FolderArchive className="h-4 w-4 text-purple-500" />
              <span>Document Vault (R2)</span>
              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-mono border border-blue-200">
                R2 Secure
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">All 15 Tools Integrated</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: TOOL 1 - SITE SURVEY CHECKLIST (GO/NO-GO ENGINE) */}
        {/* ======================================================== */}
        {activeTab === "survey" && (
          <div className="space-y-6">
            {/* Header Score & Decision Banner */}
            <div
              className={`rounded-2xl border p-6 shadow-sm transition-all ${
                surveyMetrics.isCriticalFailed
                  ? "border-rose-300 bg-rose-50/70"
                  : surveyMetrics.isApproved
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-amber-300 bg-amber-50/70"
              }`}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-md ${
                      surveyMetrics.isCriticalFailed
                        ? "bg-rose-600 text-white"
                        : surveyMetrics.isApproved
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {surveyMetrics.isCriticalFailed ? (
                      <XCircle className="h-8 w-8" />
                    ) : surveyMetrics.isApproved ? (
                      <CheckCircle2 className="h-8 w-8" />
                    ) : (
                      <AlertTriangle className="h-8 w-8" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Site Survey Clearance Verdict
                      </span>
                      {surveyMetrics.isCriticalFailed && (
                        <span className="rounded-md bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                          CRITICAL GATE BREACH
                        </span>
                      )}
                    </div>
                    <h2
                      className={`text-2xl font-black tracking-tight ${
                        surveyMetrics.isCriticalFailed
                          ? "text-rose-900"
                          : surveyMetrics.isApproved
                          ? "text-emerald-950"
                          : "text-amber-950"
                      }`}
                    >
                      {surveyMetrics.recommendation}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                      {surveyMetrics.isCriticalFailed
                        ? "Construction mobilization is strictly LOCKED. One or more mandatory statutory, title, or logistics conditions have failed. Mitigate before re-inspecting."
                        : surveyMetrics.isApproved
                        ? "All mandatory statutory, title, logistics, and geotechnical checks passed. Site is officially approved for mobilization and excavation."
                        : "Site is feasible but carries moderate risk conditions requiring formal owner mitigation approval."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Feasibility Index</div>
                    <div className="text-3xl font-black text-slate-900">
                      {surveyMetrics.scorePercentage}
                      <span className="text-sm font-semibold text-slate-400">/100</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Weighted score: {surveyMetrics.earnedWeight}/{surveyMetrics.totalPossibleWeight} pts
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="flex flex-col items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
                  >
                    <Award className="h-4 w-4 text-emerald-400 mb-0.5" />
                    <span>View Certificate</span>
                  </button>
                </div>
              </div>

              {/* Critical Failures Warning List */}
              {surveyMetrics.criticalFailures.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose-300 bg-rose-100/80 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <BadgeAlert className="h-4 w-4 text-rose-700" />
                    <span>Mandatory Abort Failures ({surveyMetrics.criticalFailures.length}):</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-rose-800">
                    {surveyMetrics.criticalFailures.map((cf) => (
                      <li key={cf.id} className="flex items-start gap-1.5">
                        <span className="font-bold">• [{cf.section}]</span>
                        <span>{cf.question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Checklist Questions Table / Cards */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#122b45] text-sm">
                    Detailed 10-Section Site Survey Verification Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click Pass, Fail, or N/A on each physical inspection item. Critical items marked with a red badge.
                  </p>
                </div>
                <button
                  onClick={() => setSurveyQuestions(INITIAL_SURVEY_QUESTIONS)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Reset All</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {surveyQuestions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      q.status === "fail" && q.isCritical
                        ? "bg-rose-50/50"
                        : q.status === "fail"
                        ? "bg-amber-50/30"
                        : "hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {q.section}
                        </span>
                        {q.isCritical ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 border border-rose-200">
                            CRITICAL ABORT GATE
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                            Weight: {q.weight} pts
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900">{q.question}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Info className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{q.guidance}</span>
                      </div>
                    </div>

                    {/* Action Selector */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => toggleQuestionStatus(q.id, "pass")}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          q.status === "pass"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => toggleQuestionStatus(q.id, "fail")}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                          q.status === "fail"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Fail</span>
                      </button>

                      <button
                        onClick={() => toggleQuestionStatus(q.id, "na")}
                        className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                          q.status === "na"
                            ? "bg-slate-700 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        N/A
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TOOL 6 - PLOT AREA & LAND GEOMETRY CALCULATOR     */}
        {/* ======================================================== */}
        {activeTab === "geometry" && (
          <PlotGeometryCalculator
            onAreaChange={(area) => {
              // Synchronize area with local metrics if needed
            }}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 3: TOOL 12 - ZONING, SETBACKS & FAR PERMISSIBLE AREA */}
        {/* ======================================================== */}
        {activeTab === "zoning" && (
          <ZoningSetbacksEngine initialPlotAreaSqFt={geometryMetrics.grossAreaSqFt} />
        )}

        {/* ======================================================== */}
        {/* TAB 4: TOOL 8 - GEOTECHNICAL SOIL INVESTIGATION & STRATA */}
        {/* ======================================================== */}
        {activeTab === "soil" && (
          <GeotechSoilTracker />
        )}

        {/* ======================================================== */}
        {/* TAB 5: TOOL 2 - PRE-CONSTRUCTION COST ESTIMATOR & RATES  */}
        {/* ======================================================== */}
        {activeTab === "cost" && (
          <PreConstructionCostEstimator initialBUASqFt={75000} />
        )}

        {/* ======================================================== */}
        {/* TAB 6: TOOL 9 - FINANCIAL FEASIBILITY & DEBT/EMI MODEL   */}
        {/* ======================================================== */}
        {activeTab === "feasibility" && (
          <FinancialFeasibilityEngine
            initialCapexINR={225000000}
            initialSaleableSqFt={65000}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 7: TOOL 14 - PROJECT OPTIONS SCORECARD & GATE MATRIX */}
        {/* ======================================================== */}
        {activeTab === "options" && (
          <OptionsScorecardGateMatrix />
        )}

        {/* ======================================================== */}
        {/* TAB 3: TOOL 5 - STATUTORY PERMIT & NOC TRACKER         */}
        {/* ======================================================== */}
        {activeTab === "permits" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#122b45] text-sm">
                  Pre-Construction Statutory Sanctions & NOC Tracker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track municipal clearances, sanction fees paid, and statutory expiry milestones.
                </p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm">
                <span>Add Statutory NOC</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Sanction / Permit Name</th>
                    <th className="px-5 py-3.5">Issuing Authority</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Sanction Fee Paid</th>
                    <th className="px-5 py-3.5">Approval Date</th>
                    <th className="px-5 py-3.5">Expiry Date</th>
                    <th className="px-5 py-3.5">Document Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permits.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{p.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.authority}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            p.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                        ₹{p.feePaid.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{p.sanctionDate}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">{p.expiryDate}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-blue-700">{p.docRef}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CLOUDFLARE R2 DOCUMENT VAULT                      */}
        {/* ======================================================== */}
        {activeTab === "vault" && (
          <DocumentVault projectId="proj-1" />
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: OFFICIAL SITE FEASIBILITY & CLEARANCE CERTIFICATE */}
      {/* ======================================================== */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-[#122b45] text-sm">
                  Official Site Feasibility & Clearance Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-slate-800 print:p-0">
              {/* Certificate Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">OSTAAD ERP ENTERPRISE</div>
                  <div className="text-xs text-slate-500">Engineering & Statutory Site Feasibility Division</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900">CERT-2026-SITE-8821</div>
                  <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString("en-IN")}</div>
                </div>
              </div>

              {/* Project Vetting Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Project Name</div>
                  <div className="font-bold text-slate-900">{projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Geographic Location</div>
                  <div className="font-bold text-slate-900">{projectLocation}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Site Area</div>
                  <div className="font-bold text-slate-900">
                    {geometryMetrics.grossAreaSqFt.toLocaleString()} sq.ft ({geometryMetrics.conversions.acres} Acres)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Lead Surveyor</div>
                  <div className="font-bold text-slate-900">{surveyorName}</div>
                </div>
              </div>

              {/* Status Stamp Box */}
              <div
                className={`rounded-xl border-2 p-5 text-center ${
                  surveyMetrics.isCriticalFailed
                    ? "border-rose-600 bg-rose-50 text-rose-900"
                    : surveyMetrics.isApproved
                    ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                    : "border-amber-600 bg-amber-50 text-amber-950"
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">Statutory Decision</div>
                <div className="text-3xl font-black tracking-tight mt-1">
                  {surveyMetrics.recommendation}
                </div>
                <div className="text-xs font-medium mt-2">
                  Comprehensive Feasibility Index: {surveyMetrics.scorePercentage}/100 (Pass Threshold: 75/100)
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">Site Surveyor</div>
                  <div className="text-[10px] text-slate-400">Physical Demarcation</div>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">Geotechnical Lead</div>
                  <div className="text-[10px] text-slate-400">SBC & Topography</div>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="mt-1 font-bold text-slate-800">Project Director</div>
                  <div className="text-[10px] text-slate-400">Final Mobilization Gate</div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Digitally verified on Ostaad ERP Single-Worker Architecture
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
