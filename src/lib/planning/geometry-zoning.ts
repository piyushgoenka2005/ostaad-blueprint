/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.1: Plot Area & Geometric Boundary Calculator (Tool 6)
 * Sub-Module 2.2: Zoning, Setbacks & FAR Permissible Area Engine (Tool 12)
 *
 * Implements Cartesian coordinate Shoelace polygon area calculation,
 * comprehensive Indian regional land unit conversions, and National Building Code
 * (NBC 2016) municipal zoning, setback, ground coverage, and FAR/FSI algorithms.
 */

export interface CoordinatePoint {
  x: number; // in feet or meters
  y: number; // in feet or meters
  label?: string;
}

export type PlotShapeType = "rectangle" | "trapezoid" | "triangle" | "polygon";

export type ZoningClassification =
  | "R1_RESIDENTIAL_LOW"
  | "R2_RESIDENTIAL_HIGH"
  | "C1_COMMERCIAL_RETAIL"
  | "C2_COMMERCIAL_OFFICE"
  | "MIXED_USE"
  | "INDUSTRIAL";

export type RoadWidthCategory =
  | "LESS_THAN_9M"
  | "9M_TO_12M"
  | "12M_TO_18M"
  | "18M_TO_24M"
  | "ABOVE_24M";

export interface LandUnitConversions {
  sqft: number;
  sqm: number;
  gaj: number; // Square Yards
  guntha: number;
  bighaPucca: number; // Standard North India (27,225 sqft)
  bighaBengal: number; // Bengal / Eastern India (14,400 sqft)
  bighaUP: number; // Uttar Pradesh (27,000 sqft)
  acres: number;
  hectares: number;
  brass: number; // 100 sqft unit
}

export interface PlotGeometryResult {
  shape: PlotShapeType;
  grossAreaSqFt: number;
  perimeterFt: number;
  conversions: LandUnitConversions;
  points: CoordinatePoint[];
}

export interface ZoningParams {
  grossPlotAreaSqFt: number;
  roadWidthCategory: RoadWidthCategory;
  zoningClass: ZoningClassification;
  proposedBuildingHeightMeters: number;
  includeTDRPremium: boolean;
  includeFungibleFSI: boolean;
  manualFrontSetbackFt?: number;
  manualRearSetbackFt?: number;
  manualSide1SetbackFt?: number;
  manualSide2SetbackFt?: number;
}

export interface SetbackRulesResult {
  frontSetbackFt: number;
  rearSetbackFt: number;
  side1SetbackFt: number;
  side2SetbackFt: number;
  mandatoryOpenSpacePercent: number; // Typically 10-15%
}

export interface ZoningAnalysisResult {
  setbacks: SetbackRulesResult;
  netBuildableFootprintSqFt: number;
  permissibleGroundCoveragePercent: number;
  baseFSI: number;
  premiumTdrFSI: number;
  fungibleFSI: number;
  effectiveFSI: number;
  permissibleGrossBUASqFt: number;
  permissibleGrossBUASqM: number;
  estimatedNetCarpetAreaSqFt: number; // ~72% efficiency
  estimatedMaxFloors: number;
}

// Exact Indian land conversion standards
export const INDIAN_LAND_FACTORS = {
  SQM: 10.7639, // 1 sqm = 10.7639 sqft
  GAJ: 9.0, // 1 Gaj (sq yard) = 9 sqft
  GUNTHA: 1089.0, // 1 Guntha = 1,089 sqft (33ft x 33ft)
  BIGHA_PUCCA: 27225.0, // 1 Pucca Bigha = 27,225 sqft = 25 Guntha
  BIGHA_BENGAL: 14400.0, // 1 Bengal Bigha = 14,400 sqft (20 Kathas)
  BIGHA_UP: 27000.0, // 1 UP Bigha = 27,000 sqft
  ACRE: 43560.0, // 1 Acre = 43,560 sqft = 40 Guntha
  HECTARE: 107639.1, // 1 Hectare = 10,000 sqm = 107,639.1 sqft
  BRASS: 100.0, // 1 Brass = 100 sqft
};

/**
 * Calculates irregular polygon area using Cartesian Gauss / Shoelace formula:
 * Area = 0.5 * | sum(x_i * y_{i+1} - x_{i+1} * y_i) |
 */
export function calculateShoelaceArea(points: CoordinatePoint[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    sum += points[i].x * points[next].y - points[next].x * points[i].y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Calculates boundary perimeter around a polygon
 */
export function calculatePolygonPerimeter(points: CoordinatePoint[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const dx = points[next].x - points[i].x;
    const dy = points[next].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return perimeter;
}

/**
 * Converts a square footage area into all standard Indian land units
 */
export function convertLandUnits(sqft: number): LandUnitConversions {
  const safeSqft = Math.max(0, sqft);
  return {
    sqft: Math.round(safeSqft * 100) / 100,
    sqm: Math.round((safeSqft / INDIAN_LAND_FACTORS.SQM) * 100) / 100,
    gaj: Math.round((safeSqft / INDIAN_LAND_FACTORS.GAJ) * 100) / 100,
    guntha: Math.round((safeSqft / INDIAN_LAND_FACTORS.GUNTHA) * 100) / 100,
    bighaPucca: Math.round((safeSqft / INDIAN_LAND_FACTORS.BIGHA_PUCCA) * 1000) / 1000,
    bighaBengal: Math.round((safeSqft / INDIAN_LAND_FACTORS.BIGHA_BENGAL) * 1000) / 1000,
    bighaUP: Math.round((safeSqft / INDIAN_LAND_FACTORS.BIGHA_UP) * 1000) / 1000,
    acres: Math.round((safeSqft / INDIAN_LAND_FACTORS.ACRE) * 1000) / 1000,
    hectares: Math.round((safeSqft / INDIAN_LAND_FACTORS.HECTARE) * 1000) / 1000,
    brass: Math.round((safeSqft / INDIAN_LAND_FACTORS.BRASS) * 100) / 100,
  };
}

/**
 * Computes National Building Code (NBC 2016) setback rules
 */
export function evaluateNBCSetbacks(
  roadWidth: RoadWidthCategory,
  heightMeters: number,
  zoningClass: ZoningClassification
): SetbackRulesResult {
  // Height factor in feet (1m = 3.28084 ft)
  const heightFt = heightMeters * 3.28084;

  // Front setback minimum based on road width
  let baseFrontMeters = 3.0;
  switch (roadWidth) {
    case "LESS_THAN_9M":
      baseFrontMeters = 3.0;
      break;
    case "9M_TO_12M":
      baseFrontMeters = 4.5;
      break;
    case "12M_TO_18M":
      baseFrontMeters = 6.0;
      break;
    case "18M_TO_24M":
      baseFrontMeters = 7.5;
      break;
    case "ABOVE_24M":
      baseFrontMeters = 9.0;
      break;
  }

  // High-rise height increment: H / 3 for front, H / 4 for rear, H / 5 for sides
  const frontFt = Math.max(baseFrontMeters * 3.28084, heightFt / 3.5);
  const rearFt = Math.max(10.0, heightFt / 4.0);
  const side1Ft = Math.max(8.0, heightFt / 5.0);
  const side2Ft = Math.max(8.0, heightFt / 5.0);

  // Mandatory open amenity space reservation
  const mandatoryOpenSpacePercent =
    zoningClass === "R2_RESIDENTIAL_HIGH" || zoningClass === "C2_COMMERCIAL_OFFICE" ? 15.0 : 10.0;

  return {
    frontSetbackFt: Math.round(frontFt * 10) / 10,
    rearSetbackFt: Math.round(rearFt * 10) / 10,
    side1SetbackFt: Math.round(side1Ft * 10) / 10,
    side2SetbackFt: Math.round(side2Ft * 10) / 10,
    mandatoryOpenSpacePercent,
  };
}

/**
 * Evaluates Full Zoning, Ground Coverage & FAR/BUA calculations
 */
export function evaluateZoningAndFAR(params: ZoningParams): ZoningAnalysisResult {
  const {
    grossPlotAreaSqFt,
    roadWidthCategory,
    zoningClass,
    proposedBuildingHeightMeters,
    includeTDRPremium,
    includeFungibleFSI,
    manualFrontSetbackFt,
    manualRearSetbackFt,
    manualSide1SetbackFt,
    manualSide2SetbackFt,
  } = params;

  const standardSetbacks = evaluateNBCSetbacks(
    roadWidthCategory,
    proposedBuildingHeightMeters,
    zoningClass
  );

  const frontSetback = manualFrontSetbackFt ?? standardSetbacks.frontSetbackFt;
  const rearSetback = manualRearSetbackFt ?? standardSetbacks.rearSetbackFt;
  const side1Setback = manualSide1SetbackFt ?? standardSetbacks.side1SetbackFt;
  const side2Setback = manualSide2SetbackFt ?? standardSetbacks.side2SetbackFt;

  // Estimate approximate rectangular proportions for setback deduction if irregular
  const approxSide = Math.sqrt(grossPlotAreaSqFt);
  const effectiveLength = Math.max(0, approxSide - (frontSetback + rearSetback));
  const effectiveWidth = Math.max(0, approxSide - (side1Setback + side2Setback));
  let netFootprint = effectiveLength * effectiveWidth;

  // Apply maximum permissible ground coverage cap (typically 40% to 50% for high-rise, 60% for low-rise)
  let maxCoverageCapPercent = 50.0;
  if (proposedBuildingHeightMeters <= 15) {
    maxCoverageCapPercent = 60.0;
  } else if (proposedBuildingHeightMeters > 30) {
    maxCoverageCapPercent = 40.0;
  }

  const maxAllowedCoverageSqFt = (grossPlotAreaSqFt * maxCoverageCapPercent) / 100;
  netFootprint = Math.min(netFootprint, maxAllowedCoverageSqFt);

  const permissibleGroundCoveragePercent =
    grossPlotAreaSqFt > 0 ? (netFootprint / grossPlotAreaSqFt) * 100 : 0;

  // Base FSI determination based on road width and zoning
  let baseFSI = 1.2;
  switch (roadWidthCategory) {
    case "LESS_THAN_9M":
      baseFSI = 1.0;
      break;
    case "9M_TO_12M":
      baseFSI = 1.2;
      break;
    case "12M_TO_18M":
      baseFSI = 1.5;
      break;
    case "18M_TO_24M":
      baseFSI = 1.75;
      break;
    case "ABOVE_24M":
      baseFSI = 2.0;
      break;
  }

  // Commercial / Mixed-Use bonus
  if (zoningClass === "C1_COMMERCIAL_RETAIL" || zoningClass === "C2_COMMERCIAL_OFFICE") {
    baseFSI += 0.25;
  }

  // Premium / TDR FSI allowance (Transferable Development Rights)
  const premiumTdrFSI = includeTDRPremium ? 0.5 : 0;

  // Fungible / Compensatory FSI (typically 35% on residential, 20% on commercial)
  let fungibleRatio = 0.35;
  if (zoningClass.startsWith("C") || zoningClass === "INDUSTRIAL") {
    fungibleRatio = 0.2;
  }
  const fungibleFSI = includeFungibleFSI ? Math.round((baseFSI + premiumTdrFSI) * fungibleRatio * 100) / 100 : 0;

  const effectiveFSI = Math.round((baseFSI + premiumTdrFSI + fungibleFSI) * 100) / 100;
  const permissibleGrossBUASqFt = Math.round(grossPlotAreaSqFt * effectiveFSI);
  const permissibleGrossBUASqM = Math.round(permissibleGrossBUASqFt / INDIAN_LAND_FACTORS.SQM);

  // Carpet area (72% efficiency standard)
  const estimatedNetCarpetAreaSqFt = Math.round(permissibleGrossBUASqFt * 0.72);

  // Maximum floors
  const estimatedMaxFloors =
    netFootprint > 0 ? Math.ceil(permissibleGrossBUASqFt / netFootprint) : 1;

  return {
    setbacks: {
      frontSetbackFt: frontSetback,
      rearSetbackFt: rearSetback,
      side1SetbackFt: side1Setback,
      side2SetbackFt: side2Setback,
      mandatoryOpenSpacePercent: standardSetbacks.mandatoryOpenSpacePercent,
    },
    netBuildableFootprintSqFt: Math.round(netFootprint),
    permissibleGroundCoveragePercent: Math.round(permissibleGroundCoveragePercent * 10) / 10,
    baseFSI,
    premiumTdrFSI,
    fungibleFSI,
    effectiveFSI,
    permissibleGrossBUASqFt,
    permissibleGrossBUASqM,
    estimatedNetCarpetAreaSqFt,
    estimatedMaxFloors,
  };
}
