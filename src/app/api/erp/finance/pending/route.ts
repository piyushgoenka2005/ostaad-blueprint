import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET() {
  const pending = erpStore.purchaseOrders.filter((po) => po.status === "PENDING_FINANCE_APPROVAL");
  return NextResponse.json(pending);
}

