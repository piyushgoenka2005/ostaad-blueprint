import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  try {
    const body = await req.json();
    const item = erpStore.boqItems.find((b) => b.id === itemId);
    if (item) {
      if (body.description !== undefined) item.description = body.description;
      if (body.quantity !== undefined) item.quantity = Number(body.quantity);
      if (body.unit_rate !== undefined) item.unit_rate = Number(body.unit_rate);
      if (body.unit !== undefined) item.unit = body.unit;
      item.total_amount = Math.round(item.quantity * item.unit_rate);
      return NextResponse.json(item);
    }
    return NextResponse.json({ id: itemId, ...body });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to update" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  erpStore.boqItems = erpStore.boqItems.filter((b) => b.id !== itemId);
  return NextResponse.json({ success: true, deleted_id: itemId });
}

