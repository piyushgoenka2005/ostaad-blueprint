-- Cloudflare D1 Migration: 0004_d1_migration_tracking.sql
-- Sub-Module 1.3: D1 Database Migration Framework & Schema Management

CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    batch INTEGER NOT NULL DEFAULT 1,
    checksum VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations (version);

-- Seed existing applied migrations record
INSERT OR IGNORE INTO schema_migrations (version, name, batch) VALUES
('0001', '0001_initial_schema.sql', 1),
('0002', '0002_seed_demo_data.sql', 1),
('0003', '0003_multi_company_tenants.sql', 1),
('0004', '0004_d1_migration_tracking.sql', 1);

