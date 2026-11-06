"use client";

import React, { useState, useMemo } from "react";
import {
  Calculator,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileText,
  Check,
  X,
  FileUp,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  HierarchicalBOQItem,
  BOQTradeCategory,
  DEFAULT_DETAILED_BOQ_ITEMS,
} from "@/lib/boq-cost-control";

interface HierarchicalBOQRegistryProps {
  items: HierarchicalBOQItem[];
  onUpdateItems: (items: HierarchicalBOQItem[]) => void;
  onSelectForDecomposition?: () => void;
}

const CATEGORY_LABELS: Record<BOQTradeCategory, { label: string; badgeColor: string }> = {
  EARTHWORK: { label: "Earthwork & Excavation", badgeColor: "bg-amber-100 text-amber-800 border-amber-200" },
  CONCRETE_PCC: { label: "Plain Cement Concrete (PCC)", badgeColor: "bg-slate-100 text-slate-800 border-slate-200" },
  CONCRETE_RCC: { label: "Reinforced Concrete (RCC)", badgeColor: "bg-blue-100 text-blue-800 border-blue-200" },
  REINFORCEMENT: { label: "Steel Reinforcement (TMT)", badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  FORMWORK: { label: "Formwork & Shuttering", badgeColor: "bg-orange-100 text-orange-800 border-orange-200" },
  MASONRY: { label: "AAC / Brick Masonry", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  PLASTERING: { label: "Plastering & Finishes", badgeColor: "bg-teal-100 text-teal-800 border-teal-200" },
  WATERPROOFING: { label: "Waterproofing & Membrane", badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  FLOORING: { label: "Flooring & Tiling", badgeColor: "bg-purple-100 text-purple-800 border-purple-200" },
  MEP_ELECTRICAL: { label: "MEP Electrical Conduit", badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  MEP_PLUMBING: { label: "MEP Plumbing & Drainage", badgeColor: "bg-sky-100 text-sky-800 border-sky-200" },
};

export default function HierarchicalBOQRegistry({
  items,
  onUpdateItems,
  onSelectForDecomposition,
}: HierarchicalBOQRegistryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // New Item Form State
  const [newItem, setNewItem] = useState<Partial<HierarchicalBOQItem>>({
    wbsCode: "1.5.01",
    category: "CONCRETE_RCC",
    description: "",
    specificationClause: "IS 456 / CPWD Standard",
    unit: "cum",
    tenderQuantity: 100,
    approvedRateINR: 6500,
  });

  // Import Wizard State
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [uploadedFileName, setUploadedFileName] = useState("Contractor_Tender_Package_B2.xlsx");
  const [rawFileColumns, setRawFileColumns] = useState<string[]>([
    "Item_Ref_No",
    "Scope_of_Work",
    "CPWD_Standard_Clause",
    "Trade_Section",
    "Tender_Qty",
    "Measurement_Unit",
    "Unit_Rate_INR",
  ]);
  const [columnMappings, setColumnMappings] = useState({
    wbsCode: "Item_Ref_No",
    description: "Scope_of_Work",
    category: "Trade_Section",
    specificationClause: "CPWD_Standard_Clause",
    tenderQuantity: "Tender_Qty",
    unit: "Measurement_Unit",
    approvedRateINR: "Unit_Rate_INR",
  });

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.wbsCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specificationClause.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory]);

  // Summary Metrics
  const totalBOQValue = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.totalAmountINR, 0);
  }, [items]);

  const verifiedItemsCount = useMemo(() => {
    return items.filter((i) => i.isVerified).length;
  }, [items]);

  const verifiedValue = useMemo(() => {
    return items.filter((i) => i.isVerified).reduce((acc, curr) => acc + curr.totalAmountINR, 0);
  }, [items]);

  const toggleVerifyItem = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          isVerified: !item.isVerified,
          verifiedBy: !item.isVerified ? "Rajesh Sharma (PM)" : undefined,
          verifiedDate: !item.isVerified ? new Date().toISOString().split("T")[0] : undefined,
        };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const verifyAllItems = () => {
    const updated = items.map((item) => ({
      ...item,
      isVerified: true,
      verifiedBy: "Rajesh Sharma (PM)",
      verifiedDate: new Date().toISOString().split("T")[0],
    }));
    onUpdateItems(updated);
  };

  const handleInlineUpdate = (id: string, field: "tenderQuantity" | "approvedRateINR", value: number) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const tenderQty = field === "tenderQuantity" ? value : item.tenderQuantity;
        const rate = field === "approvedRateINR" ? value : item.approvedRateINR;
        return {
          ...item,
          [field]: value,
          totalAmountINR: Math.round(tenderQty * rate),
        };
      }
      return item;
    });
    onUpdateItems(updated);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to remove this BOQ item from the registry?")) {
      onUpdateItems(items.filter((i) => i.id !== id));
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || !newItem.tenderQuantity || !newItem.approvedRateINR) return;

    const item: HierarchicalBOQItem = {
      id: `boq-item-${Date.now()}`,
      wbsCode: newItem.wbsCode || `1.${items.length + 1}.01`,
      category: (newItem.category as BOQTradeCategory) || "CONCRETE_RCC",
      description: newItem.description,
      specificationClause: newItem.specificationClause || "IS 456 / CPWD Standard",
      unit: (newItem.unit as any) || "cum",
      tenderQuantity: Number(newItem.tenderQuantity),
      approvedRateINR: Number(newItem.approvedRateINR),
      totalAmountINR: Math.round(Number(newItem.tenderQuantity) * Number(newItem.approvedRateINR)),
      isVerified: true,
      verifiedBy: "Rajesh Sharma (PM)",
      verifiedDate: new Date().toISOString().split("T")[0],
    };

    onUpdateItems([...items, item]);
    setShowAddModal(false);
    setNewItem({
      wbsCode: "1.5.01",
      category: "CONCRETE_RCC",
      description: "",
      specificationClause: "IS 456 / CPWD Standard",
      unit: "cum",
      tenderQuantity: 100,
      approvedRateINR: 6500,
    });
  };

  // Complete Column Mapping Import Simulation
  const handleExecuteImport = () => {
    const simulatedImportedItems: HierarchicalBOQItem[] = [
      {
        id: `imp-${Date.now()}-1`,
        wbsCode: "3.2.01",
        category: "MEP_PLUMBING",
        description: "Supply, laying and testing of CPVC SDR-11 hot and cold water distribution pipes (32mm dia)",
        specificationClause: "IS 15778 / ASTM D2846",
        unit: "rmt",
        tenderQuantity: 3400,
        approvedRateINR: 245,
        totalAmountINR: 833000,
        isVerified: true,
        verifiedBy: "Rajesh Sharma (PM)",
        verifiedDate: new Date().toISOString().split("T")[0],
      },
      {
        id: `imp-${Date.now()}-2`,
        wbsCode: "2.5.01",
        category: "WATERPROOFING",
        description: "Injection grouting of foundation raft cold joints using non-shrink polymer cementitious grout",
        specificationClause: "IS 516 / ASTM C1090",
        unit: "bags",
        tenderQuantity: 350,
        approvedRateINR: 820,
        totalAmountINR: 287000,
        isVerified: true,
        verifiedBy: "Rajesh Sharma (PM)",
        verifiedDate: new Date().toISOString().split("T")[0],
      },
    ];

    onUpdateItems([...items, ...simulatedImportedItems]);
    setShowImportWizard(false);
    setImportStep(1);
  };

  const exportToCSV = () => {
    const headers = ["WBS Code", "Category", "Description", "Specification", "Unit", "Tender Qty", "Rate (INR)", "Total Amount (INR)", "Verified"];
    const rows = items.map((i) => [
      i.wbsCode,
      i.category,
      `"${i.description.replace(/"/g, '""')}"`,
      `"${i.specificationClause}"`,
      i.unit,
      i.tenderQuantity,
      i.approvedRateINR,
      i.totalAmountINR,
      i.isVerified ? "YES" : "NO",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BOQ_Master_Registry_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Sub-Modules 4.1 & 4.2
            </span>
            <span className="text-xs text-slate-500 font-medium">IS 1200 / CPWD Standard Registry</span>
          </div>
          <h2 className="text-xl font-bold text-[#122b45] mt-1">Hierarchical Bill of Quantities (BOQ) Master</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Tree-structured items with tender quantities, rates, and automated column-mapped import wizard.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowImportWizard(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Column Mapping Wizard</span>
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={verifyAllItems}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>PM Bulk Sign-off</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1368d8] text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add BOQ Item</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Total Tender BOQ Value</div>
            <div className="text-xl font-bold text-[#122b45]">
              ₹{(totalBOQValue / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">₹{totalBOQValue.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">PM Verified Value</div>
            <div className="text-xl font-bold text-emerald-700">
              ₹{(verifiedValue / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {((verifiedValue / (totalBOQValue || 1)) * 100).toFixed(1)}% Verified by PM
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">Active BOQ Line Items</div>
            <div className="text-xl font-bold text-[#122b45]">{items.length} Items</div>
            <div className="text-[11px] text-slate-500">
              {verifiedItemsCount} of {items.length} locked & verified
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">BOM Material Derivation</div>
            <div className="text-sm font-bold text-[#122b45] mt-0.5">IS 456 Constants</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ready for procurement dispatch</div>
          </div>
          {onSelectForDecomposition && (
            <button
              onClick={onSelectForDecomposition}
              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1"
            >
              <span>View BOM</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search WBS code, description, or IS code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Trade Categories (11 Packages)</option>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat as BOQTradeCategory].label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Showing {filteredItems.length} of {items.length}
          </span>
        </div>
      </div>

      {/* Main Hierarchical BOQ Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs">
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">Verify</th>
                <th className="py-3 px-3 w-20">WBS Code</th>
                <th className="py-3 px-3 w-36">Category</th>
                <th className="py-3 px-3 min-w-[280px]">Item Description & IS Specification</th>
                <th className="py-3 px-3 w-20 text-center">Unit</th>
                <th className="py-3 px-3 w-28 text-right">Tender Qty</th>
                <th className="py-3 px-3 w-28 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-3 w-32 text-right">Total Amount (₹)</th>
                <th className="py-3 px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                const isEditing = editingItemId === item.id;
                const catInfo = CATEGORY_LABELS[item.category] || {
                  label: item.category,
                  badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.isVerified ? "bg-white" : "bg-amber-50/20"
                    }`}
                  >
                    {/* Verification Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleVerifyItem(item.id)}
                        title={item.isVerified ? `Verified by ${item.verifiedBy}` : "Click to mark verified"}
                        className={`p-1 rounded transition ${
                          item.isVerified
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </td>

                    {/* WBS Code */}
                    <td className="py-3 px-3 font-mono font-semibold text-[#122b45]">
                      {item.wbsCode}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${catInfo.badgeColor}`}
                      >
                        {catInfo.label}
                      </span>
                    </td>

                    {/* Description & Specs */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 leading-snug">{item.description}</div>
                      <div className="text-[11px] text-blue-600 font-mono mt-0.5">
                        {item.specificationClause}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 bg-slate-50/50">
                      {item.unit}
                    </td>

                    {/* Tender Quantity (Inline Editable) */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          defaultValue={item.tenderQuantity}
                          onBlur={(e) => handleInlineUpdate(item.id, "tenderQuantity", Number(e.target.value))}
                          className="w-20 text-right px-1.5 py-0.5 bg-white border border-blue-400 rounded text-xs font-mono font-semibold"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-slate-900">
                          {item.tenderQuantity.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>

                    {/* Approved Unit Rate (Inline Editable) */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          defaultValue={item.approvedRateINR}
                          onBlur={(e) => handleInlineUpdate(item.id, "approvedRateINR", Number(e.target.value))}
                          className="w-20 text-right px-1.5 py-0.5 bg-white border border-blue-400 rounded text-xs font-mono font-semibold"
                        />
                      ) : (
                        <span className="font-mono text-slate-700">
                          ₹{item.approvedRateINR.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#122b45]">
                      ₹{item.totalAmountINR.toLocaleString("en-IN")}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItemId(isEditing ? null : item.id)}
                          className={`p-1 rounded transition ${
                            isEditing ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600"
                          }`}
                          title="Edit Quantity / Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>All rates conform to CPWD DSR 2023 with localized market indices.</span>
          </div>
          <div className="font-mono font-bold text-slate-900 text-sm">
            Total Package Sum: ₹{totalBOQValue.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW BOQ ITEM                                                 */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-[#122b45] text-base">Add New Hierarchical BOQ Item</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WBS Code</label>
                  <input
                    type="text"
                    required
                    value={newItem.wbsCode}
                    onChange={(e) => setNewItem({ ...newItem, wbsCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as BOQTradeCategory })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                  >
                    {Object.keys(CATEGORY_LABELS).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat as BOQTradeCategory].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Item Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Providing and laying design mix M35 concrete for columns..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  CPWD / IS Specification Clause
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IS 456 Clause 9.1 / CPWD 5.2"
                  value={newItem.specificationClause}
                  onChange={(e) => setNewItem({ ...newItem, specificationClause: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  >
                    <option value="cum">cum (m³)</option>
                    <option value="sqm">sqm (m²)</option>
                    <option value="rmt">rmt (m)</option>
                    <option value="MT">MT (Tonnes)</option>
                    <option value="bags">bags (50kg)</option>
                    <option value="nos">nos (Each)</option>
                    <option value="kg">kg</option>
                    <option value="litres">litres</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tender Qty</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.tenderQuantity}
                    onChange={(e) => setNewItem({ ...newItem, tenderQuantity: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.approvedRateINR}
                    onChange={(e) => setNewItem({ ...newItem, approvedRateINR: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-blue-900">Total Computed Item Value:</span>
                <span className="font-mono font-bold text-blue-950 text-sm">
                  ₹{((newItem.tenderQuantity || 0) * (newItem.approvedRateINR || 0)).toLocaleString("en-IN")}
                </span>
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COLUMN MAPPING WIZARD (SUB-MODULE 4.2)                            */}
      {/* ========================================================================= */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-[#122b45] text-base">Excel / CSV Column Mapping Wizard</h3>
                  <div className="text-[11px] text-slate-500">Sub-Module 4.2 — Automated Header Detection & Normalization</div>
                </div>
              </div>
              <button
                onClick={() => setShowImportWizard(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between my-4 px-2">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importStep === 1 ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"}`}>1</span>
                <span className="text-xs font-semibold text-slate-700">Uploaded File</span>
              </div>
              <div className="h-0.5 w-16 bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importStep === 2 ? "bg-blue-600 text-white" : importStep === 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                <span className="text-xs font-semibold text-slate-700">Map Schema</span>
              </div>
              <div className="h-0.5 w-16 bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importStep === 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>3</span>
                <span className="text-xs font-semibold text-slate-700">Validate & Ingest</span>
              </div>
            </div>

            {/* STEP 1: UPLOADED FILE PREVIEW */}
            {importStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-5 text-center">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold text-slate-900">{uploadedFileName}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Detected 7 columns and 45 rows from Contractor tender schedule</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Auto-Detected Header Columns:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rawFileColumns.map((col) => (
                      <span key={col} className="px-2 py-1 rounded bg-white border border-slate-300 font-mono text-[11px] text-slate-700">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowImportWizard(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    <span>Proceed to Column Mapping</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SCHEMA MAPPING */}
            {importStep === 2 && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Map the columns from your uploaded contractor Excel sheet into Ostaad ERP standard BOQ fields:
                </p>

                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">WBS Item Code</label>
                    <select
                      value={columnMappings.wbsCode}
                      onChange={(e) => setColumnMappings({ ...columnMappings, wbsCode: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                    <select
                      value={columnMappings.category}
                      onChange={(e) => setColumnMappings({ ...columnMappings, category: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Item Description / Scope</label>
                    <select
                      value={columnMappings.description}
                      onChange={(e) => setColumnMappings({ ...columnMappings, description: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UOM)</label>
                    <select
                      value={columnMappings.unit}
                      onChange={(e) => setColumnMappings({ ...columnMappings, unit: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tender Quantity</label>
                    <select
                      value={columnMappings.tenderQuantity}
                      onChange={(e) => setColumnMappings({ ...columnMappings, tenderQuantity: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Approved Unit Rate (₹)</label>
                    <select
                      value={columnMappings.approvedRateINR}
                      onChange={(e) => setColumnMappings({ ...columnMappings, approvedRateINR: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Specification / IS Clause</label>
                    <select
                      value={columnMappings.specificationClause}
                      onChange={(e) => setColumnMappings({ ...columnMappings, specificationClause: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono"
                    >
                      {rawFileColumns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setImportStep(3)}
                    className="px-4 py-1.5 rounded-lg bg-[#1368d8] text-white font-semibold hover:bg-blue-700 flex items-center gap-1.5"
                  >
                    <span>Validate & Ingest</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VALIDATION AND BULK INGEST */}
            {importStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Validation Successful: 100% Schema Match</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      No negative quantities or unmapped units detected. 2 new sample verified items prepared for ingestion.
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2">WBS</th>
                        <th className="p-2">Scope</th>
                        <th className="p-2 text-center">Unit</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2 font-mono font-semibold">3.2.01</td>
                        <td className="p-2">CPVC SDR-11 water pipes (32mm)</td>
                        <td className="p-2 text-center font-mono">rmt</td>
                        <td className="p-2 text-right font-mono">3,400</td>
                        <td className="p-2 text-right font-mono">₹245</td>
                        <td className="p-2 text-right font-mono font-bold">₹8,33,000</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono font-semibold">2.5.01</td>
                        <td className="p-2">Injection grouting polymer cementitious</td>
                        <td className="p-2 text-center font-mono">bags</td>
                        <td className="p-2 text-right font-mono">350</td>
                        <td className="p-2 text-right font-mono">₹820</td>
                        <td className="p-2 text-right font-mono font-bold">₹2,87,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Back to Mappings
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Ingest into Master BOQ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

