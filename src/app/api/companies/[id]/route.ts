import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = erpStore.getCompanyById(id);
    if (!company) {
      return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, company });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load company";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = erpStore.updateCompany(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: "Company details updated successfully",
      company: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update company";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

