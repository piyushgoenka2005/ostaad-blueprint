import { NextRequest, NextResponse } from "next/server";
import { erpStore, StoreGRN } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const grnId = `grn-${Date.now().toString(36)}`;
    const receivedQty = Number(body.received_quantity) || 0;
    const damagedQty = Number(body.damaged_quantity) || 0;
    const netReceived = Math.max(0, receivedQty - damagedQty);

    const newGRN: StoreGRN = {
      id: grnId,
      po_id: body.po_id,
      challan_number: body.challan_number || `CH-${Math.floor(1000 + Math.random() * 9000)}`,
      truck_number: body.truck_number || "MH-04-AZ-9988",
      received_quantity: receivedQty,
      damaged_quantity: damagedQty,
      challan_photo_url: body.challan_photo_url,
      storekeeper_id: body.storekeeper_id || "user-store-01",
      created_at: new Date().toISOString(),
    };

    erpStore.grnReceipts.unshift(newGRN);

    // Update PO delivery status
    const po = erpStore.purchaseOrders.find((p) => p.id === body.po_id);
    if (po) {
      po.net_received_quantity += netReceived;
      po.pending_delivery_quantity = Math.max(0, po.ordered_quantity - po.net_received_quantity);
    }

    return NextResponse.json({
      success: true,
      message: `Goods receipt note ${newGRN.challan_number} recorded. Stock updated.`,
      grn: newGRN,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to record GRN" }, { status: 400 });
  }
}

