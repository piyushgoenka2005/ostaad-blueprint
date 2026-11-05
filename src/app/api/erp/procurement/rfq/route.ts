import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rfqId = `rfq-${Date.now().toString(36)}`;
    erpStore.rfqs[rfqId] = {
      id: rfqId,
      material_name: body.material_name,
      quantity: Number(body.required_quantity),
      uom: body.uom,
      project_id: body.project_id || "proj-demo-101",
    };
    return NextResponse.json({
      rfq_id: rfqId,
      material_name: body.material_name,
      quantity: Number(body.required_quantity),
      uom: body.uom,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to create RFQ" }, { status: 400 });
  }
}

