/**
 * Ostaad ERP Core Data Store
 * In-memory state store with persistent D1 migration seed compatibility.
 * Provides instant responses for Next.js App Router API routes.
 */

import { Company, UserCompanyRole } from "@/lib/tenant-context";

export interface DemoUser {
  id: string;
  email: string;
  full_name: string;
  role: "OPERATIONS" | "FINANCE" | "SITE_STORE" | "ADMIN" | string;
  role_display: string;
  dept_badge: string;
  avatar: string;
  tenant_id: string;
  company_id?: string;
  phone?: string;
}

export interface StoreBOQItem {
  id: string;
  project_id: string;
  company_id?: string;
  wbs_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  is_verified: boolean;
  verified_by_user_id?: string | null;
}

export interface StoreVendor {
  id: string;
  company_id?: string;
  vendor_name: string;
  gstin: string;
  phone: string;
  city: string;
  category: string;
}

export interface StorePO {
  id: string;
  po_number: string;
  company_id?: string;
  project_id: string;
  project_name: string;
  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string;
  material_name: string;
  ordered_quantity: number;
  uom: string;
  rate_per_unit: number;
  total_amount: number;
  status: "PENDING_FINANCE_APPROVAL" | "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED";
  manager_notes?: string;
  rejection_reason?: string;
  clarification_notes?: string;
  payment_structure?: string;
  advance_percentage?: number;
  net_received_quantity: number;
  pending_delivery_quantity: number;
  is_fully_settled: boolean;
  created_at: string;
}

export interface StoreGRN {
  id: string;
  po_id: string;
  challan_number: string;
  truck_number: string;
  received_quantity: number;
  damaged_quantity: number;
  challan_photo_url?: string;
  storekeeper_id: string;
  created_at: string;
}

class ERPDataStore {
  public companies: Company[] = [
    {
      id: "comp-lt-01",
      tenant_id: "tenant-demo-1",
      company_name: "Larsen & Toubro Construction Ltd",
      legal_name: "Larsen & Toubro Limited - Heavy Civil Infrastructure IC",
      gstin: "27AAACL0149C1ZM",
      pan_number: "AAACL0149C",
      state_code: "27",
      state_name: "Maharashtra",
      registered_address: "L&T House, Ballard Estate, P.O. Box: 278, Mumbai 400001",
      city: "Mumbai",
      pincode: "400001",
      currency: "INR",
      financial_year_start: "04-01",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "comp-lt-metro-02",
      tenant_id: "tenant-demo-1",
      company_name: "L&T Metro Rail & Elevated Corridors JV",
      legal_name: "L&T Infrastructure Engineering Joint Venture Ltd",
      gstin: "29AAACL0149C1ZK",
      pan_number: "AAACL0149C",
      state_code: "29",
      state_name: "Karnataka",
      registered_address: "Whitefield Main Road, ITPL Tech Park, Bangalore 560066",
      city: "Bengaluru",
      pincode: "560066",
      currency: "INR",
      financial_year_start: "04-01",
      is_active: true,
      created_at: "2026-01-15T00:00:00Z",
    },
    {
      id: "comp-shapoorji-03",
      tenant_id: "tenant-demo-1",
      company_name: "Shapoorji Pallonji EPC Ltd",
      legal_name: "Shapoorji Pallonji and Company Private Limited",
      gstin: "07AAACS1234D1Z8",
      pan_number: "AAACS1234D",
      state_code: "07",
      state_name: "Delhi",
      registered_address: "Barakhamba Road, Connaught Place, New Delhi 110001",
      city: "New Delhi",
      pincode: "110001",
      currency: "INR",
      financial_year_start: "04-01",
      is_active: true,
      created_at: "2026-02-01T00:00:00Z",
    },
  ];

  public userCompanyRoles: UserCompanyRole[] = [
    { user_id: "user-pm-01", company_id: "comp-lt-01", role: "OPERATIONS", is_default: true, assigned_at: "2026-01-01T00:00:00Z" },
    { user_id: "user-fin-01", company_id: "comp-lt-01", role: "FINANCE", is_default: true, assigned_at: "2026-01-01T00:00:00Z" },
    { user_id: "user-store-01", company_id: "comp-lt-01", role: "SITE_STORE", is_default: true, assigned_at: "2026-01-01T00:00:00Z" },
    { user_id: "admin-01", company_id: "comp-lt-01", role: "ADMIN", is_default: true, assigned_at: "2026-01-01T00:00:00Z" },
    { user_id: "user-pm-01", company_id: "comp-lt-metro-02", role: "OPERATIONS", is_default: false, assigned_at: "2026-01-15T00:00:00Z" },
    { user_id: "user-fin-01", company_id: "comp-shapoorji-03", role: "FINANCE", is_default: false, assigned_at: "2026-02-01T00:00:00Z" },
  ];

  public users: DemoUser[] = [
    {
      id: "user-pm-01",
      email: "rajesh.pm@lt.com",
      full_name: "Rajesh Sharma",
      role: "OPERATIONS",
      role_display: "Managing Authority / Operations",
      dept_badge: "Execution & Planning",
      avatar: "RS",
      tenant_id: "tenant-demo-1",
      phone: "+91 98201 12233",
    },
    {
      id: "user-fin-01",
      email: "sunita.finance@lt.com",
      full_name: "Sunita Iyer",
      role: "FINANCE",
      role_display: "Head of Commercial & Finance",
      dept_badge: "Commercial & Treasury",
      avatar: "SI",
      tenant_id: "tenant-demo-1",
      phone: "+91 98202 33445",
    },
    {
      id: "user-store-01",
      email: "ramesh.store@lt.com",
      full_name: "Ramesh Pawar",
      role: "SITE_STORE",
      role_display: "Site Stores & Inventory In-Charge",
      dept_badge: "Godown & Physical GRN",
      avatar: "RP",
      tenant_id: "tenant-demo-1",
      phone: "+91 98203 55667",
    },
    {
      id: "admin-01",
      email: "admin@ostaad.in",
      full_name: "Aditya Verma",
      role: "ADMIN",
      role_display: "Corporate Administrator",
      dept_badge: "Security & Governance",
      avatar: "AV",
      tenant_id: "tenant-demo-1",
      phone: "+91 98200 99887",
    },
  ];

  public vendors: StoreVendor[] = [
    {
      id: "ven-01",
      vendor_name: "UltraTech Cement Ltd",
      gstin: "27AAACU2345H1Z5",
      phone: "+91 98200 11223",
      city: "Mumbai",
      category: "Cement & Binders",
    },
    {
      id: "ven-02",
      vendor_name: "Tata Steel Ltd (Tiscon)",
      gstin: "27AAACT0987K1Z3",
      phone: "+91 98200 44556",
      city: "Navi Mumbai",
      category: "Structural Steel & TMT",
    },
    {
      id: "ven-03",
      vendor_name: "Ambuja Cements Ltd",
      gstin: "27AAACA1234D1Z2",
      phone: "+91 98200 77889",
      city: "Thane",
      category: "Cement & Binders",
    },
    {
      id: "ven-04",
      vendor_name: "Jindal Steel & Power (JSPL)",
      gstin: "27AAACJ5678L1Z9",
      phone: "+91 98200 88990",
      city: "Mumbai",
      category: "Structural Steel & TMT",
    },
  ];

  public boqItems: StoreBOQItem[] = [
    {
      id: "boq-001",
      project_id: "proj-demo-101",
      wbs_code: "1.1.1",
      description: "Earthwork excavation in foundation trenches in ordinary soil up to 1.5m depth",
      quantity: 1250,
      unit: "cum",
      unit_rate: 285.5,
      total_amount: 356875,
      is_verified: true,
      verified_by_user_id: "user-pm-01",
    },
    {
      id: "boq-002",
      project_id: "proj-demo-101",
      wbs_code: "1.2.3",
      description: "Reinforced Cement Concrete M25 grade in column footings and raft slabs",
      quantity: 480,
      unit: "cum",
      unit_rate: 6250.0,
      total_amount: 3000000,
      is_verified: true,
      verified_by_user_id: "user-pm-01",
    },
    {
      id: "boq-003",
      project_id: "proj-demo-101",
      wbs_code: "2.1.4",
      description: "Thermo-Mechanically Treated (TMT) Fe-550D high yield steel rebar reinforcement",
      quantity: 45,
      unit: "MT",
      unit_rate: 58500.0,
      total_amount: 2632500,
      is_verified: true,
      verified_by_user_id: "user-pm-01",
    },
    {
      id: "boq-004",
      project_id: "proj-demo-101",
      wbs_code: "3.1.1",
      description: "Autoclaved Aerated Concrete (AAC) block masonry in 1:4 cement mortar 200mm thick",
      quantity: 820,
      unit: "sqm",
      unit_rate: 1420.0,
      total_amount: 1164400,
      is_verified: false,
      verified_by_user_id: null,
    },
  ];

  public purchaseOrders: StorePO[] = [
    {
      id: "po-101",
      po_number: "PO-2026-MUM-0089",
      project_id: "proj-demo-101",
      project_name: "Commercial Complex - Tower B",
      vendor_id: "ven-01",
      vendor_name: "UltraTech Cement Ltd",
      vendor_gstin: "27AAACU2345H1Z5",
      material_name: "Ordinary Portland Cement (OPC 53 Grade)",
      ordered_quantity: 3840,
      uom: "Bags",
      rate_per_unit: 380,
      total_amount: 1459200,
      status: "PENDING_FINANCE_APPROVAL",
      manager_notes: "Lowest qualified bidder with 2-day delivery guarantee. Needed for raft foundation pour next Monday.",
      net_received_quantity: 0,
      pending_delivery_quantity: 3840,
      is_fully_settled: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "po-102",
      po_number: "PO-2026-MUM-0090",
      project_id: "proj-demo-101",
      project_name: "Commercial Complex - Tower B",
      vendor_id: "ven-02",
      vendor_name: "Tata Steel Ltd (Tiscon)",
      vendor_gstin: "27AAACT0987K1Z3",
      material_name: "TMT Rebars Fe-550D (16mm & 20mm)",
      ordered_quantity: 45,
      uom: "MT",
      rate_per_unit: 58500,
      total_amount: 2632500,
      status: "APPROVED",
      manager_notes: "Primary rebar lot for columns and shear walls.",
      payment_structure: "PART_BY_PART",
      advance_percentage: 30,
      net_received_quantity: 25,
      pending_delivery_quantity: 20,
      is_fully_settled: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  public grnReceipts: StoreGRN[] = [
    {
      id: "grn-001",
      po_id: "po-102",
      challan_number: "CH-9921",
      truck_number: "MH-04-AZ-9988",
      received_quantity: 25,
      damaged_quantity: 0,
      challan_photo_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80",
      storekeeper_id: "user-store-01",
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  public rfqs: Record<string, { id: string; material_name: string; quantity: number; uom: string; project_id: string }> = {};
  public bids: Record<string, Array<{ id: string; vendor_id: string; rate: number; created_at: string }>> = {};

  public findUserByEmail(email: string): DemoUser | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public authenticate(email: string): DemoUser {
    const user = this.findUserByEmail(email);
    if (user) return user;
    // Fallback default
    return this.users[0];
  }

  // Multi-Company Sub-Module 1.1 Methods
  public getCompanies(): Company[] {
    return this.companies.filter((c) => c.is_active);
  }

  public getCompanyById(id: string): Company | undefined {
    return this.companies.find((c) => c.id === id);
  }

  public getCompaniesForUser(userId: string): Company[] {
    const assignedIds = this.userCompanyRoles
      .filter((ucr) => ucr.user_id === userId)
      .map((ucr) => ucr.company_id);
    
    // If no explicit assignments, provide default access to active companies
    if (assignedIds.length === 0) return this.getCompanies();
    return this.companies.filter((c) => assignedIds.includes(c.id) && c.is_active);
  }

  public createCompany(data: {
    company_name: string;
    legal_name: string;
    gstin: string;
    pan_number: string;
    state_code: string;
    state_name: string;
    registered_address: string;
    city: string;
    pincode: string;
    tenant_id?: string;
  }): Company {
    const newCompany: Company = {
      id: `comp-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
      tenant_id: data.tenant_id || "tenant-demo-1",
      company_name: data.company_name.trim(),
      legal_name: data.legal_name.trim(),
      gstin: data.gstin.trim().toUpperCase(),
      pan_number: data.pan_number.trim().toUpperCase(),
      state_code: data.state_code.trim(),
      state_name: data.state_name.trim(),
      registered_address: data.registered_address.trim(),
      city: data.city.trim(),
      pincode: data.pincode.trim(),
      currency: "INR",
      financial_year_start: "04-01",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.companies.push(newCompany);
    return newCompany;
  }

  public updateCompany(id: string, updates: Partial<Company>): Company | null {
    const index = this.companies.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.companies[index] = { ...this.companies[index], ...updates };
    return this.companies[index];
  }
}

// Global singleton instance
const globalStoreKey = Symbol.for("ostaad.erp.store");
const globalObj = globalThis as unknown as { [key: symbol]: ERPDataStore };

export const erpStore: ERPDataStore = globalObj[globalStoreKey] || new ERPDataStore();
if (process.env.NODE_ENV !== "production") {
  globalObj[globalStoreKey] = erpStore;
}

