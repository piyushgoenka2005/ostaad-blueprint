-- Cloudflare D1 Schema for BuildBharat / Ostaad ERP
-- Generated from SQLAlchemy ORM metadata

CREATE TABLE login_throttles (
	id VARCHAR(36) NOT NULL, 
	lookup_key VARCHAR(128) NOT NULL, 
	failed_attempts INTEGER NOT NULL, 
	first_failed_at DATETIME NOT NULL, 
	locked_until DATETIME, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE tenants (
	id VARCHAR(36) NOT NULL, 
	company_name VARCHAR(200) NOT NULL, 
	gstin VARCHAR(15) NOT NULL, 
	pan_number VARCHAR(10), 
	state_code VARCHAR(2) NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (gstin)
);

CREATE TABLE projects (
	id VARCHAR(36) NOT NULL, 
	tenant_id VARCHAR(36) NOT NULL, 
	project_name VARCHAR(200) NOT NULL, 
	district VARCHAR(100) NOT NULL, 
	state VARCHAR(100) NOT NULL, 
	contract_value_inr NUMERIC(18, 2), 
	status VARCHAR(9) NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE TABLE users (
	id VARCHAR(36) NOT NULL, 
	tenant_id VARCHAR(36) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	full_name VARCHAR(150) NOT NULL, 
	role VARCHAR(10) NOT NULL, 
	password_hash VARCHAR(255), 
	phone VARCHAR(20), 
	is_active BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	UNIQUE (email)
);

CREATE TABLE vendors (
	id VARCHAR(36) NOT NULL, 
	tenant_id VARCHAR(36) NOT NULL, 
	vendor_name VARCHAR(200) NOT NULL, 
	gstin VARCHAR(15) NOT NULL, 
	phone VARCHAR(20) NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE TABLE audit_events (
	id VARCHAR(36) NOT NULL, 
	tenant_id VARCHAR(36) NOT NULL, 
	actor_user_id VARCHAR(36) NOT NULL, 
	action VARCHAR(100) NOT NULL, 
	resource_type VARCHAR(100) NOT NULL, 
	resource_id VARCHAR(100) NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	details TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	FOREIGN KEY(actor_user_id) REFERENCES users (id)
);

CREATE TABLE auth_sessions (
	id VARCHAR(36) NOT NULL, 
	token_id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	key_version VARCHAR(32) NOT NULL, 
	issued_at DATETIME NOT NULL, 
	expires_at DATETIME NOT NULL, 
	revoked_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE boq_items (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	wbs_code VARCHAR(20) NOT NULL, 
	description TEXT NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	quantity NUMERIC(18, 6) NOT NULL, 
	unit_rate NUMERIC(18, 2), 
	is_verified BOOLEAN, 
	verified_by_user_id VARCHAR(36), 
	verified_at DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(verified_by_user_id) REFERENCES users (id)
);

CREATE TABLE documents (
	id VARCHAR(36) NOT NULL, 
	tenant_id VARCHAR(36) NOT NULL, 
	uploaded_by_user_id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36), 
	object_key VARCHAR(512) NOT NULL, 
	original_name VARCHAR(255) NOT NULL, 
	content_type VARCHAR(128) NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	retention_class VARCHAR(32) NOT NULL, 
	retain_until DATETIME NOT NULL, 
	legal_hold BOOLEAN NOT NULL, 
	deleted_at DATETIME, 
	purge_after DATETIME, 
	created_at DATETIME NOT NULL, 
	checksum_sha256 VARCHAR(64) NOT NULL, 
	description TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	FOREIGN KEY(uploaded_by_user_id) REFERENCES users (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	UNIQUE (object_key)
);

CREATE TABLE material_requirements (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	material_name VARCHAR(150) NOT NULL, 
	required_quantity NUMERIC(18, 6) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	status VARCHAR(50), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE TABLE rfq_packages (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	rfq_code VARCHAR(50) NOT NULL, 
	material_name VARCHAR(150) NOT NULL, 
	required_quantity NUMERIC(18, 6) NOT NULL, 
	uom VARCHAR(20) NOT NULL, 
	status VARCHAR(13) NOT NULL, 
	expires_at DATETIME NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	UNIQUE (rfq_code)
);

CREATE TABLE site_inventory (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	material_name VARCHAR(150) NOT NULL, 
	current_stock NUMERIC(18, 6), 
	uom VARCHAR(20) NOT NULL, 
	last_updated DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE TABLE vendor_bids (
	id VARCHAR(36) NOT NULL, 
	rfq_id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	base_unit_rate NUMERIC(18, 2) NOT NULL, 
	freight_unit_rate NUMERIC(18, 2), 
	gst_percentage NUMERIC(8, 4), 
	landed_cost_per_unit NUMERIC(18, 2) NOT NULL, 
	submitted_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(rfq_id) REFERENCES rfq_packages (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
);

CREATE TABLE purchase_orders (
	id VARCHAR(36) NOT NULL, 
	project_id VARCHAR(36) NOT NULL, 
	rfq_id VARCHAR(36) NOT NULL, 
	vendor_id VARCHAR(36) NOT NULL, 
	selected_bid_id VARCHAR(36) NOT NULL, 
	po_number VARCHAR(50) NOT NULL, 
	material_name VARCHAR(150) NOT NULL, 
	quantity NUMERIC(18, 6) NOT NULL, 
	uom VARCHAR(20) NOT NULL, 
	landed_unit_rate NUMERIC(18, 2) NOT NULL, 
	total_landed_amount_inr NUMERIC(18, 2) NOT NULL, 
	manager_recommended_by_id VARCHAR(36) NOT NULL, 
	manager_notes TEXT, 
	finance_approval_status VARCHAR(24) NOT NULL, 
	finance_approver_id VARCHAR(36), 
	finance_rejection_reason TEXT, 
	finance_clarification_reason TEXT, 
	finance_clarification_at DATETIME, 
	payment_structure VARCHAR(18), 
	advance_percentage NUMERIC(8, 4), 
	is_dispatched_to_vendor BOOLEAN, 
	dispatched_at DATETIME, 
	is_fully_settled BOOLEAN, 
	settled_at DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(rfq_id) REFERENCES rfq_packages (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id), 
	FOREIGN KEY(selected_bid_id) REFERENCES vendor_bids (id), 
	UNIQUE (po_number), 
	FOREIGN KEY(manager_recommended_by_id) REFERENCES users (id), 
	FOREIGN KEY(finance_approver_id) REFERENCES users (id)
);

CREATE TABLE goods_receipt_notes (
	id VARCHAR(36) NOT NULL, 
	purchase_order_id VARCHAR(36) NOT NULL, 
	challan_number VARCHAR(100) NOT NULL, 
	truck_number VARCHAR(50) NOT NULL, 
	received_quantity NUMERIC(18, 6) NOT NULL, 
	damaged_quantity NUMERIC(18, 6), 
	challan_photo_url VARCHAR(255) NOT NULL, 
	storekeeper_id VARCHAR(36) NOT NULL, 
	received_date DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id), 
	FOREIGN KEY(storekeeper_id) REFERENCES users (id)
);

CREATE TABLE payment_transactions (
	id VARCHAR(36) NOT NULL, 
	purchase_order_id VARCHAR(36) NOT NULL, 
	stage_type VARCHAR(14) NOT NULL, 
	amount_inr NUMERIC(18, 2) NOT NULL, 
	payment_method VARCHAR(11) NOT NULL, 
	transaction_ref VARCHAR(100) NOT NULL, 
	bank_name VARCHAR(100) NOT NULL, 
	paid_date DATETIME, 
	recorded_by_user_id VARCHAR(36) NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id), 
	UNIQUE (transaction_ref), 
	FOREIGN KEY(recorded_by_user_id) REFERENCES users (id)
);

CREATE TABLE vendor_invoices (
	id VARCHAR(36) NOT NULL, 
	purchase_order_id VARCHAR(36) NOT NULL, 
	invoice_number VARCHAR(100) NOT NULL, 
	invoice_date DATETIME NOT NULL, 
	invoiced_quantity NUMERIC(18, 6) NOT NULL, 
	invoiced_unit_rate NUMERIC(18, 2) NOT NULL, 
	total_invoiced_amount NUMERIC(18, 2) NOT NULL, 
	verified_payable_quantity NUMERIC(18, 6), 
	approved_payable_amount NUMERIC(18, 2), 
	reconciliation_status VARCHAR(20) NOT NULL, 
	variance_notes TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_vendor_invoice_po_number UNIQUE (purchase_order_id, invoice_number), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id)
);
