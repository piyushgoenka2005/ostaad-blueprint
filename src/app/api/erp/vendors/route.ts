import { NextRequest, NextResponse } from "next/server";
import { erpStore, StoreVendor } from "@/lib/erp-store";

export async function GET() {
  return NextResponse.json(erpStore.vendors);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newVendor: StoreVendor = {
      id: `ven-${Date.now().toString(36)}`,
      vendor_name: body.vendor_name || "New Vendor",
      gstin: body.gstin || "27AAAC000000Z1",
      phone: body.phone || "+91 98000 00000",
      city: body.city || "Mumbai",
      category: body.category || "General Materials",
    };
    erpStore.vendors.push(newVendor);
    return NextResponse.json(newVendor);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Failed to create vendor" }, { status: 400 });
  }
}

