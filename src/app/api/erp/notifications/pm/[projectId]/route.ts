import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  _context: { params: Promise<{ projectId: string }> }
) {
  // Returns real-time alerts or empty array
  return NextResponse.json([]);
}

