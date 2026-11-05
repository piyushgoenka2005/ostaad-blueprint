import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, role, phone } = body || {};

    if (!email || !full_name) {
      return NextResponse.json(
        { detail: "Full name and corporate email are required." },
        { status: 400 }
      );
    }

    const newUser = {
      id: `user-reg-${Date.now().toString(36)}`,
      email,
      full_name,
      role: role || "OPERATIONS",
      role_display: "Managing Authority / Operations",
      dept_badge: "Operations",
      avatar: full_name.slice(0, 2).toUpperCase(),
      tenant_id: "tenant-demo-1",
      phone: phone || "+91 98200 00000",
    };

    erpStore.users.push(newUser);

    return NextResponse.json({
      success: true,
      message: "Account registered successfully.",
      token: `ostaad_session_reg_${Date.now()}`,
      user: newUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to register." },
      { status: 400 }
    );
  }
}

