/**
 * Ostaad ERP - BOQ, Rate Analysis & Cost Control (Module 4)
 * Sub-Module 4.1: Hierarchical BOQ Sections, Items & Units Registry (IS 1200)
 * Sub-Module 4.2: Excel/CSV Import, Column Mapping & Bulk Verification
 * Sub-Module 4.3: Versioning, Revision History & Change Order Variations
 * Sub-Module 4.4: Material Breakdown & Requirement Derivation Engine (IS 456 BOM)
 * Sub-Module 4.5: Running Account (RA) Billing & Client Measurement Sheets
 */

// =========================================================================
// SUB-MODULE 4.1 & 4.2: HIERARCHICAL BOQ & COLUMN MAPPING REGISTRY
// =========================================================================

export type BOQTradeCategory =
  | "EARTHWORK"
  | "CONCRETE_PCC"
  | "CONCRETE_RCC"
  | "REINFORCEMENT"
  | "FORMWORK"
  | "MASONRY"
  | "PLASTERING"
  | "WATERPROOFING"
  | "FLOORING"
  | "MEP_ELECTRICAL"
  | "MEP_PLUMBING";

export interface HierarchicalBOQItem {
  id: string;
  wbsCode: string;
  category: BOQTradeCategory;
  description: string;
  specificationClause: string;
  unit: "cum" | "sqm" | "rmt" | "MT" | "bags" | "nos" | "kg" | "litres";
  tenderQuantity: number;
  approvedRateINR: number;
  totalAmountINR: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedDate?: string;
}

export const DEFAULT_DETAILED_BOQ_ITEMS: HierarchicalBOQItem[] = [
  {
    id: "boq-item-01",
    wbsCode: "1.1.01",
    category: "EARTHWORK",
    description: "Earthwork excavation in foundation trenches and basement in all kinds of soil over areas, disposal with 50m lead",
    specificationClause: "CPWD Spec 2.8.1 / IS 1200 Part 1",
    unit: "cum",
    tenderQuantity: 4850,
    approvedRateINR: 285,
    totalAmountINR: 1382250,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-02",
    wbsCode: "1.2.01",
    category: "CONCRETE_PCC",
    description: "Providing and laying in position plain cement concrete (PCC 1:3:6 nominal mix) for levelling course",
    specificationClause: "IS 456 Clause 9.1",
    unit: "cum",
    tenderQuantity: 420,
    approvedRateINR: 4850,
    totalAmountINR: 2037000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-03",
    wbsCode: "1.2.02",
    category: "CONCRETE_RCC",
    description: "Providing and laying design mix M35 grade ready-mix concrete (RMC) for foundation raft slab and retaining walls",
    specificationClause: "IS 456 / IS 10262",
    unit: "cum",
    tenderQuantity: 1850,
    approvedRateINR: 6450,
    totalAmountINR: 11932500,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-04",
    wbsCode: "1.3.01",
    category: "REINFORCEMENT",
    description: "Thermo-mechanically treated (TMT Fe 550D) high-yield strength rebar: cutting, bending, binding with 18-gauge wire, placing",
    specificationClause: "IS 1786 / IS 2502",
    unit: "MT",
    tenderQuantity: 280,
    approvedRateINR: 72500,
    totalAmountINR: 20300000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-05",
    wbsCode: "1.4.01",
    category: "FORMWORK",
    description: "Centering, shuttering and propping using water-resistant film-faced plywood shuttering with steel props for columns and slabs",
    specificationClause: "CPWD Spec 5.9 / IS 14687",
    unit: "sqm",
    tenderQuantity: 14200,
    approvedRateINR: 480,
    totalAmountINR: 6816000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-06",
    wbsCode: "2.1.01",
    category: "MASONRY",
    description: "Autoclaved Aerated Concrete (AAC) lightweight block masonry (200mm thick) using polymer modified thin-bed block jointing adhesive",
    specificationClause: "IS 2185 Part 3",
    unit: "cum",
    tenderQuantity: 1250,
    approvedRateINR: 4200,
    totalAmountINR: 5250000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-07",
    wbsCode: "2.2.01",
    category: "PLASTERING",
    description: "20mm thick cement plaster in two coats (1:4) on external walls finished with sponge texture and water-repellent additive",
    specificationClause: "CPWD Spec 12.11 / IS 1661",
    unit: "sqm",
    tenderQuantity: 11500,
    approvedRateINR: 320,
    totalAmountINR: 3680000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-08",
    wbsCode: "2.3.01",
    category: "WATERPROOFING",
    description: "Two-component elastomeric cementitious and PU polymer waterproofing membrane system over sunken slabs, terrace, and water tanks",
    specificationClause: "IS 1346 / ASTM C836",
    unit: "sqm",
    tenderQuantity: 4500,
    approvedRateINR: 650,
    totalAmountINR: 2925000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-09",
    wbsCode: "2.4.01",
    category: "FLOORING",
    description: "Double-charged vitrified tile flooring (800x800mm, Grade AA) laid on 20mm thick cement mortar (1:4) with epoxy grouted joints",
    specificationClause: "IS 15622",
    unit: "sqm",
    tenderQuantity: 6800,
    approvedRateINR: 1250,
    totalAmountINR: 8500000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
  {
    id: "boq-item-10",
    wbsCode: "3.1.01",
    category: "MEP_ELECTRICAL",
    description: "Heavy-duty concealed FRLS PVC electrical conduit piping, junction boxes, and MS pull wire inside concrete slabs and masonry",
    specificationClause: "IS 9537 Part 3",
    unit: "rmt",
    tenderQuantity: 9200,
    approvedRateINR: 185,
    totalAmountINR: 1702000,
    isVerified: true,
    verifiedBy: "Rajesh Sharma (PM)",
    verifiedDate: "2026-01-20",
  },
];

// =========================================================================
// SUB-MODULE 4.3: VERSIONING, REVISION HISTORY & CHANGE ORDERS
// =========================================================================

export interface BOQChangeOrder {
  id: string;
  changeOrderNumber: string;
  targetItemId: string;
  itemDescription: string;
  originalQuantity: number;
  revisedQuantity: number;
  quantityDelta: number;
  rateINR: number;
  costImpactINR: number;
  reasonForVariation: string;
  status: "APPROVED" | "PENDING_APPROVAL" | "REJECTED";
  requestedBy: string;
  approvedBy?: string;
  date: string;
}

export const DEFAULT_CHANGE_ORDERS: BOQChangeOrder[] = [
  {
    id: "co-01",
    changeOrderNumber: "CO-2026-001",
    targetItemId: "boq-item-03",
    itemDescription: "Providing and laying design mix M35 grade ready-mix concrete (RMC) for foundation raft",
    originalQuantity: 1850,
    revisedQuantity: 1980,
    quantityDelta: 130, // +130 cum
    rateINR: 6450,
    costImpactINR: 838500, // +₹8,38,500
    reasonForVariation: "Site strata required additional 150mm thickening of raft foundation under central elevator shear walls.",
    status: "APPROVED",
    requestedBy: "Vikram Kulkarni (Lead Resident Engineer)",
    approvedBy: "Managing Authority / Project Director",
    date: "2026-02-18",
  },
  {
    id: "co-02",
    changeOrderNumber: "CO-2026-002",
    targetItemId: "boq-item-04",
    itemDescription: "Thermo-mechanically treated (TMT Fe 550D) high-yield strength rebar",
    originalQuantity: 280,
    revisedQuantity: 298,
    quantityDelta: 18, // +18 MT
    rateINR: 72500,
    costImpactINR: 1305000, // +₹13,05,000
    reasonForVariation: "Enhanced seismic ductile detailing (IS 13920) increased horizontal link density in shear wall boundaries.",
    status: "APPROVED",
    requestedBy: "Vikram Kulkarni (Lead Resident Engineer)",
    approvedBy: "Managing Authority / Project Director",
    date: "2026-02-25",
  },
];

// =========================================================================
// SUB-MODULE 4.4: SCIENTIFIC MATERIAL DECOMPOSITION ENGINE (IS 456 BOM)
// =========================================================================

export interface DecomposedMaterialBOM {
  materialId: string;
  materialName: string;
  category: "CEMENT" | "STEEL" | "AGGREGATES" | "SAND" | "BLOCKS" | "CHEMICALS";
  standardUOM: string;
  requiredGrossQuantity: number;
  wastageBufferPercent: number; // e.g. 4% rebar scrap, 2% cement handling
  netPurchaseQuantity: number;
  sourceBOQItemsCount: number;
  benchmarkLandedRateINR: number;
  totalEstimatedOutlayINR: number;
}

/**
 * Decomposes Hierarchical BOQ items into scientific gross Bill of Materials (BOM)
 * based on IS 456 / IS 1200 empirical mix design constants:
 * - 1 cum M35 Concrete = 8.2 Bags OPC 53 Cement + 0.45 cum River Sand + 0.85 cum 20mm/10mm Aggregates
 * - 1 cum M10 PCC = 4.4 Bags OPC Cement + 0.48 cum Sand + 0.90 cum Coarse Aggregates
 * - 1 MT Rebar = 1.04 MT gross steel (4% lapping/cutting wastage) + 12 kg Binding Wire
 * - 1 cum AAC Blockwork = 28 Nos 600x200x200 Blocks + 1.2 Bags Jointing Mortar Adhesive
 * - 100 sqm Plaster 20mm = 18 Bags Cement + 2.4 cum Screened Sand
 */
export function calculateMaterialDecomposition(
  boqItems: HierarchicalBOQItem[]
): DecomposedMaterialBOM[] {
  let cementBagsTotal = 0;
  let sandCumTotal = 0;
  let aggregatesCumTotal = 0;
  let steelMTTotal = 0;
  let aacBlocksTotal = 0;
  let jointAdhesiveBags = 0;

  boqItems.forEach((item) => {
    if (item.category === "CONCRETE_RCC") {
      // M35 design mix decomposition
      cementBagsTotal += item.tenderQuantity * 8.2;
      sandCumTotal += item.tenderQuantity * 0.45;
      aggregatesCumTotal += item.tenderQuantity * 0.85;
    } else if (item.category === "CONCRETE_PCC") {
      // M10 PCC decomposition
      cementBagsTotal += item.tenderQuantity * 4.4;
      sandCumTotal += item.tenderQuantity * 0.48;
      aggregatesCumTotal += item.tenderQuantity * 0.90;
    } else if (item.category === "REINFORCEMENT") {
      // Rebar gross tonnage
      steelMTTotal += item.tenderQuantity * 1.04; // 4% scrap & lapping
    } else if (item.category === "MASONRY") {
      // AAC block masonry
      aacBlocksTotal += item.tenderQuantity * 28;
      jointAdhesiveBags += item.tenderQuantity * 1.2;
    } else if (item.category === "PLASTERING") {
      // 20mm external/internal plaster
      cementBagsTotal += (item.tenderQuantity / 100) * 18;
      sandCumTotal += (item.tenderQuantity / 100) * 2.4;
    }
  });

  return [
    {
      materialId: "mat-cem",
      materialName: "Ordinary Portland Cement (OPC 53 Grade)",
      category: "CEMENT",
      standardUOM: "50kg Bags",
      requiredGrossQuantity: Math.round(cementBagsTotal),
      wastageBufferPercent: 2.0,
      netPurchaseQuantity: Math.round(cementBagsTotal * 1.02),
      sourceBOQItemsCount: 4,
      benchmarkLandedRateINR: 375,
      totalEstimatedOutlayINR: Math.round(cementBagsTotal * 1.02 * 375),
    },
    {
      materialId: "mat-stl",
      materialName: "Primary Producer TMT Rebar (Fe 550D)",
      category: "STEEL",
      standardUOM: "Metric Tonnes (MT)",
      requiredGrossQuantity: Math.round(steelMTTotal * 10) / 10,
      wastageBufferPercent: 3.5,
      netPurchaseQuantity: Math.round(steelMTTotal * 1.035 * 10) / 10,
      sourceBOQItemsCount: 1,
      benchmarkLandedRateINR: 68500,
      totalEstimatedOutlayINR: Math.round(steelMTTotal * 1.035 * 68500),
    },
    {
      materialId: "mat-snd",
      materialName: "Manufactured Sand (M-Sand Zone II)",
      category: "SAND",
      standardUOM: "Cubic Meters (cum)",
      requiredGrossQuantity: Math.round(sandCumTotal),
      wastageBufferPercent: 5.0,
      netPurchaseQuantity: Math.round(sandCumTotal * 1.05),
      sourceBOQItemsCount: 3,
      benchmarkLandedRateINR: 1650,
      totalEstimatedOutlayINR: Math.round(sandCumTotal * 1.05 * 1650),
    },
    {
      materialId: "mat-agg",
      materialName: "Crushed Coarse Aggregates (20mm & 10mm Graded)",
      category: "AGGREGATES",
      standardUOM: "Cubic Meters (cum)",
      requiredGrossQuantity: Math.round(aggregatesCumTotal),
      wastageBufferPercent: 4.0,
      netPurchaseQuantity: Math.round(aggregatesCumTotal * 1.04),
      sourceBOQItemsCount: 2,
      benchmarkLandedRateINR: 1450,
      totalEstimatedOutlayINR: Math.round(aggregatesCumTotal * 1.04 * 1450),
    },
    {
      materialId: "mat-aac",
      materialName: "Autoclaved Aerated Concrete Blocks (600x200x200mm)",
      category: "BLOCKS",
      standardUOM: "Blocks (Nos)",
      requiredGrossQuantity: Math.round(aacBlocksTotal),
      wastageBufferPercent: 3.0,
      netPurchaseQuantity: Math.round(aacBlocksTotal * 1.03),
      sourceBOQItemsCount: 1,
      benchmarkLandedRateINR: 88,
      totalEstimatedOutlayINR: Math.round(aacBlocksTotal * 1.03 * 88),
    },
  ];
}

// =========================================================================
// SUB-MODULE 4.5: RUNNING ACCOUNT (RA) BILLING & CLIENT MEASUREMENT
// =========================================================================

export interface RABillLineMeasurement {
  boqItemId: string;
  wbsCode: string;
  description: string;
  unit: string;
  approvedRateINR: number;
  tenderQuantity: number;
  previousExecutedQuantity: number;
  currentExecutedQuantity: number;
  cumulativeExecutedQuantity: number;
  cumulativeProgressPercent: number;
  currentAmountINR: number;
  cumulativeAmountINR: number;
}

export interface RunningAccountBillSummary {
  billNumber: string; // e.g. "RA Bill #04"
  billDate: string;
  contractorName: string;
  projectCode: string;
  projectName: string;
  measurementPeriod: string;
  grossCurrentAmountINR: number;
  retentionMoneyDeductionPercent: number; // 5%
  retentionMoneyDeductionINR: number;
  mobilizationAdvanceRecoveryPercent: number; // 10%
  mobilizationAdvanceRecoveryINR: number;
  taxDeductionAtSourceTDSPercent: number; // 2%
  taxDeductionAtSourceTDSINR: number;
  gstWorksContractPercent: number; // 18%
  gstWorksContractINR: number;
  netPayableToContractorINR: number;
  lines: RABillLineMeasurement[];
}

export const DEFAULT_RA_BILL_04: RunningAccountBillSummary = {
  billNumber: "RA-BILL-04",
  billDate: "2026-03-01",
  contractorName: "L&T Construction Consortium Ltd.",
  projectCode: "PRJ-PUN-2026-TWR-B",
  projectName: "Commercial Complex — Tower B",
  measurementPeriod: "01 Feb 2026 to 28 Feb 2026",
  grossCurrentAmountINR: 8425000, // ₹84.25 Lakhs
  retentionMoneyDeductionPercent: 5.0,
  retentionMoneyDeductionINR: 421250,
  mobilizationAdvanceRecoveryPercent: 10.0,
  mobilizationAdvanceRecoveryINR: 842500,
  taxDeductionAtSourceTDSPercent: 2.0,
  taxDeductionAtSourceTDSINR: 168500,
  gstWorksContractPercent: 18.0,
  gstWorksContractINR: 1516500,
  netPayableToContractorINR: 8509250, // Gross - Retention - Adv - TDS + GST
  lines: [
    {
      boqItemId: "boq-item-01",
      wbsCode: "1.1.01",
      description: "Earthwork excavation in foundation trenches and basement in all kinds of soil",
      unit: "cum",
      approvedRateINR: 285,
      tenderQuantity: 4850,
      previousExecutedQuantity: 4200,
      currentExecutedQuantity: 650,
      cumulativeExecutedQuantity: 4850,
      cumulativeProgressPercent: 100,
      currentAmountINR: 185250,
      cumulativeAmountINR: 1382250,
    },
    {
      boqItemId: "boq-item-02",
      wbsCode: "1.2.01",
      description: "PCC (1:3:6 nominal mix) for levelling course",
      unit: "cum",
      approvedRateINR: 4850,
      tenderQuantity: 420,
      previousExecutedQuantity: 320,
      currentExecutedQuantity: 100,
      cumulativeExecutedQuantity: 420,
      cumulativeProgressPercent: 100,
      currentAmountINR: 485000,
      cumulativeAmountINR: 2037000,
    },
    {
      boqItemId: "boq-item-03",
      wbsCode: "1.2.02",
      description: "Design mix M35 grade ready-mix concrete (RMC) for foundation raft",
      unit: "cum",
      approvedRateINR: 6450,
      tenderQuantity: 1850,
      previousExecutedQuantity: 350,
      currentExecutedQuantity: 580,
      cumulativeExecutedQuantity: 930,
      cumulativeProgressPercent: 50.3,
      currentAmountINR: 3741000,
      cumulativeAmountINR: 5998500,
    },
    {
      boqItemId: "boq-item-04",
      wbsCode: "1.3.01",
      description: "TMT Fe 550D high-yield strength rebar cutting, bending, and placing",
      unit: "MT",
      approvedRateINR: 72500,
      tenderQuantity: 280,
      previousExecutedQuantity: 45,
      currentExecutedQuantity: 52,
      cumulativeExecutedQuantity: 97,
      cumulativeProgressPercent: 34.6,
      currentAmountINR: 3770000,
      cumulativeAmountINR: 7032500,
    },
    {
      boqItemId: "boq-item-05",
      wbsCode: "1.4.01",
      description: "Centering, shuttering and propping using film-faced plywood",
      unit: "sqm",
      approvedRateINR: 480,
      tenderQuantity: 14200,
      previousExecutedQuantity: 1200,
      currentExecutedQuantity: 508,
      cumulativeExecutedQuantity: 1708,
      cumulativeProgressPercent: 12.0,
      currentAmountINR: 243750,
      cumulativeAmountINR: 819840,
    },
  ],
};

