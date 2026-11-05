import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET(
  _req: NextRequest,
  _context: { params: Promise<{ projectId: string }> }
) {
  const storePOs = erpStore.purchaseOrders.map((po) => ({
    id: po.id,
    po_number: po.po_number,
    material_name: po.material_name,
    ordered_quantity: po.ordered_quantity,
    uom: po.uom,
    net_received_quantity: po.net_received_quantity,
    pending_delivery_quantity: po.pending_delivery_quantity,
    vendor_name: po.vendor_name,
    is_fully_settled: po.is_fully_settled,
  }));
  return NextResponse.json(storePOs);
}

