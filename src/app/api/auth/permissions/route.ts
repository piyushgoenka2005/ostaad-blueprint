import { NextResponse } from "next/server";
import {
  normalizeRole,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
  StandardRole,
} from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    let role: StandardRole = "PROJECT_MANAGER";

    if (authHeader.includes("finance")) {
      role = "FINANCE_APPROVER";
    } else if (authHeader.includes("store")) {
      role = "STORE_MANAGER";
    } else if (authHeader.includes("admin")) {
      role = "COMPANY_ADMIN";
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    const metadata = ROLE_DEFINITIONS[role];

    return NextResponse.json({
      success: true,
      currentRole: role,
      metadata,
      permissions,
      allRoles: Object.values(ROLE_DEFINITIONS),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch permissions";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

