"use client";

import React, { ReactNode } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import {
  Role,
  Permission,
  hasPermission,
  normalizeRole,
  ROLE_DEFINITIONS,
  StandardRole,
} from "@/lib/rbac";
import { getAuthSession } from "@/lib/api";

interface RoleGateProps {
  allow?: Role[];
  requirePermission?: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * RoleGate renders children only if the logged-in user possesses the required role or permission.
 */
export default function RoleGate({
  allow,
  requirePermission: perm,
  fallback,
  children,
}: RoleGateProps) {
  const { user } = getAuthSession();
  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  const userRole = normalizeRole(user.role);

  // Check role allowance
  if (allow && allow.length > 0) {
    const normalizedAllowed = allow.map(normalizeRole);
    if (!normalizedAllowed.includes(userRole)) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  // Check granular permission
  if (perm) {
    if (!hasPermission(userRole, perm)) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  return <>{children}</>;
}

/**
 * RoleBadge displays an executive-styled badge representing the user's enterprise role.
 */
export function RoleBadge({ role, size = "md" }: { role: string; size?: "sm" | "md" | "lg" }) {
  const stdRole = normalizeRole(role);
  const meta = ROLE_DEFINITIONS[stdRole] || ROLE_DEFINITIONS.PROJECT_MANAGER;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
    lg: "px-3 py-1.5 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-lg border ${meta.colorScheme.bg} ${meta.colorScheme.text} ${meta.colorScheme.border} ${sizeClasses}`}
      title={meta.description}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.colorScheme.badgeBg}`} />
      <span>{meta.title}</span>
    </span>
  );
}

/**
 * AccessDeniedCard shows a clean, non-intrusive alert when access is gated.
 */
export function AccessDeniedCard({ requiredRole }: { requiredRole?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <Lock className="h-4 w-4" />
      </div>
      <div>
        <div className="font-bold text-slate-800">Commercial Action Restricted</div>
        <div className="text-[11px] text-slate-500">
          This operation requires elevated authority ({requiredRole || "Authorised Personnel"}).
        </div>
      </div>
    </div>
  );
}
