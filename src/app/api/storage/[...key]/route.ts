import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant-context";
import {
  r2StorageService,
  verifySignedDownloadToken,
} from "@/lib/storage/r2";

interface RouteContext {
  params: Promise<{
    key: string[];
  }>;
}

/**
 * GET /api/storage/[...key]?token=...
 * Streams a protected file from Cloudflare R2 after validating signed token or tenant session
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const fileKey = Array.isArray(key) ? key.join("/") : key;

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // Extract tenant context as fallback if token is not passed
    const tenant = getTenantContext(req);
    const companyId = tenant.companyId;

    // Check signed token if provided
    if (token) {
      const verification = await verifySignedDownloadToken(fileKey, companyId, token);
      if (!verification.valid) {
        return NextResponse.json(
          { success: false, message: `Access Denied: ${verification.reason}` },
          { status: 403 }
        );
      }
    }

    const result = await r2StorageService.getDocument(fileKey, companyId);
    if (!result) {
      return NextResponse.json(
        { success: false, message: "Document not found in storage vault" },
        { status: 404 }
      );
    }

    const { document, buffer } = result;

    // If binary buffer is present, stream it with proper headers
    if (buffer && buffer.length > 0) {
      const headers = new Headers();
      headers.set("Content-Type", document.mime_type || "application/octet-stream");
      headers.set(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(document.filename)}"`
      );
      headers.set("Content-Length", buffer.length.toString());
      headers.set("Cache-Control", "private, max-age=3600");
      headers.set("x-checksum-sha256", document.checksum_sha256);

      return new NextResponse(buffer as any, { status: 200, headers });
    }

    // For metadata-only / demo records without binary bytes
    return NextResponse.json({
      success: true,
      document,
      message: "Document metadata verified in R2 vault.",
      view: {
        filename: document.filename,
        category: document.category,
        fileSizeBytes: document.file_size_bytes,
        checksum: document.checksum_sha256,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to download document" },
      { status: 403 }
    );
  }
}

/**
 * DELETE /api/storage/[...key]
 * Deletes document from R2 with company isolation
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const fileKey = Array.isArray(key) ? key.join("/") : key;

    const tenant = getTenantContext(req);
    const companyId = tenant.companyId;

    const deleted = await r2StorageService.deleteDocument(fileKey, companyId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Document not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Document removed from storage vault.`,
      fileKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete document" },
      { status: 403 }
    );
  }
}
