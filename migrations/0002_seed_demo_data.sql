-- Initial Seed Data for Cloudflare D1
-- Creates default tenant and 4 department accounts

INSERT OR IGNORE INTO tenants (id, company_name, gstin, pan_number, state_code, created_at)
VALUES ('tenant-demo-1', 'BuildBharat Construction', '27AAACL1234F1Z1', 'AAACL1234F', '27', datetime('now'));

INSERT OR IGNORE INTO users (id, tenant_id, email, full_name, role, password_hash, phone, is_active, created_at)
VALUES 
('user-pm-01', 'tenant-demo-1', 'rajesh.pm@lt.com', 'Rajesh Sharma', 'OPERATIONS', 'pbkdf2_sha256$100000$129801fd5b9f1b60ada362ae225c5bd7$f15695ad705d8828131d260c4492d15f4cac87d82550141326007658b846cb02', '+91 98201 12233', 1, datetime('now')),
('user-fin-01', 'tenant-demo-1', 'sunita.finance@lt.com', 'Sunita Iyer', 'FINANCE', 'pbkdf2_sha256$100000$d41d1c24019fbe51981e12c8d23242ca$1f29d055561b99c02a46828ad1157aa160b330c5268f9030663bd13f8f9ea6ad', '+91 98202 33445', 1, datetime('now')),
('user-store-01', 'tenant-demo-1', 'ramesh.store@lt.com', 'Ramesh Pawar', 'SITE_STORE', 'pbkdf2_sha256$100000$adc0739dabc0c9fa7af5201c3b91228e$6a0cd7884529a000fa72622182e9983c12483cf25f9227a4b43da17e2f595911', '+91 98203 55667', 1, datetime('now')),
('admin-01', 'tenant-demo-1', 'admin@buildbharat.in', 'Aditya Verma', 'ADMIN', 'pbkdf2_sha256$100000$76d4744a2f5fba12d9bf899eba7bddcc$7064d6a45c4585e709b9d027d8c5c170e6a7877dce9dc71a28e2ba036aeca205', '+91 98200 99887', 1, datetime('now'));

INSERT OR IGNORE INTO projects (id, tenant_id, project_name, district, state, contract_value_inr, status, created_at)
VALUES ('proj-demo-101', 'tenant-demo-1', 'Commercial Complex - Tower B', 'Mumbai Suburban', 'Maharashtra', 25000000.00, 'ACTIVE', datetime('now'));
