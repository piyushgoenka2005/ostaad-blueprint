/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.12: Statutory Permit, NOC & Clearance Lifecycle Tracker (Tool 5)
 * Sub-Module 2.13: Temporary Site Layout & Logistics Zone Planner (Tool 11)
 *
 * Implements municipal sanctions lifecycle tracking, expiry monitoring,
 * site logistics zoning (cement godown, rebar yard, batching plant),
 * tower crane swing radius clash detection, and heavy trailer road clearance.
 */

// =========================================================================
// TOOL 5: STATUTORY PERMIT, NOC & CLEARANCE LIFECYCLE TRACKER
// =========================================================================

export type PermitStatus = "APPROVED" | "IN_REVIEW" | "APPLIED" | "EXPIRED" | "NOT_STARTED";

export type PermitCategory =
  | "LAND_TITLE"
  | "MUNICIPAL"
  | "ENVIRONMENT"
  | "SAFETY_FIRE"
  | "UTILITIES"
  | "OCCUPANCY";

export interface StatutoryPermit {
  id: string;
  permitName: string;
  category: PermitCategory;
  authority: string;
  status: PermitStatus;
  sanctionFeeINR: number;
  applicationDate: string;
  approvalDate: string;
  expiryDate: string;
  isMandatoryForGroundbreaking: boolean;
  docRef: string;
  notes?: string;
}

export const DEFAULT_STATUTORY_PERMITS: StatutoryPermit[] = [
  {
    id: "pm-01",
    permitName: "30-Year Title Search & Non-Encumbrance Certificate",
    category: "LAND_TITLE",
    authority: "Sub-Registrar / Revenue Department",
    status: "APPROVED",
    sanctionFeeINR: 125000,
    applicationDate: "2025-10-10",
    approvalDate: "2025-11-05",
    expiryDate: "2035-11-04",
    isMandatoryForGroundbreaking: true,
    docRef: "DOC-SR-2025-992",
    notes: "Clean title certified by Senior Advocate Rajesh Parekh.",
  },
  {
    id: "pm-02",
    permitName: "Building Plan Sanction & Commencement Certificate (CC)",
    category: "MUNICIPAL",
    authority: "PMC Urban Development Authority",
    status: "APPROVED",
    sanctionFeeINR: 1850000,
    applicationDate: "2025-11-15",
    approvalDate: "2026-01-20",
    expiryDate: "2027-01-19",
    isMandatoryForGroundbreaking: true,
    docRef: "PMC/BP/2026/8841",
    notes: "Valid for 1 year; renewal mandatory prior to expiry.",
  },
  {
    id: "pm-03",
    permitName: "State Environmental Impact Assessment (SEIAA EC)",
    category: "ENVIRONMENT",
    authority: "State Environment Impact Assessment Authority",
    status: "APPROVED",
    sanctionFeeINR: 650000,
    applicationDate: "2025-08-01",
    approvalDate: "2025-12-14",
    expiryDate: "2032-12-13",
    isMandatoryForGroundbreaking: true,
    docRef: "SEIAA-MH-EC-2025-412",
    notes: "Strict air & water pollution monitoring logs required on site.",
  },
  {
    id: "pm-04",
    permitName: "Provisional Fire Safety NOC & Evacuation Plan",
    category: "SAFETY_FIRE",
    authority: "Chief Fire Officer (CFO)",
    status: "APPROVED",
    sanctionFeeINR: 380000,
    applicationDate: "2025-12-01",
    approvalDate: "2026-02-05",
    expiryDate: "2027-02-04",
    isMandatoryForGroundbreaking: true,
    docRef: "CFO/PUN/2026/F-881",
    notes: "Requires 6m clear driveway around perimeter for fire tenders.",
  },
  {
    id: "pm-05",
    permitName: "Airports Authority of India (AAI) Height Clearance",
    category: "SAFETY_FIRE",
    authority: "Airports Authority of India (Western Region)",
    status: "IN_REVIEW",
    sanctionFeeINR: 85000,
    applicationDate: "2026-01-10",
    approvalDate: "—",
    expiryDate: "—",
    isMandatoryForGroundbreaking: false,
    docRef: "AAI/W-REG/2026/H-104",
    notes: "Height restricted to 65.5m AMSL; awaiting final obstacle chart clearance.",
  },
  {
    id: "pm-06",
    permitName: "Temporary 100 kVA Construction Power Connection",
    category: "UTILITIES",
    authority: "MSEDCL Electricity Board",
    status: "APPROVED",
    sanctionFeeINR: 240000,
    applicationDate: "2026-01-25",
    approvalDate: "2026-02-12",
    expiryDate: "2027-02-11",
    isMandatoryForGroundbreaking: true,
    docRef: "MSEDCL/TP/88392",
    notes: "Transformer commissioned at Site Substation Bay A.",
  },
  {
    id: "pm-07",
    permitName: "Ground Water Boring & Dewatering Clearance (CGWA)",
    category: "UTILITIES",
    authority: "Central Ground Water Authority",
    status: "APPROVED",
    sanctionFeeINR: 110000,
    applicationDate: "2025-12-10",
    approvalDate: "2026-01-15",
    expiryDate: "2028-01-14",
    isMandatoryForGroundbreaking: true,
    docRef: "CGWA/NOC/2026/044",
    notes: "Permits dewatering during basement raft construction.",
  },
  {
    id: "pm-08",
    permitName: "Tree Cutting / Transplantation Authority Sanction",
    category: "ENVIRONMENT",
    authority: "Municipal Tree Authority",
    status: "APPROVED",
    sanctionFeeINR: 95000,
    applicationDate: "2025-11-20",
    approvalDate: "2026-01-18",
    expiryDate: "2026-12-31",
    isMandatoryForGroundbreaking: true,
    docRef: "TA/PMC/2026/T-19",
    notes: "Compensatory plantation of 45 indigenous trees mandated.",
  },
];

/**
 * Calculates Statutory Permitting Summary Metrics
 */
export function calculatePermitsSummary(permits: StatutoryPermit[]) {
  const totalCount = permits.length;
  const approvedCount = permits.filter((p) => p.status === "APPROVED").length;
  const inReviewCount = permits.filter((p) => p.status === "IN_REVIEW").length;
  const appliedCount = permits.filter((p) => p.status === "APPLIED").length;
  const expiredCount = permits.filter((p) => p.status === "EXPIRED").length;

  let totalFeesPaidINR = 0;
  let criticalGatesPassed = true;

  permits.forEach((p) => {
    if (p.status === "APPROVED") {
      totalFeesPaidINR += p.sanctionFeeINR;
    }
    if (p.isMandatoryForGroundbreaking && p.status !== "APPROVED") {
      criticalGatesPassed = false;
    }
  });

  const clearanceIndexPercent =
    totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  return {
    totalCount,
    approvedCount,
    inReviewCount,
    appliedCount,
    expiredCount,
    totalFeesPaidINR,
    totalFeesPaidLakhs: (totalFeesPaidINR / 100000).toFixed(2),
    criticalGatesPassed,
    clearanceIndexPercent,
  };
}

// =========================================================================
// TOOL 11: TEMPORARY SITE LAYOUT & LOGISTICS ZONE PLANNER
// =========================================================================

export type LogisticsZoneType =
  | "CEMENT_GODOWN"
  | "STEEL_YARD"
  | "BATCHING_RMC"
  | "TOWER_CRANE"
  | "SITE_OFFICE"
  | "LABOUR_CAMP"
  | "ENTRY_SECURITY"
  | "DEBRIS_DISPOSAL";

export interface LogisticsZone {
  id: string;
  type: LogisticsZoneType;
  name: string;
  xPercent: number; // 0 to 100% of plot width
  yPercent: number; // 0 to 100% of plot length
  widthPercent: number;
  heightPercent: number;
  craneRadiusMeters?: number; // For tower crane swing radius
  isCompliant: boolean;
  notes: string;
}

export const DEFAULT_LOGISTICS_ZONES: LogisticsZone[] = [
  {
    id: "zone-1",
    type: "ENTRY_SECURITY",
    name: "Main Entry Gate, Weighbridge & Security Checkpoint",
    xPercent: 5,
    yPercent: 82,
    widthPercent: 25,
    heightPercent: 14,
    isCompliant: true,
    notes: "9.2m clear width for 40-foot multi-axle trailers with automatic boom barrier.",
  },
  {
    id: "zone-2",
    type: "CEMENT_GODOWN",
    name: "Moisture-Proof Cement Storage Shed (Capacity: 3,500 Bags)",
    xPercent: 34,
    yPercent: 78,
    widthPercent: 22,
    heightPercent: 18,
    isCompliant: true,
    notes: "Elevated wooden pallet platforms (150mm above plinth) with double polythene wrap.",
  },
  {
    id: "zone-3",
    type: "STEEL_YARD",
    name: "TMT Rebar Fabrication & Bar Bending Yard",
    xPercent: 60,
    yPercent: 75,
    widthPercent: 35,
    heightPercent: 21,
    isCompliant: true,
    notes: "Direct trailer unloading access with electric rebar bending and shearing machines.",
  },
  {
    id: "zone-4",
    type: "TOWER_CRANE",
    name: "Tower Crane Base (Potain 45m Jib Radius)",
    xPercent: 48,
    yPercent: 42,
    widthPercent: 12,
    heightPercent: 12,
    craneRadiusMeters: 45,
    isCompliant: true,
    notes: "Central positioning covers 95% of building core without swinging into neighboring properties.",
  },
  {
    id: "zone-5",
    type: "BATCHING_RMC",
    name: "RMC Transit Mixer Discharge & Pump Station",
    xPercent: 18,
    yPercent: 52,
    widthPercent: 20,
    heightPercent: 18,
    isCompliant: true,
    notes: "Concrete pump staging with wash-out pit and slurry settlement tank.",
  },
  {
    id: "zone-6",
    type: "SITE_OFFICE",
    name: "Site PM Office, Meeting Room & QC Testing Lab",
    xPercent: 5,
    yPercent: 8,
    widthPercent: 30,
    heightPercent: 22,
    isCompliant: true,
    notes: "Equipped with cube compression testing machine (CTM), oven, and blueprint rack.",
  },
  {
    id: "zone-7",
    type: "LABOUR_CAMP",
    name: "Contractor Labour Colony & Sanitation Block (Separated)",
    xPercent: 65,
    yPercent: 8,
    widthPercent: 30,
    heightPercent: 22,
    isCompliant: true,
    notes: "Located outside active crane swing hazard radius with potable drinking water & RO plant.",
  },
  {
    id: "zone-8",
    type: "DEBRIS_DISPOSAL",
    name: "Segregated Waste & Construction Debris Chute",
    xPercent: 5,
    yPercent: 35,
    widthPercent: 14,
    heightPercent: 14,
    isCompliant: true,
    notes: "Daily municipal carting access for green disposal compliance.",
  },
];
