/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.6: Financial Feasibility, Debt/EMI & Return Analyzer (Tool 9)
 * Sub-Module 2.7: Project Options Selection Scorecard & Gate Matrix (Tool 14)
 *
 * Implements debt-equity capital structures, reducing balance loan amortization,
 * moratorium interest capitalization, break-even sale rate, ROE, IRR approximation,
 * and multi-option structural gate matrix with mandatory pass/fail constraints.
 */

// =========================================================================
// TOOL 9: FINANCIAL FEASIBILITY, DEBT/EMI & RETURN ANALYZER
// =========================================================================

export interface FeasibilityParams {
  totalCapexINR: number;
  saleableAreaSqFt: number;
  projectedSaleRatePerSqFt: number;
  equityContributionPercent: number; // e.g. 35%
  debtInterestRatePercent: number; // e.g. 10.5% per annum
  loanTenureMonths: number; // e.g. 36 months
  moratoriumPeriodMonths: number; // e.g. 18 months construction period
}

export interface AmortizationMonth {
  month: number;
  openingPrincipal: number;
  emi: number;
  interest: number;
  principalRepaid: number;
  closingPrincipal: number;
}

export interface FeasibilityAnalysisResult {
  equityRequiredINR: number;
  loanAmountINR: number;
  monthlyEMIINR: number;
  totalInterestINR: number;
  capitalizedInterestMoratoriumINR: number;
  totalProjectCostWithFinancingINR: number;
  projectedGrossRevenueINR: number;
  grossProfitINR: number;
  grossMarginPercent: number;
  breakEvenSaleRatePerSqFt: number;
  returnOnEquityPercent: number;
  estimatedIRRPercent: number;
  dscrRatio: number; // Debt Service Coverage Ratio
  schedulePreview: AmortizationMonth[];
}

/**
 * Calculates Reducing Balance Loan EMI and Generates Summary Schedule
 */
export function calculateLoanAmortization(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
  moratoriumMonths: number = 0
): {
  monthlyEMI: number;
  totalInterest: number;
  moratoriumInterest: number;
  schedule: AmortizationMonth[];
} {
  if (principal <= 0 || tenureMonths <= 0) {
    return { monthlyEMI: 0, totalInterest: 0, moratoriumInterest: 0, schedule: [] };
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  const repaymentMonths = Math.max(1, tenureMonths - moratoriumMonths);

  // Simple interest accrued during moratorium (interest-only payment or capitalized)
  const moratoriumInterest = Math.round(principal * monthlyRate * moratoriumMonths);

  // EMI formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
  let monthlyEMI = 0;
  if (monthlyRate === 0) {
    monthlyEMI = Math.round(principal / repaymentMonths);
  } else {
    monthlyEMI = Math.round(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) /
        (Math.pow(1 + monthlyRate, repaymentMonths) - 1)
    );
  }

  const schedule: AmortizationMonth[] = [];
  let balance = principal;
  let totalInterest = moratoriumInterest;

  for (let m = 1; m <= tenureMonths; m++) {
    const opening = balance;
    let interest = 0;
    let principalPaid = 0;
    let emi = 0;

    if (m <= moratoriumMonths) {
      // Interest-only servicing during construction moratorium
      interest = Math.round(balance * monthlyRate);
      emi = interest;
      principalPaid = 0;
    } else {
      interest = Math.round(balance * monthlyRate);
      principalPaid = Math.min(balance, monthlyEMI - interest);
      emi = interest + principalPaid;
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
    }

    if (m <= 6 || m === tenureMonths || m % 6 === 0) {
      schedule.push({
        month: m,
        openingPrincipal: opening,
        emi,
        interest,
        principalRepaid: principalPaid,
        closingPrincipal: balance,
      });
    }
  }

  return {
    monthlyEMI,
    totalInterest,
    moratoriumInterest,
    schedule,
  };
}

/**
 * Evaluates Project Financial Feasibility, Debt/EMI, Break-even & Returns
 */
export function evaluateFinancialFeasibility(params: FeasibilityParams): FeasibilityAnalysisResult {
  const {
    totalCapexINR,
    saleableAreaSqFt,
    projectedSaleRatePerSqFt,
    equityContributionPercent,
    debtInterestRatePercent,
    loanTenureMonths,
    moratoriumPeriodMonths,
  } = params;

  const equityRequiredINR = Math.round((totalCapexINR * equityContributionPercent) / 100);
  const loanAmountINR = Math.max(0, totalCapexINR - equityRequiredINR);

  const { monthlyEMI, totalInterest, moratoriumInterest, schedule } = calculateLoanAmortization(
    loanAmountINR,
    debtInterestRatePercent,
    loanTenureMonths,
    moratoriumPeriodMonths
  );

  const totalProjectCostWithFinancingINR = totalCapexINR + totalInterest;
  const projectedGrossRevenueINR = Math.round(saleableAreaSqFt * projectedSaleRatePerSqFt);
  const grossProfitINR = projectedGrossRevenueINR - totalProjectCostWithFinancingINR;

  const grossMarginPercent =
    projectedGrossRevenueINR > 0
      ? Math.round((grossProfitINR / projectedGrossRevenueINR) * 1000) / 10
      : 0;

  const breakEvenSaleRatePerSqFt =
    saleableAreaSqFt > 0
      ? Math.round(totalProjectCostWithFinancingINR / saleableAreaSqFt)
      : 0;

  const returnOnEquityPercent =
    equityRequiredINR > 0
      ? Math.round((grossProfitINR / equityRequiredINR) * 1000) / 10
      : 0;

  // Approximate Project Internal Rate of Return (IRR) based on equity multiple and tenure years
  const tenureYears = Math.max(1, loanTenureMonths / 12);
  const equityMultiple = equityRequiredINR > 0 ? (grossProfitINR + equityRequiredINR) / equityRequiredINR : 1;
  const estimatedIRRPercent =
    equityMultiple > 0
      ? Math.round((Math.pow(equityMultiple, 1 / tenureYears) - 1) * 1000) / 10
      : 0;

  // Debt Service Coverage Ratio (DSCR) = Net Cashflow / Total Debt Service
  const totalDebtService = loanAmountINR + totalInterest;
  const dscrRatio =
    totalDebtService > 0
      ? Math.round((projectedGrossRevenueINR / totalDebtService) * 100) / 100
      : 0;

  return {
    equityRequiredINR,
    loanAmountINR,
    monthlyEMIINR: monthlyEMI,
    totalInterestINR: totalInterest,
    capitalizedInterestMoratoriumINR: moratoriumInterest,
    totalProjectCostWithFinancingINR,
    projectedGrossRevenueINR,
    grossProfitINR,
    grossMarginPercent,
    breakEvenSaleRatePerSqFt,
    returnOnEquityPercent,
    estimatedIRRPercent,
    dscrRatio,
    schedulePreview: schedule,
  };
}

// =========================================================================
// TOOL 14: PROJECT OPTIONS SELECTION SCORECARD & GATE MATRIX
// =========================================================================

export interface EvaluationCriterion {
  id: string;
  name: string;
  weightPercentage: number; // e.g. 25%
  description: string;
}

export interface GateRule {
  id: string;
  name: string;
  failConditionDescription: string;
}

export interface StructuralOption {
  id: string;
  name: string;
  shortCode: string;
  systemDescription: string;
  scores: Record<string, number>; // criterionId -> score (1 to 10)
  gatePasses: Record<string, boolean>; // gateId -> boolean
  costPerSqFtDeltaINR: number; // e.g. -50 or +150 vs baseline
  timeSavingsMonths: number; // e.g. 4 months faster
}

export interface OptionEvaluationScore {
  option: StructuralOption;
  weightedScore: number; // out of 10
  isDisqualified: boolean;
  failedGates: string[];
  rank: number;
}

export const DEFAULT_SCORECARD_CRITERIA: EvaluationCriterion[] = [
  {
    id: "crit-1",
    name: "Initial Capex & Material Sourcing Economy",
    weightPercentage: 25,
    description: "Overall cost of formwork, concrete, reinforcement, and local vendor availability",
  },
  {
    id: "crit-2",
    name: "Speed of Construction & Turnaround",
    weightPercentage: 25,
    description: "Floor cycle speed (days per floor) and early handover potential",
  },
  {
    id: "crit-3",
    name: "Local Contractor Capability & Skilled Labour",
    weightPercentage: 20,
    description: "Availability of specialized erectors, operators, and tier-2/3 labour supply",
  },
  {
    id: "crit-4",
    name: "Architectural Flexibility & Future Remodeling",
    weightPercentage: 15,
    description: "Ease of internal partition relocation, facade customization, and MEP core alterations",
  },
  {
    id: "crit-5",
    name: "Structural Durability & Low Maintenance",
    weightPercentage: 15,
    description: "Resistance to corrosion, seismic ductile performance, thermal performance, and joints seal integrity",
  },
];

export const MANDATORY_HARD_GATES: GateRule[] = [
  {
    id: "gate-1",
    name: "Seismic Ductile Detailing (IS 13920 Compliance)",
    failConditionDescription: "Fails mandatory ductile connection requirements in Zone III/IV/V",
  },
  {
    id: "gate-2",
    name: "Site Road Access for Heavy Crane Rigging (>40T)",
    failConditionDescription: "Approach road width is <9m or overhead HT lines prevent mobile crane swing",
  },
  {
    id: "gate-3",
    name: "Working Capital & Factory Mobilization Readiness",
    failConditionDescription: "Initial mobilization deposit exceeds 20% of promoter upfront liquid capital",
  },
];

export const DEFAULT_STRUCTURAL_OPTIONS: StructuralOption[] = [
  {
    id: "opt-1",
    name: "Option A: Conventional Cast-in-Situ RCC Frame (M30/M35)",
    shortCode: "RCC-CIS",
    systemDescription: "Traditional timber/marine ply formwork with cast-in-situ columns, beams, and two-way slabs. Highly flexible and universally available.",
    scores: {
      "crit-1": 8.5,
      "crit-2": 6.0,
      "crit-3": 9.0,
      "crit-4": 8.5,
      "crit-5": 7.5,
    },
    gatePasses: {
      "gate-1": true,
      "gate-2": true,
      "gate-3": true,
    },
    costPerSqFtDeltaINR: 0, // Baseline
    timeSavingsMonths: 0,
  },
  {
    id: "opt-2",
    name: "Option B: Monolithic Aluminium Formwork (Mivan System)",
    shortCode: "MIVAN",
    systemDescription: "Precision engineered aluminium shuttering allowing simultaneous casting of walls and slabs in single 5-day floor cycles.",
    scores: {
      "crit-1": 7.0,
      "crit-2": 9.5,
      "crit-3": 7.5,
      "crit-4": 5.0,
      "crit-5": 9.0,
    },
    gatePasses: {
      "gate-1": true,
      "gate-2": true,
      "gate-3": true,
    },
    costPerSqFtDeltaINR: 120,
    timeSavingsMonths: 5,
  },
  {
    id: "opt-3",
    name: "Option C: Precast Concrete Columns & Hollow-Core Slabs",
    shortCode: "PRECAST",
    systemDescription: "Off-site factory produced prestressed elements erected with high-capacity tower cranes. Minimal site casting.",
    scores: {
      "crit-1": 6.5,
      "crit-2": 9.0,
      "crit-3": 5.5,
      "crit-4": 4.5,
      "crit-5": 8.5,
    },
    gatePasses: {
      "gate-1": true,
      "gate-2": false, // Fails if approach road cannot support heavy trailers
      "gate-3": true,
    },
    costPerSqFtDeltaINR: 180,
    timeSavingsMonths: 6,
  },
  {
    id: "opt-4",
    name: "Option D: Structural Steel Composite Framing & Deck Slab",
    shortCode: "STEEL-COMP",
    systemDescription: "Heavy rolled steel I-sections, shear studs, and profiled galvanised metal decking with thin concrete topping.",
    scores: {
      "crit-1": 5.5,
      "crit-2": 9.0,
      "crit-3": 6.5,
      "crit-4": 8.0,
      "crit-5": 7.0,
    },
    gatePasses: {
      "gate-1": true,
      "gate-2": true,
      "gate-3": true,
    },
    costPerSqFtDeltaINR: 320,
    timeSavingsMonths: 4,
  },
];

/**
 * Evaluates Structural Options against Weighted Criteria and Hard Pass/Fail Gates
 */
export function evaluateOptionsScorecard(
  options: StructuralOption[],
  criteria: EvaluationCriterion[] = DEFAULT_SCORECARD_CRITERIA,
  gates: GateRule[] = MANDATORY_HARD_GATES
): OptionEvaluationScore[] {
  const evaluated = options.map((opt) => {
    // Check mandatory gates
    const failedGates: string[] = [];
    gates.forEach((gate) => {
      if (opt.gatePasses[gate.id] === false) {
        failedGates.push(gate.name);
      }
    });

    const isDisqualified = failedGates.length > 0;

    // Calculate weighted score: sum(weight% * score) / 100
    let weightedScore = 0;
    criteria.forEach((crit) => {
      const score = opt.scores[crit.id] ?? 5.0;
      weightedScore += (crit.weightPercentage * score) / 100;
    });

    weightedScore = Math.round(weightedScore * 100) / 100;

    return {
      option: opt,
      weightedScore,
      isDisqualified,
      failedGates,
      rank: 0, // Assigned below
    };
  });

  // Sort: Qualified first sorted by score descending, then disqualified
  evaluated.sort((a, b) => {
    if (a.isDisqualified && !b.isDisqualified) return 1;
    if (!a.isDisqualified && b.isDisqualified) return -1;
    return b.weightedScore - a.weightedScore;
  });

  // Assign ranks
  evaluated.forEach((item, index) => {
    item.rank = index + 1;
  });

  return evaluated;
}

