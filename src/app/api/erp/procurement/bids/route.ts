import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bidId = `bid-${Date.now().toString(36)}`;
    const rfqId = body.rfq_id;
    if (!erpStore.bids[rfqId]) erpStore.bids[rfqId] = [];

    const landedRate = Number(body.base_unit_rate || body.final_unit_rate || 0);
    erpStore.bids[rfqId].push({
      id: bidId,
      vendor_id: body.vendor_id,
      rate: landedRate,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      bid_id: bidId,
      landed_cost_per_unit: landedRate,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to record bid" }, { status: 400 });
  }
}

