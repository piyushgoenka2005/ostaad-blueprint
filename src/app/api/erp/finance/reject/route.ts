import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const po = erpStore.purchaseOrders.find((p) => p.id === body.po_id);
    if (po) {
      po.status = "REJECTED";
      po.rejection_reason = body.rejection_reason || "Rejected by Finance authority.";
      return NextResponse.json({ success: true, message: `PO ${po.po_number} rejected.`, po });
    }
    return NextResponse.json({ success: true, message: "PO rejected" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Rejection failed" }, { status: 400 });
  }
}

