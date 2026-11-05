/**
 * Ostaad ERP - Pre-Construction Planning Engine
 * Sub-Module 2.8: Master BOQ Template & Excel/CSV Importer/Exporter (Tool 3)
 * Sub-Module 2.9: Pre-Construction Vendor Comparison Matrix (Tool 7)
 *
 * Implements CPWD / IS 1200 hierarchical BOQ structures, CSV import/export parsing,
 * landed cost calculations (Base + Freight + Loading + GST), and multi-criteria
 * vendor comparative statements (L1 vs V1 Best Value ranking).
 */

// =========================================================================
// TOOL 3: MASTER BOQ TEMPLATE & EXCEL/CSV IMPORTER/EXPORTER
// =========================================================================

export type BOQCategory =
  | "EARTHWORK"
  | "CONCRETE"
  | "REBAR"
  | "FORMWORK"
  | "MASONRY"
  | "PLASTER"
  | "WATERPROOF"
  | "FLOORING"
  | "OPENINGS"
  | "MEP";

export interface MasterBOQItem {
  id: string;
  wbsCode: string;
  category: BOQCategory;
  description: string;
  specReference: string;
  unit: string;
  quantity: number;
  unitRateINR: number;
  totalAmountINR: number;
  notes?: string;
}

export const BOQ_CATEGORIES: { id: BOQCategory; name: string; icon: string }[] = [
  { id: "EARTHWORK", name: "1. Earthwork & Excavation", icon: "Shovel" },
  { id: "CONCRETE", name: "2. Plain & Reinforced Concrete", icon: "Box" },
  { id: "REBAR", name: "3. TMT Reinforcement Steel", icon: "Layers" },
  { id: "FORMWORK", name: "4. Shuttering & Scaffolding", icon: "Grid" },
  { id: "MASONRY", name: "5. AAC Blockwork & Masonry", icon: "Square" },
  { id: "PLASTER", name: "6. Internal & External Plaster", icon: "Brush" },
  { id: "WATERPROOF", name: "7. Waterproofing Systems", icon: "Shield" },
  { id: "FLOORING", name: "8. Flooring, Cladding & Dado", icon: "Sparkles" },
  { id: "OPENINGS", name: "9. Doors, Windows & Glazing", icon: "DoorClosed" },
  { id: "MEP", name: "10. MEP Rough-Ins & Conduiting", icon: "Zap" },
];

export const DEFAULT_MASTER_BOQ: MasterBOQItem[] = [
  {
    id: "boq-001",
    wbsCode: "WBS-01.01",
    category: "EARTHWORK",
    description: "Earthwork excavation in all kinds of soil over areas including disposal within 50m lead as per drawing",
    specReference: "CPWD Spec 2.8.1 / IS 1200 Part 1",
    unit: "cum",
    quantity: 4850,
    unitRateINR: 285,
    totalAmountINR: 1382250,
  },
  {
    id: "boq-002",
    wbsCode: "WBS-01.02",
    category: "EARTHWORK",
    description: "Anti-termite treatment around foundation trenches and under plinth floor slab using Chlorpyrifos 20% EC",
    specReference: "IS 6313 Part 2",
    unit: "sqm",
    quantity: 3200,
    unitRateINR: 110,
    totalAmountINR: 352000,
  },
  {
    id: "boq-003",
    wbsCode: "WBS-02.01",
    category: "CONCRETE",
    description: "Providing and laying in-situ M10 grade nominal mix PCC (1:3:6) for leveling course under foundations",
    specReference: "IS 456 Clause 9.1",
    unit: "cum",
    quantity: 420,
    unitRateINR: 4850,
    totalAmountINR: 2037000,
  },
  {
    id: "boq-004",
    wbsCode: "WBS-02.02",
    category: "CONCRETE",
    description: "Providing and laying in-situ design mix M30 grade RMC for isolated pad footings, plinth beams, and retaining walls",
    specReference: "IS 456 / IS 10262",
    unit: "cum",
    quantity: 1850,
    unitRateINR: 6450,
    totalAmountINR: 11932500,
  },
  {
    id: "boq-005",
    wbsCode: "WBS-03.01",
    category: "REBAR",
    description: "Thermo-mechanically treated (TMT Fe 550D) high yield strength rebar: cutting, bending, binding, and placing in position",
    specReference: "IS 1786 / IS 2502",
    unit: "MT",
    quantity: 260,
    unitRateINR: 72500,
    totalAmountINR: 18850000,
  },
  {
    id: "boq-006",
    wbsCode: "WBS-04.01",
    category: "FORMWORK",
    description: "Centering, shuttering and propping using water-resistant film-faced plywood shuttering with steel props",
    specReference: "CPWD Spec 5.9 / IS 14687",
    unit: "sqm",
    quantity: 14200,
    unitRateINR: 480,
    totalAmountINR: 6816000,
  },
  {
    id: "boq-007",
    wbsCode: "WBS-05.01",
    category: "MASONRY",
    description: "Autoclaved Aerated Concrete (AAC) block masonry (200mm thick) using polymer modified thin-bed block jointing adhesive",
    specReference: "IS 2185 Part 3",
    unit: "cum",
    quantity: 1250,
    unitRateINR: 4200,
    totalAmountINR: 5250000,
  },
  {
    id: "boq-008",
    wbsCode: "WBS-06.01",
    category: "PLASTER",
    description: "20mm thick cement plaster in two coats (1:4) on external walls finished with sponge texture and water-repellent additive",
    specReference: "CPWD Spec 12.11 / IS 1661",
    unit: "sqm",
    quantity: 11500,
    unitRateINR: 320,
    totalAmountINR: 3680000,
  },
  {
    id: "boq-009",
    wbsCode: "WBS-07.01",
    category: "WATERPROOF",
    description: "Two-component elastomeric cementitious and PU polymer waterproofing membrane system over sunken slabs, terrace, and water tanks",
    specReference: "IS 1346 / ASTM C836",
    unit: "sqm",
    quantity: 4500,
    unitRateINR: 650,
    totalAmountINR: 2925000,
  },
  {
    id: "boq-010",
    wbsCode: "WBS-08.01",
    category: "FLOORING",
    description: "Double-charged vitrified tile flooring (800x800mm, Grade AA) laid on 20mm thick cement mortar (1:4) with epoxy grouted joints",
    specReference: "IS 15622",
    unit: "sqm",
    quantity: 6800,
    unitRateINR: 1250,
    totalAmountINR: 8500000,
  },
  {
    id: "boq-011",
    wbsCode: "WBS-10.01",
    category: "MEP",
    description: "Concealed heavy-duty FRLS PVC electrical conduit piping, junction boxes, and MS pull wire inside concrete slabs and masonry",
    specReference: "IS 9537 Part 3",
    unit: "rmt",
    quantity: 9200,
    unitRateINR: 185,
    totalAmountINR: 1702000,
  },
];

/**
 * Calculates Grand Total and Section Subtotals for Master BOQ
 */
export function calculateBOQSummary(items: MasterBOQItem[]) {
  let grandTotalINR = 0;
  const categorySubtotals: Record<string, number> = {};

  items.forEach((item) => {
    grandTotalINR += item.totalAmountINR;
    categorySubtotals[item.category] = (categorySubtotals[item.category] || 0) + item.totalAmountINR;
  });

  return {
    totalItems: items.length,
    grandTotalINR,
    grandTotalLakhs: Math.round((grandTotalINR / 100000) * 100) / 100,
    grandTotalCrores: Math.round((grandTotalINR / 10000000) * 100) / 100,
    categorySubtotals,
  };
}

/**
 * Serializes Master BOQ to CSV format with UTF-8 BOM for Excel compatibility
 */
export function exportBOQToCSV(items: MasterBOQItem[]): string {
  const headers = [
    "WBS Code",
    "Category",
    "Item Description",
    "Specification Reference",
    "Unit",
    "Quantity",
    "Unit Rate (INR)",
    "Total Amount (INR)",
    "Notes",
  ];

  const rows = items.map((item) => [
    `"${item.wbsCode}"`,
    `"${item.category}"`,
    `"${item.description.replace(/"/g, '""')}"`,
    `"${item.specReference.replace(/"/g, '""')}"`,
    `"${item.unit}"`,
    item.quantity,
    item.unitRateINR,
    item.totalAmountINR,
    `"${(item.notes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return csvContent;
}

/**
 * Parses CSV text into Master BOQ Items
 */
export function parseBOQFromCSV(csvText: string): { items: MasterBOQItem[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const items: MasterBOQItem[] = [];
  const errors: string[] = [];

  if (lines.length <= 1) {
    errors.push("CSV file contains no data rows.");
    return { items, errors };
  }

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV regex parse accounting for quotes
    const cols = line.match(/(?:\"[^\"]*\"|[^,])+/g) || [];
    const cleanCols = cols.map((c) => c.replace(/^"|"$/g, "").trim());

    if (cleanCols.length < 7) {
      errors.push(`Row ${i + 1}: Insufficient columns (found ${cleanCols.length}, expected at least 7).`);
      continue;
    }

    const wbsCode = cleanCols[0] || `WBS-${i.toString().padStart(2, "0")}`;
    const rawCategory = cleanCols[1].toUpperCase();
    const category: BOQCategory = (BOQ_CATEGORIES.some((c) => c.id === rawCategory)
      ? rawCategory
      : "CONCRETE") as BOQCategory;
    const description = cleanCols[2] || `Imported Item ${i}`;
    const specReference = cleanCols[3] || "Standard IS Specification";
    const unit = cleanCols[4] || "nos";
    const quantity = parseFloat(cleanCols[5]) || 0;
    const unitRateINR = parseFloat(cleanCols[6]) || 0;
    const totalAmountINR = Math.round(quantity * unitRateINR);
    const notes = cleanCols[8] || "";

    items.push({
      id: `imp-${Date.now()}-${i}`,
      wbsCode,
      category,
      description,
      specReference,
      unit,
      quantity,
      unitRateINR,
      totalAmountINR,
      notes,
    });
  }

  return { items, errors };
}

// =========================================================================
// TOOL 7: PRE-CONSTRUCTION VENDOR COMPARISON MATRIX & BENCHMARKING
// =========================================================================

export type VendorPackageType = "CEMENT" | "REBAR" | "RMC" | "FORMWORK";

export interface VendorBid {
  id: string;
  vendorName: string;
  brandOrGrade: string;
  plantLocation: string;
  distanceKm: number;
  baseRateINR: number; // Ex-factory rate per UOM
  freightINR: number; // Transport/cartage per UOM
  unloadingINR: number; // Loading/unloading per UOM
  gstPercent: number; // 18% or 28%
  creditPeriodDays: number; // e.g. 0 (Advance), 15, 30, 45, 60
  leadTimeDays: number; // Delivery turnaround time
  minOrderQuantity: number;
  bisCertified: boolean;
  testCertificateProvided: boolean;
  qualityRatingStars: number; // 1 to 5
}

export interface EvaluatedVendorBid {
  bid: VendorBid;
  subtotalBeforeTaxINR: number;
  gstAmountINR: number;
  landedRateINR: number; // Net all-inclusive cost to site
  isL1LowestCost: boolean;
  isBestValue: boolean; // V1 composite highest score
  compositeScore: number; // out of 100
  scoreBreakdown: {
    priceScore: number; // Max 45
    creditScore: number; // Max 20
    leadTimeScore: number; // Max 15
    qualityScore: number; // Max 20
  };
}

export interface MaterialPackageBenchmark {
  id: VendorPackageType;
  packageName: string;
  uom: string;
  projectEstimatedQuantity: number;
  bids: VendorBid[];
}

export const BENCHMARK_PACKAGES: MaterialPackageBenchmark[] = [
  {
    id: "CEMENT",
    packageName: "Ordinary Portland Cement (OPC 53 Grade)",
    uom: "50kg Bag",
    projectEstimatedQuantity: 35000,
    bids: [
      {
        id: "bid-cem-1",
        vendorName: "UltraTech Building Solutions Hub",
        brandOrGrade: "UltraTech Super 53 Grade (IS 269)",
        plantLocation: "Chakan Depot, Pune",
        distanceKm: 28,
        baseRateINR: 345,
        freightINR: 12,
        unloadingINR: 6,
        gstPercent: 28,
        creditPeriodDays: 45,
        leadTimeDays: 2,
        minOrderQuantity: 500,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.8,
      },
      {
        id: "bid-cem-2",
        vendorName: "Ambuja Cements Direct Logistics",
        brandOrGrade: "Ambuja Plus Roof Special (OPC 53)",
        plantLocation: "Talegaon Depot, Pune",
        distanceKm: 34,
        baseRateINR: 338,
        freightINR: 15,
        unloadingINR: 6,
        gstPercent: 28,
        creditPeriodDays: 30,
        leadTimeDays: 3,
        minOrderQuantity: 600,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.6,
      },
      {
        id: "bid-cem-3",
        vendorName: "JSW Cement Regional Depot",
        brandOrGrade: "JSW Concreel HD (Composite/OPC)",
        plantLocation: "Hadapsar Industrial Estate",
        distanceKm: 18,
        baseRateINR: 325,
        freightINR: 10,
        unloadingINR: 6,
        gstPercent: 28,
        creditPeriodDays: 15,
        leadTimeDays: 1,
        minOrderQuantity: 400,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.2,
      },
    ],
  },
  {
    id: "REBAR",
    packageName: "Primary Producer TMT Reinforcement (Fe 550D)",
    uom: "Metric Tonne (MT)",
    projectEstimatedQuantity: 280,
    bids: [
      {
        id: "bid-reb-1",
        vendorName: "Tata Tiscon Authorized Distributor",
        brandOrGrade: "Tata Tiscon 550D Super Ductile",
        plantLocation: "Bhosari Central Yard",
        distanceKm: 22,
        baseRateINR: 58500,
        freightINR: 1200,
        unloadingINR: 400,
        gstPercent: 18,
        creditPeriodDays: 30,
        leadTimeDays: 3,
        minOrderQuantity: 20,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.9,
      },
      {
        id: "bid-reb-2",
        vendorName: "JSW Neosteel Distribution Network",
        brandOrGrade: "JSW Neosteel Fe 550D CRS (IS 1786)",
        plantLocation: "Chakan MIDC Yard",
        distanceKm: 30,
        baseRateINR: 56800,
        freightINR: 1400,
        unloadingINR: 400,
        gstPercent: 18,
        creditPeriodDays: 21,
        leadTimeDays: 4,
        minOrderQuantity: 25,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.7,
      },
      {
        id: "bid-reb-3",
        vendorName: "Jindal Panther Regional Consortium",
        brandOrGrade: "Jindal Panther Fe 550D Earthquake Resistant",
        plantLocation: "Uruli Kanchan Logistics Hub",
        distanceKm: 26,
        baseRateINR: 55400,
        freightINR: 1500,
        unloadingINR: 400,
        gstPercent: 18,
        creditPeriodDays: 0, // Advance only
        leadTimeDays: 5,
        minOrderQuantity: 30,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.4,
      },
    ],
  },
  {
    id: "RMC",
    packageName: "Ready Mix Concrete (Design Mix M30 Grade)",
    uom: "Cubic Meter (cum)",
    projectEstimatedQuantity: 1850,
    bids: [
      {
        id: "bid-rmc-1",
        vendorName: "RDC Concrete India Batching Plant",
        brandOrGrade: "Design Mix M30 with Flyash Slag & Poly-carboxylate Superplasticizer",
        plantLocation: "Kharadi Transit Hub",
        distanceKm: 8,
        baseRateINR: 4850,
        freightINR: 350,
        unloadingINR: 0,
        gstPercent: 18,
        creditPeriodDays: 30,
        leadTimeDays: 1,
        minOrderQuantity: 6,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.7,
      },
      {
        id: "bid-rmc-2",
        vendorName: "Prism Johnson RMC Division",
        brandOrGrade: "MegaMix M30 Commercial High-Workability",
        plantLocation: "Wagholi Plant",
        distanceKm: 12,
        baseRateINR: 4700,
        freightINR: 420,
        unloadingINR: 0,
        gstPercent: 18,
        creditPeriodDays: 15,
        leadTimeDays: 1,
        minOrderQuantity: 6,
        bisCertified: true,
        testCertificateProvided: true,
        qualityRatingStars: 4.5,
      },
    ],
  },
];

/**
 * Evaluates Vendor Bids for Landed Cost and Multi-Criteria Composite Scoring
 */
export function evaluateVendorBids(bids: VendorBid[]): EvaluatedVendorBid[] {
  if (bids.length === 0) return [];

  // Calculate landed rates
  const calculated = bids.map((bid) => {
    const subtotalBeforeTaxINR = bid.baseRateINR + bid.freightINR + bid.unloadingINR;
    const gstAmountINR = Math.round((subtotalBeforeTaxINR * bid.gstPercent) / 100);
    const landedRateINR = subtotalBeforeTaxINR + gstAmountINR;

    return {
      bid,
      subtotalBeforeTaxINR,
      gstAmountINR,
      landedRateINR,
    };
  });

  // Find min landed rate for price normalization
  const minLandedRate = Math.min(...calculated.map((c) => c.landedRateINR));
  const maxCreditDays = Math.max(...calculated.map((c) => c.bid.creditPeriodDays), 1);
  const minLeadTime = Math.min(...calculated.map((c) => c.bid.leadTimeDays));

  const evaluated: EvaluatedVendorBid[] = calculated.map((item) => {
    // 1. Price Score: max 45 points (higher when landed rate is closer to min)
    const priceScore = Math.round((minLandedRate / item.landedRateINR) * 45 * 10) / 10;

    // 2. Credit Score: max 20 points (longer credit is better for working capital)
    const creditScore = Math.round((item.bid.creditPeriodDays / maxCreditDays) * 20 * 10) / 10;

    // 3. Lead Time Score: max 15 points (faster delivery is better)
    const leadRatio = item.bid.leadTimeDays > 0 ? minLeadTime / item.bid.leadTimeDays : 1;
    const leadTimeScore = Math.round(leadRatio * 15 * 10) / 10;

    // 4. Quality & Compliance Score: max 20 points (stars + BIS cert + test certificate)
    let qualityScore = (item.bid.qualityRatingStars / 5) * 12;
    if (item.bid.bisCertified) qualityScore += 4;
    if (item.bid.testCertificateProvided) qualityScore += 4;
    qualityScore = Math.round(qualityScore * 10) / 10;

    const compositeScore = Math.round((priceScore + creditScore + leadTimeScore + qualityScore) * 10) / 10;

    return {
      ...item,
      isL1LowestCost: item.landedRateINR === minLandedRate,
      isBestValue: false, // Assigned below
      compositeScore,
      scoreBreakdown: {
        priceScore,
        creditScore,
        leadTimeScore,
        qualityScore,
      },
    };
  });

  // Find best value (highest composite score)
  const maxComposite = Math.max(...evaluated.map((e) => e.compositeScore));
  evaluated.forEach((e) => {
    if (e.compositeScore === maxComposite) {
      e.isBestValue = true;
    }
  });

  // Sort by composite score descending
  evaluated.sort((a, b) => b.compositeScore - a.compositeScore);

  return evaluated;
}
