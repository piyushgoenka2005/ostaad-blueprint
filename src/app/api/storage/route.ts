import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant-context";
import {
  r2StorageService,
  DocumentCategory,
  generateSignedDownloadToken,
} from "@/lib/storage/r2";

/**
 * GET /api/storage
 * Returns all documents for the authenticated tenant company
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = getTenantContext(req);
    const companyId = tenant.companyId;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as DocumentCategory | null;
    const projectId = searchParams.get("projectId") || undefined;
    const search = searchParams.get("search") || undefined;

    const documents = await r2StorageService.listDocuments({
      companyId,
      category: category || undefined,
      projectId,
      search,
    });

    return NextResponse.json({
      success: true,
      companyId,
      total: documents.length,
      documents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve documents" },
      { status: 400 }
    );
  }
}

/**
 * POST /api/storage
 * Uploads a document to Cloudflare R2 with tenant isolation
 */
export async function POST(req: NextRequest) {
  try {
    const tenant = getTenantContext(req);
    const companyId = tenant.companyId;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as DocumentCategory) || "OTHER";
    const projectId = (formData.get("projectId") as string) || null;
    const isPublic = formData.get("isPublic") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided in multipart request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const { document, signedToken } = await r2StorageService.uploadDocument({
      companyId,
      projectId,
      category,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: arrayBuffer,
      uploadedBy: tenant.userId || "usr-current",
      uploaderName: tenant.company?.company_name || "Authorized User",
      isPublic,
    });

    const downloadUrl = `/api/storage/${document.file_key}?token=${signedToken}`;

    return NextResponse.json({
      success: true,
      document,
      downloadUrl,
      message: `File "${file.name}" securely stored in R2 vault.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Document upload failed" },
      { status: 400 }
    );
  }
}
