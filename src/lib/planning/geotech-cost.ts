/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.4: Geotechnical Soil Investigation & Strata Tracker (Tool 8)
 * Sub-Module 2.5: Pre-Construction Cost Estimator & Rate Analysis (Tool 2)
 *
 * Implements borehole logging, SPT N-value correction, Terzaghi/IS 6403 Safe Bearing Capacity (SBC),
 * foundation type advisory, dewatering classification, and multi-package CPWD work-head cost estimation.
 */

// =========================================================================
// TOOL 8: GEOTECHNICAL SOIL INVESTIGATION & STRATA TYPES
// =========================================================================

export type SoilLayerType =
  | "TOPSOIL_ORGANIC"
  | "SOFT_CLAY"
  | "MEDIUM_STIFF_CLAY"
  | "LOOSE_SAND"
  | "MEDIUM_DENSE_SAND"
  | "DENSE_SAND_GRAVEL"
  | "WEATHERED_ROCK_MURRUM"
  | "HARD_BASALT_BEDROCK";

export interface BoreholeStrataLayer {
  depthFromM: number;
  depthToM: number;
  soilType: SoilLayerType;
  sptNValue: number; // Observed blow count
  description: string;
}

export interface BoreholeRecord {
  id: string;
  boreholeNumber: string; // e.g. "BH-01", "BH-02"
  coordinates: string; // Lat/Long or Grid
  groundElevationM: number;
  waterTableDepthM: number;
  totalDepthM: number;
  layers: BoreholeStrataLayer[];
  dateTested: string;
  agencyName: string;
}

export type FoundationTypeAdvisory =
  | "SHALLOW_ISOLATED_FOOTINGS"
  | "COMBINED_STRIP_FOOTINGS"
  | "RAFT_MAT_FOUNDATION"
  | "BORED_CAST_IN_SITU_PILES"
  | "UNDER_REAMED_PILES";

export interface GeotechAnalysisResult {
  averageCorrectedSptN: number;
  designSbcKNm2: number; // Safe Bearing Capacity in kN/m2
  designSbcTonsPerM2: number; // in t/m2
  recommendedFoundation: FoundationTypeAdvisory;
  foundationJustification: string;
  dewateringRequired: boolean;
  dewateringMethod: string;
  chemicalAggressionVerdict: string;
  recommendedCementType: string;
}

export const SOIL_TYPE_PROPERTIES: Record<
  SoilLayerType,
  { label: string; baseSbc: number; typicalN: number; color: string }
> = {
  TOPSOIL_ORGANIC: { label: "Topsoil / Filled Ground", baseSbc: 50, typicalN: 3, color: "bg-amber-900/20 text-amber-900 border-amber-800" },
  SOFT_CLAY: { label: "Soft Marine / Black Cotton Clay", baseSbc: 75, typicalN: 4, color: "bg-yellow-800/20 text-yellow-900 border-yellow-700" },
  MEDIUM_STIFF_CLAY: { label: "Medium Stiff Silty Clay", baseSbc: 150, typicalN: 12, color: "bg-amber-700/20 text-amber-800 border-amber-600" },
  LOOSE_SAND: { label: "Loose River Sand", baseSbc: 120, typicalN: 9, color: "bg-yellow-500/20 text-yellow-800 border-yellow-500" },
  MEDIUM_DENSE_SAND: { label: "Medium Dense Coarse Sand", baseSbc: 220, typicalN: 22, color: "bg-amber-500/20 text-amber-800 border-amber-500" },
  DENSE_SAND_GRAVEL: { label: "Dense Sand & River Gravel", baseSbc: 320, typicalN: 35, color: "bg-emerald-600/20 text-emerald-800 border-emerald-600" },
  WEATHERED_ROCK_MURRUM: { label: "Weathered Soft Rock / Hard Murrum", baseSbc: 450, typicalN: 50, color: "bg-purple-600/20 text-purple-800 border-purple-600" },
  HARD_BASALT_BEDROCK: { label: "Hard Basalt / Granite Bedrock", baseSbc: 1200, typicalN: 100, color: "bg-slate-700/20 text-slate-800 border-slate-700" },
};

/**
 * Computes Safe Bearing Capacity (SBC) and Foundation Type Advisory
 * based on borehole strata and IS 6403 standards.
 */
export function evaluateGeotechBorehole(
  borehole: BoreholeRecord,
  proposedFoundationDepthM: number = 3.0
): GeotechAnalysisResult {
  // Find the strata layer at the proposed foundation depth
  const targetLayer =
    borehole.layers.find(
      (l) => proposedFoundationDepthM >= l.depthFromM && proposedFoundationDepthM <= l.depthToM
    ) || borehole.layers[borehole.layers.length - 1];

  const rawN = targetLayer ? targetLayer.sptNValue : 15;
  // Overburden & Dilatancy correction approximation (IS 2131)
  const correctedN = Math.round(rawN > 15 ? 15 + 0.5 * (rawN - 15) : rawN);

  // Compute Safe Bearing Capacity in kN/m2
  let sbc = targetLayer ? SOIL_TYPE_PROPERTIES[targetLayer.soilType].baseSbc : 180;
  if (targetLayer.soilType !== "HARD_BASALT_BEDROCK" && targetLayer.soilType !== "WEATHERED_ROCK_MURRUM") {
    // Meyerhof / Teng correlation: SBC (kN/m2) ≈ 11 * N (for 25mm permissible settlement)
    sbc = Math.round(correctedN * 11);
  }

  // Cap minimum & maximum realistic boundaries
  sbc = Math.max(60, Math.min(1800, sbc));
  const sbcTons = Math.round((sbc / 9.80665) * 10) / 10;

  // Determine foundation advisory
  let recommendedFoundation: FoundationTypeAdvisory = "SHALLOW_ISOLATED_FOOTINGS";
  let foundationJustification = "";

  if (sbc < 100 || targetLayer.soilType === "SOFT_CLAY") {
    recommendedFoundation = "BORED_CAST_IN_SITU_PILES";
    foundationJustification =
      "Low safe bearing capacity (<100 kN/m²) or high plasticity clay strata. Deep piling required to terminate in hard rock socket.";
  } else if (sbc >= 100 && sbc < 180) {
    recommendedFoundation = "RAFT_MAT_FOUNDATION";
    foundationJustification =
      "Moderate bearing capacity (100–180 kN/m²). Solid RC raft slab recommended to distribute column loads and eliminate differential settlement.";
  } else if (sbc >= 180 && sbc < 300) {
    recommendedFoundation = "COMBINED_STRIP_FOOTINGS";
    foundationJustification =
      "Good soil stability (180–300 kN/m²). Isolated pad footings with heavy ground tie beams or combined strap footings.";
  } else {
    recommendedFoundation = "SHALLOW_ISOLATED_FOOTINGS";
    foundationJustification =
      "Competent hard murrum or bedrock (SBC ≥ 300 kN/m²). Economical shallow isolated trapezoidal footings directly on rock.";
  }

  // Dewatering assessment
  const dewateringRequired = borehole.waterTableDepthM <= proposedFoundationDepthM + 1.0;
  const dewateringMethod = dewateringRequired
    ? borehole.waterTableDepthM < 2.0
      ? "Well-Point Header System with multi-stage vacuum dewatering"
      : "Open sump pumping with peripheral French gravel drains"
    : "No active dewatering required; ground water table is below foundation excavation level.";

  return {
    averageCorrectedSptN: correctedN,
    designSbcKNm2: sbc,
    designSbcTonsPerM2: sbcTons,
    recommendedFoundation,
    foundationJustification,
    dewateringRequired,
    dewateringMethod,
    chemicalAggressionVerdict: "Non-aggressive (pH 7.2, SO3 < 0.2%). Normal corrosion safeguards apply.",
    recommendedCementType: "IS 269 OPC 53 Grade / IS 1489 PPC (Fly Ash based)",
  };
}

// =========================================================================
// TOOL 2: PRE-CONSTRUCTION COST ESTIMATOR & RATE ANALYSIS
// =========================================================================

export interface WorkHeadCostPackage {
  id: string;
  packageCode: string; // e.g. "CIVIL-01"
  packageName: string;
  weightPercentage: number; // Approximate standard weight of total civil cost
  baseRatePerSqFtBUA: number; // in INR per sq.ft BUA
  description: string;
  materialsList: string;
}

export const CPWD_WORK_HEAD_PACKAGES: WorkHeadCostPackage[] = [
  {
    id: "pkg-1",
    packageCode: "CIVIL-01",
    packageName: "1. Substructure & Foundation Excavation",
    weightPercentage: 14.0,
    baseRatePerSqFtBUA: 340,
    description: "Bulk soil excavation, anti-termite chemical injection, M10 PCC leveling, M25/M30 RCC column footings & plinth tie beams",
    materialsList: "OPC 53 Cement, Coarse Aggregate 20mm/10mm, M-Sand, Fe-550D Rebar, Chlorpyrifos",
  },
  {
    id: "pkg-2",
    packageCode: "CIVIL-02",
    packageName: "2. Superstructure RCC Core & Slabs",
    weightPercentage: 32.0,
    baseRatePerSqFtBUA: 780,
    description: "M30/M35 design mix concrete, heavy columns, shear walls, post-tensioned / solid RC floor slabs, scaffolding & shuttering",
    materialsList: "RMC Ready-Mix Concrete M30, Tata Tiscon Fe-550D Rebar, Film-faced Marine Plywood",
  },
  {
    id: "pkg-3",
    packageCode: "CIVIL-03",
    packageName: "3. Masonry, AAC Blocks & Plastering",
    weightPercentage: 11.0,
    baseRatePerSqFtBUA: 260,
    description: "200mm external & 100mm internal AAC blockwork with polymer mortar, 12mm internal cement plaster, 20mm external sand face plaster",
    materialsList: "Siporex/Birla Aerocon AAC Blocks, Block Jointing Adhesive, River Sand, PPC Cement",
  },
  {
    id: "pkg-4",
    packageCode: "CIVIL-04",
    packageName: "4. Waterproofing & Chemical Membranes",
    weightPercentage: 5.5,
    baseRatePerSqFtBUA: 135,
    description: "Retaining wall SBS membrane, sunken toilet box waterproofing, podium polyurethane membrane, terrace crystalline protection",
    materialsList: "Fosroc / Dr. Fixit 2K Polymer, APP Bituminous Sheet, Geotextile Membrane, Crystalline slurry",
  },
  {
    id: "pkg-5",
    packageCode: "MEP-01",
    packageName: "5. MEP, Electrical & Plumbing Rough-Ins",
    weightPercentage: 16.5,
    baseRatePerSqFtBUA: 400,
    description: "CPVC water supply, SWR drainage stacks, FRLS concealed copper wiring, distribution panels, wet riser firefighting & HVAC sleeves",
    materialsList: "Ashirvad/Astral CPVC, Polycab FR-LSH Copper Wires, Schneider MCB, GI Fire Pipes",
  },
  {
    id: "pkg-6",
    packageCode: "FINISH-01",
    packageName: "6. Flooring, Cladding & Architectural Finishes",
    weightPercentage: 13.0,
    baseRatePerSqFtBUA: 315,
    description: "800x1600mm GVT vitrified tiles, Italian marble entrance lobby, granite sill/jambs, gypsum false ceiling, acrylic emulsion paint",
    materialsList: "Kajaria GVT Tiles, Flamed Granite, Saint-Gobain Gypsum Board, Asian Paints Royale",
  },
  {
    id: "pkg-7",
    packageCode: "INFRA-01",
    packageName: "7. External Infrastructure & Statutory Fees",
    weightPercentage: 8.0,
    baseRatePerSqFtBUA: 195,
    description: "Compound boundary wall, heavy-duty paver blocks, stormwater drains, STP sewage treatment, transformer yard & municipal fees",
    materialsList: "60mm Precast Pavers, RCC Stormwater Pipes, 11kV Substation Transformer, DG Backup",
  },
];

export interface CostEstimatorParams {
  grossBUASqFt: number;
  buildingGrade: "ECONOMY" | "STANDARD_COMMERCIAL" | "PREMIUM_CORPORATE" | "LUXURY_HIGH_RISE";
  contingencyReservePercent: number; // e.g. 5%
  contractorMarginPercent: number; // e.g. 12%
  statutoryConsultantFeesPercent: number; // e.g. 3.5%
  applyGstPercent: number; // 18% GST works contract
  packageOverrides?: Record<string, number>; // Custom rate per sq.ft
}

export interface PackageCostBreakdown {
  id: string;
  packageCode: string;
  packageName: string;
  ratePerSqFt: number;
  totalPackageCostINR: number;
  percentageOfBase: number;
  description: string;
  materialsList: string;
}

export interface CostEstimationResult {
  grossBUASqFt: number;
  baseConstructionCostINR: number;
  baseRatePerSqFtINR: number;
  packages: PackageCostBreakdown[];
  statutoryConsultantFeesINR: number;
  contractorMarginINR: number;
  contingencyReserveINR: number;
  subtotalBeforeTaxINR: number;
  gstAmountINR: number;
  grandTotalProjectCostINR: number;
  effectiveAllInclusiveRatePerSqFt: number;
}

/**
 * Computes Total Pre-Construction Project Budget & Rate Analysis
 */
export function calculatePreConstructionBudget(
  params: CostEstimatorParams
): CostEstimationResult {
  const {
    grossBUASqFt,
    buildingGrade,
    contingencyReservePercent = 5.0,
    contractorMarginPercent = 12.0,
    statutoryConsultantFeesPercent = 3.5,
    applyGstPercent = 18.0,
    packageOverrides = {},
  } = params;

  // Grade multiplier
  let gradeMultiplier = 1.0;
  switch (buildingGrade) {
    case "ECONOMY":
      gradeMultiplier = 0.85;
      break;
    case "STANDARD_COMMERCIAL":
      gradeMultiplier = 1.0;
      break;
    case "PREMIUM_CORPORATE":
      gradeMultiplier = 1.25;
      break;
    case "LUXURY_HIGH_RISE":
      gradeMultiplier = 1.5;
      break;
  }

  let baseConstructionCostINR = 0;

  const packages: PackageCostBreakdown[] = CPWD_WORK_HEAD_PACKAGES.map((pkg) => {
    const rate = packageOverrides[pkg.id] ?? Math.round(pkg.baseRatePerSqFtBUA * gradeMultiplier);
    const totalCost = Math.round(rate * grossBUASqFt);
    baseConstructionCostINR += totalCost;

    return {
      id: pkg.id,
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      ratePerSqFt: rate,
      totalPackageCostINR: totalCost,
      percentageOfBase: 0, // computed below
      description: pkg.description,
      materialsList: pkg.materialsList,
    };
  });

  // Calculate percentage of base
  packages.forEach((pkg) => {
    pkg.percentageOfBase =
      baseConstructionCostINR > 0
        ? Math.round((pkg.totalPackageCostINR / baseConstructionCostINR) * 1000) / 10
        : 0;
  });

  const baseRatePerSqFtINR =
    grossBUASqFt > 0 ? Math.round(baseConstructionCostINR / grossBUASqFt) : 0;

  const statutoryConsultantFeesINR = Math.round(
    (baseConstructionCostINR * statutoryConsultantFeesPercent) / 100
  );
  const contractorMarginINR = Math.round(
    (baseConstructionCostINR * contractorMarginPercent) / 100
  );
  const contingencyReserveINR = Math.round(
    (baseConstructionCostINR * contingencyReservePercent) / 100
  );

  const subtotalBeforeTaxINR =
    baseConstructionCostINR +
    statutoryConsultantFeesINR +
    contractorMarginINR +
    contingencyReserveINR;

  const gstAmountINR = Math.round((subtotalBeforeTaxINR * applyGstPercent) / 100);
  const grandTotalProjectCostINR = subtotalBeforeTaxINR + gstAmountINR;

  const effectiveAllInclusiveRatePerSqFt =
    grossBUASqFt > 0 ? Math.round(grandTotalProjectCostINR / grossBUASqFt) : 0;

  return {
    grossBUASqFt,
    baseConstructionCostINR,
    baseRatePerSqFtINR,
    packages,
    statutoryConsultantFeesINR,
    contractorMarginINR,
    contingencyReserveINR,
    subtotalBeforeTaxINR,
    gstAmountINR,
    grandTotalProjectCostINR,
    effectiveAllInclusiveRatePerSqFt,
  };
}

