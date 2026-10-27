"use client";

import React, { useState, useEffect } from "react";
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
  ShieldAlert,
} from "lucide-react";
import {
  loginUser,
  registerUser,
  getDemoAccounts,
  saveAuthSession,
  getAuthSession,
  DemoAccount,
} from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    // Check if already authenticated
    const { token, user } = getAuthSession();
    if (token && user) {
      redirectByRole(user.role);
    }

    // Load demo accounts
    getDemoAccounts().then(setDemoAccounts);
  }, []);

  const redirectByRole = (role: string) => {
    switch (role?.toUpperCase()) {
      case "OPERATIONS":
        router.push("/dashboard/operations");
        break;
      case "FINANCE":
        router.push("/dashboard/finance");
        break;
      case "SITE_STORE":
        router.push("/dashboard/site-store");
        break;
      case "ADMIN":
      case "SUPERADMIN":
        router.push("/dashboard/admin");
        break;
      default:
        router.push("/dashboard/operations");
        break;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginUser(signInEmail, signInPassword);
      saveAuthSession(res.token, res.user);
      setSuccess(`Signed in as ${res.user.full_name} (${res.user.role_display})`);
      setTimeout(() => redirectByRole(res.user.role), 600);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
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
      setTimeout(() => redirectByRole(res.user.role), 700);
    } catch (err: any) {
      setError(err.message || "Failed to register. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc: DemoAccount) => {
    setSignInEmail(acc.email);
    setSignInPassword(acc.password);
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginUser(acc.email, acc.password);
      saveAuthSession(res.token, res.user);
      setSuccess(`Demo session started: ${acc.full_name} (${acc.role_title})`);
      setTimeout(() => redirectByRole(res.user.role), 500);
    } catch (err: any) {
      setError(err.message || "Failed to log in with demo account.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OPERATIONS":
        return <HardHat className="w-5 h-5 text-sky-400" />;
      case "FINANCE":
        return <BadgeIndianRupee className="w-5 h-5 text-emerald-400" />;
      case "SITE_STORE":
        return <Warehouse className="w-5 h-5 text-amber-400" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between selection:bg-sky-500/30 selection:text-sky-200 relative overflow-hidden">
      {/* Background Subtle Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                BuildBharat ERP
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold tracking-wider">
                Enterprise v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Unified Construction Operations, Financial Gatekeeping & Site Store ERP
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> IS 456 & 1200 Compliant
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Centralized RBAC
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 z-10">
        <div className="w-full max-w-xl">
          {/* Main Card */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 relative">
            {/* Header / Tabs */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {mode === "signin" ? "Sign In to Corporate Portal" : "Register Enterprise Account"}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {mode === "signin"
                  ? "Access your assigned department dashboard with authorized enterprise credentials."
                  : "Create an account with role-based access for your construction team."}
              </p>

              {/* Mode Toggle Switch */}
              <div className="mt-5 p-1 bg-slate-950/70 border border-white/10 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === "signin"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                      : "text-slate-400 hover:text-white"
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
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    mode === "signup"
                      ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register (New Entity)
                </button>
              </div>
            </div>

            {/* Error & Success Feedback */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Corporate Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="e.g. rajesh.pm@lt.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile / Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder="+91 98201 12345"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Corporate Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="vikram.pm@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Enterprise Role / Department
                  </label>
                  <select
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  >
                    <option value="OPERATIONS">Managing Authority — Project Manager / Operations</option>
                    <option value="FINANCE">Finance Department — CFO / Budget & Accounts</option>
                    <option value="SITE_STORE">Site Storekeeper — Godown In-Charge / GRN Receiving</option>
                    <option value="ADMIN">Corporate Administrator — System & Tenant Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Construction Company / Tenant Name
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={signUpCompany}
                      onChange={(e) => setSignUpCompany(e.target.value)}
                      placeholder="Larsen & Toubro Construction Ltd"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Registering Enterprise Account...</span>
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
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  1-Click Department Demo Logins
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Instant Cross-Browser Testing</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc)}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/5 hover:border-sky-500/30 text-left transition-all group flex items-start gap-2.5"
                  >
                    <div className="p-2 rounded-lg bg-white/[0.03] group-hover:bg-sky-500/10 transition-colors">
                      {getRoleIcon(acc.role)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                        {acc.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{acc.dept_badge}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">{acc.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/60 px-6 py-3 text-center text-xs text-slate-500 z-10">
        BuildBharat Construction ERP • Decoupled Next.js Frontend + Python FastAPI Architecture • Local Database Sync
      </footer>
    </div>
  );
}
