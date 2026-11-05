import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET() {
  const demoAccounts = erpStore.users.map((u) => ({
    role: u.role,
    role_title: u.role_display,
    full_name: u.full_name,
    email: u.email,
    dept_badge: u.dept_badge,
    avatar: u.avatar,
  }));
  return NextResponse.json(demoAccounts);
}

