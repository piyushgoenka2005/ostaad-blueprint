const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000/api/v1";
  }

  return "/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "OPERATIONS" | "FINANCE" | "SITE_STORE" | "ADMIN" | string;
  role_display: string;
  phone?: string;
  tenant_id: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserProfile;
}

export interface DemoAccount {
  role: string;
  role_title: string;
  full_name: string;
  email: string;
  password: string;
  dept_badge: string;
  avatar: string;
}

export interface BOQItem {
  id: string;
  wbs_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
  is_verified: boolean;
  verified_by_user_id?: string | null;
}

export interface Vendor {
  id: string;
  vendor_name: string;
  gstin: string;
  phone: string;
  city: string;
  category: string;
}

export interface MaterialRequirement {
  id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  uom?: string;
  standard_code: string;
  estimated_cost: number;
}

export interface TakeoffLine {
  id: string;
  item_description: string;
  category: string;
  quantity: number;
  unit: string;
  confidence: number;
  validation_status: string;
  needs_review: boolean;
  unit_cost: number;
  total_cost: number;
}

export interface TakeoffResponse {
  success: boolean;
  report: {
    project_name: string;
    sheet_name: string;
    classification: { drawing_type: string; confidence: number };
    lines: TakeoffLine[];
    reconciliation_flags: Array<{ message?: string; severity?: string }>;
    cost_summary: { currency_symbol: string; total_estimated_budget: number };
  };
  blueprint_data_url?: string | null;
  processing_time_sec?: number;
}

export interface VendorBidComparison {
  rank: string;
  bid_id: string;
  vendor_id: string;
  vendor_name: string;
  city: string;
  base_rate: number;
  freight: number;
  gst_pct: number;
  landed_rate: number;
  total_order_value_inr: number;
}

export interface PendingPO {
  id: string;
  po_number: string;
  project_id: string;
  material_name?: string;
  quantity?: number;
  uom?: string;
  unit_rate?: number;
  total_amount: number;
  vendor_name: string;
  manager_notes?: string;
  status: string;
  rejection_reason?: string | null;
  clarification_reason?: string | null;
  clarification_at?: string | null;
  is_dispatched?: boolean;
  created_at?: string;
}

export interface DispatchedPO {
  id: string;
  po_number: string;
  project_id: string;
  vendor_name: string;
  total_amount: number;
  is_dispatched: boolean;
  is_fully_settled: boolean;
  created_at?: string;
}

export interface NotificationItem {
  type: string;
  po_id: string;
  po_number: string;
  title: string;
  message: string;
  reason?: string;
  timestamp: string;
}

// ----------------- Auth Functions -----------------
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Authentication failed.");
  }
  return data;
}

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  company_name?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Registration failed.");
  }
  return data;
}

export async function getDemoAccounts(): Promise<DemoAccount[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/demo-accounts`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getCurrentUser(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: UserProfile) {
  if (typeof window !== "undefined") {
    localStorage.setItem("buildbharat_token", token);
    localStorage.setItem("buildbharat_user", JSON.stringify(user));
  }
}

export function getAuthSession(): { token: string | null; user: UserProfile | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("buildbharat_token");
  const rawUser = localStorage.getItem("buildbharat_user");
  let user: UserProfile | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }
  return { token, user };
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("buildbharat_token");
    localStorage.removeItem("buildbharat_user");
  }
}

// ----------------- Managing Authority / BOQ & Procurement -----------------
export async function getProjectBOQItems(projectId: string = "proj-demo-101"): Promise<BOQItem[]> {
  const res = await fetch(`${API_BASE_URL}/erp/boq/items/${projectId}`);
  if (!res.ok) throw new Error("Failed to load BOQ items.");
  return await res.json();
}

export async function uploadBlueprint(file: File): Promise<TakeoffResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("currency", "INR");
  const res = await fetch(`${API_BASE_URL}/takeoff/process`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to process blueprint.");
  return data;
}

export async function importTakeoffAsProject(payload: {
  project_name: string;
  district?: string;
  state?: string;
  lines: TakeoffLine[];
}): Promise<{ project_id: string; project_name: string; boq_line_count: number }> {
  const res = await fetch(`${API_BASE_URL}/erp/projects/from-takeoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to create project from blueprint.");
  return data;
}

export async function updateBOQItem(itemId: string, payload: Partial<BOQItem>): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/boq/item/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update BOQ line item.");
  return await res.json();
}

export async function addBOQItem(payload: {
  project_id: string;
  wbs_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/boq/item`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add BOQ item.");
  return await res.json();
}

export async function deleteBOQItem(itemId: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/boq/item/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete BOQ line item.");
  return await res.json();
}

export async function verifyAllBOQItems(projectId: string = "proj-demo-101", userId: string = "user-pm-01"): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/boq/verify-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, verified_by_user_id: userId }),
  });
  if (!res.ok) throw new Error("Failed to approve project BOQ.");
  return await res.json();
}

export async function decomposeBOQ(projectId: string = "proj-demo-101"): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/procurement/decompose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!res.ok) throw new Error("Failed to decompose materials.");
  return await res.json();
}

export async function getVendors(): Promise<Vendor[]> {
  const res = await fetch(`${API_BASE_URL}/erp/vendors`);
  if (!res.ok) throw new Error("Failed to load vendor directory.");
  return await res.json();
}

export async function createVendor(payload: Omit<Vendor, "id">): Promise<Vendor> {
  const res = await fetch(`${API_BASE_URL}/erp/vendors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to create vendor.");
  return data;
}

export async function createMaterialRFQ(payload: {
  project_id: string;
  material_name: string;
  required_quantity: number;
  uom: string;
}): Promise<{ rfq_id: string; material_name: string; quantity: number; uom: string }> {
  const res = await fetch(`${API_BASE_URL}/erp/procurement/rfq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to create material RFQ.");
  return data;
}

export async function submitMaterialBid(payload: {
  rfq_id: string;
  vendor_id: string;
  final_unit_rate: number;
}): Promise<{ bid_id: string; landed_cost_per_unit: number }> {
  const res = await fetch(`${API_BASE_URL}/erp/procurement/bids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rfq_id: payload.rfq_id,
      vendor_id: payload.vendor_id,
      base_unit_rate: payload.final_unit_rate,
      freight_unit_rate: 0,
      gst_percentage: 0,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to record vendor quote.");
  return data;
}

export async function getMaterialComparison(rfqId: string): Promise<VendorBidComparison[]> {
  const res = await fetch(`${API_BASE_URL}/erp/procurement/comparative/${rfqId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to load vendor comparison.");
  return data.comparative_ranking || [];
}

export async function getPMNotifications(projectId: string = "proj-demo-101"): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE_URL}/erp/notifications/pm/${projectId}`);
  if (!res.ok) return [];
  return await res.json();
}

export async function submitBillProposalToFinance(payload: {
  rfq_id?: string;
  vendor_id?: string;
  bid_id?: string;
  selected_bid_id?: string;
  manager_user_id: string;
  justification_notes?: string;
  manager_notes?: string;
}): Promise<any> {
  const requestBody = {
    rfq_id: payload.rfq_id || "rfq-demo-001",
    selected_bid_id: payload.selected_bid_id || payload.bid_id || "bid-demo-001",
    manager_user_id: payload.manager_user_id || "user-pm-01",
    manager_notes: payload.manager_notes || payload.justification_notes || "Recommended based on lowest evaluated landed rate and delivery lead time."
  };
  const res = await fetch(`${API_BASE_URL}/erp/procurement/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to submit bill proposal to finance.");
  }
  return await res.json();
}

// ----------------- Finance Department -----------------
export async function getPendingFinancePOs(): Promise<PendingPO[]> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/pending`);
  if (!res.ok) return [];
  return await res.json();
}

export async function getFinanceOrders(): Promise<PendingPO[]> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/orders`);
  if (!res.ok) throw new Error("Failed to load Finance purchase orders.");
  return await res.json();
}

export async function approveFinancePO(payload: {
  po_id: string;
  finance_user_id: string;
  payment_structure: "PART_BY_PART" | "ADVANCE_ONLY" | "ON_DELIVERY_CREDIT";
  advance_percentage?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to approve PO.");
  }
  return await res.json();
}

export async function rejectFinancePO(payload: {
  po_id: string;
  finance_user_id: string;
  rejection_reason: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to reject PO.");
  }
  return await res.json();
}

export async function requestFinanceClarification(payload: {
  po_id: string;
  finance_user_id: string;
  clarification_reason: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/clarification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Failed to request clarification.");
  return data;
}

export async function recordFinancePayment(payload: {
  po_id: string;
  finance_user_id: string;
  stage_type: "ADVANCE" | "MILESTONE_TRANCHE" | "FINAL_SETTLEMENT";
  amount: number;
  payment_method: "NEFT_RTGS" | "NEFT" | "CHEQUE" | "UPI" | "CASH";
  transaction_ref: string;
  bank_name?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/finance/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      po_id: payload.po_id,
      finance_user_id: payload.finance_user_id,
      stage_type: payload.stage_type,
      amount_inr: payload.amount,
      payment_method: payload.payment_method,
      transaction_ref: payload.transaction_ref,
      bank_name: payload.bank_name || "",
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to log transaction.");
  }
  return await res.json();
}

export async function reconcileInvoice(payload: {
  po_id: string;
  invoice_number: string;
  invoice_date: string;
  billed_quantity: number;
  billed_unit_rate: number;
  gst_amount: number;
  total_invoice_amount: number;
  verified_by_user_id: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/reconciliation/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to reconcile invoice.");
  }
  return await res.json();
}

export async function settlePOFinalBalance(payload: {
  po_id: string;
  payment_method: string;
  transaction_ref: string;
  bank_name?: string;
  settled_by_user_id: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/erp/reconciliation/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to settle PO.");
  }
  return await res.json();
}

export interface StoreDispatchedPO {
  id: string;
  po_number: string;
  material_name: string;
  ordered_quantity: number;
  uom: string;
  net_received_quantity: number;
  pending_delivery_quantity: number;
  vendor_name: string;
  is_fully_settled: boolean;
}

export interface GodownStockItem {
  material_name: string;
  current_stock: number;
  uom: string;
  last_updated?: string;
}

// ----------------- Site Storekeeper -----------------
export async function getStorePOs(projectId: string = "proj-demo-101"): Promise<StoreDispatchedPO[]> {
  const res = await fetch(`${API_BASE_URL}/erp/stores/pos/${projectId}`);
  if (!res.ok) return [];
  return await res.json();
}

export async function receiveGoodsGRN(payload: {
  po_id: string;
  storekeeper_id?: string;
  received_by_user_id?: string;
  challan_number: string;
  truck_number?: string;
  vehicle_number?: string;
  received_quantity?: number;
  gross_quantity?: number;
  damaged_quantity?: number;
  challan_photo_url?: string;
  notes?: string;
}): Promise<any> {
  const requestBody = {
    po_id: payload.po_id,
    storekeeper_id: payload.storekeeper_id || payload.received_by_user_id || "user-store-01",
    challan_number: payload.challan_number,
    truck_number: (payload.truck_number || payload.vehicle_number || "MH-04-AZ-9988").toUpperCase(),
    received_quantity: payload.received_quantity ?? payload.gross_quantity ?? 0,
    damaged_quantity: payload.damaged_quantity || 0,
    challan_photo_url: payload.challan_photo_url || "https://s3.ap-south-1.amazonaws.com/erp-docs/chal-0091.jpg",
  };

  const res = await fetch(`${API_BASE_URL}/erp/stores/grn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to receive goods.");
  }
  return await res.json();
}

export async function getProcurementReport(projectId: string = "proj-demo-101"): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/erp/reports/procurement/${projectId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.report || null;
  } catch {
    return null;
  }
}

// ----------------- Admin -----------------
export async function getRegisteredUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/erp/users`);
  if (!res.ok) return [];
  return await res.json();
}

