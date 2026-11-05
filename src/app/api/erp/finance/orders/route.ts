import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET() {
  return NextResponse.json(erpStore.purchaseOrders);
}

