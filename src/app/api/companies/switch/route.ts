import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(request: Request) {
  try {
    const { company_id } = await request.json();
    if (!company_id) {
      return NextResponse.json({ success: false, message: "company_id is required." }, { status: 400 });
    }

    const company = erpStore.getCompanyById(company_id);
    if (!company) {
      return NextResponse.json({ success: false, message: "Company not found." }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: `Active operating entity set to: ${company.company_name}`,
      activeCompany: company,
    });

    // Set cookie for edge routing and SSR consistency
    response.cookies.set("ostaad_company_id", company.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch company";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

