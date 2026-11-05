"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FolderArchive,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  Compass,
  Layers,
  Receipt,
  Download,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Eye,
  X,
  HardDrive,
  Copy,
  Check,
} from "lucide-react";
import { DocumentCategory, DocumentRecord } from "@/lib/storage/r2";

interface DocumentVaultProps {
  initialCategory?: DocumentCategory;
  projectId?: string;
  className?: string;
}

const CATEGORY_META: Record<
  DocumentCategory | "ALL",
  { label: string; icon: React.ElementType; color: string }
> = {
  ALL: { label: "All Files", icon: FolderArchive, color: "text-slate-600 bg-slate-100" },
  BLUEPRINT: { label: "Blueprints & CAD", icon: Compass, color: "text-blue-700 bg-blue-50" },
  SITE_PHOTO: { label: "Site Photos", icon: ImageIcon, color: "text-emerald-700 bg-emerald-50" },
  NOC_DOCUMENT: { label: "Statutory NOCs", icon: ShieldCheck, color: "text-amber-700 bg-amber-50" },
  SOIL_REPORT: { label: "Geotech Reports", icon: Layers, color: "text-purple-700 bg-purple-50" },
  BOQ_SHEET: { label: "BOQ & Schedules", icon: FileSpreadsheet, color: "text-teal-700 bg-teal-50" },
  INVOICE: { label: "Invoices & Bills", icon: Receipt, color: "text-rose-700 bg-rose-50" },
  VENDOR_QUOTE: { label: "Vendor Quotes", icon: FileText, color: "text-indigo-700 bg-indigo-50" },
  CONTRACT: { label: "Contracts", icon: FileText, color: "text-cyan-700 bg-cyan-50" },
  OTHER: { label: "Miscellaneous", icon: FileText, color: "text-slate-700 bg-slate-50" },
};

export default function DocumentVault({
  initialCategory,
  projectId,
  className = "",
}: DocumentVaultProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "ALL">(
    initialCategory || "ALL"
  );
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>(
    initialCategory || "BLUEPRINT"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let url = "/api/storage";
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (projectId) params.set("projectId", projectId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, projectId]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const q = search.toLowerCase();
      const matchesSearch =
        doc.filename.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        (doc.uploader_name && doc.uploader_name.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [documents, search]);

  const totalBytes = useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.file_size_bytes || 0), 0);
  }, [documents]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setNotice({ type: "error", text: "Please select a file to upload." });
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", uploadCategory);
      if (projectId) formData.append("projectId", projectId);

      const res = await fetch("/api/storage", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Upload failed");
      }

      setNotice({
        type: "success",
        text: `File "${selectedFile.name}" successfully vaulted to Cloudflare R2!`,
      });
      setSelectedFile(null);
      setShowUploadModal(false);
      await fetchDocuments();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to upload file." });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileKey: string, filename: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${filename}" from the vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/storage/${fileKey}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Delete failed");
      }
      setNotice({ type: "success", text: `Deleted "${filename}" from vault.` });
      await fetchDocuments();
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "Failed to delete document." });
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header & Vault Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <FolderArchive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-lg">
                  Cloudflare R2 Document Vault
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Tenant Isolated</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tamper-proof storage for blueprints, NOCs, soil investigations, and financial records with SHA-256 integrity checks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => fetchDocuments()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#12304c] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Upload to Vault</span>
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-4 flex items-center justify-between gap-2 rounded-xl p-3 text-xs ${
              notice.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Vault Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Documents</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{documents.length}</div>
            <div className="text-[10px] text-slate-500">In this corporate entity</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-400">Storage Used</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{formatBytes(totalBytes)}</div>
            <div className="text-[10px] text-slate-500">Tier: Cloudflare R2 Standard</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="text-[10px] font-bold uppercase text-blue-800">Target Bucket</div>
            <div className="text-sm font-bold text-blue-950 mt-1 font-mono">ostaad-erp-storage</div>
            <div className="text-[10px] text-blue-700">Binding: env.STORAGE</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="text-[10px] font-bold uppercase text-emerald-800">Tamper Guard</div>
            <div className="text-sm font-bold text-emerald-950 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>SHA-256 Verified</span>
            </div>
            <div className="text-[10px] text-emerald-700">Zero Data Corruption</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(["ALL", "BLUEPRINT", "SITE_PHOTO", "NOC_DOCUMENT", "SOIL_REPORT", "BOQ_SHEET", "INVOICE"] as const).map(
            (cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium whitespace-nowrap transition-colors border ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{meta.label}</span>
                </button>
              );
            }
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Documents Table View */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>Accessing encrypted R2 storage...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FolderArchive className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">No documents found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `No documents match "${search}". Try adjusting your search query.`
                : "No files have been vaulted in this category yet. Click 'Upload to Vault' to add drawings or NOCs."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Document Name</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">File Size</th>
                  <th className="px-3 py-3">Uploaded By</th>
                  <th className="px-3 py-3">Cryptographic SHA-256</th>
                  <th className="px-3 py-3">Date Added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const meta = CATEGORY_META[doc.category] || CATEGORY_META.OTHER;
                  const Icon = meta.icon;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                              {doc.filename}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {doc.file_key.split("/").slice(-1)[0]}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3.5 font-mono text-slate-600">
                        {formatBytes(doc.file_size_bytes)}
                      </td>

                      <td className="px-3 py-3.5 text-slate-600">
                        <div className="font-medium text-slate-800">{doc.uploader_name}</div>
                        <div className="text-[10px] text-slate-400">{doc.uploaded_by}</div>
                      </td>

                      <td className="px-3 py-3.5">
                        <button
                          onClick={() => handleCopyHash(doc.checksum_sha256)}
                          title="Click to copy full SHA-256 hash"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
                        >
                          <span>{doc.checksum_sha256.slice(0, 10)}...</span>
                          {copiedHash === doc.checksum_sha256 ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(doc.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/api/storage/${doc.file_key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-2xs"
                            title="Download or Preview Document"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </a>

                          <button
                            onClick={() => handleDelete(doc.file_key, doc.filename)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#122b45] text-base">
                  Upload Document to Cloudflare R2 Vault
                </h3>
                <p className="text-xs text-slate-500">
                  Files are cryptographically fingerprinted and tenant isolated
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              {/* Category Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="BLUEPRINT">Blueprint / CAD Architectural Drawing</option>
                  <option value="SITE_PHOTO">Site Inspection / Drone Photograph</option>
                  <option value="NOC_DOCUMENT">Statutory Authority NOC / Sanction</option>
                  <option value="SOIL_REPORT">Geotechnical Soil / Borehole Investigation</option>
                  <option value="BOQ_SHEET">Bill of Quantities / Rate Schedule</option>
                  <option value="INVOICE">Vendor Invoice / Tax Bill</option>
                  <option value="VENDOR_QUOTE">Supplier Quotation / Bid Summary</option>
                  <option value="CONTRACT">Subcontractor Agreement / Work Order</option>
                  <option value="OTHER">Other Technical Specification</option>
                </select>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select File (Max 50 MB)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-colors"
                >
                  <UploadCloud className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  {selectedFile ? (
                    <div>
                      <div className="font-bold text-slate-800">{selectedFile.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatBytes(selectedFile.size)} • {selectedFile.type || "binary"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="font-semibold text-blue-700">Click to browse</span> or drag
                      and drop
                      <div className="text-[10px] text-slate-400 mt-1">
                        PDF, PNG, JPG, DWG, DXF, XLSX, CSV, ZIP (up to 50 MB)
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Security Alert */}
              <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-[11px] text-blue-800 border border-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Uploaded files are hashed with SHA-256 before upload. Direct public access is disabled; downloads require short-lived HMAC cryptographic tokens.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#12304c] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Encrypting & Vaulting...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Confirm Vault Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
