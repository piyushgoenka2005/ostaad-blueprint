import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileName = file ? file.name.replace(/\.[^/.]+$/, "") : "Commercial Foundation Plan";

    return NextResponse.json({
      success: true,
      report: {
        project_name: fileName,
        sheet_name: "G+4 Structural Foundation & Framing",
        classification: { drawing_type: "Structural Foundation Drawing", confidence: 0.98 },
        lines: [
          {
            id: "to-1",
            item_description: "Excavation in all soils for isolated pad footings",
            category: "Earthwork",
            quantity: 1250,
            unit: "cum",
            confidence: 0.96,
            validation_status: "VALIDATED",
            needs_review: false,
            unit_cost: 285.5,
            total_cost: 356875,
          },
          {
            id: "to-2",
            item_description: "Reinforced Cement Concrete M25 grade in column footings",
            category: "Concrete",
            quantity: 480,
            unit: "cum",
            confidence: 0.99,
            validation_status: "VALIDATED",
            needs_review: false,
            unit_cost: 6250,
            total_cost: 3000000,
          },
          {
            id: "to-3",
            item_description: "TMT Fe-550D rebar reinforcement for foundations and columns",
            category: "Steel",
            quantity: 45,
            unit: "MT",
            confidence: 0.97,
            validation_status: "VALIDATED",
            needs_review: false,
            unit_cost: 58500,
            total_cost: 2632500,
          },
        ],
        reconciliation_flags: [],
        cost_summary: { currency_symbol: "₹", total_estimated_budget: 5989375 },
      },
      processing_time_sec: 1.15,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to process takeoff" }, { status: 400 });
  }
}

