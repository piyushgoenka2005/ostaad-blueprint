export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

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

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Authentication failed. Please check your credentials.");
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
    throw new Error(data.detail || "Registration failed. Please check the entered details.");
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
