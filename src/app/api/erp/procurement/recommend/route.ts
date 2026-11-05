import { NextRequest, NextResponse } from "next/server";
import { erpStore, StorePO } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const poNumber = `PO-${new Date().getFullYear()}-MUM-0${Math.floor(100 + Math.random() * 900)}`;
    const newPO: StorePO = {
      id: `po-${Date.now().toString(36)}`,
      po_number: poNumber,
      project_id: "proj-demo-101",
      project_name: "Commercial Complex - Tower B",
      vendor_id: "ven-01",
      vendor_name: "UltraTech Cement Ltd",
      vendor_gstin: "27AAACU2345H1Z5",
      material_name: "Ordinary Portland Cement (OPC 53 Grade)",
      ordered_quantity: 3840,
      uom: "Bags",
      rate_per_unit: 380,
      total_amount: 1459200,
      status: "PENDING_FINANCE_APPROVAL",
      manager_notes: body.manager_notes || "Recommended based on lowest evaluated landed rate and delivery lead time.",
      net_received_quantity: 0,
      pending_delivery_quantity: 3840,
      is_fully_settled: false,
      created_at: new Date().toISOString(),
    };

    erpStore.purchaseOrders.unshift(newPO);

    return NextResponse.json({
      success: true,
      message: `Proposal submitted to Finance for ${poNumber}.`,
      po: newPO,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to submit recommendation" }, { status: 400 });
  }
}

