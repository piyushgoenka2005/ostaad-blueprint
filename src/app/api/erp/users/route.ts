import { NextResponse } from "next/server";
import { erpStore } from "@/lib/erp-store";

export async function GET() {
  const users = erpStore.users.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
  }));
  return NextResponse.json(users);
}

