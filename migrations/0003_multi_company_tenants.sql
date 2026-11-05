-- Cloudflare D1 Migration: 0003_multi_company_tenants.sql
-- Sub-Module 1.1: Multi-Company Organization & Tenant Isolation

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) NOT NULL UNIQUE,
    pan_number VARCHAR(10) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    registered_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    financial_year_start VARCHAR(5) NOT NULL DEFAULT '04-01',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    logo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE TABLE IF NOT EXISTS user_company_roles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users (id),
    FOREIGN KEY(company_id) REFERENCES companies (id),
    UNIQUE(user_id, company_id)
);

-- Indexes for zero-latency tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_gstin ON companies (gstin);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_lookup ON user_company_roles (user_id, company_id);

-- Initial Enterprise Seed Companies
INSERT OR IGNORE INTO companies (
    id, tenant_id, company_name, legal_name, gstin, pan_number, state_code, state_name, registered_address, city, pincode, currency, is_active
) VALUES 
('comp-lt-01', 'tenant-demo-1', 'Larsen & Toubro Construction Ltd', 'Larsen & Toubro Limited - Heavy Civil Infrastructure IC', '27AAACL0149C1ZM', 'AAACL0149C', '27', 'Maharashtra', 'L&T House, Ballard Estate, P.O. Box: 278, Mumbai 400001', 'Mumbai', '400001', 'INR', 1),
('comp-lt-metro-02', 'tenant-demo-1', 'L&T Metro Rail & Elevated Corridors JV', 'L&T Infrastructure Engineering Joint Venture Ltd', '29AAACL0149C1ZK', 'AAACL0149C', '29', 'Karnataka', 'Whitefield Main Road, ITPL Tech Park, Bangalore 560066', 'Bengaluru', '560066', 'INR', 1),
('comp-shapoorji-03', 'tenant-demo-1', 'Shapoorji Pallonji EPC Ltd', 'Shapoorji Pallonji and Company Private Limited', '07AAACS1234D1Z8', 'AAACS1234D', '07', 'Delhi', 'Barakhamba Road, Connaught Place, New Delhi 110001', 'New Delhi', '110001', 'INR', 1);

-- Map Demo Users to Default Company
INSERT OR IGNORE INTO user_company_roles (id, user_id, company_id, role, is_default) VALUES
('ucr-01', 'user-pm-01', 'comp-lt-01', 'OPERATIONS', 1),
('ucr-02', 'user-fin-01', 'comp-lt-01', 'FINANCE', 1),
('ucr-03', 'user-store-01', 'comp-lt-01', 'SITE_STORE', 1),
('ucr-04', 'admin-01', 'comp-lt-01', 'ADMIN', 1),
('ucr-05', 'user-pm-01', 'comp-lt-metro-02', 'OPERATIONS', 0);

