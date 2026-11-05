import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      success: true,
      message: `Payment of ₹${Number(body.amount_inr || body.amount || 0).toLocaleString("en-IN")} recorded under ref ${body.transaction_ref}.`,
      payment_id: `pay-${Date.now().toString(36)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to log payment" }, { status: 400 });
  }
}

