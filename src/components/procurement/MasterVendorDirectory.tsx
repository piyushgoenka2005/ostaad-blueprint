"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Star,
  Clock,
  Phone,
  Mail,
  MapPin,
  Download,
  AlertTriangle,
  X,
  CreditCard,
  Building,
  Check,
  TrendingUp,
  Tag,
} from "lucide-react";
import {
  VerifiedVendorProfile,
  VendorCategory,
  validateGSTIN,
} from "@/lib/procurement-sourcing";

interface MasterVendorDirectoryProps {
  vendors: VerifiedVendorProfile[];
  onUpdateVendors: (vendors: VerifiedVendorProfile[]) => void;
}

const CATEGORY_TAG_COLORS: Record<VendorCategory, string> = {
  CEMENT: "bg-amber-100 text-amber-800 border-amber-200",
  STEEL_REBAR: "bg-blue-100 text-blue-800 border-blue-200",
  RMC_CONCRETE: "bg-slate-100 text-slate-800 border-slate-200",
  SAND_AGGREGATES: "bg-emerald-100 text-emerald-800 border-emerald-200",
  AAC_BLOCKS: "bg-orange-100 text-orange-800 border-orange-200",
  SHUTTERING_FORMWORK: "bg-indigo-100 text-indigo-800 border-indigo-200",
  WATERPROOFING: "bg-cyan-100 text-cyan-800 border-cyan-200",
  ELECTRICAL_PLUMBING: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function MasterVendorDirectory({
  vendors,
  onUpdateVendors,
}: MasterVendorDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendorForView, setSelectedVendorForView] = useState<VerifiedVendorProfile | null>(null);

  // New Vendor Form State
  const [newVendor, setNewVendor] = useState({
    vendorName: "",
    tradeCategories: ["CEMENT"] as VendorCategory[],
    gstin: "27AABCO9988D1Z2",
    panNumber: "AABCO9988D",
    stateCode: "27",
    stateName: "Maharashtra",
    city: "Pune",
    officeAddress: "",
    contactPerson: "",
    phone: "",
    email: "",
    bankName: "HDFC Bank Ltd",
    accountNumber: "",
    ifscCode: "HDFC0000039",
    branchName: "Pune Central",
    tier: "TIER_1_PREFERRED" as const,
  });

  const [gstinError, setGstinError] = useState<string | null>(null);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesSearch =
        v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === "ALL" ||
        v.tradeCategories.includes(selectedCategory as VendorCategory);
      return matchesSearch && matchesCat;
    });
  }, [vendors, searchQuery, selectedCategory]);

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateGSTIN(newVendor.gstin)) {
      setGstinError("Invalid 15-character Indian GSTIN format (e.g. 27AAACU0147B1ZN).");
      return;
    }

    const created: VerifiedVendorProfile = {
      id: `vnd-${Date.now()}`,
      vendorCode: `VND-PUN-01${vendors.length + 10}`,
      vendorName: newVendor.vendorName,
      tradeCategories: newVendor.tradeCategories,
      gstin: newVendor.gstin.toUpperCase(),
      panNumber: newVendor.gstin.slice(2, 12).toUpperCase(),
      stateCode: newVendor.stateCode,
      stateName: newVendor.stateName,
      city: newVendor.city,
      officeAddress: newVendor.officeAddress || `${newVendor.city}, ${newVendor.stateName}`,
      contactPerson: newVendor.contactPerson,
      phone: newVendor.phone,
      email: newVendor.email,
      bankDetails: {
        bankName: newVendor.bankName,
        accountNumber: newVendor.accountNumber || "50200034910281",
        ifscCode: newVendor.ifscCode,
        branchName: newVendor.branchName,
      },
      performanceMetrics: {
        qualityRating: 4.8,
        onTimeDeliveryPercent: 95.0,
        pricingCompetitivenessScore: 4.6,
        tier: newVendor.tier,
        totalCompletedOrdersCount: 0,
      },
      isVerified: true,
      registrationDate: new Date().toISOString().split("T")[0],
    };

    onUpdateVendors([...vendors, created]);
    setShowAddModal(false);
    setGstinError(null);
  };

  const exportVendorsCSV = () => {
    const headers = [
      "Vendor Code",
      "Vendor Name",
      "GSTIN",
      "PAN",
      "Categories",
      "City",
      "State",
      "Contact Person",
      "Phone",
      "Email",
      "Quality Rating",
      "Tier",
      "Verified",
    ];
    const rows = vendors.map((v) => [
      v.vendorCode,
      `"${v.vendorName}"`,
      v.gstin,
      v.panNumber,
      `"${v.tradeCategories.join(", ")}"`,
      v.city,
      v.stateName,
      `"${v.contactPerson}"`,
      v.phone,
      v.email,
      v.performanceMetrics.qualityRating,
      v.performanceMetrics.tier,
      v.isVerified ? "YES" : "NO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Vendor_Directory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Sub-Module 5.1
            </span>
            <span className="text-xs text-slate-500 font-medium">Statutory GSTIN & Category Tagging</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">
            Master Verified Vendor Directory & Compliance Registry
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Pre-qualified suppliers with verified 15-character GSTIN, bank mandates, performance ratings, and category tagging.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={exportVendorsCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Vendor</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Verified Vendors</div>
            <div className="text-xl font-bold text-[#122b45]">{vendors.length} Suppliers</div>
            <div className="text-[11px] text-slate-500">100% GSTIN Compliant</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Tier-1 Preferred Partners</div>
            <div className="text-xl font-bold text-emerald-700">
              {vendors.filter((v) => v.performanceMetrics.tier === "TIER_1_PREFERRED").length} Vendors
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">UltraTech, Tata Steel, JSW</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Avg Quality Score</div>
            <div className="text-xl font-bold text-purple-700">4.8 / 5.0</div>
            <div className="text-[11px] text-slate-500">Field QC test verification</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">On-Time Gate Adherence</div>
            <div className="text-xl font-bold text-amber-700">95.6%</div>
            <div className="text-[11px] text-slate-500">Across 215 past GRN dispatches</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, GSTIN, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Material Packages</option>
            <option value="CEMENT">Cement Suppliers</option>
            <option value="STEEL_REBAR">Steel Rebar Mill Producers</option>
            <option value="RMC_CONCRETE">RMC Batching Plants</option>
            <option value="SAND_AGGREGATES">M-Sand & Stone Aggregates</option>
            <option value="AAC_BLOCKS">AAC Blocks</option>
            <option value="SHUTTERING_FORMWORK">Formwork & Props</option>
            <option value="WATERPROOFING">Waterproofing Chemicals</option>
          </select>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 flex flex-col justify-between"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {vendor.vendorCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    vendor.performanceMetrics.tier === "TIER_1_PREFERRED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : vendor.performanceMetrics.tier === "TIER_2_APPROVED"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {vendor.performanceMetrics.tier.replace(/_/g, " ")}
                </span>
              </div>

              {/* Vendor Name */}
              <h3 className="font-bold text-slate-900 text-sm">{vendor.vendorName}</h3>

              {/* GSTIN & PAN */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-mono">
                <span>GST: <strong>{vendor.gstin}</strong></span>
                <span>•</span>
                <span>PAN: <strong>{vendor.panNumber}</strong></span>
              </div>

              {/* Trade Categories Tags */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {vendor.tradeCategories.map((cat) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      CATEGORY_TAG_COLORS[cat] || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {cat.replace(/_/g, " ")}
                  </span>
                ))}
              </div>

              {/* Contact Info */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{vendor.city}, {vendor.stateName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate text-blue-600">{vendor.email}</span>
                </div>
              </div>
            </div>

            {/* Performance Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50 -mx-4 -mb-4 p-3 rounded-b-xl">
              <div className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{vendor.performanceMetrics.qualityRating.toFixed(1)}</span>
                <span className="text-[10px] text-slate-400 font-normal">/ 5.0</span>
              </div>

              <div className="text-[11px] text-slate-500">
                <strong className="text-slate-800 font-mono">{vendor.performanceMetrics.onTimeDeliveryPercent}%</strong> on-time
              </div>

              <button
                onClick={() => setSelectedVendorForView(vendor)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER NEW VENDOR                                              */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Register Master Verified Vendor</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setGstinError(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Legal Trade Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jindal Steel and Power Ltd"
                  value={newVendor.vendorName}
                  onChange={(e) => setNewVendor({ ...newVendor, vendorName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">15-Digit GSTIN Number</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="27AAACU0147B1ZN"
                    value={newVendor.gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewVendor({ ...newVendor, gstin: val });
                      if (val.length === 15) {
                        setGstinError(validateGSTIN(val) ? null : "Invalid 15-character GSTIN format.");
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-bold uppercase"
                  />
                  {gstinError && (
                    <div className="text-[10px] text-rose-600 mt-0.5">{gstinError}</div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Material Package</label>
                  <select
                    value={newVendor.tradeCategories[0]}
                    onChange={(e) => setNewVendor({ ...newVendor, tradeCategories: [e.target.value as VendorCategory] })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="CEMENT">Cement (OPC / PPC)</option>
                    <option value="STEEL_REBAR">Primary Steel Rebar (Fe 550D)</option>
                    <option value="RMC_CONCRETE">Ready-Mix Concrete</option>
                    <option value="SAND_AGGREGATES">M-Sand & Aggregates</option>
                    <option value="AAC_BLOCKS">AAC Blocks</option>
                    <option value="SHUTTERING_FORMWORK">Formwork & Props</option>
                    <option value="WATERPROOFING">Waterproofing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newVendor.city}
                    onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Code</label>
                  <input
                    type="text"
                    value={newVendor.stateCode}
                    onChange={(e) => setNewVendor({ ...newVendor, stateCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor Tier</label>
                  <select
                    value={newVendor.tier}
                    onChange={(e) => setNewVendor({ ...newVendor, tier: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="TIER_1_PREFERRED">Tier-1 Preferred</option>
                    <option value="TIER_2_APPROVED">Tier-2 Approved</option>
                    <option value="TIER_3_UNDER_WATCH">Tier-3 Under Watch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91..."
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="vendor@company.com"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Bank Mandate Details */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>Statutory Bank Mandate for RTGS / NEFT Settlements</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={newVendor.bankName}
                      onChange={(e) => setNewVendor({ ...newVendor, bankName: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      placeholder="Account No"
                      value={newVendor.accountNumber}
                      onChange={(e) => setNewVendor({ ...newVendor, accountNumber: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">IFSC Code</label>
                    <input
                      type="text"
                      value={newVendor.ifscCode}
                      onChange={(e) => setNewVendor({ ...newVendor, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700"
                >
                  Verify & Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VENDOR DETAILS INSPECTOR                                         */}
      {/* ========================================================================= */}
      {selectedVendorForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-[#122b45] text-base">{selectedVendorForView.vendorName}</h3>
                  <div className="text-[11px] text-slate-500 font-mono">{selectedVendorForView.vendorCode}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendorForView(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">GSTIN Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVendorForView.gstin}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PAN:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVendorForView.panNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Registered Office:</span>
                  <span className="text-slate-800">{selectedVendorForView.officeAddress}</span>
                </div>
              </div>

              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-1">
                <div className="font-semibold text-blue-900">Bank Disbursement Mandate:</div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>Bank: <strong>{selectedVendorForView.bankDetails.bankName}</strong></div>
                  <div>IFSC: <strong className="font-mono">{selectedVendorForView.bankDetails.ifscCode}</strong></div>
                  <div className="col-span-2">Account No: <strong className="font-mono">{selectedVendorForView.bankDetails.accountNumber}</strong></div>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-emerald-900">Historical Performance Score</div>
                  <div className="text-[11px] text-emerald-700">
                    {selectedVendorForView.performanceMetrics.totalCompletedOrdersCount} Orders Completed
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-900 text-sm">
                    {selectedVendorForView.performanceMetrics.qualityRating.toFixed(1)} / 5.0
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    {selectedVendorForView.performanceMetrics.onTimeDeliveryPercent}% On-time
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setSelectedVendorForView(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
