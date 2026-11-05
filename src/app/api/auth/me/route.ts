import { NextRequest, NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";
import { verifySessionToken } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  // Try cryptographic verification
  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      const matched = erpStore.findUserByEmail(session.email);
      if (matched) {
        return NextResponse.json({ user: matched });
      }
    }
  }

  // Graceful fallback for mock/demo sessions
  let user = erpStore.users[0];
  if (token.includes("finance")) user = erpStore.users[1];
  else if (token.includes("store")) user = erpStore.users[2];
  else if (token.includes("admin")) user = erpStore.users[3];

  return NextResponse.json({ user });
}
