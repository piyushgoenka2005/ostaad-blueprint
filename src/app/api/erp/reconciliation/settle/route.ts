import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const po = erpStore.purchaseOrders.find((p) => p.id === body.po_id);
    if (po) {
      po.is_fully_settled = true;
    }
    return NextResponse.json({
      success: true,
      message: "PO final balance settled. Ledger updated.",
      status: "FULLY_SETTLED",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Settlement failed" }, { status: 400 });
  }
}

