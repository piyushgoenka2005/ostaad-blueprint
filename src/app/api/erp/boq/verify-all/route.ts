import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { project_id, verified_by_user_id } = body;
    erpStore.boqItems.forEach((item) => {
      if (!project_id || item.project_id === project_id) {
        item.is_verified = true;
        item.verified_by_user_id = verified_by_user_id || "user-pm-01";
      }
    });
    return NextResponse.json({
      success: true,
      message: "All BOQ line items approved and locked for procurement.",
      verified_count: erpStore.boqItems.length,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Approval failed" }, { status: 400 });
  }
}

