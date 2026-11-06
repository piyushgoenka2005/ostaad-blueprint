/**
 * Ostaad ERP - Vendor Management & Sourcing Procurement (Module 5)
 * Sub-Module 5.1: Master Vendor Directory, GSTIN & Category Tagging
 * Sub-Module 5.2: Material Request for Quotation (RFQ) Generation
 * Sub-Module 5.3: Vendor Quotation Entry & Landed Cost Breakdown
 * Sub-Module 5.4: Automated Comparative Statement & Multi-Criteria Ranking (L1 to Ln)
 * Sub-Module 5.5: Managing Authority Award Recommendation Workflow
 */

// =========================================================================
// SUB-MODULE 5.1: MASTER VENDOR DIRECTORY & GSTIN COMPLIANCE
// =========================================================================

export type VendorCategory =
  | "CEMENT"
  | "STEEL_REBAR"
  | "RMC_CONCRETE"
  | "SAND_AGGREGATES"
  | "AAC_BLOCKS"
  | "SHUTTERING_FORMWORK"
  | "WATERPROOFING"
  | "ELECTRICAL_PLUMBING";

export interface VerifiedVendorProfile {
  id: string;
  vendorCode: string;
  vendorName: string;
  tradeCategories: VendorCategory[];
  gstin: string; // 15-char Indian GSTIN e.g. "27AABCO1234F1Z8"
  panNumber: string; // 10-char PAN
  stateCode: string; // e.g. "27" (Maharashtra), "06" (Haryana)
  stateName: string;
  city: string;
  officeAddress: string;
  contactPerson: string;
  phone: string;
  email: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
  };
  performanceMetrics: {
    qualityRating: number; // 1 to 5.0
    onTimeDeliveryPercent: number; // e.g. 96%
    pricingCompetitivenessScore: number; // 1 to 5.0
    tier: "TIER_1_PREFERRED" | "TIER_2_APPROVED" | "TIER_3_UNDER_WATCH";
    totalCompletedOrdersCount: number;
  };
  isVerified: boolean;
  registrationDate: string;
}

export const DEFAULT_VERIFIED_VENDORS: VerifiedVendorProfile[] = [
  {
    id: "vnd-01",
    vendorCode: "VND-PUN-0101",
    vendorName: "UltraTech Cement Limited",
    tradeCategories: ["CEMENT", "RMC_CONCRETE"],
    gstin: "27AAACU0147B1ZN",
    panNumber: "AAACU0147B",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Pune",
    officeAddress: "ICC Trade Tower, 8th Floor, Senapati Bapat Road, Pune 411016",
    contactPerson: "Praveen Deshmukh (Zonal Institutional Sales)",
    phone: "+91 98230 44521",
    email: "praveen.deshmukh@adityabirla.com",
    bankDetails: {
      bankName: "HDFC Bank Ltd",
      accountNumber: "50200023489102",
      ifscCode: "HDFC0000039",
      branchName: "Bhandarkar Road, Pune",
    },
    performanceMetrics: {
      qualityRating: 4.9,
      onTimeDeliveryPercent: 97.5,
      pricingCompetitivenessScore: 4.6,
      tier: "TIER_1_PREFERRED",
      totalCompletedOrdersCount: 42,
    },
    isVerified: true,
    registrationDate: "2025-06-15",
  },
  {
    id: "vnd-02",
    vendorCode: "VND-PUN-0102",
    vendorName: "Ambuja Cements Ltd (Adani Group)",
    tradeCategories: ["CEMENT"],
    gstin: "27AABCA3421K1ZM",
    panNumber: "AABCA3421K",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Pune",
    officeAddress: "Adani House, Nagar Road, Yerwada, Pune 411006",
    contactPerson: "Kavita Nair (Institutional Key Accounts)",
    phone: "+91 97654 31200",
    email: "kavita.nair@adani.com",
    bankDetails: {
      bankName: "State Bank of India",
      accountNumber: "30459812901",
      ifscCode: "SBIN0000455",
      branchName: "Yerwada Commercial Branch",
    },
    performanceMetrics: {
      qualityRating: 4.7,
      onTimeDeliveryPercent: 94.0,
      pricingCompetitivenessScore: 4.8,
      tier: "TIER_1_PREFERRED",
      totalCompletedOrdersCount: 28,
    },
    isVerified: true,
    registrationDate: "2025-08-20",
  },
  {
    id: "vnd-03",
    vendorCode: "VND-PUN-0103",
    vendorName: "Tata Steel Ltd (Tata Tiscon Division)",
    tradeCategories: ["STEEL_REBAR"],
    gstin: "27AAACT2727Q1ZW",
    panNumber: "AAACT2727Q",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Mumbai",
    officeAddress: "Bombay House, 24 Homi Mody Street, Fort, Mumbai 400001",
    contactPerson: "Arunav Sen (Western Region Project Head)",
    phone: "+91 99201 88472",
    email: "arunav.sen@tatasteel.com",
    bankDetails: {
      bankName: "Axis Bank Ltd",
      accountNumber: "915020045812934",
      ifscCode: "UTIB0000004",
      branchName: "Fort, Mumbai",
    },
    performanceMetrics: {
      qualityRating: 5.0,
      onTimeDeliveryPercent: 98.0,
      pricingCompetitivenessScore: 4.3,
      tier: "TIER_1_PREFERRED",
      totalCompletedOrdersCount: 65,
    },
    isVerified: true,
    registrationDate: "2025-04-10",
  },
  {
    id: "vnd-04",
    vendorCode: "VND-PUN-0104",
    vendorName: "JSW Steel Neo Rebars Co.",
    tradeCategories: ["STEEL_REBAR"],
    gstin: "27AAACJ4412H1ZD",
    panNumber: "AAACJ4412H",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Mumbai",
    officeAddress: "JSW Centre, Bandra Kurla Complex, Bandra East, Mumbai 400051",
    contactPerson: "Rohan Singhal (Regional Project Sales)",
    phone: "+91 98199 77231",
    email: "rohan.singhal@jsw.in",
    bankDetails: {
      bankName: "ICICI Bank Ltd",
      accountNumber: "000405011928",
      ifscCode: "ICIC0000004",
      branchName: "BKC Mumbai",
    },
    performanceMetrics: {
      qualityRating: 4.8,
      onTimeDeliveryPercent: 95.0,
      pricingCompetitivenessScore: 4.7,
      tier: "TIER_1_PREFERRED",
      totalCompletedOrdersCount: 39,
    },
    isVerified: true,
    registrationDate: "2025-07-01",
  },
  {
    id: "vnd-05",
    vendorCode: "VND-PUN-0105",
    vendorName: "Sahyadri Natural Aggregates & M-Sand Infra",
    tradeCategories: ["SAND_AGGREGATES"],
    gstin: "27ABFPS8819L1ZP",
    panNumber: "ABFPS8819L",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Pune",
    officeAddress: "Plot 42, Wagholi Quarry Cluster, Nagar Road, Pune 412207",
    contactPerson: "Sanjay Patil (Proprietor)",
    phone: "+91 94220 19384",
    email: "sales@sahyadriaggregates.in",
    bankDetails: {
      bankName: "Kotak Mahindra Bank",
      accountNumber: "2811904581",
      ifscCode: "KKBK0000721",
      branchName: "Kharadi, Pune",
    },
    performanceMetrics: {
      qualityRating: 4.6,
      onTimeDeliveryPercent: 92.0,
      pricingCompetitivenessScore: 4.9,
      tier: "TIER_2_APPROVED",
      totalCompletedOrdersCount: 19,
    },
    isVerified: true,
    registrationDate: "2025-09-12",
  },
  {
    id: "vnd-06",
    vendorCode: "VND-PUN-0106",
    vendorName: "Magicrete Building Solutions Pvt Ltd",
    tradeCategories: ["AAC_BLOCKS"],
    gstin: "27AAECM9982E1Z2",
    panNumber: "AAECM9982E",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Pune",
    officeAddress: "Chakan Industrial Area, Phase II, Pune 410501",
    contactPerson: "Dhiren Choksi (Area Business Manager)",
    phone: "+91 98902 44109",
    email: "dhiren@magicrete.in",
    bankDetails: {
      bankName: "HDFC Bank Ltd",
      accountNumber: "50200048192039",
      ifscCode: "HDFC0000180",
      branchName: "Chakan Branch",
    },
    performanceMetrics: {
      qualityRating: 4.7,
      onTimeDeliveryPercent: 95.0,
      pricingCompetitivenessScore: 4.5,
      tier: "TIER_1_PREFERRED",
      totalCompletedOrdersCount: 22,
    },
    isVerified: true,
    registrationDate: "2025-10-05",
  },
];

// =========================================================================
// SUB-MODULE 5.2: MATERIAL RFQ GENERATION
// =========================================================================

export interface MaterialRFQItem {
  id: string;
  rfqNumber: string; // e.g. "RFQ-2026-CEM-001"
  projectCode: string;
  materialName: string;
  category: VendorCategory;
  technicalSpecification: string;
  requiredQuantity: number;
  standardUOM: string;
  targetDeliveryDate: string;
  deliverySiteGodown: string; // e.g. "Central Cement Shed - Tower B"
  deliveryStaggeringTerms: string; // e.g. "500 Bags per weekly drop"
  invitedVendorIds: string[];
  status: "DRAFT" | "PUBLISHED" | "QUOTATIONS_RECEIVED" | "AWARDED" | "CLOSED";
  createdDate: string;
  bidsClosingDate: string;
}

export const DEFAULT_RFQS: MaterialRFQItem[] = [
  {
    id: "rfq-01",
    rfqNumber: "RFQ-2026-CEM-001",
    projectCode: "PRJ-PUN-2026-TWR-B",
    materialName: "Ordinary Portland Cement (OPC 53 Grade)",
    category: "CEMENT",
    technicalSpecification: "IS 12269:2013 compliant, 28-day compressive strength min 53 MPa, Fresh test certificate per batch",
    requiredQuantity: 15350,
    standardUOM: "50kg Bags",
    targetDeliveryDate: "2026-03-15",
    deliverySiteGodown: "Central Cement Godown Shed — Tower B Site",
    deliveryStaggeringTerms: "1,500 bags every 7 days upon engineer indent",
    invitedVendorIds: ["vnd-01", "vnd-02"],
    status: "QUOTATIONS_RECEIVED",
    createdDate: "2026-02-20",
    bidsClosingDate: "2026-02-28",
  },
  {
    id: "rfq-02",
    rfqNumber: "RFQ-2026-STL-002",
    projectCode: "PRJ-PUN-2026-TWR-B",
    materialName: "Primary Producer TMT Fe 550D Rebar",
    category: "STEEL_REBAR",
    technicalSpecification: "IS 1786:2008 high ductile Fe 550D primary billets only (Tata/JSW/SAIL), 8mm to 32mm bundles",
    requiredQuantity: 301.1,
    standardUOM: "Metric Tonnes (MT)",
    targetDeliveryDate: "2026-03-20",
    deliverySiteGodown: "Rebar Fabrication Yard — Gate 2",
    deliveryStaggeringTerms: "50 MT per drop as per bar bending schedule (BBS)",
    invitedVendorIds: ["vnd-03", "vnd-04"],
    status: "QUOTATIONS_RECEIVED",
    createdDate: "2026-02-22",
    bidsClosingDate: "2026-03-02",
  },
  {
    id: "rfq-03",
    rfqNumber: "RFQ-2026-AGG-003",
    projectCode: "PRJ-PUN-2026-TWR-B",
    materialName: "Manufactured Sand (M-Sand Zone II)",
    category: "SAND_AGGREGATES",
    technicalSpecification: "IS 383:2016 Zone II crushed basalt stone sand, silt content < 3%",
    requiredQuantity: 915,
    standardUOM: "Cubic Meters (cum)",
    targetDeliveryDate: "2026-03-10",
    deliverySiteGodown: "Aggregate Storage Bins — Batching Plant",
    deliveryStaggeringTerms: "Daily 30 cum tipper truck deliveries",
    invitedVendorIds: ["vnd-05"],
    status: "PUBLISHED",
    createdDate: "2026-02-25",
    bidsClosingDate: "2026-03-05",
  },
];

// =========================================================================
// SUB-MODULE 5.3: VENDOR QUOTATION & LANDED COST BREAKDOWN
// =========================================================================

export interface VendorQuotationBid {
  id: string;
  rfqId: string;
  rfqNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  quotedDate: string;
  validityUntilDate: string;
  baseRateINR: number; // Ex-factory price per UOM
  freightPerUOMINR: number; // Transit cartage
  unloadingHandlingPerUOMINR: number; // Site handling
  subtotalTaxablePerUOMINR: number; // Base + Freight + Handling
  gstRatePercent: number; // 5%, 12%, 18%, 28%
  gstAmountPerUOMINR: number;
  netLandedRatePerUOMINR: number; // Final per-unit landed price
  totalLandedContractCostINR: number; // Landed * RFQ Qty
  deliveryLeadTimeDays: number;
  paymentCreditTerms: string; // e.g. "30 Days Credit", "100% Advance"
  technicalComplianceConfirmed: boolean;
  notes: string;
}

export function computeLandedRate(
  base: number,
  freight: number,
  handling: number,
  gstPercent: number,
  quantity: number
) {
  const taxableSubtotal = base + freight + handling;
  const gstAmount = Math.round((taxableSubtotal * (gstPercent / 100)) * 100) / 100;
  const landedRate = Math.round((taxableSubtotal + gstAmount) * 100) / 100;
  const totalCost = Math.round(landedRate * quantity);
  return {
    taxableSubtotal,
    gstAmount,
    landedRate,
    totalCost,
  };
}

export const DEFAULT_VENDOR_BIDS: VendorQuotationBid[] = [
  // Bids for RFQ-2026-CEM-001 (15,350 Bags OPC 53 Cement)
  {
    id: "bid-cem-01",
    rfqId: "rfq-01",
    rfqNumber: "RFQ-2026-CEM-001",
    vendorId: "vnd-01",
    vendorName: "UltraTech Cement Limited",
    vendorGstin: "27AAACU0147B1ZN",
    quotedDate: "2026-02-24",
    validityUntilDate: "2026-03-31",
    baseRateINR: 280.0,
    freightPerUOMINR: 12.0,
    unloadingHandlingPerUOMINR: 3.0,
    subtotalTaxablePerUOMINR: 295.0,
    gstRatePercent: 28.0,
    gstAmountPerUOMINR: 82.6,
    netLandedRatePerUOMINR: 377.6,
    totalLandedContractCostINR: 5796160, // 15,350 * 377.60 = ₹57,96,160
    deliveryLeadTimeDays: 2,
    paymentCreditTerms: "30 Days Credit after Delivery",
    technicalComplianceConfirmed: true,
    notes: "Direct depot dispatches from Urse plant. Test certificate included per truck.",
  },
  {
    id: "bid-cem-02",
    rfqId: "rfq-01",
    rfqNumber: "RFQ-2026-CEM-001",
    vendorId: "vnd-02",
    vendorName: "Ambuja Cements Ltd (Adani Group)",
    vendorGstin: "27AABCA3421K1ZM",
    quotedDate: "2026-02-25",
    validityUntilDate: "2026-03-31",
    baseRateINR: 275.0,
    freightPerUOMINR: 15.0,
    unloadingHandlingPerUOMINR: 4.0,
    subtotalTaxablePerUOMINR: 294.0,
    gstRatePercent: 28.0,
    gstAmountPerUOMINR: 82.32,
    netLandedRatePerUOMINR: 376.32,
    totalLandedContractCostINR: 5776512, // 15,350 * 376.32 = ₹57,76,512 (Lowest L1!)
    deliveryLeadTimeDays: 3,
    paymentCreditTerms: "15 Days Credit",
    technicalComplianceConfirmed: true,
    notes: "Ex-Chakan depot. Sealed moisture-proof HDPE packaging guaranteed.",
  },

  // Bids for RFQ-2026-STL-002 (301.1 MT TMT Fe 550D Steel)
  {
    id: "bid-stl-01",
    rfqId: "rfq-02",
    rfqNumber: "RFQ-2026-STL-002",
    vendorId: "vnd-03",
    vendorName: "Tata Steel Ltd (Tata Tiscon Division)",
    vendorGstin: "27AAACT2727Q1ZW",
    quotedDate: "2026-02-26",
    validityUntilDate: "2026-03-31",
    baseRateINR: 56500.0,
    freightPerUOMINR: 1200.0,
    unloadingHandlingPerUOMINR: 300.0,
    subtotalTaxablePerUOMINR: 58000.0,
    gstRatePercent: 18.0,
    gstAmountPerUOMINR: 10440.0,
    netLandedRatePerUOMINR: 68440.0,
    totalLandedContractCostINR: 20607284, // 301.1 * 68,440 = ₹2,06,07,284
    deliveryLeadTimeDays: 4,
    paymentCreditTerms: "30 Days Credit against LC",
    technicalComplianceConfirmed: true,
    notes: "Primary steel with low phosphorus and sulfur (<0.035%). BIS certified.",
  },
  {
    id: "bid-stl-02",
    rfqId: "rfq-02",
    rfqNumber: "RFQ-2026-STL-002",
    vendorId: "vnd-04",
    vendorName: "JSW Steel Neo Rebars Co.",
    vendorGstin: "27AAACJ4412H1ZD",
    quotedDate: "2026-02-27",
    validityUntilDate: "2026-03-31",
    baseRateINR: 55800.0,
    freightPerUOMINR: 1350.0,
    unloadingHandlingPerUOMINR: 350.0,
    subtotalTaxablePerUOMINR: 57500.0,
    gstRatePercent: 18.0,
    gstAmountPerUOMINR: 10350.0,
    netLandedRatePerUOMINR: 67850.0,
    totalLandedContractCostINR: 20429635, // 301.1 * 67,850 = ₹2,04,29,635 (Lowest L1!)
    deliveryLeadTimeDays: 3,
    paymentCreditTerms: "21 Days Credit",
    technicalComplianceConfirmed: true,
    notes: "Dispatches from Dolvi steel complex. NABL accredited test reports provided.",
  },
];

// =========================================================================
// SUB-MODULE 5.4 & 5.5: COMPARATIVE STATEMENT & MULTI-CRITERIA RANKING
// =========================================================================

export interface RankedComparativeBid {
  rank: number; // 1 = L1, 2 = L2, etc.
  bidId: string;
  vendorId: string;
  vendorName: string;
  vendorTier: string;
  netLandedRateINR: number;
  totalContractCostINR: number;
  costDeltaL1INR: number; // 0 for L1, +amount for L2
  costDeltaPercent: number; // 0% for L1
  deliveryLeadTimeDays: number;
  paymentCreditTerms: string;
  vendorQualityRating: number;
  compositeScore: number; // Out of 100
  isRecommended: boolean;
}

export interface ComparativeStatementSummary {
  rfqId: string;
  rfqNumber: string;
  materialName: string;
  requiredQuantity: number;
  standardUOM: string;
  engineeringBudgetLandedINR: number;
  rankedBids: RankedComparativeBid[];
  recommendationNote: string;
  recommendedBidId?: string;
  managingAuthorityStatus: "DRAFT" | "SUBMITTED_TO_FINANCE" | "APPROVED_FOR_PO" | "REJECTED";
  recommendedBy?: string;
  submittedDate?: string;
}

/**
 * Computes Multi-Criteria Comparative Ranking:
 * - Commercial Landed Rate: 50%
 * - Delivery Lead Days: 20%
 * - Payment Credit Days: 15%
 * - Historical Vendor Rating: 15%
 */
export function generateComparativeStatement(
  rfq: MaterialRFQItem,
  bids: VendorQuotationBid[],
  vendors: VerifiedVendorProfile[],
  baselineBudgetPerUOMINR: number
): ComparativeStatementSummary {
  const rfqBids = bids.filter((b) => b.rfqId === rfq.id);

  // Sort bids by total landed cost ascending (L1 first)
  const sortedBids = [...rfqBids].sort(
    (a, b) => a.totalLandedContractCostINR - b.totalLandedContractCostINR
  );

  const l1Cost = sortedBids[0]?.totalLandedContractCostINR || 1;

  const rankedBids: RankedComparativeBid[] = sortedBids.map((bid, index) => {
    const vendor = vendors.find((v) => v.id === bid.vendorId);
    const costDelta = bid.totalLandedContractCostINR - l1Cost;
    const costDeltaPct = Math.round((costDelta / l1Cost) * 1000) / 10;

    // Credit days estimation
    const creditDays = bid.paymentCreditTerms.includes("30")
      ? 30
      : bid.paymentCreditTerms.includes("21")
        ? 21
        : bid.paymentCreditTerms.includes("15")
          ? 15
          : 0;

    // Composite scoring out of 100
    const priceScore = Math.max(0, 50 - costDeltaPct * 2);
    const deliveryScore = Math.max(0, 20 - (bid.deliveryLeadTimeDays - 2) * 3);
    const creditScore = (creditDays / 30) * 15;
    const qualityScore = ((vendor?.performanceMetrics.qualityRating || 4.5) / 5) * 15;
    const composite = Math.round((priceScore + deliveryScore + creditScore + qualityScore) * 10) / 10;

    return {
      rank: index + 1,
      bidId: bid.id,
      vendorId: bid.vendorId,
      vendorName: bid.vendorName,
      vendorTier: vendor?.performanceMetrics.tier || "TIER_1_PREFERRED",
      netLandedRateINR: bid.netLandedRatePerUOMINR,
      totalContractCostINR: bid.totalLandedContractCostINR,
      costDeltaL1INR: costDelta,
      costDeltaPercent: costDeltaPct,
      deliveryLeadTimeDays: bid.deliveryLeadTimeDays,
      paymentCreditTerms: bid.paymentCreditTerms,
      vendorQualityRating: vendor?.performanceMetrics.qualityRating || 4.5,
      compositeScore: composite,
      isRecommended: index === 0, // Auto-recommend L1 by default
    };
  });

  return {
    rfqId: rfq.id,
    rfqNumber: rfq.rfqNumber,
    materialName: rfq.materialName,
    requiredQuantity: rfq.requiredQuantity,
    standardUOM: rfq.standardUOM,
    engineeringBudgetLandedINR: baselineBudgetPerUOMINR * rfq.requiredQuantity,
    rankedBids,
    recommendationNote:
      sortedBids.length > 0
        ? `Recommend award to L1 bidder ${sortedBids[0].vendorName} at net landed rate of ₹${sortedBids[0].netLandedRatePerUOMINR.toLocaleString("en-IN")}/${rfq.standardUOM}. Meets technical IS specs and offers competitive credit terms.`
        : "No quotes received yet.",
    recommendedBidId: sortedBids[0]?.id,
    managingAuthorityStatus: "SUBMITTED_TO_FINANCE",
    recommendedBy: "Rajesh Sharma (Project Manager)",
    submittedDate: "2026-03-01",
  };
}

/**
 * Validates 15-character Indian GSTIN format
 * Format: 2 digits (state) + 5 letters (PAN) + 4 digits (PAN) + 1 letter (PAN) + 1 digit/letter (entity) + 'Z' + 1 checksum digit/letter
 */
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
}

