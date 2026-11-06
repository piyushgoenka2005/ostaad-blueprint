/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.14: Cost vs. Budget Variance & Contingency Monitor (Tool 13)
 * Sub-Module 2.15: Site Mobilization & Project Kickoff Readiness Checklist (Tool 15)
 *
 * Implements package budget baseline tracking, committed vs invoiced delta,
 * Estimate at Completion (EAC), contingency drawdown pool math,
 * and 50-point pre-commencement mobilization gating with critical pass/fail triggers.
 */

// =========================================================================
// TOOL 13: COST VS. BUDGET VARIANCE & CONTINGENCY MONITOR
// =========================================================================

export type BudgetStatus = "SAFE" | "WARNING" | "OVERRUN";

export interface PackageBudgetItem {
  id: string;
  costCode: string;
  packageName: string;
  baselineBudgetINR: number;
  committedOrdersINR: number; // Purchase Orders / Contracts issued
  actualInvoicedINR: number; // Invoices received & approved
  contingencyAllocatedINR: number; // Extra drawdown from contingency
  status: BudgetStatus;
  notes?: string;
}

export interface ContingencyDrawdown {
  id: string;
  date: string;
  targetPackageId: string;
  targetPackageName: string;
  amountINR: number;
  justification: string;
  approvedBy: string;
}

export const DEFAULT_BUDGET_PACKAGES: PackageBudgetItem[] = [
  {
    id: "pkg-01",
    costCode: "CST-01",
    packageName: "Civil Substructure & Foundation Raft",
    baselineBudgetINR: 28000000, // ₹2.80 Cr
    committedOrdersINR: 27500000,
    actualInvoicedINR: 18500000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
    notes: "Raft concrete completed within baseline tender rates.",
  },
  {
    id: "pkg-02",
    costCode: "CST-02",
    packageName: "Superstructure RCC Core & Typical Slabs (M30/M35)",
    baselineBudgetINR: 65000000, // ₹6.50 Cr
    committedOrdersINR: 67200000, // 3.3% overrun before contingency
    actualInvoicedINR: 24000000,
    contingencyAllocatedINR: 2500000, // ₹25L drawn from contingency
    status: "WARNING",
    notes: "TMT rebar price escalation absorbed via approved contingency drawdown.",
  },
  {
    id: "pkg-03",
    costCode: "CST-03",
    packageName: "Monolithic Formwork System (Mivan Shuttering)",
    baselineBudgetINR: 18500000, // ₹1.85 Cr
    committedOrdersINR: 18200000,
    actualInvoicedINR: 14500000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
    notes: "Formwork delivered on site with 5-day floor cycle speed.",
  },
  {
    id: "pkg-04",
    costCode: "CST-04",
    packageName: "AAC Masonry, Lightweight Blocks & Plastering",
    baselineBudgetINR: 14500000, // ₹1.45 Cr
    committedOrdersINR: 13900000,
    actualInvoicedINR: 4200000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
  },
  {
    id: "pkg-05",
    costCode: "CST-05",
    packageName: "Waterproofing & Chemical Injection Membranes",
    baselineBudgetINR: 6200000, // ₹62 L
    committedOrdersINR: 6850000, // Overrun
    actualInvoicedINR: 1800000,
    contingencyAllocatedINR: 800000,
    status: "WARNING",
    notes: "High water table required 2 additional PU injection waterproofing coats.",
  },
  {
    id: "pkg-06",
    costCode: "CST-06",
    packageName: "MEP, Electrical Conduiting, Firefighting & Plumbing",
    baselineBudgetINR: 32000000, // ₹3.20 Cr
    committedOrdersINR: 31200000,
    actualInvoicedINR: 6500000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
  },
  {
    id: "pkg-07",
    costCode: "CST-07",
    packageName: "Architectural Finishes, Vitrified Tiling & Facade",
    baselineBudgetINR: 26000000, // ₹2.60 Cr
    committedOrdersINR: 25500000,
    actualInvoicedINR: 2100000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
  },
  {
    id: "pkg-08",
    costCode: "CST-08",
    packageName: "External Infrastructure, Roads, Landscaping & OC",
    baselineBudgetINR: 12500000, // ₹1.25 Cr
    committedOrdersINR: 11800000,
    actualInvoicedINR: 900000,
    contingencyAllocatedINR: 0,
    status: "SAFE",
  },
];

export const INITIAL_CONTINGENCY_DRAWDOWNS: ContingencyDrawdown[] = [
  {
    id: "drw-01",
    date: "2026-02-15",
    targetPackageId: "pkg-02",
    targetPackageName: "Superstructure RCC Core & Typical Slabs",
    amountINR: 2500000,
    justification: "Primary steel mill market index revision for Fe 550D rebar (+₹2,400/MT).",
    approvedBy: "Managing Director / CFO",
  },
  {
    id: "drw-02",
    date: "2026-02-28",
    targetPackageId: "pkg-05",
    targetPackageName: "Waterproofing & Chemical Injection Membranes",
    amountINR: 800000,
    justification: "Basement perimeter dewatering slurry treatment and dual PU layer specification upgrade.",
    approvedBy: "Project Director",
  },
];

export const TOTAL_PROJECT_CONTINGENCY_POOL_INR = 12500000; // ₹1.25 Cr Contingency Reserve (5%)

/**
 * Calculates Package Budget Variances, Estimate at Completion (EAC),
 * and Contingency Reserve Balances
 */
export function calculateBudgetVarianceSummary(
  packages: PackageBudgetItem[],
  drawdowns: ContingencyDrawdown[],
  totalContingencyPoolINR = TOTAL_PROJECT_CONTINGENCY_POOL_INR
) {
  let totalBaselineBudgetINR = 0;
  let totalCommittedOrdersINR = 0;
  let totalActualInvoicedINR = 0;
  let totalContingencyAllocatedINR = 0;

  const totalDrawnINR = drawdowns.reduce((acc, d) => acc + d.amountINR, 0);
  const remainingContingencyINR = Math.max(0, totalContingencyPoolINR - totalDrawnINR);
  const contingencyUtilizationPercent =
    totalContingencyPoolINR > 0
      ? Math.round((totalDrawnINR / totalContingencyPoolINR) * 1000) / 10
      : 0;

  const analyzedPackages = packages.map((pkg) => {
    totalBaselineBudgetINR += pkg.baselineBudgetINR;
    totalCommittedOrdersINR += pkg.committedOrdersINR;
    totalActualInvoicedINR += pkg.actualInvoicedINR;
    totalContingencyAllocatedINR += pkg.contingencyAllocatedINR;

    // Estimate at Completion (EAC): Committed + Anticipated Uncommitted
    const eacINR = Math.max(pkg.baselineBudgetINR, pkg.committedOrdersINR);
    // Cost Variance (CV) = Baseline - EAC. Negative means overrun.
    const costVarianceINR = pkg.baselineBudgetINR - eacINR;
    const variancePercent =
      pkg.baselineBudgetINR > 0
        ? Math.round((costVarianceINR / pkg.baselineBudgetINR) * 1000) / 10
        : 0;

    let computedStatus: BudgetStatus = "SAFE";
    if (variancePercent < -5) {
      computedStatus = "OVERRUN";
    } else if (variancePercent < 0) {
      computedStatus = "WARNING";
    }

    return {
      ...pkg,
      eacINR,
      costVarianceINR,
      variancePercent,
      computedStatus,
    };
  });

  const grandTotalEACINR = Math.max(totalBaselineBudgetINR, totalCommittedOrdersINR);
  const netProjectCostVarianceINR = totalBaselineBudgetINR - grandTotalEACINR;
  const netVariancePercent =
    totalBaselineBudgetINR > 0
      ? Math.round((netProjectCostVarianceINR / totalBaselineBudgetINR) * 1000) / 10
      : 0;

  return {
    totalBaselineBudgetINR,
    totalCommittedOrdersINR,
    totalActualInvoicedINR,
    totalContingencyPoolINR,
    totalDrawnINR,
    remainingContingencyINR,
    contingencyUtilizationPercent,
    grandTotalEACINR,
    netProjectCostVarianceINR,
    netVariancePercent,
    analyzedPackages,
  };
}

// =========================================================================
// TOOL 15: SITE MOBILIZATION & PROJECT KICKOFF READINESS CHECKLIST
// =========================================================================

export type ReadinessCategory =
  | "STATUTORY"
  | "INSURANCE_LABOUR"
  | "UTILITIES"
  | "SAFETY_ENVIRONMENT"
  | "SURVEY_ENGINEERING";

export interface MobilizationCheckItem {
  id: string;
  category: ReadinessCategory;
  question: string;
  complianceRequirement: string;
  isCritical: boolean; // If failed, triggers immediate MOBILIZATION HALT
  status: "PASS" | "FAIL" | "PENDING";
  verifiedBy?: string;
  notes?: string;
}

export const INITIAL_MOBILIZATION_CHECKLIST: MobilizationCheckItem[] = [
  // 1. STATUTORY SANCTIONS
  {
    id: "mob-01",
    category: "STATUTORY",
    question: "Municipal Commencement Certificate (CC) physically on site",
    complianceRequirement: "Signed CC order copy prominently displayed on site engineering notice board.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Lead Liaison Officer",
  },
  {
    id: "mob-02",
    category: "STATUTORY",
    question: "SEIAA Environmental Clearance (EC) compliance board erected at gate",
    complianceRequirement: "Bilingual display of project coordinates, EC number, and air/water safeguards.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "EHS Manager",
  },
  {
    id: "mob-03",
    category: "STATUTORY",
    question: "Provisional Fire Department Safety NOC & vehicular turning radius",
    complianceRequirement: "6.0m clear paved all-weather driveway around excavation pit.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Fire Safety Consultant",
  },
  {
    id: "mob-04",
    category: "STATUTORY",
    question: "Labour Welfare & Building and Other Construction Workers (BOCW) Cess paid",
    complianceRequirement: "1% BOCW cess treasury receipt filed with municipal corporation.",
    isCritical: false,
    status: "PASS",
  },

  // 2. INSURANCE & LABOUR WELFARE
  {
    id: "mob-05",
    category: "INSURANCE_LABOUR",
    question: "Contractor's All Risk (CAR) Insurance Policy active & endorsed",
    complianceRequirement: "CAR Policy with Third Party Liability (TPL) min ₹10 Cr coverage.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Commercial Finance Head",
  },
  {
    id: "mob-06",
    category: "INSURANCE_LABOUR",
    question: "Workmen Compensation (WC) Insurance & ESIC coverage for site tradesmen",
    complianceRequirement: "Active policy covering peak workforce of 250 personnel.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "HR Site Officer",
  },
  {
    id: "mob-07",
    category: "INSURANCE_LABOUR",
    question: "Potable Drinking Water Filtration (RO Plant) & Worker Canteen operational",
    complianceRequirement: "IS 10500 drinking water test certificate submitted to site QC.",
    isCritical: true,
    status: "PASS",
  },
  {
    id: "mob-08",
    category: "INSURANCE_LABOUR",
    question: "Hygienic worker sanitation facilities (Separate male/female toilets)",
    complianceRequirement: "Minimum 1 toilet per 25 workers with septic tank connection.",
    isCritical: false,
    status: "PASS",
  },

  // 3. SITE UTILITIES & POWER
  {
    id: "mob-09",
    category: "UTILITIES",
    question: "100 kVA dedicated temporary construction power connection energized",
    complianceRequirement: "MSEDCL sanctioned transformer and main distribution board (MDB) with ELCB.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Electrical Engineer",
  },
  {
    id: "mob-10",
    category: "UTILITIES",
    question: "125 kVA Silent Diesel Generator (DG Set) backup for uninterrupted dewatering",
    complianceRequirement: "Automatic Mains Failure (AMF) panel with acoustic canopy conforming to CPCB norms.",
    isCritical: true,
    status: "PASS",
  },
  {
    id: "mob-11",
    category: "UTILITIES",
    question: "Continuous construction water supply (Borewell / Dedicated tanker storage tank)",
    complianceRequirement: "100,000 Litre capacity RCC/MS ground sump connected to curing pump line.",
    isCritical: true,
    status: "PASS",
  },
  {
    id: "mob-12",
    category: "UTILITIES",
    question: "High-speed broadband Wi-Fi & CCTV perimeter surveillance cameras operational",
    complianceRequirement: "Real-time remote video feed streaming to Head Office Executive Dashboard.",
    isCritical: false,
    status: "PASS",
  },

  // 4. SAFETY BARRICADING & ENVIRONMENT
  {
    id: "mob-13",
    category: "SAFETY_ENVIRONMENT",
    question: "2.4m high pre-coated GI sheet security barricading erected around full perimeter",
    complianceRequirement: "Wind-braced tubular steel posts with retro-reflective warning tape.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Site Safety Officer",
  },
  {
    id: "mob-14",
    category: "SAFETY_ENVIRONMENT",
    question: "PPE stock available in store (Hard hats, steel-toe boots, hi-vis vests, harnesses)",
    complianceRequirement: "100% compliance mandatory for entry; zero-tolerance safety protocol.",
    isCritical: true,
    status: "PASS",
  },
  {
    id: "mob-15",
    category: "SAFETY_ENVIRONMENT",
    question: "Wheel washing facility at main exit gate to prevent mud track on public roads",
    complianceRequirement: "High-pressure jet wash and sediment settling trap at security gate.",
    isCritical: false,
    status: "PASS",
  },
  {
    id: "mob-16",
    category: "SAFETY_ENVIRONMENT",
    question: "Anti-smog water mist cannon and air quality monitoring sensor (PM2.5/PM10)",
    complianceRequirement: "Active suppression during dry bulk excavation carting.",
    isCritical: false,
    status: "PASS",
  },

  // 5. SURVEY & ENGINEERING BENCHMARKS
  {
    id: "mob-17",
    category: "SURVEY_ENGINEERING",
    question: "Permanent Temporary Benchmark (TBM) established from GTS benchmark",
    complianceRequirement: "Reinforced concrete pillar (150x150mm) cast outside excavation zone (+100.000m datum).",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Chief Geodetic Surveyor",
  },
  {
    id: "mob-18",
    category: "SURVEY_ENGINEERING",
    question: "Total Station grid boundary verification matching cadastral revenue coordinates",
    complianceRequirement: "Triangulation error < 3mm across 250m base perimeter.",
    isCritical: true,
    status: "PASS",
  },
  {
    id: "mob-19",
    category: "SURVEY_ENGINEERING",
    question: "Soil Safe Bearing Capacity (SBC) confirmed with confirmatory borehole logging",
    complianceRequirement: "SBC verified at 220 kN/m² matching structural design assumptions.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Geotechnical Lead",
  },
  {
    id: "mob-20",
    category: "SURVEY_ENGINEERING",
    question: "Structural 'Good For Construction' (GFC) Rev-0 foundation drawings issued",
    complianceRequirement: "Approved by Structural Peer Review Consultant and stamped by Chief Engineer.",
    isCritical: true,
    status: "PASS",
    verifiedBy: "Project Director",
  },
];

/**
 * Calculates Mobilization Readiness Index, Critical Gates Verification,
 * and Official Mobilization Clearance Decision
 */
export function calculateMobilizationReadiness(items: MobilizationCheckItem[]) {
  const totalItems = items.length;
  const passedItems = items.filter((i) => i.status === "PASS").length;
  const failedItems = items.filter((i) => i.status === "FAIL");
  const pendingItems = items.filter((i) => i.status === "PENDING").length;

  const criticalFailures = items.filter((i) => i.isCritical && i.status !== "PASS");
  const isCriticalPassed = criticalFailures.length === 0;

  const readinessScorePercent =
    totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;

  let decisionVerdict: "CLEAR TO COMMENCE" | "CONDITIONAL COMMENCEMENT" | "MOBILIZATION HALTED" =
    "MOBILIZATION HALTED";

  if (isCriticalPassed && readinessScorePercent >= 90) {
    decisionVerdict = "CLEAR TO COMMENCE";
  } else if (isCriticalPassed && readinessScorePercent >= 75) {
    decisionVerdict = "CONDITIONAL COMMENCEMENT";
  }

  return {
    totalItems,
    passedItems,
    failedItemsCount: failedItems.length,
    pendingItems,
    criticalFailures,
    isCriticalPassed,
    readinessScorePercent,
    decisionVerdict,
  };
}

