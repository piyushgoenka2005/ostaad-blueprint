"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  LayoutDashboard,
  Compass,
  ClipboardList,
  BadgeCheck,
  Truck,
  Shield,
  FolderArchive,
  Database,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  User,
  SlidersHorizontal,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calculator,
  ShoppingCart,
} from "lucide-react";
import CompanySwitcher from "@/components/CompanySwitcher";
import { RoleBadge } from "@/components/RoleGate";
import { clearAuthSession, getAuthSession, UserProfile } from "@/lib/api";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  activeNav?: "pre-construction" | "projects" | "boq" | "operations" | "procurement" | "finance" | "site-store" | "admin";
  actions?: React.ReactNode;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "success" | "warning" | "info";
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Commercial PO-9921 Approved",
    description: "Finance Approver authorized ₹30,00,000 for UltraTech RMC Batching.",
    timestamp: "10 mins ago",
    type: "success",
    read: false,
  },
  {
    id: "notif-2",
    title: "Site Store GRN Tolerance Pass",
    description: "45 MT TMT Fe-550D received at weighbridge (+2.1% tolerance gate approved).",
    timestamp: "1 hour ago",
    type: "info",
    read: false,
  },
  {
    id: "notif-3",
    title: "Statutory Fire NOC Renewal Pending",
    description: "Fire Department Provisional NOC expires in 15 days for Tower B.",
    timestamp: "3 hours ago",
    type: "warning",
    read: false,
  },
  {
    id: "notif-4",
    title: "D1 Database & R2 Storage Synchronized",
    description: "Migration 0005 applied: Cloudflare R2 Document Vault active.",
    timestamp: "5 hours ago",
    type: "success",
    read: true,
  },
];

export default function AppShell({
  children,
  title,
  subtitle,
  breadcrumbs,
  activeNav,
  actions,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    const session = getAuthSession();
    if (session.user) {
      setUser(session.user);
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Determine active item from current route if not explicitly supplied
  const currentNav = useMemo(() => {
    if (activeNav) return activeNav;
    if (pathname.includes("/pre-construction")) return "pre-construction";
    if (pathname.includes("/projects")) return "projects";
    if (pathname.includes("/boq")) return "boq";
    if (pathname.includes("/procurement")) return "procurement";
    if (pathname.includes("/operations")) return "operations";
    if (pathname.includes("/finance")) return "finance";
    if (pathname.includes("/site-store")) return "site-store";
    if (pathname.includes("/admin")) return "admin";
    return "operations";
  }, [activeNav, pathname]);

  const navItems = [
    {
      group: "Planning Hub",
      items: [
        {
          id: "pre-construction",
          label: "Pre-Construction Hub",
          badge: "15 Tools",
          href: "/dashboard/pre-construction",
          icon: Compass,
        },
      ],
    },
    {
      group: "Execution & Engineering",
      items: [
        {
          id: "projects",
          label: "Project Lifecycle & WBS",
          badge: "Module 3",
          href: "/dashboard/projects",
          icon: FolderKanban,
        },
        {
          id: "boq",
          label: "BOQ & Cost Control",
          badge: "Module 4",
          href: "/dashboard/boq",
          icon: Calculator,
        },
        {
          id: "operations",
          label: "Operations & Tasks",
          badge: "Site Ops",
          href: "/dashboard/operations",
          icon: ClipboardList,
        },
      ],
    },
    {
      group: "Commercial & Treasury",
      items: [
        {
          id: "finance",
          label: "Finance & PO Gate",
          badge: "3-Way Match",
          href: "/dashboard/finance",
          icon: BadgeCheck,
        },
      ],
    },
    {
      group: "Supply Chain & Sourcing",
      items: [
        {
          id: "procurement",
          label: "Procurement & Sourcing",
          badge: "Module 5",
          href: "/dashboard/procurement",
          icon: ShoppingCart,
        },
        {
          id: "site-store",
          label: "Site Store & GRN",
          badge: "+5% Tolerance",
          href: "/dashboard/site-store",
          icon: Truck,
        },
      ],
    },
    {
      group: "System Governance",
      items: [
        {
          id: "admin",
          label: "Administration & Audit",
          badge: "D1 & R2",
          href: "/dashboard/admin",
          icon: Shield,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f8fc] text-slate-800 flex flex-col antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* ======================================================== */}
      {/* DESKTOP FIXED SIDEBAR                                    */}
      {/* ======================================================== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#10263d] text-white lg:flex border-r border-[#1a3857]">
        {/* Brand Banner */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#10263d] shadow-sm">
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
              <span>Ostaad ERP</span>
              <span className="rounded-sm bg-blue-500/20 px-1 py-0.2 text-[9px] font-mono text-blue-300 border border-blue-400/30">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-slate-400 leading-none">
              Construction · Procurement · Finance
            </div>
          </div>
        </div>

        {/* Navigation Tree */}
        <nav className="flex-1 space-y-5 px-3 py-4 text-xs overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.group}>
              <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentNav === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 font-semibold"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-medium ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-white/5 text-slate-400 border border-white/10"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout In Sidebar Bottom */}
        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300 border border-blue-400/30">
                {(user?.full_name || "Ostaad User")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">
                  {user?.full_name || "Authorized Engineer"}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-slate-400">
                  {user?.role || "PROJECT_MANAGER"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE SLIDE-OVER DRAWER                                 */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 flex-1 flex-col bg-[#10263d] text-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <div className="flex items-center gap-2.5 font-bold text-base">
                <Building2 className="h-5 w-5 text-blue-400" />
                <span>Ostaad ERP</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-4 px-3 py-4 text-xs overflow-y-auto">
              {navItems.map((group) => (
                <div key={group.group}>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.group}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentNav === item.id;
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium ${
                            isActive
                              ? "bg-blue-600 text-white font-semibold"
                              : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-mono">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-rose-300 hover:bg-white/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA & TOP BAR                              */}
      {/* ======================================================== */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-8 shadow-xs backdrop-blur-md">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/dashboard/operations" className="hover:text-blue-600 transition-colors">
                Ostaad ERP
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              {breadcrumbs && breadcrumbs.length > 0 ? (
                breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-blue-600 transition-colors font-medium text-slate-700"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[#122b45]">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="font-semibold text-[#122b45]">
                  {title || "Executive Dashboard"}
                </span>
              )}
            </div>
          </div>

          {/* Right: Tenant Switcher, Search, Notifications, User */}
          <div className="flex items-center gap-3">
            {/* Cloudflare Edge Synced Indicator */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Cloud Edge Synced</span>
            </div>

            {/* Global Company Switcher Pill */}
            <CompanySwitcher />

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#122b45] text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.2">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`pt-2 flex items-start gap-2.5 ${
                          !n.read ? "bg-blue-50/40 p-2 rounded-xl" : "p-1"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === "success" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                          {n.type === "warning" && (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                          {n.type === "info" && <Clock className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 leading-snug">{n.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{n.description}</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-1">
                            {n.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400">
                      Real-time enterprise event sync enabled
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill & Role Badge */}
            <div className="hidden md:flex items-center gap-2.5 border-l border-slate-200 pl-3">
              <div className="text-right leading-tight">
                <div className="text-xs font-bold text-[#122b45]">
                  {user?.full_name || "Enterprise User"}
                </div>
                <div className="mt-0.5 flex justify-end">
                  <RoleBadge role={user?.role || "SUPER_ADMIN"} size="sm" />
                </div>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#122b45] text-xs font-bold text-white shadow-xs">
                {(user?.full_name || "EU")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Header (if title or actions supplied) */}
        {(title || actions) && (
          <div className="border-b border-slate-200 bg-white/70 px-4 py-4 md:px-8">
            <div className="mx-auto max-w-[1600px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {title && (
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#122b45]">
                    {title}
                  </h1>
                )}
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>

              {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
            </div>
          </div>
        )}

        {/* Main Page Canvas */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

