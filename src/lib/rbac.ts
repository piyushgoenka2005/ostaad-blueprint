/**
 * Ostaad ERP Role-Based Access Control (RBAC) & Session Engine
 * Sub-Module 1.2: Platform Foundation, Multi-Tenant Core & Security
 * 
 * 100% Web Standards & Cloudflare Workers Edge Runtime Compatible (WebCrypto).
 */

import { NextResponse } from "next/server";

// ==========================================
// 1. STANDARD 8 ENTERPRISE ROLES
// ==========================================

export type StandardRole =
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "PROJECT_MANAGER"
  | "PROCUREMENT_MANAGER"
  | "FINANCE_APPROVER"
  | "SITE_ENGINEER"
  | "STORE_MANAGER"
  | "AUDITOR";

export type LegacyRole = "OPERATIONS" | "FINANCE" | "SITE_STORE" | "ADMIN";

export type Role = StandardRole | LegacyRole;

export interface RoleMetadata {
  id: StandardRole;
  title: string;
  department: string;
  description: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
  level: number; // 1 (Highest) to 8 (Auditor)
}

export const ROLE_DEFINITIONS: Record<StandardRole, RoleMetadata> = {
  SUPER_ADMIN: {
    id: "SUPER_ADMIN",
    title: "Super Administrator",
    department: "Executive & Governance",
    description: "Global cross-company oversight, tenant administration, database migrations & security configuration.",
    colorScheme: {
      bg: "bg-purple-50",
      text: "text-purple-800",
      border: "border-purple-200",
      badgeBg: "bg-purple-600",
    },
    level: 1,
  },
  COMPANY_ADMIN: {
    id: "COMPANY_ADMIN",
    title: "Company Administrator",
    department: "Corporate Management",
    description: "Entity administrator managing company settings, subsidiaries, employee onboarding, and access roles.",
    colorScheme: {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      border: "border-indigo-200",
      badgeBg: "bg-indigo-600",
    },
    level: 2,
  },
  PROJECT_MANAGER: {
    id: "PROJECT_MANAGER",
    title: "Project Operations Lead",
    department: "Execution & Planning",
    description: "Overall project scheduling, WBS work head management, BOQ approval, and milestone tracking.",
    colorScheme: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-200",
      badgeBg: "bg-blue-600",
    },
    level: 3,
  },
  PROCUREMENT_MANAGER: {
    id: "PROCUREMENT_MANAGER",
    title: "Procurement & Sourcing Lead",
    department: "Supply Chain & Sourcing",
    description: "Vendor onboarding, material RFQ floating, supplier quotation comparison, and draft PO generation.",
    colorScheme: {
      bg: "bg-cyan-50",
      text: "text-cyan-800",
      border: "border-cyan-200",
      badgeBg: "bg-cyan-600",
    },
    level: 4,
  },
  FINANCE_APPROVER: {
    id: "FINANCE_APPROVER",
    title: "Head of Commercial & Finance",
    department: "Treasury & Accounts",
    description: "Commercial gatekeeper approving purchase orders, 3-way invoice matching, and payment disbursement.",
    colorScheme: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
      badgeBg: "bg-emerald-600",
    },
    level: 5,
  },
  SITE_ENGINEER: {
    id: "SITE_ENGINEER",
    title: "Site Execution Engineer",
    department: "Field Construction",
    description: "On-site quality inspection, survey checklists, physical progress reporting, and material indenting.",
    colorScheme: {
      bg: "bg-sky-50",
      text: "text-sky-800",
      border: "border-sky-200",
      badgeBg: "bg-sky-600",
    },
    level: 6,
  },
  STORE_MANAGER: {
    id: "STORE_MANAGER",
    title: "Site Storekeeper & Inventory In-Charge",
    department: "Godown & Physical GRN",
    description: "Weighbridge challan verification, Goods Receipt Note (GRN) logging, and bin card inventory tracking.",
    colorScheme: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      badgeBg: "bg-amber-600",
    },
    level: 7,
  },
  AUDITOR: {
    id: "AUDITOR",
    title: "Statutory Auditor & Compliance Officer",
    department: "Internal Audit & Vigilance",
    description: "Read-only access across all general ledgers, financial transactions, and immutable audit trails.",
    colorScheme: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
      badgeBg: "bg-slate-700",
    },
    level: 8,
  },
};

// ==========================================
// 2. GRANULAR PERMISSION TAXONOMY
// ==========================================

export type Permission =
  // Tenant & Organization
  | "tenant:read"
  | "tenant:manage"
  | "company:create"
  | "company:manage"
  | "user:read"
  | "user:manage"
  // Projects & Planning
  | "project:read"
  | "project:create"
  | "project:manage"
  | "site_survey:execute"
  | "site_survey:approve"
  // BOQ & Estimation
  | "boq:read"
  | "boq:create"
  | "boq:update"
  | "boq:verify"
  // Procurement & RFQs
  | "vendor:read"
  | "vendor:create"
  | "rfq:create"
  | "rfq:compare_bids"
  | "po:create_draft"
  // Finance Gate & Accounts
  | "po:approve"
  | "po:reject"
  | "invoice:verify"
  | "payment:release"
  // Site Store & Inventory
  | "grn:create"
  | "stock:read"
  | "stock:transfer"
  // Audit & Governance
  | "audit:read_all";

// ==========================================
// 3. ROLE-TO-PERMISSION MATRIX
// ==========================================

export const ROLE_PERMISSIONS: Record<StandardRole, Permission[]> = {
  SUPER_ADMIN: [
    "tenant:read", "tenant:manage", "company:create", "company:manage", "user:read", "user:manage",
    "project:read", "project:create", "project:manage", "site_survey:execute", "site_survey:approve",
    "boq:read", "boq:create", "boq:update", "boq:verify", "vendor:read", "vendor:create", "rfq:create",
    "rfq:compare_bids", "po:create_draft", "po:approve", "po:reject", "invoice:verify", "payment:release",
    "grn:create", "stock:read", "stock:transfer", "audit:read_all",
  ],
  COMPANY_ADMIN: [
    "tenant:read", "company:manage", "user:read", "user:manage", "project:read", "project:create",
    "project:manage", "site_survey:approve", "boq:read", "boq:create", "boq:update", "boq:verify",
    "vendor:read", "vendor:create", "rfq:create", "rfq:compare_bids", "po:create_draft", "po:approve",
    "invoice:verify", "stock:read", "audit:read_all",
  ],
  PROJECT_MANAGER: [
    "project:read", "project:create", "project:manage", "site_survey:execute", "site_survey:approve",
    "boq:read", "boq:create", "boq:update", "boq:verify", "vendor:read", "rfq:create", "rfq:compare_bids",
    "po:create_draft", "stock:read", "audit:read_all",
  ],
  PROCUREMENT_MANAGER: [
    "project:read", "boq:read", "vendor:read", "vendor:create", "rfq:create", "rfq:compare_bids",
    "po:create_draft", "stock:read",
  ],
  FINANCE_APPROVER: [
    "project:read", "boq:read", "vendor:read", "rfq:compare_bids", "po:create_draft", "po:approve",
    "po:reject", "invoice:verify", "payment:release", "stock:read", "audit:read_all",
  ],
  SITE_ENGINEER: [
    "project:read", "site_survey:execute", "boq:read", "stock:read",
  ],
  STORE_MANAGER: [
    "project:read", "vendor:read", "grn:create", "stock:read", "stock:transfer",
  ],
  AUDITOR: [
    "tenant:read", "project:read", "boq:read", "vendor:read", "stock:read", "audit:read_all",
  ],
};

// ==========================================
// 4. ROLE NORMALIZATION & EVALUATION
// ==========================================

export function normalizeRole(role: string): StandardRole {
  const clean = role?.trim().toUpperCase();
  switch (clean) {
    case "SUPER_ADMIN":
    case "SUPERADMIN":
      return "SUPER_ADMIN";
    case "COMPANY_ADMIN":
    case "ADMIN":
      return "COMPANY_ADMIN";
    case "OPERATIONS":
    case "PROJECT_MANAGER":
    case "PM":
      return "PROJECT_MANAGER";
    case "PROCUREMENT":
    case "PROCUREMENT_MANAGER":
      return "PROCUREMENT_MANAGER";
    case "FINANCE":
    case "FINANCE_APPROVER":
      return "FINANCE_APPROVER";
    case "SITE_ENGINEER":
    case "ENGINEER":
      return "SITE_ENGINEER";
    case "SITE_STORE":
    case "STORE_MANAGER":
    case "STOREKEEPER":
      return "STORE_MANAGER";
    case "AUDITOR":
    case "VIEWER":
      return "AUDITOR";
    default:
      return "PROJECT_MANAGER";
  }
}

export function hasPermission(role: string, permission: Permission): boolean {
  const stdRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[stdRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// ==========================================
// 5. WEBCRYPTO SESSION SIGNING & HASHING
// ==========================================

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: StandardRole;
  tenantId: string;
  companyId: string;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "ostaad-erp-enterprise-cryptographic-signing-key-2026";

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signs a cryptographic session token using native WebCrypto HMAC-SHA256
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const key = await getCryptoKey();
  const enc = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const base64Payload = btoa(payloadStr);

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(base64Payload));
  const signatureBytes = new Uint8Array(signature);
  const base64Signature = btoa(String.fromCharCode(...signatureBytes));

  return `${base64Payload}.${base64Signature}`;
}

/**
 * Verifies a cryptographic session token and returns decoded payload
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [base64Payload, base64Signature] = token.split(".");
    if (!base64Payload || !base64Signature) return null;

    const key = await getCryptoKey();
    const enc = new TextEncoder();

    const signatureStr = atob(base64Signature);
    const signatureBytes = new Uint8Array(signatureStr.split("").map((c) => c.charCodeAt(0)));

    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, enc.encode(base64Payload));
    if (!valid) return null;

    const payload: SessionPayload = JSON.parse(atob(base64Payload));
    if (Date.now() > payload.expiresAt) return null; // expired

    return payload;
  } catch {
    return null;
  }
}

/**
 * PBKDF2 Password Hasher using native WebCrypto (Edge runtime compliant)
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordKey = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 10000,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(derived)).map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${saltHex}:${hashHex}`;
}

/**
 * Verifies a password against PBKDF2 salt:hash string
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, expectedHashHex] = storedHash.split(":");
    if (!saltHex || !expectedHashHex) return false;

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const enc = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, [
      "deriveBits",
    ]);

    const derived = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 10000,
        hash: "SHA-256",
      },
      passwordKey,
      256
    );

    const hashHex = Array.from(new Uint8Array(derived)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex === expectedHashHex;
  } catch {
    return false;
  }
}

/**
 * Server-side route handler guard: validates permission and returns 403 Forbidden if not permitted
 */
export function enforcePermission(
  userRole: string,
  requiredPermission: Permission
): { authorized: boolean; errorResponse?: NextResponse } {
  if (!hasPermission(userRole, requiredPermission)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: `Role "${normalizeRole(userRole)}" lacks required permission: "${requiredPermission}".`,
          requiredPermission,
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true };
}

