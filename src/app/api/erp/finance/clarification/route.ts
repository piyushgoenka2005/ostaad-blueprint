import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const po = erpStore.purchaseOrders.find((p) => p.id === body.po_id);
    if (po) {
      po.status = "CLARIFICATION_REQUESTED";
      po.clarification_notes = body.clarification_reason || "Clarification requested.";
      return NextResponse.json({ success: true, message: `Clarification requested for ${po.po_number}.`, po });
    }
    return NextResponse.json({ success: true, message: "Clarification recorded" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Request failed" }, { status: 400 });
  }
}

