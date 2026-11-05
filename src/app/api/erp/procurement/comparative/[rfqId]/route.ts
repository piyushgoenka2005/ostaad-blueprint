import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  _context: { params: Promise<{ rfqId: string }> }
) {
  return NextResponse.json({
    comparative_ranking: [
      {
        bid_id: "bid-01",
        vendor_id: "ven-01",
        vendor_name: "UltraTech Cement Ltd",
        base_rate: 375,
        freight: 5,
        gst_percent: 18,
        landed_rate: 380,
        total_landed_cost: 1459200,
        delivery_lead_days: 2,
        payment_terms: "30% Advance, 70% against delivery",
        rank: 1,
        recommendation_status: "RECOMMENDED",
      },
      {
        bid_id: "bid-02",
        vendor_id: "ven-03",
        vendor_name: "Ambuja Cements Ltd",
        base_rate: 385,
        freight: 7,
        gst_percent: 18,
        landed_rate: 392,
        total_landed_cost: 1505280,
        delivery_lead_days: 3,
        payment_terms: "20% Advance, 80% within 15 days",
        rank: 2,
        recommendation_status: "HIGHER_COST",
      },
    ],
  });
}

