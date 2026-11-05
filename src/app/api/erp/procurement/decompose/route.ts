import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const projectId = body.project_id || "proj-demo-101";

  return NextResponse.json({
    project_id: projectId,
    status: "SUCCESS",
    decomposed_materials: [
      {
        id: "mat-01",
        material_name: "Ordinary Portland Cement (OPC 53 Grade)",
        quantity: 3840,
        unit: "Bags",
        uom: "Bags",
        standard_code: "IS 269:2015",
        estimated_cost: 1459200,
      },
      {
        id: "mat-02",
        material_name: "TMT Rebars Fe-550D (8mm to 25mm)",
        quantity: 45,
        unit: "MT",
        uom: "MT",
        standard_code: "IS 1786:2008",
        estimated_cost: 2632500,
      },
      {
        id: "mat-03",
        material_name: "Crushed Sand (M-Sand Zone II)",
        quantity: 360,
        unit: "cum",
        uom: "cum",
        standard_code: "IS 383:2016",
        estimated_cost: 468000,
      },
      {
        id: "mat-04",
        material_name: "Coarse Aggregate (20mm down)",
        quantity: 520,
        unit: "cum",
        uom: "cum",
        standard_code: "IS 383:2016",
        estimated_cost: 624000,
      },
    ],
  });
}

