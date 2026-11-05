import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email || "";
    const user = erpStore.authenticate(email);

    return NextResponse.json({
      success: true,
      message: `Signed in successfully as ${user.full_name}.`,
      token: `ostaad_session_${user.role.toLowerCase()}_${Date.now()}`,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        role_display: user.role_display,
        tenant_id: user.tenant_id,
        phone: user.phone,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to authenticate." },
      { status: 400 }
    );
  }
}

