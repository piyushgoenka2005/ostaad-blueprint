"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  ShieldCheck,
  MapPin,
  FileText,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Company,
  getCompanies,
  createCompany,
  switchCompany,
  getActiveCompany,
  setActiveCompany,
  FALLBACK_COMPANIES,
} from "@/lib/api";
import { validateGSTIN, validatePAN } from "@/lib/tenant-context";

export default function CompanySwitcher() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>(FALLBACK_COMPANIES);
  const [activeCompany, setActiveCompanyState] = useState<Company>(FALLBACK_COMPANIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Company Modal Form State
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newPan, setNewPan] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("Mumbai");
  const [newPincode, setNewPincode] = useState("400001");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const current = getActiveCompany();
    setActiveCompanyState(current);

    getCompanies().then((list) => {
      if (list && list.length) {
        setCompanies(list);
        // Sync if current isn't in list or update details
        const found = list.find((c) => c.id === current.id);
        if (found) setActiveCompanyState(found);
      }
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCompany = async (comp: Company) => {
    if (comp.id === activeCompany.id) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const switched = await switchCompany(comp.id);
      setActiveCompanyState(switched);
      setActiveCompany(switched);
      setOpen(false);
      // Reload page to re-scope all queries under new company
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to switch entity");
    } finally {
      setLoading(false);
    }
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setNewGstin(val);
    if (val.length >= 12) {
      // Auto-extract PAN from characters 3-12 of GSTIN
      const derivedPan = val.slice(2, 12);
      if (validatePAN(derivedPan).valid) {
        setNewPan(derivedPan);
      }
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const gstCheck = validateGSTIN(newGstin);
    if (!gstCheck.valid) {
      setFormError(gstCheck.error || "Invalid GSTIN");
      return;
    }

    const panCheck = validatePAN(newPan || gstCheck.pan || "");
    if (!panCheck.valid) {
      setFormError(panCheck.error || "Invalid PAN");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCompany({
        company_name: newCompanyName,
        legal_name: newLegalName,
        gstin: newGstin,
        pan_number: newPan || gstCheck.pan,
        registered_address: newAddress,
        city: newCity,
        pincode: newPincode,
      });

      setCompanies((prev) => [...prev, created]);
      setActiveCompanyState(created);
      setActiveCompany(created);
      setModalOpen(false);
      setOpen(false);
      // Reset form
      setNewCompanyName("");
      setNewLegalName("");
      setNewGstin("");
      setNewPan("");
      setNewAddress("");
      // Reload under newly created company
      window.location.reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to provision company");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm">
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="font-semibold">{activeCompany.company_name}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Switcher Pill Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs text-slate-800 transition-all shadow-sm group"
        title="Switch Operating Entity / Company"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <div className="text-left hidden sm:block max-w-[190px]">
          <div className="font-bold text-slate-900 truncate leading-tight">
            {activeCompany.company_name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            GST: {activeCompany.gstin} ({activeCompany.state_code})
          </div>
        </div>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600 border border-slate-200">
          {activeCompany.state_code}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operating Entities & Subsidiaries
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Tenant Isolated
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Switching active company recalculates all budgets, POs, and stock ledgers.
            </p>
          </div>

          {/* List of Companies */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {companies.map((comp) => {
              const isSelected = comp.id === activeCompany.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleSelectCompany(comp)}
                  disabled={loading}
                  className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition-all ${
                    isSelected
                      ? "bg-blue-50/80 border border-blue-200 text-blue-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs truncate text-slate-900">
                        {comp.company_name}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0 ml-1" />}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{comp.legal_name}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                      <span>GST: {comp.gstin}</span>
                      <span>•</span>
                      <span>{comp.state_name}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Modal Opener / Register New Company */}
          <div className="border-t border-slate-100 pt-1.5 mt-1">
            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
                setOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" />
              <span>Register New Operating Entity</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Register New Company Entity */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Register New Operating Company</h3>
                  <p className="text-[11px] text-slate-500">Provision a new legal entity under your enterprise tenant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operating Brand / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Larsen & Toubro Dedicated Freight JV"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Registered Legal Entity Name
                </label>
                <input
                  type="text"
                  required
                  value={newLegalName}
                  onChange={(e) => setNewLegalName(e.target.value)}
                  placeholder="e.g. L&T Infrastructure Projects (DFCCIL) Private Limited"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={newGstin}
                    onChange={handleGstinChange}
                    placeholder="27AAACL0149C1ZM"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none uppercase transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PAN Number (10 Digits)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                    placeholder="AAACL0149C"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none uppercase transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corporate Registered Office Address
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 5th Floor, Tower B, Cyber City, Phase III, Sector 24"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Gurugram"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="e.g. 122002"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Provision Company Entity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
