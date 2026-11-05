import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";
import { signSessionToken, normalizeRole, ROLE_DEFINITIONS } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, role, phone, company_name } = body || {};

    if (!email || !full_name) {
      return NextResponse.json(
        { detail: "Full name and corporate email are required." },
        { status: 400 }
      );
    }

    const stdRole = normalizeRole(role || "PROJECT_MANAGER");
    const roleMeta = ROLE_DEFINITIONS[stdRole];

    const newUser = {
      id: `user-reg-${Date.now().toString(36)}`,
      email,
      full_name,
      role: stdRole,
      role_display: roleMeta.title,
      dept_badge: roleMeta.department,
      avatar: full_name.slice(0, 2).toUpperCase(),
      tenant_id: "tenant-demo-1",
      company_id: "comp-lt-01",
      phone: phone || "+91 98200 00000",
    };

    erpStore.users.push(newUser);

    const token = await signSessionToken({
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: stdRole,
      tenantId: newUser.tenant_id,
      companyId: newUser.company_id,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      message: `Account registered successfully for ${newUser.full_name}.`,
      token,
      user: newUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
