import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = `proj-${Date.now().toString(36).slice(-6)}`;
    const projectName = body.project_name || "Commercial Complex - Tower B";

    if (Array.isArray(body.lines) && body.lines.length > 0) {
      body.lines.forEach((line: any, idx: number) => {
        erpStore.boqItems.push({
          id: `boq-gen-${idx + 1}-${Date.now().toString(36)}`,
          project_id: projectId,
          wbs_code: `1.${idx + 1}.1`,
          description: line.item_description || "Takeoff Item",
          quantity: Number(line.quantity) || 1,
          unit: line.unit || "NOS",
          unit_rate: Number(line.unit_cost) || 0,
          total_amount: Math.round((Number(line.quantity) || 1) * (Number(line.unit_cost) || 0)),
          is_verified: false,
        });
      });
    }

    return NextResponse.json({
      project_id: projectId,
      project_name: projectName,
      boq_line_count: body.lines?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to create project" }, { status: 400 });
  }
}

