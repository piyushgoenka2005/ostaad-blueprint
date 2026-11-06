/**
 * Ostaad ERP - Site Operations, Godown & Stock Ledger (Module 7)
 * Sub-Module 7.1: Multi-Godown / Site Warehouse Management
 * Sub-Module 7.2: Goods Receipt Note (GRN) Inward with Transporter Vehicle Log
 * Sub-Module 7.3: Burst, Damaged & Rejected Material Accounting (+5% Tolerance)
 * Sub-Module 7.4: Double-Entry Immutable Stock Ledger (Inward, Issue, Transfer)
 * Sub-Module 7.5: Contractor Material Indent, Issue Slips & Wastage Tracking
 */

// =========================================================================
// SUB-MODULE 7.1: MULTI-GODOWN / SITE STORAGE LOCATIONS
// =========================================================================

export interface GodownStorageLocation {
  id: string;
  godownCode: string; // e.g. "GODOWN-CEM-01"
  name: string;
  category: "CEMENT_SHED" | "REBAR_YARD" | "AGGREGATE_BINS" | "AAC_BLOCK_YARD" | "MEP_FITTING_GODOWN";
  projectCode: string;
  projectName: string;
  physicalLocation: string; // e.g. "Gate 2 East Flank, Commercial Complex Tower B"
  maxCapacityQuantity: number;
  capacityUOM: string;
  currentStockQuantity: number;
  utilizationPercent: number;
  storekeeperName: string;
  storekeeperPhone: string;
  status: "ACTIVE" | "MAINTENANCE" | "FULL";
}

export const DEFAULT_GODOWNS: GodownStorageLocation[] = [
  {
    id: "gdn-01",
    godownCode: "GDN-CEM-01",
    name: "Central Waterproof Cement Shed",
    category: "CEMENT_SHED",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    physicalLocation: "Tower B Plot Flank, Raised Plinth 300mm above ground",
    maxCapacityQuantity: 5000,
    capacityUOM: "50kg Bags",
    currentStockQuantity: 1820,
    utilizationPercent: 36.4,
    storekeeperName: "Mahesh Patil (Storekeeper)",
    storekeeperPhone: "+91 98221 44021",
    status: "ACTIVE",
  },
  {
    id: "gdn-02",
    godownCode: "GDN-STL-02",
    name: "Primary Rebar Fabrication & Bending Yard",
    category: "REBAR_YARD",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    physicalLocation: "North Gate 2 Laydown Area (Adjacent to 50T Mobile Crane)",
    maxCapacityQuantity: 150,
    capacityUOM: "MT",
    currentStockQuantity: 42.5,
    utilizationPercent: 28.3,
    storekeeperName: "Mahesh Patil (Storekeeper)",
    storekeeperPhone: "+91 98221 44021",
    status: "ACTIVE",
  },
  {
    id: "gdn-03",
    godownCode: "GDN-AGG-03",
    name: "Granular Aggregate Storage Bins",
    category: "AGGREGATE_BINS",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    physicalLocation: "Concrete Batching Plant Radius (South Perimeter)",
    maxCapacityQuantity: 800,
    capacityUOM: "cum",
    currentStockQuantity: 310,
    utilizationPercent: 38.8,
    storekeeperName: "Suresh Chavan (Assistant Storekeeper)",
    storekeeperPhone: "+91 97650 11982",
    status: "ACTIVE",
  },
  {
    id: "gdn-04",
    godownCode: "GDN-AAC-04",
    name: "AAC Lightweight Block Stacking Yard",
    category: "AAC_BLOCK_YARD",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    physicalLocation: "Ground Floor Stilt Logistics Corridor",
    maxCapacityQuantity: 15000,
    capacityUOM: "Blocks",
    currentStockQuantity: 5400,
    utilizationPercent: 36.0,
    storekeeperName: "Suresh Chavan (Assistant Storekeeper)",
    storekeeperPhone: "+91 97650 11982",
    status: "ACTIVE",
  },
];

// =========================================================================
// SUB-MODULE 7.2 & 7.3: GOODS RECEIPT NOTE (GRN) & TOLERANCE GUARDRAIL
// =========================================================================

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string; // e.g. "GRN-2026-0042"
  poNumber: string;
  targetGodownId: string;
  targetGodownName: string;
  vendorName: string;
  materialName: string;
  standardUOM: string;
  grossDeliveredQuantity: number;
  damagedRejectedQuantity: number;
  netAcceptedQuantity: number;
  toleranceAllowedCapQuantity: number; // PO Qty * 1.05 (+5% max tolerance)
  isOverToleranceRejected: boolean;
  transporterName: string;
  vehicleTruckNumber: string; // e.g. "MH-12-RN-8821"
  challanNumber: string; // e.g. "CHAL-UTC-9918"
  challanPhotoUrl: string; // Cloudflare R2 object link
  weighbridgeGrossWeightKg: number;
  weighbridgeTareWeightKg: number;
  weighbridgeNetWeightKg: number;
  securitySealsStatus: "SEALS_INTACT_VERIFIED" | "SEALS_BROKEN_DISAPPROVED";
  storekeeperId: string;
  storekeeperName: string;
  inwardDate: string;
  inwardTime: string;
  gateNotes: string;
}

export const DEFAULT_GRN_LOGS: GoodsReceiptNote[] = [
  {
    id: "grn-01",
    grnNumber: "GRN-2026-0042",
    poNumber: "PO-2026-PUN-0101",
    targetGodownId: "gdn-01",
    targetGodownName: "Central Waterproof Cement Shed",
    vendorName: "UltraTech Cement Limited",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    standardUOM: "50kg Bags",
    grossDeliveredQuantity: 700,
    damagedRejectedQuantity: 12, // 12 burst bags in transit
    netAcceptedQuantity: 688,
    toleranceAllowedCapQuantity: 735, // 700 * 1.05 (+5%)
    isOverToleranceRejected: false,
    transporterName: "Mahalaxmi Logistics Carriers",
    vehicleTruckNumber: "MH-12-RN-8821",
    challanNumber: "CHAL-UTC-9918",
    challanPhotoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
    weighbridgeGrossWeightKg: 49800,
    weighbridgeTareWeightKg: 14800,
    weighbridgeNetWeightKg: 35000,
    securitySealsStatus: "SEALS_INTACT_VERIFIED",
    storekeeperId: "user-store-01",
    storekeeperName: "Mahesh Patil (Storekeeper)",
    inwardDate: "2026-03-01",
    inwardTime: "09:45 AM",
    gateNotes: "Gross 700 bags received. 12 torn bags rejected at tailboard; net 688 bags stacked on timber pallets.",
  },
  {
    id: "grn-02",
    grnNumber: "GRN-2026-0043",
    poNumber: "PO-2026-PUN-0102",
    targetGodownId: "gdn-03",
    targetGodownName: "Granular Aggregate Storage Bins",
    vendorName: "Sahyadri Natural Aggregates & M-Sand Infra",
    materialName: "Manufactured Sand (M-Sand Zone II)",
    standardUOM: "cum",
    grossDeliveredQuantity: 300,
    damagedRejectedQuantity: 10, // 10 cum moisture tare docking
    netAcceptedQuantity: 290,
    toleranceAllowedCapQuantity: 315, // 300 * 1.05
    isOverToleranceRejected: false,
    transporterName: "Sahyadri Fleet Tippers",
    vehicleTruckNumber: "MH-14-CW-4409",
    challanNumber: "CHAL-SND-4412",
    challanPhotoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
    weighbridgeGrossWeightKg: 52000,
    weighbridgeTareWeightKg: 16000,
    weighbridgeNetWeightKg: 36000,
    securitySealsStatus: "SEALS_INTACT_VERIFIED",
    storekeeperId: "user-store-01",
    storekeeperName: "Mahesh Patil (Storekeeper)",
    inwardDate: "2026-03-02",
    inwardTime: "11:15 AM",
    gateNotes: "Weighed at Site Weighbridge. Excess 10 cum moisture tare deducted after dip test.",
  },
];

// =========================================================================
// SUB-MODULE 7.4: DOUBLE-ENTRY IMMUTABLE STOCK LEDGER
// =========================================================================

export type StockMovementType =
  | "INWARD_GRN"
  | "ISSUE_TO_CONTRACTOR"
  | "TRANSFER_BETWEEN_GODOWNS"
  | "DAMAGE_WRITEOFF";

export interface StockLedgerEntry {
  id: string;
  timestamp: string;
  movementType: StockMovementType;
  materialName: string;
  godownName: string;
  quantityIn: number;
  quantityOut: number;
  balanceQuantityAfter: number;
  standardUOM: string;
  referenceDocNumber: string; // GRN Number or Issue Slip Number
  recipientOrTransporter: string;
  operatorStorekeeper: string;
}

export const DEFAULT_STOCK_LEDGER: StockLedgerEntry[] = [
  {
    id: "stk-01",
    timestamp: "2026-03-01 10:15 AM",
    movementType: "INWARD_GRN",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    godownName: "Central Waterproof Cement Shed",
    quantityIn: 688,
    quantityOut: 0,
    balanceQuantityAfter: 1820,
    standardUOM: "50kg Bags",
    referenceDocNumber: "GRN-2026-0042",
    recipientOrTransporter: "Mahalaxmi Logistics (Truck MH-12-RN-8821)",
    operatorStorekeeper: "Mahesh Patil (Storekeeper)",
  },
  {
    id: "stk-02",
    timestamp: "2026-03-01 02:30 PM",
    movementType: "ISSUE_TO_CONTRACTOR",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    godownName: "Central Waterproof Cement Shed",
    quantityIn: 0,
    quantityOut: 200,
    balanceQuantityAfter: 1620,
    standardUOM: "50kg Bags",
    referenceDocNumber: "ISS-2026-0021",
    recipientOrTransporter: "L&T Civil Team (Tower B Column Pour)",
    operatorStorekeeper: "Mahesh Patil (Storekeeper)",
  },
  {
    id: "stk-03",
    timestamp: "2026-03-02 11:45 AM",
    movementType: "INWARD_GRN",
    materialName: "Manufactured Sand (M-Sand Zone II)",
    godownName: "Granular Aggregate Storage Bins",
    quantityIn: 290,
    quantityOut: 0,
    balanceQuantityAfter: 310,
    standardUOM: "cum",
    referenceDocNumber: "GRN-2026-0043",
    recipientOrTransporter: "Sahyadri Fleet (Truck MH-14-CW-4409)",
    operatorStorekeeper: "Mahesh Patil (Storekeeper)",
  },
];

// =========================================================================
// SUB-MODULE 7.5: CONTRACTOR MATERIAL INDENTS & THEORETICAL WASTAGE TRACKER
// =========================================================================

export interface MaterialIndentIssueSlip {
  id: string;
  indentNumber: string; // e.g. "IND-2026-0021"
  issueSlipNumber: string; // e.g. "ISS-2026-0021"
  date: string;
  requestingEngineer: string;
  contractorName: string;
  workAreaLocation: string; // e.g. "Tower B — Level 3 Shear Wall Concreting"
  materialName: string;
  standardUOM: string;
  requestedQuantity: number;
  issuedQuantity: number;
  theoreticalBOQConsumption: number; // Empirical IS 456 calculation
  varianceWastagePercent: number; // ((Issued - Theoretical) / Theoretical) * 100
  wastageStatus: "NORMAL_WITHIN_TOLERANCE" | "ABNORMAL_SCRAP_WARNING";
  storekeeperSignOff: string;
  engineerSignOff: string;
}

export const DEFAULT_MATERIAL_INDENTS: MaterialIndentIssueSlip[] = [
  {
    id: "ind-01",
    indentNumber: "IND-2026-0021",
    issueSlipNumber: "ISS-2026-0021",
    date: "2026-03-01",
    requestingEngineer: "Vikram Kulkarni (Lead Resident Engineer)",
    contractorName: "L&T Construction Consortium Ltd.",
    workAreaLocation: "Tower B — Level 3 Shear Wall Concreting (Grid C-F)",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    standardUOM: "50kg Bags",
    requestedQuantity: 200,
    issuedQuantity: 200,
    theoreticalBOQConsumption: 196.8, // 24 cum M35 * 8.2 bags
    varianceWastagePercent: 1.6, // +1.6% within CPWD 2% allowance
    wastageStatus: "NORMAL_WITHIN_TOLERANCE",
    storekeeperSignOff: "Mahesh Patil",
    engineerSignOff: "Vikram Kulkarni",
  },
  {
    id: "ind-02",
    indentNumber: "IND-2026-0022",
    issueSlipNumber: "ISS-2026-0022",
    date: "2026-03-02",
    requestingEngineer: "Vikram Kulkarni (Lead Resident Engineer)",
    contractorName: "L&T Construction Consortium Ltd.",
    workAreaLocation: "Tower B — Foundation Retaining Wall Rebar Tying",
    materialName: "TMT Fe 550D Rebar (16mm & 20mm)",
    standardUOM: "MT",
    requestedQuantity: 12.5,
    issuedQuantity: 12.5,
    theoreticalBOQConsumption: 11.8,
    varianceWastagePercent: 5.9, // +5.9% > 3.5% threshold!
    wastageStatus: "ABNORMAL_SCRAP_WARNING",
    storekeeperSignOff: "Mahesh Patil",
    engineerSignOff: "Vikram Kulkarni",
  },
];
