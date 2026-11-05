import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const items = erpStore.boqItems.filter(
    (item) => item.project_id === projectId || projectId === "proj-demo-101"
  );
  return NextResponse.json(items.length ? items : erpStore.boqItems);
}

