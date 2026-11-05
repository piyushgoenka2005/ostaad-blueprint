"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HardHat,
  BadgeIndianRupee,
  Warehouse,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  loginUser,
  registerUser,
  getDemoAccounts,
  saveAuthSession,
  getAuthSession,
  DemoAccount,
  FALLBACK_DEMO_ACCOUNTS,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState("OPERATIONS");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpCompany, setSignUpCompany] = useState("Larsen & Toubro Construction Ltd");

  // Demo Accounts
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(FALLBACK_DEMO_ACCOUNTS);

  const redirectByRole = useCallback(
    (role: string) => {
      switch (role?.toUpperCase()) {
        case "OPERATIONS":
        case "PROJECT_MANAGER":
        case "SITE_ENGINEER":
          router.push("/dashboard/operations");
          break;
        case "FINANCE":
        case "FINANCE_APPROVER":
          router.push("/dashboard/finance");
          break;
        case "SITE_STORE":
        case "STORE_MANAGER":
        case "PROCUREMENT_MANAGER":
          router.push("/dashboard/site-store");
          break;
        case "ADMIN":
        case "COMPANY_ADMIN":
        case "SUPER_ADMIN":
        case "SUPERADMIN":
        case "AUDITOR":
          router.push("/dashboard/admin");
          break;
        default:
          router.push("/dashboard/operations");
          break;
      }
    },
    [router]
  );

  useEffect(() => {
    setMounted(true);
    const { token, user } = getAuthSession();
    if (token && user) {
      redirectByRole(user.role);
    }
    getDemoAccounts().then(setDemoAccounts);
  }, [redirectByRole]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginUser(signInEmail, signInPassword);
      saveAuthSession(res.token, res.user);
      setSuccess(`Signed in as ${res.user.full_name} (${res.user.role_display})`);
      setTimeout(() => redirectByRole(res.user.role), 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await registerUser({
        full_name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        role: signUpRole,
        phone: signUpPhone,
        company_name: signUpCompany,
      });
      saveAuthSession(res.token, res.user);
      setSuccess(`Account registered successfully! Welcome ${res.user.full_name}.`);
      setTimeout(() => redirectByRole(res.user.role), 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc: DemoAccount) => {
    setSignInEmail(acc.email);
    setSignInPassword("ostaad@2026");
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(acc.email, "ostaad@2026");
      saveAuthSession(res.token, res.user);
      setSuccess(`Signed in as ${res.user.full_name} (${res.user.role_display})`);
      setTimeout(() => redirectByRole(res.user.role), 400);
    } catch {
      setSuccess(`Selected demo account: ${acc.full_name}. Click Sign In to continue.`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OPERATIONS":
        return <HardHat className="w-4 h-4 text-blue-600" />;
      case "FINANCE":
        return <BadgeIndianRupee className="w-4 h-4 text-emerald-600" />;
      case "SITE_STORE":
        return <Warehouse className="w-4 h-4 text-amber-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Subtle Blueprint & Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60" />

      {/* Top Header */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-5 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Ostaad <span className="text-blue-600">ERP</span>
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                Enterprise v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Enterprise Construction Management, Commercial Gatekeeping & Site Store ERP
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> IS 456 & 1200 Standard
          </span>
        </div>
      </header>

      {/* Main Container - Reduced Width */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 z-10">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/60 relative">
            {/* Header & Mode Switcher */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {mode === "signin" ? "Sign In to Corporate Portal" : "Create Enterprise Account"}
              </h1>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                {mode === "signin"
                  ? "Access your assigned department workspace with authorized enterprise credentials."
                  : "Provision role-based access for your construction and commercial teams."}
              </p>

              {/* Toggle Switch */}
              <div className="mt-3.5 p-1 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${mode === "signin"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Sign In (Existing User)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${mode === "signup"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Create Account (New Entity)
                </button>
              </div>
            </div>

            {/* Error & Success Feedback */}
            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-3.5" suppressHydrationWarning>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corporate Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      suppressHydrationWarning
                      autoComplete="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="e.g. rajesh.pm@lt.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Account Password
                    </label>
                    <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                      Forgot Password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      suppressHydrationWarning
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-3" suppressHydrationWarning>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        suppressHydrationWarning
                        autoComplete="name"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile / Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="tel"
                        suppressHydrationWarning
                        autoComplete="tel"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder="+91 98201 12345"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Corporate Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        suppressHydrationWarning
                        autoComplete="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="vikram@corp.com"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password (min 6)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        suppressHydrationWarning
                        autoComplete="new-password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Role / Department
                  </label>
                  <select
                    suppressHydrationWarning
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium truncate"
                  >
                    <option value="PROJECT_MANAGER">Project Operations Lead (Managing Authority)</option>
                    <option value="FINANCE_APPROVER">Head of Commercial & Finance (Approver)</option>
                    <option value="STORE_MANAGER">Site Stores & Godown In-Charge</option>
                    <option value="PROCUREMENT_MANAGER">Procurement & Sourcing Lead</option>
                    <option value="SITE_ENGINEER">Site Execution Engineer</option>
                    <option value="COMPANY_ADMIN">Corporate Administrator & Governance</option>
                    <option value="AUDITOR">Statutory Compliance Auditor</option>
                    <option value="SUPER_ADMIN">Executive Super Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Tenant Name
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      suppressHydrationWarning
                      autoComplete="organization"
                      value={signUpCompany}
                      onChange={(e) => setSignUpCompany(e.target.value)}
                      placeholder="Larsen & Toubro Construction Ltd"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Create Account & Enter Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 1-Click Demo Profiles for Quick Testing */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  1-Click Demo Sign In
                </span>
                <span className="text-[9px] text-slate-500 font-mono">Instant Role Switching</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-left transition-all group flex items-start gap-2"
                  >
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-sm group-hover:border-blue-300 transition-colors shrink-0">
                      {getRoleIcon(acc.role)}
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {acc.full_name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{acc.dept_badge}</div>
                      <div className="text-[9px] font-mono text-slate-400 truncate">{acc.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 py-2.5 text-center text-[11px] text-slate-500 z-10 shadow-sm">
        Ostaad ERP • Enterprise Construction & Procurement Platform • Single-Worker Full-Stack Cloudflare D1 Architecture
      </footer>
    </div>
  );
}
