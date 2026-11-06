/**
 * Ostaad ERP - Project Management & Lifecycle Monitoring (Module 3)
 * Sub-Module 3.1: Project Setup, Geolocation & Member Assignment
 * Sub-Module 3.2: Milestone Tracking & Work Breakdown Structure (WBS Level-1 to Level-4)
 * Sub-Module 3.3: Project Document Vault & Drawing Sheets Versioning (GFC Stamping)
 * Sub-Module 3.4: Daily Site Progress & Activity Log (DPR, Headcount, Machinery)
 */

// =========================================================================
// SUB-MODULE 3.1: PROJECT SETUP, GEOLOCATION & MEMBER ASSIGNMENT
// =========================================================================

export type ProjectCategory = "COMMERCIAL" | "RESIDENTIAL" | "INDUSTRIAL" | "INFRASTRUCTURE";
export type ProjectStage = "PLANNING" | "MOBILIZING" | "ACTIVE_EXECUTION" | "COMMISSIONING" | "HANDED_OVER";

export interface ProjectMaster {
  id: string;
  projectCode: string;
  name: string;
  category: ProjectCategory;
  stage: ProjectStage;
  clientName: string;
  siteAddress: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  plotAreaSqFt: number;
  totalBUASqFt: number;
  numberOfFloors: number;
  commencementDate: string;
  targetCompletionDate: string;
  approvedCapexINR: number;
}

export type StaffRole =
  | "PROJECT_MANAGER"
  | "LEAD_RESIDENT_ENGINEER"
  | "SITE_ENGINEER"
  | "QUALITY_CONTROL_LEAD"
  | "SAFETY_OFFICER"
  | "FINANCE_APPROVER"
  | "STORE_MANAGER";

export interface ProjectStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  assignedDate: string;
  department: string;
  accessLevel: "ADMIN" | "WRITE" | "READ";
  avatarInitials: string;
}

export const DEFAULT_PROJECT_MASTER: ProjectMaster = {
  id: "proj-101",
  projectCode: "PRJ-PUN-2026-TWR-B",
  name: "Commercial Complex — Tower B",
  category: "COMMERCIAL",
  stage: "ACTIVE_EXECUTION",
  clientName: "Godrej Urban Properties Consortium Ltd.",
  siteAddress: "Plot No. 42/B, Off North Main Road, Kalyani Nagar",
  city: "Pune",
  state: "Maharashtra",
  latitude: 18.5481,
  longitude: 73.9038,
  plotAreaSqFt: 45000,
  totalBUASqFt: 75000,
  numberOfFloors: 13, // 2B + G + 10
  commencementDate: "2026-01-15",
  targetCompletionDate: "2027-06-30",
  approvedCapexINR: 225000000, // ₹22.50 Cr
};

export const DEFAULT_PROJECT_STAFF: ProjectStaffMember[] = [
  {
    id: "stf-01",
    name: "Rajesh Sharma",
    email: "rajesh.sharma@ostaad-erp.com",
    phone: "+91 98230 44812",
    role: "PROJECT_MANAGER",
    assignedDate: "2026-01-02",
    department: "Project Directorate",
    accessLevel: "ADMIN",
    avatarInitials: "RS",
  },
  {
    id: "stf-02",
    name: "Vikram Kulkarni",
    email: "vikram.k@ostaad-erp.com",
    phone: "+91 98811 20455",
    role: "LEAD_RESIDENT_ENGINEER",
    assignedDate: "2026-01-05",
    department: "Civil & Structural",
    accessLevel: "WRITE",
    avatarInitials: "VK",
  },
  {
    id: "stf-03",
    name: "Amit Deshmukh",
    email: "amit.deshmukh@ostaad-erp.com",
    phone: "+91 94220 33819",
    role: "SITE_ENGINEER",
    assignedDate: "2026-01-10",
    department: "Site Operations",
    accessLevel: "WRITE",
    avatarInitials: "AD",
  },
  {
    id: "stf-04",
    name: "Pooja Hegde",
    email: "pooja.hegde@ostaad-erp.com",
    phone: "+91 99201 88472",
    role: "QUALITY_CONTROL_LEAD",
    assignedDate: "2026-01-12",
    department: "Quality Assurance",
    accessLevel: "WRITE",
    avatarInitials: "PH",
  },
  {
    id: "stf-05",
    name: "Sanjay Verma",
    email: "sanjay.verma@ostaad-erp.com",
    phone: "+91 97654 32109",
    role: "SAFETY_OFFICER",
    assignedDate: "2026-01-15",
    department: "EHS & Safety",
    accessLevel: "WRITE",
    avatarInitials: "SV",
  },
  {
    id: "stf-06",
    name: "Sunil Mehta",
    email: "sunil.mehta@ostaad-erp.com",
    phone: "+91 98222 11984",
    role: "FINANCE_APPROVER",
    assignedDate: "2026-01-05",
    department: "Commercial & Finance",
    accessLevel: "ADMIN",
    avatarInitials: "SM",
  },
];

// =========================================================================
// SUB-MODULE 3.2: MILESTONE TRACKING & WORK BREAKDOWN STRUCTURE (WBS)
// =========================================================================

export type WBSLevel = 1 | 2 | 3 | 4;
export type WBSStatus = "COMPLETED" | "IN_PROGRESS" | "DELAYED" | "NOT_STARTED";

export interface WBSNode {
  id: string;
  wbsCode: string;
  title: string;
  level: WBSLevel;
  parentCode?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualEndDate?: string;
  weightPercent: number; // Contribution to total project
  progressPercent: number;
  status: WBSStatus;
  delayDays: number;
  isMilestone: boolean;
}

export const DEFAULT_WBS_TREE: WBSNode[] = [
  // LEVEL 1: PHASES
  {
    id: "wbs-1",
    wbsCode: "1.0",
    title: "Phase 1: Pre-Construction & Substructure Execution",
    level: 1,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-05-30",
    weightPercent: 30,
    progressPercent: 72,
    status: "IN_PROGRESS",
    delayDays: 0,
    isMilestone: false,
  },
  // LEVEL 2: PACKAGES
  {
    id: "wbs-1-1",
    wbsCode: "1.1",
    parentCode: "1.0",
    title: "1.1 Bulk Excavation & Piling Retaining Wall",
    level: 2,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-03-10",
    actualEndDate: "2026-03-08",
    weightPercent: 12,
    progressPercent: 100,
    status: "COMPLETED",
    delayDays: -2,
    isMilestone: false,
  },
  // LEVEL 3: WORK ITEMS
  {
    id: "wbs-1-1-1",
    wbsCode: "1.1.1",
    parentCode: "1.1",
    title: "1.1.1 Earthwork Carting & Shoring Pile Drilling",
    level: 3,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-02-28",
    weightPercent: 8,
    progressPercent: 100,
    status: "COMPLETED",
    delayDays: 0,
    isMilestone: false,
  },
  // LEVEL 4: EXECUTION ACTIVITIES
  {
    id: "wbs-1-1-1-a",
    wbsCode: "1.1.1.a",
    parentCode: "1.1.1",
    title: "1.1.1.a Confirmatory SBC Plate Load Testing",
    level: 4,
    plannedStartDate: "2026-01-15",
    plannedEndDate: "2026-01-22",
    weightPercent: 4,
    progressPercent: 100,
    status: "COMPLETED",
    delayDays: 0,
    isMilestone: true,
  },
  {
    id: "wbs-1-2",
    wbsCode: "1.2",
    parentCode: "1.0",
    title: "1.2 Foundation Raft & Basement Slabs (M30/M35)",
    level: 2,
    plannedStartDate: "2026-03-01",
    plannedEndDate: "2026-05-30",
    weightPercent: 18,
    progressPercent: 55,
    status: "IN_PROGRESS",
    delayDays: 4,
    isMilestone: false,
  },
  {
    id: "wbs-1-2-1",
    wbsCode: "1.2.1",
    parentCode: "1.2",
    title: "1.2.1 Bottom Mat Reinforcement (Fe 550D TMT)",
    level: 3,
    plannedStartDate: "2026-03-01",
    plannedEndDate: "2026-03-25",
    weightPercent: 10,
    progressPercent: 90,
    status: "IN_PROGRESS",
    delayDays: 0,
    isMilestone: false,
  },
  {
    id: "wbs-1-2-2",
    wbsCode: "1.2.2",
    parentCode: "1.2",
    title: "1.2.2 Milestone: Substructure Plinth Level Reached",
    level: 3,
    plannedStartDate: "2026-05-30",
    plannedEndDate: "2026-05-30",
    weightPercent: 8,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: true,
  },

  // LEVEL 1: SUPERSTRUCTURE
  {
    id: "wbs-2",
    wbsCode: "2.0",
    title: "Phase 2: Superstructure RCC Core & Monolithic Slabs",
    level: 1,
    plannedStartDate: "2026-06-01",
    plannedEndDate: "2026-12-15",
    weightPercent: 40,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: false,
  },
  {
    id: "wbs-2-1",
    wbsCode: "2.1",
    parentCode: "2.0",
    title: "2.1 Typical Floor Casting (Ground to 10th Floor)",
    level: 2,
    plannedStartDate: "2026-06-01",
    plannedEndDate: "2026-11-15",
    weightPercent: 30,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: false,
  },
  {
    id: "wbs-2-2",
    wbsCode: "2.2",
    parentCode: "2.0",
    title: "2.2 Milestone: Structural Slab Topping Out",
    level: 2,
    plannedStartDate: "2026-12-15",
    plannedEndDate: "2026-12-15",
    weightPercent: 10,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: true,
  },

  // LEVEL 1: FINISHING & HANDOVER
  {
    id: "wbs-3",
    wbsCode: "3.0",
    title: "Phase 3: MEP Rough-Ins, Architectural Finishes & OC",
    level: 1,
    plannedStartDate: "2026-10-01",
    plannedEndDate: "2027-06-30",
    weightPercent: 30,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: false,
  },
  {
    id: "wbs-3-1",
    wbsCode: "3.1",
    parentCode: "3.0",
    title: "3.1 Milestone: Occupancy Certificate (OC) & Final Handover",
    level: 2,
    plannedStartDate: "2027-06-30",
    plannedEndDate: "2027-06-30",
    weightPercent: 10,
    progressPercent: 0,
    status: "NOT_STARTED",
    delayDays: 0,
    isMilestone: true,
  },
];

// =========================================================================
// SUB-MODULE 3.3: PROJECT DOCUMENT VAULT & DRAWING REVISION (GFC STAMP)
// =========================================================================

export type DrawingDiscipline = "ARCHITECTURAL" | "STRUCTURAL" | "MEP_SERVICES" | "LANDSCAPE";

export interface DrawingRevision {
  revision: string; // e.g. "Rev-0", "Rev-1", "Rev-2"
  releaseDate: string;
  changeDescription: string;
  approver: string;
}

export interface DrawingSheet {
  id: string;
  drawingNumber: string;
  title: string;
  discipline: DrawingDiscipline;
  currentRevision: string;
  isGFC: boolean; // Good For Construction Stamp
  gfcApprovalDate?: string;
  gfcApprover?: string;
  sheetSize: "A0" | "A1" | "A2";
  scale: string;
  revisions: DrawingRevision[];
  fileKey: string;
}

export const DEFAULT_GFC_DRAWINGS: DrawingSheet[] = [
  {
    id: "drg-01",
    drawingNumber: "STR-FDN-001",
    title: "Raft Foundation Layout, Column Pedestals & Grid Coordinates",
    discipline: "STRUCTURAL",
    currentRevision: "Rev-1",
    isGFC: true,
    gfcApprovalDate: "2026-01-20",
    gfcApprover: "Chief Structural Peer Review Consultant",
    sheetSize: "A0",
    scale: "1:100",
    fileKey: "drawings/structural/STR-FDN-001_Rev1.pdf",
    revisions: [
      {
        revision: "Rev-0",
        releaseDate: "2025-12-10",
        changeDescription: "Initial Tender Issue",
        approver: "Lead Structural Engineer",
      },
      {
        revision: "Rev-1",
        releaseDate: "2026-01-20",
        changeDescription: "Updated for confirmatory SBC 220 kN/m² and thickened lift pit edge.",
        approver: "Chief Structural Consultant",
      },
    ],
  },
  {
    id: "drg-02",
    drawingNumber: "ARC-FLR-002",
    title: "Ground Floor Architectural Plan & Entry Ramp Circulation",
    discipline: "ARCHITECTURAL",
    currentRevision: "Rev-2",
    isGFC: true,
    gfcApprovalDate: "2026-02-01",
    gfcApprover: "Principal Architect",
    sheetSize: "A0",
    scale: "1:100",
    fileKey: "drawings/architectural/ARC-FLR-002_Rev2.pdf",
    revisions: [
      {
        revision: "Rev-0",
        releaseDate: "2025-11-20",
        changeDescription: "Initial Concept",
        approver: "Architect",
      },
      {
        revision: "Rev-1",
        releaseDate: "2026-01-05",
        changeDescription: "Fire tender driveway widened to 6m.",
        approver: "Principal Architect",
      },
      {
        revision: "Rev-2",
        releaseDate: "2026-02-01",
        changeDescription: "Revised security cabin and boom barrier alignment.",
        approver: "Principal Architect",
      },
    ],
  },
  {
    id: "drg-03",
    drawingNumber: "MEP-PLB-003",
    title: "Basement Drainage, Dewatering Sump Pit & Stormwater Piping",
    discipline: "MEP_SERVICES",
    currentRevision: "Rev-0",
    isGFC: true,
    gfcApprovalDate: "2026-01-25",
    gfcApprover: "MEP Project Director",
    sheetSize: "A1",
    scale: "1:50",
    fileKey: "drawings/mep/MEP-PLB-003_Rev0.pdf",
    revisions: [
      {
        revision: "Rev-0",
        releaseDate: "2026-01-25",
        changeDescription: "Approved for construction as per municipal stormwater norms.",
        approver: "MEP Director",
      },
    ],
  },
  {
    id: "drg-04",
    drawingNumber: "STR-COL-004",
    title: "Column Schedule & Heavy Ductile Shear Wall Reinforcement",
    discipline: "STRUCTURAL",
    currentRevision: "Rev-1",
    isGFC: true,
    gfcApprovalDate: "2026-02-10",
    gfcApprover: "Chief Structural Consultant",
    sheetSize: "A0",
    scale: "1:25",
    fileKey: "drawings/structural/STR-COL-004_Rev1.pdf",
    revisions: [
      {
        revision: "Rev-0",
        releaseDate: "2026-01-10",
        changeDescription: "Baseline Design",
        approver: "Design Engineer",
      },
      {
        revision: "Rev-1",
        releaseDate: "2026-02-10",
        changeDescription: "IS 13920 seismic confinement rebar link details added.",
        approver: "Chief Structural Consultant",
      },
    ],
  },
];

// =========================================================================
// SUB-MODULE 3.4: DAILY SITE PROGRESS & ACTIVITY LOG (DPR)
// =========================================================================

export type WeatherType = "SUNNY" | "OVERCAST" | "RAINY" | "EXTREME_HEAT";

export interface TradeLabourCount {
  trade: string;
  count: number;
}

export interface MachineryDeployment {
  machine: string;
  count: number;
  hoursOperated: number;
  status: "ACTIVE" | "IDLE" | "BREAKDOWN";
}

export interface DailyProgressReport {
  id: string;
  reportDate: string;
  reportNumber: string;
  weather: WeatherType;
  temperatureC: number;
  shiftHours: number;
  labourCounts: TradeLabourCount[];
  totalWorkforce: number;
  machineryLogs: MachineryDeployment[];
  completedActivities: string[];
  plannedForTomorrow: string[];
  hindrances: string[];
  safetyIncidents: number;
  preparedBy: string;
  reviewedBy: string;
}

export const DEFAULT_DPR_LOGS: DailyProgressReport[] = [
  {
    id: "dpr-20260305",
    reportDate: "2026-03-05",
    reportNumber: "DPR-TWR-B-051",
    weather: "SUNNY",
    temperatureC: 32,
    shiftHours: 10,
    labourCounts: [
      { trade: "Bar Benders (Fe 550D)", count: 28 },
      { trade: "Carpenters / Shuttering", count: 18 },
      { trade: "Masons / Bricklayers", count: 8 },
      { trade: "Concrete Helpers", count: 24 },
      { trade: "MEP Electricians / Plumbers", count: 6 },
    ],
    totalWorkforce: 84,
    machineryLogs: [
      { machine: "Potain 45m Tower Crane", count: 1, hoursOperated: 9.5, status: "ACTIVE" },
      { machine: "Schwing Stetter RMC Pump Line", count: 1, hoursOperated: 6.0, status: "ACTIVE" },
      { machine: "Tata Hitachi EX200 Excavator", count: 1, hoursOperated: 7.0, status: "ACTIVE" },
      { machine: "125 kVA Silent DG Set", count: 1, hoursOperated: 2.5, status: "ACTIVE" },
    ],
    completedActivities: [
      "Completed bottom mat rebar binding for Bay C raft foundation (45 MT Fe 550D placed).",
      "Poured 120 cum of design mix M35 concrete with retarder admixture in footing strip F3.",
      "Completed PVC conduit piping for ground floor MEP distribution trunking.",
    ],
    plannedForTomorrow: [
      "Casting of Bay D raft concrete starting 07:00 AM.",
      "Fixing starter column rebars and dowels for Grid A1–A8.",
      "Slump and cube sampling for IS 456 28-day testing.",
    ],
    hindrances: [
      "Transit mixer delay of 45 mins due to municipal road traffic congestion on North Main Road.",
    ],
    safetyIncidents: 0,
    preparedBy: "Amit Deshmukh (Site Engineer)",
    reviewedBy: "Vikram Kulkarni (Lead Resident Engineer)",
  },
];
