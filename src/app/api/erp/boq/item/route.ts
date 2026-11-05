import { NextRequest, NextResponse } from "next/server";
import { erpStore, StoreBOQItem } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newItem: StoreBOQItem = {
      id: `boq-${Date.now().toString(36)}`,
      project_id: body.project_id || "proj-demo-101",
      wbs_code: body.wbs_code || `WBS-${Math.floor(100 + Math.random() * 900)}`,
      description: body.description || "Concrete work",
      quantity: Number(body.quantity) || 1,
      unit: body.unit || "cum",
      unit_rate: Number(body.unit_rate) || 0,
      total_amount: Math.round((Number(body.quantity) || 1) * (Number(body.unit_rate) || 0)),
      is_verified: false,
    };
    erpStore.boqItems.push(newItem);
    return NextResponse.json(newItem);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to add BOQ item" }, { status: 400 });
  }
}

