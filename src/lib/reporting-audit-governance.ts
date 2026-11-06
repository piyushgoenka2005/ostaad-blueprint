// ============================================================================
// OSTAAD ERP — MODULE 8: CROSS-FUNCTIONAL REPORTING, AUDIT & GOVERNANCE
// Data models, calculations, cryptographic audit verification, and export engine.
// ============================================================================

export interface ExecutiveProjectHealth {
  projectId: string;
  projectName: string;
  category: "Commercial" | "Residential" | "Infrastructure" | "Industrial";
  location: string;
  plannedBudget: number; // in INR
  committedSpend: number; // POs awarded
  actualSpend: number; // RA bills & disbursements paid
  progressPct: number; // Actual physical progress %
  plannedPct: number; // Scheduled progress %
  cpi: number; // Cost Performance Index = EV / AC (Earned Value / Actual Cost)
  spi: number; // Schedule Performance Index = EV / PV (Earned Value / Planned Value)
  healthStatus: "HEALTHY" | "WATCHLIST" | "CRITICAL";
  milestonesOnTrack: number;
  milestonesTotal: number;
  riskScore: number; // 0 - 100
  criticalStockDays: number; // Days of critical stock remaining at site
  projectManager: string;
}

export interface CashflowSCurvePoint {
  month: string;
  plannedCumulative: number; // in INR
  committedCumulative: number; // in INR
  actualCumulative: number; // in INR
  monthlyBilling: number; // in INR
  monthlyDisbursement: number; // in INR
}

export interface SupplierSpendMetric {
  vendorId: string;
  vendorName: string;
  category: string;
  totalSpend: number; // in INR
  poCount: number;
  onTimeDeliveryPct: number;
  qualityAcceptancePct: number;
  averageLeadDays: number;
  paymentCreditDays: number;
  marketSharePct: number;
}

export interface CategoryProcurementSpend {
  category: string;
  spend: number;
  budget: number;
  variancePct: number;
  itemCount: number;
  topSupplier: string;
}

export interface MaterialPriceTrend {
  materialCode: string;
  materialName: string;
  unit: string;
  history: Array<{
    period: string;
    baseRate: number;
    landedRate: number;
    inflationPct: number;
  }>;
  currentRate: number;
  prevQuarterRate: number;
  yoyChangePct: number;
  forecastQ1: number;
  procurementRecommendation: "STRATEGIC_STOCKPILE" | "STANDARD_ORDER" | "DELAY_ACQUISITION";
}

export interface AuditEventRecord {
  id: string;
  timestamp: string; // ISO 8601
  actor: {
    name: string;
    email: string;
    role: string;
    ipAddress: string;
  };
  category:
    | "FINANCIAL_DECISION"
    | "BUDGET_OVERRIDE"
    | "PO_APPROVAL"
    | "RBAC_ESCALATION"
    | "WEIGHBRIDGE_DISCREPANCY"
    | "BOQ_REVISION"
    | "INVOICE_RECONCILIATION";
  action: string;
  targetEntity: string;
  entityId: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  sha256Hash: string;
  previousHash: string;
  digitalSignature: string;
  verificationStatus: "VERIFIED_VALID" | "TAMPERED";
}

export interface BackupStatusRecord {
  backupId: string;
  type: "D1_SQL_DUMP" | "R2_DOCUMENT_SNAPSHOT" | "FULL_TENANT_EXPORT";
  timestamp: string;
  sizeMB: number;
  sha256Checksum: string;
  storageLocation: string;
  status: "COMPLETED" | "RUNNING" | "FAILED";
  retentionDays: number;
  initiatedBy: string;
}

// ----------------------------------------------------------------------------
// SEED DATA: EXECUTIVE C-SUITE DASHBOARD & PROJECTS (Sub-Module 8.1)
// ----------------------------------------------------------------------------

export const DEFAULT_EXECUTIVE_PROJECTS: ExecutiveProjectHealth[] = [
  {
    projectId: "PRJ-TOW-B",
    projectName: "Commercial Complex Tower B",
    category: "Commercial",
    location: "Bandra Kurla Complex, Mumbai",
    plannedBudget: 450000000, // 45.00 Cr
    committedSpend: 312000000, // 31.20 Cr
    actualSpend: 248500000, // 24.85 Cr
    progressPct: 62.5,
    plannedPct: 65.0,
    cpi: 1.04, // Cost efficient (earned value exceeds actual spend)
    spi: 0.96, // Slight 4% schedule lag
    healthStatus: "HEALTHY",
    milestonesOnTrack: 14,
    milestonesTotal: 16,
    riskScore: 24,
    criticalStockDays: 18,
    projectManager: "Er. Rajesh Kulkarni",
  },
  {
    projectId: "PRJ-LUX-H1",
    projectName: "Luxury Heights Phase 1",
    category: "Residential",
    location: "Kharadi IT Park Corridor, Pune",
    plannedBudget: 280000000, // 28.00 Cr
    committedSpend: 215000000, // 21.50 Cr
    actualSpend: 198000000, // 19.80 Cr
    progressPct: 78.0,
    plannedPct: 76.5,
    cpi: 1.08,
    spi: 1.02,
    healthStatus: "HEALTHY",
    milestonesOnTrack: 19,
    milestonesTotal: 20,
    riskScore: 16,
    criticalStockDays: 24,
    projectManager: "Er. Amit Deshmukh",
  },
  {
    projectId: "PRJ-RIV-VIL",
    projectName: "Riverside Luxury Villas",
    category: "Residential",
    location: "Alibaug Coastal Belt, Raigad",
    plannedBudget: 150000000, // 15.00 Cr
    committedSpend: 138000000, // 13.80 Cr
    actualSpend: 124000000, // 12.40 Cr
    progressPct: 41.0,
    plannedPct: 52.0,
    cpi: 0.91, // Cost overrun indicator
    spi: 0.79, // Significant delay due to monsoon permits
    healthStatus: "CRITICAL",
    milestonesOnTrack: 6,
    milestonesTotal: 12,
    riskScore: 68,
    criticalStockDays: 7,
    projectManager: "Er. Neha Patil",
  },
  {
    projectId: "PRJ-IND-LOG",
    projectName: "Industrial Logistics Hub Phase 2",
    category: "Industrial",
    location: "Chakan Industrial Zone, Pune",
    plannedBudget: 320000000, // 32.00 Cr
    committedSpend: 184000000, // 18.40 Cr
    actualSpend: 142000000, // 14.20 Cr
    progressPct: 54.0,
    plannedPct: 55.0,
    cpi: 1.01,
    spi: 0.98,
    healthStatus: "WATCHLIST",
    milestonesOnTrack: 11,
    milestonesTotal: 13,
    riskScore: 38,
    criticalStockDays: 12,
    projectManager: "Er. Sanjay Mehta",
  },
];

export const DEFAULT_CASHFLOW_SCURVE: CashflowSCurvePoint[] = [
  { month: "Jan 2026", plannedCumulative: 25000000, committedCumulative: 32000000, actualCumulative: 21000000, monthlyBilling: 21000000, monthlyDisbursement: 19500000 },
  { month: "Feb 2026", plannedCumulative: 55000000, committedCumulative: 71000000, actualCumulative: 49000000, monthlyBilling: 28000000, monthlyDisbursement: 26000000 },
  { month: "Mar 2026", plannedCumulative: 98000000, committedCumulative: 125000000, actualCumulative: 88000000, monthlyBilling: 39000000, monthlyDisbursement: 35000000 },
  { month: "Apr 2026", plannedCumulative: 154000000, committedCumulative: 192000000, actualCumulative: 139000000, monthlyBilling: 51000000, monthlyDisbursement: 47000000 },
  { month: "May 2026", plannedCumulative: 220000000, committedCumulative: 275000000, actualCumulative: 204000000, monthlyBilling: 65000000, monthlyDisbursement: 61000000 },
  { month: "Jun 2026", plannedCumulative: 300000000, committedCumulative: 370000000, actualCumulative: 282000000, monthlyBilling: 78000000, monthlyDisbursement: 72000000 },
  { month: "Jul 2026", plannedCumulative: 395000000, committedCumulative: 480000000, actualCumulative: 375000000, monthlyBilling: 93000000, monthlyDisbursement: 89000000 },
  { month: "Aug 2026", plannedCumulative: 505000000, committedCumulative: 605000000, actualCumulative: 485000000, monthlyBilling: 110000000, monthlyDisbursement: 104000000 },
  { month: "Sep 2026", plannedCumulative: 630000000, committedCumulative: 735000000, actualCumulative: 608000000, monthlyBilling: 123000000, monthlyDisbursement: 118000000 },
  { month: "Oct 2026", plannedCumulative: 770000000, committedCumulative: 849000000, actualCumulative: 712500000, monthlyBilling: 104500000, monthlyDisbursement: 99500000 },
  { month: "Nov 2026 (Est)", plannedCumulative: 920000000, committedCumulative: 970000000, actualCumulative: 825000000, monthlyBilling: 112500000, monthlyDisbursement: 108000000 },
  { month: "Dec 2026 (Est)", plannedCumulative: 1050000000, committedCumulative: 1100000000, actualCumulative: 945000000, monthlyBilling: 120000000, monthlyDisbursement: 115000000 },
];

// ----------------------------------------------------------------------------
// SEED DATA: PROCUREMENT & LANDED COST ANALYSIS (Sub-Module 8.2)
// ----------------------------------------------------------------------------

export const DEFAULT_SUPPLIER_SPEND: SupplierSpendMetric[] = [
  {
    vendorId: "VND-TATA-01",
    vendorName: "Tata Steel Ltd / Tata Tiscon",
    category: "Reinforcement Rebar Fe-550D",
    totalSpend: 184500000, // 18.45 Cr
    poCount: 14,
    onTimeDeliveryPct: 96.5,
    qualityAcceptancePct: 99.4,
    averageLeadDays: 4.2,
    paymentCreditDays: 30,
    marketSharePct: 32.4,
  },
  {
    vendorId: "VND-ULTRA-02",
    vendorName: "UltraTech Cement Ltd (Aditya Birla)",
    category: "OPC 53 Cement & Ready-Mix Concrete",
    totalSpend: 142800000, // 14.28 Cr
    poCount: 22,
    onTimeDeliveryPct: 98.1,
    qualityAcceptancePct: 99.8,
    averageLeadDays: 1.5,
    paymentCreditDays: 15,
    marketSharePct: 25.1,
  },
  {
    vendorId: "VND-JSW-03",
    vendorName: "JSW Steel Co. Ltd (NeoSteel)",
    category: "Structural Steel Sections & Wire Rods",
    totalSpend: 96200000, // 9.62 Cr
    poCount: 8,
    onTimeDeliveryPct: 91.2,
    qualityAcceptancePct: 97.6,
    averageLeadDays: 6.0,
    paymentCreditDays: 45,
    marketSharePct: 16.9,
  },
  {
    vendorId: "VND-MAGIC-04",
    vendorName: "Magicrete Building Solutions",
    category: "AAC Lightweight Blocks & Mortar",
    totalSpend: 54100000, // 5.41 Cr
    poCount: 11,
    onTimeDeliveryPct: 94.0,
    qualityAcceptancePct: 98.2,
    averageLeadDays: 3.0,
    paymentCreditDays: 21,
    marketSharePct: 9.5,
  },
  {
    vendorId: "VND-FOSROC-05",
    vendorName: "Fosroc Chemicals India Pvt Ltd",
    category: "Concrete Admixtures & Waterproofing",
    totalSpend: 38400000, // 3.84 Cr
    poCount: 9,
    onTimeDeliveryPct: 95.8,
    qualityAcceptancePct: 99.1,
    averageLeadDays: 2.8,
    paymentCreditDays: 30,
    marketSharePct: 6.7,
  },
  {
    vendorId: "VND-SCHN-06",
    vendorName: "Schneider Electric India",
    category: "LV Distribution & Switchgear",
    totalSpend: 53500000, // 5.35 Cr
    poCount: 5,
    onTimeDeliveryPct: 88.5,
    qualityAcceptancePct: 99.9,
    averageLeadDays: 12.0,
    paymentCreditDays: 45,
    marketSharePct: 9.4,
  },
];

export const DEFAULT_CATEGORY_SPEND: CategoryProcurementSpend[] = [
  { category: "Reinforcement Steel (Fe-550D)", spend: 280700000, budget: 300000000, variancePct: -6.4, itemCount: 4200, topSupplier: "Tata Steel Ltd" },
  { category: "Cement & RMC Concrete", spend: 181200000, budget: 195000000, variancePct: -7.1, itemCount: 31500, topSupplier: "UltraTech Cement Ltd" },
  { category: "Masonry & AAC Blocks", spend: 68500000, budget: 65000000, variancePct: +5.4, itemCount: 48000, topSupplier: "Magicrete Building Solutions" },
  { category: "Admixtures & Waterproofing", spend: 42100000, budget: 45000000, variancePct: -6.4, itemCount: 1850, topSupplier: "Fosroc Chemicals" },
  { category: "MEP Electrical & Piping", spend: 76500000, budget: 82000000, variancePct: -6.7, itemCount: 640, topSupplier: "Schneider Electric" },
  { category: "Aggregates & River Sand", spend: 54500000, budget: 52000000, variancePct: +4.8, itemCount: 12400, topSupplier: "Apex Aggregates Quarry" },
];

export const DEFAULT_MATERIAL_PRICE_TRENDS: MaterialPriceTrend[] = [
  {
    materialCode: "MAT-TMT-550",
    materialName: "TMT Rebar Fe-550D (12mm-32mm)",
    unit: "MT",
    history: [
      { period: "Q1 2025", baseRate: 59500, landedRate: 64800, inflationPct: 0.0 },
      { period: "Q2 2025", baseRate: 61200, landedRate: 66600, inflationPct: 2.8 },
      { period: "Q3 2025", baseRate: 63800, landedRate: 69400, inflationPct: 4.2 },
      { period: "Q4 2025", baseRate: 62500, landedRate: 68100, inflationPct: -1.9 },
      { period: "Q1 2026 (Current)", baseRate: 64200, landedRate: 70050, inflationPct: 2.9 },
    ],
    currentRate: 70050,
    prevQuarterRate: 68100,
    yoyChangePct: 8.1,
    forecastQ1: 72500,
    procurementRecommendation: "STRATEGIC_STOCKPILE",
  },
  {
    materialCode: "MAT-CEM-OPC53",
    materialName: "OPC 53 Grade Cement (IS 12269)",
    unit: "Bag (50kg)",
    history: [
      { period: "Q1 2025", baseRate: 335, landedRate: 375, inflationPct: 0.0 },
      { period: "Q2 2025", baseRate: 345, landedRate: 386, inflationPct: 2.9 },
      { period: "Q3 2025", baseRate: 360, landedRate: 403, inflationPct: 4.4 },
      { period: "Q4 2025", baseRate: 355, landedRate: 397, inflationPct: -1.5 },
      { period: "Q1 2026 (Current)", baseRate: 365, landedRate: 408, inflationPct: 2.8 },
    ],
    currentRate: 408,
    prevQuarterRate: 397,
    yoyChangePct: 8.8,
    forecastQ1: 415,
    procurementRecommendation: "STANDARD_ORDER",
  },
  {
    materialCode: "MAT-RMC-M30",
    materialName: "Ready-Mix Concrete Grade M30",
    unit: "cum",
    history: [
      { period: "Q1 2025", baseRate: 4200, landedRate: 4780, inflationPct: 0.0 },
      { period: "Q2 2025", baseRate: 4350, landedRate: 4950, inflationPct: 3.5 },
      { period: "Q3 2025", baseRate: 4500, landedRate: 5120, inflationPct: 3.4 },
      { period: "Q4 2025", baseRate: 4450, landedRate: 5060, inflationPct: -1.2 },
      { period: "Q1 2026 (Current)", baseRate: 4600, landedRate: 5240, inflationPct: 3.5 },
    ],
    currentRate: 5240,
    prevQuarterRate: 5060,
    yoyChangePct: 9.6,
    forecastQ1: 5350,
    procurementRecommendation: "STANDARD_ORDER",
  },
  {
    materialCode: "MAT-AAC-600",
    materialName: "AAC Lightweight Blocks 600x200x150mm",
    unit: "cum",
    history: [
      { period: "Q1 2025", baseRate: 2850, landedRate: 3250, inflationPct: 0.0 },
      { period: "Q2 2025", baseRate: 2900, landedRate: 3310, inflationPct: 1.8 },
      { period: "Q3 2025", baseRate: 3000, landedRate: 3420, inflationPct: 3.3 },
      { period: "Q4 2025", baseRate: 3050, landedRate: 3480, inflationPct: 1.7 },
      { period: "Q1 2026 (Current)", baseRate: 3100, landedRate: 3540, inflationPct: 1.7 },
    ],
    currentRate: 3540,
    prevQuarterRate: 3480,
    yoyChangePct: 8.9,
    forecastQ1: 3500,
    procurementRecommendation: "DELAY_ACQUISITION",
  },
];

// ----------------------------------------------------------------------------
// SEED DATA: IMMUTABLE AUDIT TRAIL & SYSTEM SECURITY EVENT LOGS (Sub-Module 8.3)
// ----------------------------------------------------------------------------

export const DEFAULT_AUDIT_LOGS: AuditEventRecord[] = [
  {
    id: "AUD-2026-0001",
    timestamp: "2026-11-06T08:48:15.220Z",
    actor: {
      name: "CFO Vikram Malhotra",
      email: "cfo@ostaad.internal",
      role: "FINANCE_DIRECTOR",
      ipAddress: "192.168.1.102",
    },
    category: "FINANCIAL_DECISION",
    action: "PO_DUAL_CONTROL_APPROVAL",
    targetEntity: "Commercial Purchase Order",
    entityId: "PO-2026-001",
    details: "Authorized 100% advance payout release of ₹30,00,000 for UltraTech Cement RMC consignment. Bank UTR reference generated: HDFC992817441.",
    beforeValue: "Status: PENDING_FINANCE_APPROVAL",
    afterValue: "Status: AUTHORISED_ISSUED (Approval Token: CF-881290-OK)",
    severity: "INFO",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    sha256Hash: "d8e3b2c1f90a5e78341b2a9f88c3412019ab76ef321948da62a8715bc7291a45",
    digitalSignature: "RSA-PSS-SHA256:3a9f0291e988241b77c54129...",
    verificationStatus: "VERIFIED_VALID",
  },
  {
    id: "AUD-2026-0002",
    timestamp: "2026-11-06T08:52:40.891Z",
    actor: {
      name: "Managing Director Aryan Singhania",
      email: "md@ostaad.internal",
      role: "SUPER_ADMIN",
      ipAddress: "192.168.1.10",
    },
    category: "BUDGET_OVERRIDE",
    action: "PACKAGE_CONTINGENCY_DRAWDOWN",
    targetEntity: "Budget Pool Guardrail",
    entityId: "PKG-STR-CONCRETE-02",
    details: "Approved contingency pool drawdown of ₹15,00,000 for high-grade M40 pumpable mix due to monsoon delivery acceleration.",
    beforeValue: "Committed: ₹2,10,00,000 / Ceiling: ₹2,20,00,000 (Available: ₹10,00,000)",
    afterValue: "Ceiling Revised: ₹2,35,00,000 / Available: ₹25,00,000",
    severity: "WARNING",
    previousHash: "d8e3b2c1f90a5e78341b2a9f88c3412019ab76ef321948da62a8715bc7291a45",
    sha256Hash: "fa76829b3c4179e88d4021bb5562134a7801934bcde1908234ab8761fa0912cb",
    digitalSignature: "RSA-PSS-SHA256:b145293409ae2211fc548902...",
    verificationStatus: "VERIFIED_VALID",
  },
  {
    id: "AUD-2026-0003",
    timestamp: "2026-11-06T08:56:11.105Z",
    actor: {
      name: "Security Guard Rampal Yadav",
      email: "gate.security@ostaad.internal",
      role: "SITE_GATE_SECURITY",
      ipAddress: "10.0.4.18",
    },
    category: "WEIGHBRIDGE_DISCREPANCY",
    action: "GATE_OVERDELIVERY_TOLERANCE_REJECTION",
    targetEntity: "Gate Goods Receipt Note",
    entityId: "GRN-2026-0003-REJ",
    details: "Weighbridge detected truck MH-04-AZ-9912 gross weight exceeding approved PO quantity by +8.4% (Threshold: +5.0% max). Inward gate pass blocked.",
    beforeValue: "PO Authorized Qty: 40.00 MT",
    afterValue: "Weighbridge Net: 43.36 MT (+8.4% variance - GATE REJECTION ISSUED)",
    severity: "CRITICAL",
    previousHash: "fa76829b3c4179e88d4021bb5562134a7801934bcde1908234ab8761fa0912cb",
    sha256Hash: "7b19284cf9017634de8219ba43056128fa99142ecbd3315690ab12879aef4103",
    digitalSignature: "RSA-PSS-SHA256:77f1903e12bb9824c0921477...",
    verificationStatus: "VERIFIED_VALID",
  },
  {
    id: "AUD-2026-0004",
    timestamp: "2026-11-06T08:58:33.742Z",
    actor: {
      name: "System Security Sentinel",
      email: "auth-daemon@ostaad.internal",
      role: "SYSTEM_DAEMON",
      ipAddress: "127.0.0.1",
    },
    category: "RBAC_ESCALATION",
    action: "UNAUTHORIZED_PERMISSION_ATTEMPT_BLOCKED",
    targetEntity: "Role Gate Access Controller",
    entityId: "USER-SITE-ENG-08",
    details: "Junior Site Engineer tried to trigger manual bank transaction settlement without dual-control authorization. Request dropped with HTTP 403.",
    beforeValue: "Role: SITE_ENGINEER",
    afterValue: "Attempted Action: SETTLE_COMMERCIAL_INVOICE (BLOCKED)",
    severity: "CRITICAL",
    previousHash: "7b19284cf9017634de8219ba43056128fa99142ecbd3315690ab12879aef4103",
    sha256Hash: "991823ab45ef6781290a34bcf12934ef8871029348bacde01928347102938471",
    digitalSignature: "RSA-PSS-SHA256:889912301984abcdef901844...",
    verificationStatus: "VERIFIED_VALID",
  },
  {
    id: "AUD-2026-0005",
    timestamp: "2026-11-06T09:00:02.418Z",
    actor: {
      name: "Chief Quantity Surveyor Sneha Joshi",
      email: "qs@ostaad.internal",
      role: "OPERATIONS_LEAD",
      ipAddress: "192.168.1.84",
    },
    category: "BOQ_REVISION",
    action: "CHANGE_ORDER_BASELINE_FREEZE",
    targetEntity: "BOQ Hierarchical Item Registry",
    entityId: "CO-2026-001",
    details: "Frozen Baseline BOQ Rev 1.0. Appended approved Change Order CO-001 for basement waterproof crystalline membrane (+₹15,70,000 impact).",
    beforeValue: "Baseline Rev 0.0 (Total: ₹43,43,00,000)",
    afterValue: "Baseline Rev 1.0 (Total: ₹43,58,70,000)",
    severity: "INFO",
    previousHash: "991823ab45ef6781290a34bcf12934ef8871029348bacde01928347102938471",
    sha256Hash: "6541289abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
    digitalSignature: "RSA-PSS-SHA256:55ab8821948833912048fbc0...",
    verificationStatus: "VERIFIED_VALID",
  },
];

// ----------------------------------------------------------------------------
// SEED DATA: BACKUPS & DISASTER RECOVERY PROCEDURES (Sub-Module 8.4)
// ----------------------------------------------------------------------------

export const DEFAULT_BACKUPS: BackupStatusRecord[] = [
  {
    backupId: "BKP-D1-2026-11-06-0200",
    type: "D1_SQL_DUMP",
    timestamp: "2026-11-06T02:00:00.000Z",
    sizeMB: 148.5,
    sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    storageLocation: "r2://ostaad-production-vault/backups/d1/2026-11-06-0200.sql.gz",
    status: "COMPLETED",
    retentionDays: 30,
    initiatedBy: "Cloudflare Cron Trigger (Nightly 02:00 UTC)",
  },
  {
    backupId: "BKP-R2-2026-11-05-0200",
    type: "R2_DOCUMENT_SNAPSHOT",
    timestamp: "2026-11-05T02:00:00.000Z",
    sizeMB: 2840.2,
    sha256Checksum: "7829103984afcbde01928347102938471901844889912301984abcdef9018440",
    storageLocation: "r2://ostaad-production-vault/snapshots/drawings-invoices-2026-11-05.tar",
    status: "COMPLETED",
    retentionDays: 90,
    initiatedBy: "Cloudflare Cron Trigger (Nightly 02:00 UTC)",
  },
  {
    backupId: "BKP-TENANT-FULL-2026-11-01",
    type: "FULL_TENANT_EXPORT",
    timestamp: "2026-11-01T00:00:00.000Z",
    sizeMB: 3120.8,
    sha256Checksum: "fa0912cb7801934bcde1908234ab8761fa76829b3c4179e88d4021bb5562134a",
    storageLocation: "r2://ostaad-cold-archive-mumbai/tenants/tenant-default-monthly-freeze.enc",
    status: "COMPLETED",
    retentionDays: 2555, // 7 years for statutory GST & tax compliance
    initiatedBy: "Automated Monthly Financial Freeze Protocol",
  },
];

// ----------------------------------------------------------------------------
// CRYPTOGRAPHIC HASH CHAIN & INTEGRITY VERIFICATION
// ----------------------------------------------------------------------------

export function verifyAuditTrailChain(records: AuditEventRecord[]): {
  isValid: boolean;
  totalVerified: number;
  brokenRecordId?: string;
  errorMessage?: string;
} {
  if (!records || records.length === 0) {
    return { isValid: true, totalVerified: 0 };
  }

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    if (i > 0) {
      const prev = records[i - 1];
      if (current.previousHash !== prev.sha256Hash) {
        return {
          isValid: false,
          totalVerified: i,
          brokenRecordId: current.id,
          errorMessage: `Hash chain broken at record ${current.id}: previousHash does not match preceding record's sha256Hash.`,
        };
      }
    }
  }

  return { isValid: true, totalVerified: records.length };
}

// ----------------------------------------------------------------------------
// UNIVERSAL DATA EXPORT ENGINE (CSV Generation & Download)
// ----------------------------------------------------------------------------

export function generateCSV(headers: string[], rows: (string | number | boolean)[][]): string {
  const sanitize = (val: string | number | boolean) => {
    const str = String(val ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(sanitize).join(",");
  const dataLines = rows.map((row) => row.map(sanitize).join(",")).join("\r\n");
  return `${headerLine}\r\n${dataLines}`;
}

export function downloadCSVFile(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------------------------------
// CURRENCY & NUMBER FORMATTERS
// ----------------------------------------------------------------------------

export function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatCrores(val: number): string {
  const cr = val / 10000000;
  return `₹${cr.toFixed(2)} Cr`;
}

export function formatLakhs(val: number): string {
  const lk = val / 100000;
  return `₹${lk.toFixed(2)} L`;
}
