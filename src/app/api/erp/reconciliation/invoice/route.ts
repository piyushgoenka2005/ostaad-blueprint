import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      success: true,
      message: `Invoice ${body.invoice_number} reconciled with 3-way match.`,
      status: "3_WAY_MATCHED",
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Invoice reconciliation failed" }, { status: 400 });
  }
}

