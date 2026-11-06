/**
 * Ostaad ERP - Commercial Gatekeeping, Finance & Accounts (Module 6)
 * Sub-Module 6.1: Project Budget Allocation & Over-Budget Guardrails
 * Sub-Module 6.2: Dual-Control PO Approval & Clarification Workflow
 * Sub-Module 6.3: Authorised Purchase Order (PO) Generation & PDF Dispatch
 * Sub-Module 6.4: Staged Payments, Advances & Bank Transaction Ledger
 * Sub-Module 6.5: 3-Way Invoice Reconciliation (PO vs. GRN vs. Vendor Invoice)
 * Sub-Module 6.6: Final Commercial Settlement & Retention Release
 */

// =========================================================================
// SUB-MODULE 6.1: PROJECT BUDGET POOLS & OVER-BUDGET GUARDRAILS
// =========================================================================

export interface DepartmentBudgetPool {
  costCode: string; // e.g. "CC-01-RCC"
  packageName: string;
  category: "CIVIL_STRUCTURE" | "STEEL_REINFORCEMENT" | "SAND_AGGREGATES" | "MASONRY_FINISHES" | "MEP_SERVICES";
  approvedBudgetINR: number;
  committedSpendINR: number; // Approved POs
  pendingSpendINR: number; // Awaiting Finance approval
  actualSettledINR: number; // Disbursed through bank
  remainingHeadroomINR: number;
  utilizationPercent: number;
  isHardStopTriggered: boolean; // Triggered if (committed + pending) > approvedBudget
}

export const DEFAULT_BUDGET_POOLS: DepartmentBudgetPool[] = [
  {
    costCode: "CC-01-RCC",
    packageName: "Civil Concrete & Ready-Mix (RMC)",
    category: "CIVIL_STRUCTURE",
    approvedBudgetINR: 14000000, // ₹1.40 Cr
    committedSpendINR: 11932500,
    pendingSpendINR: 838500,
    actualSettledINR: 6500000,
    remainingHeadroomINR: 1229000,
    utilizationPercent: 91.2,
    isHardStopTriggered: false,
  },
  {
    costCode: "CC-02-STEEL",
    packageName: "Primary Steel Rebar (TMT Fe 550D)",
    category: "STEEL_REINFORCEMENT",
    approvedBudgetINR: 22000000, // ₹2.20 Cr
    committedSpendINR: 20429635,
    pendingSpendINR: 1305000,
    actualSettledINR: 12000000,
    remainingHeadroomINR: 265365,
    utilizationPercent: 98.8,
    isHardStopTriggered: false,
  },
  {
    costCode: "CC-03-CEMENT",
    packageName: "Ordinary Portland Cement (OPC 53 Bags)",
    category: "CIVIL_STRUCTURE",
    approvedBudgetINR: 6500000, // ₹65.0 Lakhs
    committedSpendINR: 5776512,
    pendingSpendINR: 0,
    actualSettledINR: 3500000,
    remainingHeadroomINR: 723488,
    utilizationPercent: 88.9,
    isHardStopTriggered: false,
  },
  {
    costCode: "CC-04-AGG",
    packageName: "M-Sand & Coarse Aggregates",
    category: "SAND_AGGREGATES",
    approvedBudgetINR: 4500000, // ₹45.0 Lakhs
    committedSpendINR: 3850000,
    pendingSpendINR: 250000,
    actualSettledINR: 2200000,
    remainingHeadroomINR: 400000,
    utilizationPercent: 91.1,
    isHardStopTriggered: false,
  },
  {
    costCode: "CC-05-MASONRY",
    packageName: "AAC Blocks & Mortar Adhesive",
    category: "MASONRY_FINISHES",
    approvedBudgetINR: 5500000, // ₹55.0 Lakhs
    committedSpendINR: 3172400,
    pendingSpendINR: 0,
    actualSettledINR: 1800000,
    remainingHeadroomINR: 2327600,
    utilizationPercent: 57.7,
    isHardStopTriggered: false,
  },
];

// =========================================================================
// SUB-MODULE 6.2: DUAL-CONTROL PO APPROVAL INBOX
// =========================================================================

export interface PendingProcurementApproval {
  id: string;
  requisitionNumber: string; // e.g. "REQ-2026-CEM-01"
  rfqNumber: string;
  projectCode: string;
  projectName: string;
  costCode: string;
  materialName: string;
  orderedQuantity: number;
  standardUOM: string;
  recommendedVendorId: string;
  recommendedVendorName: string;
  vendorGstin: string;
  quotedLandedUnitRateINR: number;
  totalCommitmentAmountINR: number;
  budgetHeadroomBeforeINR: number;
  pmJustification: string;
  status: "PENDING_FINANCE_APPROVAL" | "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED";
  submittedBy: string;
  submittedDate: string;
  decisionNotes?: string;
  decisionDate?: string;
  financeApprover?: string;
  paymentTerms: "100_PERCENT_ADVANCE" | "PART_BY_PART" | "30_DAYS_CREDIT" | "AGAINST_GRN";
  advancePercentage: number;
}

export const DEFAULT_PENDING_APPROVALS: PendingProcurementApproval[] = [
  {
    id: "appr-01",
    requisitionNumber: "REQ-2026-CEM-01",
    rfqNumber: "RFQ-2026-CEM-001",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    costCode: "CC-03-CEMENT",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    orderedQuantity: 15350,
    standardUOM: "50kg Bags",
    recommendedVendorId: "vnd-02",
    recommendedVendorName: "Ambuja Cements Ltd (Adani Group)",
    vendorGstin: "27AABCA3421K1ZM",
    quotedLandedUnitRateINR: 376.32,
    totalCommitmentAmountINR: 5776512, // ₹57.76 Lakhs
    budgetHeadroomBeforeINR: 6500000,
    pmJustification: "L1 compliant bidder at ₹376.32/bag. Rate includes transit cartage and site unloading. Ambuja offers 15-day credit and certified fresh test batches.",
    status: "PENDING_FINANCE_APPROVAL",
    submittedBy: "Rajesh Sharma (Project Manager)",
    submittedDate: "2026-03-01",
    paymentTerms: "PART_BY_PART",
    advancePercentage: 15,
  },
  {
    id: "appr-02",
    requisitionNumber: "REQ-2026-STL-02",
    rfqNumber: "RFQ-2026-STL-002",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    costCode: "CC-02-STEEL",
    materialName: "Primary Producer TMT Fe 550D Rebar",
    orderedQuantity: 301.1,
    standardUOM: "Metric Tonnes (MT)",
    recommendedVendorId: "vnd-04",
    recommendedVendorName: "JSW Steel Neo Rebars Co.",
    vendorGstin: "27AAACJ4412H1ZD",
    quotedLandedUnitRateINR: 67850,
    totalCommitmentAmountINR: 20429635, // ₹2.04 Cr
    budgetHeadroomBeforeINR: 22000000,
    pmJustification: "L1 bidder with rate of ₹67,850/MT landed. Meets IS 1786 seismic ductile specifications. 21 days credit terms agreed.",
    status: "PENDING_FINANCE_APPROVAL",
    submittedBy: "Rajesh Sharma (Project Manager)",
    submittedDate: "2026-03-02",
    paymentTerms: "PART_BY_PART",
    advancePercentage: 20,
  },
];

// =========================================================================
// SUB-MODULE 6.3: AUTHORISED PURCHASE ORDERS (PO)
// =========================================================================

export interface AuthorisedPurchaseOrder {
  id: string;
  poNumber: string; // e.g. "PO-2026-PUN-0101"
  poDate: string;
  projectCode: string;
  projectName: string;
  costCode: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  vendorAddress: string;
  vendorBankDetails: string;
  materialName: string;
  technicalSpecification: string;
  quantity: number;
  standardUOM: string;
  baseRateINR: number;
  freightINR: number;
  handlingINR: number;
  gstPercent: number;
  netLandedRateINR: number;
  totalOrderValueINR: number;
  paymentTerms: string;
  deliverySiteGodown: string;
  deliverySchedule: string;
  status: "RELEASED_TO_VENDOR" | "IN_TRANSIT" | "PARTIALLY_DELIVERED" | "FULLY_SETTLED" | "CANCELLED";
  authorisedByFinance: string;
  financeSignOffDate: string;
  digitalStampCode: string;
}

export const DEFAULT_AUTHORISED_POS: AuthorisedPurchaseOrder[] = [
  {
    id: "po-01",
    poNumber: "PO-2026-PUN-0101",
    poDate: "2026-02-28",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    costCode: "CC-01-RCC",
    vendorId: "vnd-01",
    vendorName: "UltraTech Cement Limited",
    vendorGstin: "27AAACU0147B1ZN",
    vendorAddress: "ICC Trade Tower, 8th Floor, Senapati Bapat Road, Pune 411016",
    vendorBankDetails: "HDFC Bank (A/C: 50200023489102, IFSC: HDFC0000039)",
    materialName: "Ready-Mix Concrete M35 Design Mix",
    technicalSpecification: "IS 456 / IS 10262 design mix concrete, slump 120±25mm with retarder",
    quantity: 1850,
    standardUOM: "cum",
    baseRateINR: 5200,
    freightINR: 200,
    handlingINR: 66,
    gstPercent: 18,
    netLandedRateINR: 6450,
    totalOrderValueINR: 11932500, // ₹1,19,32,500
    paymentTerms: "15% Advance, balance against fortnightly cube test reports",
    deliverySiteGodown: "Tower B Central Raft Foundation Zone",
    deliverySchedule: "Transit mixer dispatch upon batching call-off (12-hour notice)",
    status: "PARTIALLY_DELIVERED",
    authorisedByFinance: "Sunil K. Mehta (Chief Financial Controller)",
    financeSignOffDate: "2026-02-28",
    digitalStampCode: "OSTAAD-DS-FIN-9921-VERIFIED",
  },
  {
    id: "po-02",
    poNumber: "PO-2026-PUN-0102",
    poDate: "2026-02-27",
    projectCode: "PRJ-PUN-2026-TWR-B",
    projectName: "Commercial Complex — Tower B",
    costCode: "CC-04-AGG",
    vendorId: "vnd-05",
    vendorName: "Sahyadri Natural Aggregates & M-Sand Infra",
    vendorGstin: "27ABFPS8819L1ZP",
    vendorAddress: "Plot 42, Wagholi Quarry Cluster, Nagar Road, Pune 412207",
    vendorBankDetails: "Kotak Mahindra Bank (A/C: 2811904581, IFSC: KKBK0000721)",
    materialName: "Manufactured Sand (M-Sand Zone II)",
    technicalSpecification: "IS 383:2016 Zone II crushed basalt stone sand, silt < 3%",
    quantity: 915,
    standardUOM: "cum",
    baseRateINR: 1350,
    freightINR: 200,
    handlingINR: 50,
    gstPercent: 5,
    netLandedRateINR: 1680,
    totalOrderValueINR: 1537200, // ₹15,37,200
    paymentTerms: "100% against 7-day weighbridge GRN slip",
    deliverySiteGodown: "Aggregate Storage Bins — Batching Yard",
    deliverySchedule: "30 cum tipper trucks daily",
    status: "RELEASED_TO_VENDOR",
    authorisedByFinance: "Sunil K. Mehta (Chief Financial Controller)",
    financeSignOffDate: "2026-02-27",
    digitalStampCode: "OSTAAD-DS-FIN-9918-VERIFIED",
  },
];

// =========================================================================
// SUB-MODULE 6.4: STAGED PAYMENTS & BANK TRANSACTION LEDGER
// =========================================================================

export interface BankDisbursementRecord {
  id: string;
  transactionRefUTR: string; // Bank UTR No e.g. "HDFCR5202603019842"
  poNumber: string;
  vendorName: string;
  vendorGstin: string;
  bankName: string;
  beneficiaryAccountNo: string;
  paymentType: "ADVANCE_PAYMENT" | "PROGRESSIVE_STAGE" | "RETENTION_RELEASE" | "FINAL_SETTLEMENT";
  amountINR: number;
  paymentDate: string;
  paymentMode: "RTGS" | "NEFT" | "CHEQUE" | "DIRECT_TRANSFER";
  status: "SETTLED" | "IN_CLEARING" | "REVERSED";
  approvedBy: string;
  notes: string;
}

export const DEFAULT_PAYMENTS_LEDGER: BankDisbursementRecord[] = [
  {
    id: "pay-01",
    transactionRefUTR: "HDFCR52026022800192",
    poNumber: "PO-2026-PUN-0101",
    vendorName: "UltraTech Cement Limited",
    vendorGstin: "27AAACU0147B1ZN",
    bankName: "HDFC Bank Ltd",
    beneficiaryAccountNo: "50200023489102",
    paymentType: "ADVANCE_PAYMENT",
    amountINR: 1789875, // 15% advance on ₹1.19 Cr
    paymentDate: "2026-02-28",
    paymentMode: "RTGS",
    status: "SETTLED",
    approvedBy: "Sunil K. Mehta (CFO)",
    notes: "15% Mobilization advance released as per PO terms against bank guarantee.",
  },
  {
    id: "pay-02",
    transactionRefUTR: "KKBKR52026030100481",
    poNumber: "PO-2026-PUN-0102",
    vendorName: "Sahyadri Natural Aggregates & M-Sand Infra",
    vendorGstin: "27ABFPS8819L1ZP",
    bankName: "Kotak Mahindra Bank",
    beneficiaryAccountNo: "2811904581",
    paymentType: "PROGRESSIVE_STAGE",
    amountINR: 500000,
    paymentDate: "2026-03-01",
    paymentMode: "NEFT",
    status: "SETTLED",
    approvedBy: "Sunil K. Mehta (CFO)",
    notes: "Part payment against initial 300 cum delivery verified at Gate weighbridge.",
  },
];

// =========================================================================
// SUB-MODULE 6.5 & 6.6: 3-WAY RECONCILIATION & FINAL SETTLEMENT
// =========================================================================

export interface ThreeWayReconciliationItem {
  id: string;
  poNumber: string;
  grnNumber: string; // Goods Receipt Note from Gate
  vendorInvoiceNumber: string;
  vendorName: string;
  materialName: string;
  poOrderedQuantity: number;
  grnAcceptedQuantity: number;
  invoiceBilledQuantity: number;
  poApprovedRateINR: number;
  invoiceBilledRateINR: number;
  poTotalValueINR: number;
  grnAcceptedValueINR: number;
  invoiceTotalValueINR: number;
  quantityVariance: number; // Invoice - GRN
  rateVarianceINR: number; // Invoice Rate - PO Rate
  reconciliationStatus: "PERFECT_MATCH" | "VARIANCE_FLAGGED" | "APPROVED_WITH_PENALTY";
  discrepancyNote?: string;
  retentionDeductionINR: number;
  advanceAdjustedINR: number;
  netPayableToVendorINR: number;
}

export const DEFAULT_RECONCILIATION_ITEMS: ThreeWayReconciliationItem[] = [
  {
    id: "rec-01",
    poNumber: "PO-2026-PUN-0101",
    grnNumber: "GRN-2026-0042",
    vendorInvoiceNumber: "INV-UTC-2026-981",
    vendorName: "UltraTech Cement Limited",
    materialName: "Ready-Mix Concrete M35 Design Mix",
    poOrderedQuantity: 580, // Delivery Lot 1
    grnAcceptedQuantity: 580,
    invoiceBilledQuantity: 580,
    poApprovedRateINR: 6450,
    invoiceBilledRateINR: 6450,
    poTotalValueINR: 3741000,
    grnAcceptedValueINR: 3741000,
    invoiceTotalValueINR: 3741000,
    quantityVariance: 0,
    rateVarianceINR: 0,
    reconciliationStatus: "PERFECT_MATCH",
    retentionDeductionINR: 187050, // 5%
    advanceAdjustedINR: 561150, // 15% advance recovery
    netPayableToVendorINR: 2992800,
  },
  {
    id: "rec-02",
    poNumber: "PO-2026-PUN-0102",
    grnNumber: "GRN-2026-0038",
    vendorInvoiceNumber: "INV-SND-2026-112",
    vendorName: "Sahyadri Natural Aggregates & M-Sand Infra",
    materialName: "Manufactured Sand (M-Sand Zone II)",
    poOrderedQuantity: 300,
    grnAcceptedQuantity: 290, // Weighbridge accepted only 290 cum (10 cum moisture tare deduction)
    invoiceBilledQuantity: 300, // Vendor tried billing for 300 cum
    poApprovedRateINR: 1680,
    invoiceBilledRateINR: 1680,
    poTotalValueINR: 504000,
    grnAcceptedValueINR: 487200,
    invoiceTotalValueINR: 504000,
    quantityVariance: +10, // 10 cum overbilled!
    rateVarianceINR: 0,
    reconciliationStatus: "VARIANCE_FLAGGED",
    discrepancyNote: "Vendor invoice claims 300 cum, but Gate weighbridge accepted net 290 cum after subtracting 10 cum water moisture excess. Bill docked by ₹16,800.",
    retentionDeductionINR: 24360,
    advanceAdjustedINR: 0,
    netPayableToVendorINR: 462840,
  },
];

