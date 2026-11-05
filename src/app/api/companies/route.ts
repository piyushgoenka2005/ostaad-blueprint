import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";
import { getTenantContext, validateGSTIN, validatePAN } from "@/lib/tenant-context";

export async function GET(request: Request) {
  try {
    const ctx = getTenantContext(request);
    const companies = ctx.userId ? erpStore.getCompaniesForUser(ctx.userId) : erpStore.getCompanies();
    return NextResponse.json({
      success: true,
      companies,
      activeCompanyId: ctx.companyId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch companies";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = getTenantContext(request);
    const body = await request.json();

    const { company_name, legal_name, gstin, pan_number, registered_address, city, pincode } = body;

    if (!company_name || !legal_name || !gstin || !registered_address) {
      return NextResponse.json(
        { success: false, message: "Company name, legal name, GSTIN, and registered address are required." },
        { status: 400 }
      );
    }

    // Validate GSTIN
    const gstCheck = validateGSTIN(gstin);
    if (!gstCheck.valid) {
      return NextResponse.json({ success: false, message: gstCheck.error }, { status: 400 });
    }

    // Auto-derive PAN from GSTIN if not explicitly provided
    const resolvedPan = (pan_number || gstCheck.pan || "").trim().toUpperCase();
    const panCheck = validatePAN(resolvedPan);
    if (!panCheck.valid) {
      return NextResponse.json({ success: false, message: panCheck.error }, { status: 400 });
    }

    // Prevent duplicate GSTIN registration within tenant
    const existing = erpStore.companies.find((c) => c.gstin.toUpperCase() === gstin.trim().toUpperCase());
    if (existing) {
      return NextResponse.json(
        { success: false, message: `An entity with GSTIN ${gstin} is already registered (${existing.company_name}).` },
        { status: 409 }
      );
    }

    const newCompany = erpStore.createCompany({
      tenant_id: ctx.tenantId,
      company_name,
      legal_name,
      gstin,
      pan_number: resolvedPan,
      state_code: gstCheck.stateCode || "27",
      state_name: gstCheck.stateName || "Maharashtra",
      registered_address,
      city: city || "Mumbai",
      pincode: pincode || "400001",
    });

    return NextResponse.json({
      success: true,
      message: `Operating Company "${newCompany.company_name}" provisioned successfully.`,
      company: newCompany,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register company";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
