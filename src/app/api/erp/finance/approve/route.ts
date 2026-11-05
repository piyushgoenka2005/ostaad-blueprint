import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const po = erpStore.purchaseOrders.find((p) => p.id === body.po_id);
    if (po) {
      po.status = "APPROVED";
      po.payment_structure = body.payment_structure || "PART_BY_PART";
      po.advance_percentage = body.advance_percentage || 30;
      return NextResponse.json({ success: true, message: `PO ${po.po_number} approved.`, po });
    }
    return NextResponse.json({ success: true, message: "PO approved" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Approval failed" }, { status: 400 });
  }
}

