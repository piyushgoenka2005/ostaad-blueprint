-- Migration: 0005_r2_document_vault.sql
-- Description: Cloudflare R2 Document Vault metadata schema with multi-tenant company isolation and category tracking

CREATE TABLE IF NOT EXISTS document_vault (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id TEXT,
  file_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'BLUEPRINT',
    'SITE_PHOTO',
    'NOC_DOCUMENT',
    'SOIL_REPORT',
    'BOQ_SHEET',
    'INVOICE',
    'VENDOR_QUOTE',
    'CONTRACT',
    'OTHER'
  )),
  checksum_sha256 TEXT,
  uploaded_by TEXT NOT NULL,
  uploader_name TEXT,
  is_public INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_document_vault_company_id ON document_vault(company_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_project_id ON document_vault(project_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_category ON document_vault(category);
CREATE INDEX IF NOT EXISTS idx_document_vault_created_at ON document_vault(created_at);

-- Record migration in schema_migrations
INSERT OR IGNORE INTO schema_migrations (version, name, batch, checksum, applied_at, execution_time_ms)
VALUES ('0005', '0005_r2_document_vault', 2, 'sha256_0005_r2_document_vault', datetime('now'), 12);
