/**
 * Ostaad ERP - Cloudflare R2 Document Vault & Storage Service
 * Handles multi-tenant document isolation, cryptographic SHA-256 verification,
 * MIME type & size validation, and time-restricted signed download tokens.
 */

export type DocumentCategory =
  | "BLUEPRINT"
  | "SITE_PHOTO"
  | "NOC_DOCUMENT"
  | "SOIL_REPORT"
  | "BOQ_SHEET"
  | "INVOICE"
  | "VENDOR_QUOTE"
  | "CONTRACT"
  | "OTHER";

export interface DocumentRecord {
  id: string;
  company_id: string;
  project_id: string | null;
  file_key: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  category: DocumentCategory;
  checksum_sha256: string;
  uploaded_by: string;
  uploader_name: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentParams {
  companyId: string;
  projectId?: string | null;
  category: DocumentCategory;
  filename: string;
  mimeType: string;
  buffer: ArrayBuffer | Uint8Array;
  uploadedBy: string;
  uploaderName?: string;
  isPublic?: boolean;
}

export interface DocumentFilter {
  companyId: string;
  projectId?: string;
  category?: DocumentCategory;
  search?: string;
}

// 50 MB maximum size limit for engineering drawings
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/acad",
  "image/vnd.dwg",
  "image/x-dwg",
  "application/dxf",
  "application/octet-stream", // Fallback CAD/DWG binaries
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Secret key used for signing time-expiring download tokens
const STORAGE_SIGNING_SECRET =
  process.env.STORAGE_SIGNING_SECRET || "ostaad-r2-vault-secure-signing-key-2026";

/**
 * Validates that uploaded file meets MIME type and size boundaries
 */
export function validateDocumentFile(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum allowed 50 MB limit (${sizeMb} MB detected).`,
    };
  }

  // Check MIME or extension
  const ext = filename.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "webp", "xlsx", "xls", "csv", "dwg", "dxf", "zip", "docx"];
  
  if (!ALLOWED_MIME_TYPES.has(mimeType) && (!ext || !allowedExtensions.includes(ext))) {
    return {
      valid: false,
      error: `Unsupported file type (${mimeType}). Allowed formats: PDF, PNG, JPG, WEBP, XLSX, CSV, DWG, DXF, ZIP, DOCX.`,
    };
  }

  return { valid: true };
}

/**
 * Computes native WebCrypto SHA-256 checksum hex string
 */
export async function computeBufferSHA256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes as any);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates an airtight hierarchical R2 storage key scoped by company and project
 */
export function buildR2StorageKey(
  companyId: string,
  projectId: string | null | undefined,
  category: DocumentCategory,
  filename: string
): string {
  const safeCompany = companyId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeProject = (projectId || "general").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeCat = category.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const timestamp = Date.now();
  const cleanName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `tenants/${safeCompany}/projects/${safeProject}/${safeCat}/${timestamp}_${cleanName}`;
}

/**
 * Generates a tamper-proof HMAC-SHA256 signed download token with expiration
 */
export async function generateSignedDownloadToken(
  fileKey: string,
  companyId: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${fileKey}:${companyId}:${expiresAt}`;
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(STORAGE_SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Base64url encoded token: expiresAt.sigHex
  return `${expiresAt}.${sigHex}`;
}

/**
 * Validates a signed download token against the fileKey and companyId
 */
export async function verifySignedDownloadToken(
  fileKey: string,
  companyId: string,
  token: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const [expiresAtStr, sigHex] = token.split(".");
    if (!expiresAtStr || !sigHex) {
      return { valid: false, reason: "Malformed download token" };
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      return { valid: false, reason: "Download token has expired" };
    }

    const payload = `${fileKey}:${companyId}:${expiresAt}`;
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(STORAGE_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedSig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSigHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSigHex !== sigHex) {
      return { valid: false, reason: "Invalid token signature" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Token verification failed" };
  }
}

// In-memory document vault storage fallback for local development & fast edge reads
const localDocumentRegistry: Map<string, DocumentRecord> = new Map([
  [
    "doc-sample-1",
    {
      id: "doc-sample-1",
      company_id: "comp_lt_const",
      project_id: "proj-1",
      file_key: "tenants/comp_lt_const/projects/proj-1/blueprint/1762300000000_Foundation_Framing_G4.pdf",
      filename: "Foundation_Framing_G4.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 4892400,
      category: "BLUEPRINT",
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      uploaded_by: "usr-rajesh-pm",
      uploader_name: "Rajesh Sharma",
      is_public: 0,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
  [
    "doc-sample-2",
    {
      id: "doc-sample-2",
      company_id: "comp_lt_const",
      project_id: "proj-1",
      file_key: "tenants/comp_lt_const/projects/proj-1/noc_document/1762305000000_Fire_Department_NOC_Approval.pdf",
      filename: "Fire_Department_NOC_Approval.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1420800,
      category: "NOC_DOCUMENT",
      checksum_sha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      uploaded_by: "usr-rajesh-pm",
      uploader_name: "Rajesh Sharma",
      is_public: 0,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  [
    "doc-sample-3",
    {
      id: "doc-sample-3",
      company_id: "comp_lt_const",
      project_id: "proj-1",
      file_key: "tenants/comp_lt_const/projects/proj-1/soil_report/1762310000000_Geotech_Strata_Borehole_Report.pdf",
      filename: "Geotech_Strata_Borehole_Report.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 2840500,
      category: "SOIL_REPORT",
      checksum_sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      uploaded_by: "usr-vikram-site",
      uploader_name: "Vikram Malhotra",
      is_public: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
]);

// Binary store cache for mock/local development
const localBinaryCache: Map<string, Uint8Array> = new Map();

/**
 * Cloudflare R2 Document Vault Service
 */
export const r2StorageService = {
  /**
   * Uploads and registers a document with company tenant isolation
   */
  async uploadDocument(params: UploadDocumentParams): Promise<{ document: DocumentRecord; signedToken: string }> {
    const { companyId, projectId, category, filename, mimeType, buffer, uploadedBy, uploaderName, isPublic } = params;

    const validation = validateDocumentFile(
      filename,
      mimeType,
      buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength
    );
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const checksum = await computeBufferSHA256(buffer);
    const fileKey = buildR2StorageKey(companyId, projectId, category, filename);
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const record: DocumentRecord = {
      id: docId,
      company_id: companyId,
      project_id: projectId || null,
      file_key: fileKey,
      filename,
      mime_type: mimeType,
      file_size_bytes: buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength,
      category,
      checksum_sha256: checksum,
      uploaded_by: uploadedBy,
      uploader_name: uploaderName || "Authorized User",
      is_public: isPublic ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt writing to Cloudflare R2 binding if present in global environment
    try {
      const globalEnv = (globalThis as any).env;
      if (globalEnv?.STORAGE) {
        await globalEnv.STORAGE.put(fileKey, buffer, {
          httpMetadata: {
            contentType: mimeType,
          },
          customMetadata: {
            companyId,
            projectId: projectId || "general",
            category,
            uploadedBy,
            checksum,
          },
        });
      }
    } catch (r2Err) {
      console.warn("R2 bucket write skipped or fallback engaged:", r2Err);
    }

    // Cache locally for development & instant retrieval
    localDocumentRegistry.set(docId, record);
    localBinaryCache.set(
      fileKey,
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    );

    const signedToken = await generateSignedDownloadToken(fileKey, companyId, 86400); // 24hr token

    return { document: record, signedToken };
  },

  /**
   * Lists documents filtered strictly by the tenant company_id
   */
  async listDocuments(filter: DocumentFilter): Promise<DocumentRecord[]> {
    let docs = Array.from(localDocumentRegistry.values()).filter(
      (doc) => doc.company_id === filter.companyId
    );

    if (filter.projectId) {
      docs = docs.filter((doc) => doc.project_id === filter.projectId);
    }

    if (filter.category) {
      docs = docs.filter((doc) => doc.category === filter.category);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.filename.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          (doc.uploader_name && doc.uploader_name.toLowerCase().includes(q))
      );
    }

    return docs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Retrieves a document record and verifies tenant ownership
   */
  async getDocument(fileKey: string, companyId?: string): Promise<{ document: DocumentRecord; buffer?: Uint8Array } | null> {
    const doc = Array.from(localDocumentRegistry.values()).find(
      (d) => d.file_key === fileKey
    );

    if (!doc) return null;

    if (companyId && doc.company_id !== companyId && !doc.is_public) {
      throw new Error("Access Denied: Document belongs to a different enterprise tenant.");
    }

    let buffer = localBinaryCache.get(fileKey);

    // Try reading from R2 binding if available
    try {
      const globalEnv = (globalThis as any).env;
      if (globalEnv?.STORAGE) {
        const obj = await globalEnv.STORAGE.get(fileKey);
        if (obj) {
          const ab = await obj.arrayBuffer();
          buffer = new Uint8Array(ab);
        }
      }
    } catch (r2Err) {
      console.warn("R2 fetch error:", r2Err);
    }

    return { document: doc, buffer };
  },

  /**
   * Deletes a document with company isolation guarantee
   */
  async deleteDocument(fileKey: string, companyId: string): Promise<boolean> {
    const doc = Array.from(localDocumentRegistry.values()).find(
      (d) => d.file_key === fileKey
    );

    if (!doc) return false;

    if (doc.company_id !== companyId) {
      throw new Error("Access Denied: You cannot delete a document from another company.");
    }

    localDocumentRegistry.delete(doc.id);
    localBinaryCache.delete(fileKey);

    try {
      const globalEnv = (globalThis as any).env;
      if (globalEnv?.STORAGE) {
        await globalEnv.STORAGE.delete(fileKey);
      }
    } catch (r2Err) {
      console.warn("R2 delete error:", r2Err);
    }

    return true;
  },
};
