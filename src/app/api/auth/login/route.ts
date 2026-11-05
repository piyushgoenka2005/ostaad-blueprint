import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";
import { signSessionToken, normalizeRole } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email || "";
    const user = erpStore.authenticate(email);
    const stdRole = normalizeRole(user.role);

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: stdRole,
      tenantId: user.tenant_id,
      companyId: user.company_id || "comp-lt-01",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: `Signed in successfully as ${user.full_name}.`,
      token,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to authenticate.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
