"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  Printer,
  ChevronDown,
  Layers,
  Sparkles,
  IndianRupee,
  X,
} from "lucide-react";
import {
  MasterBOQItem,
  BOQCategory,
  BOQ_CATEGORIES,
  DEFAULT_MASTER_BOQ,
  calculateBOQSummary,
  exportBOQToCSV,
  parseBOQFromCSV,
} from "@/lib/planning/boq-vendor";

interface MasterBOQTemplateEngineProps {
  className?: string;
  initialItems?: MasterBOQItem[];
}

export default function MasterBOQTemplateEngine({
  className = "",
  initialItems = DEFAULT_MASTER_BOQ,
}: MasterBOQTemplateEngineProps) {
  const [items, setItems] = useState<MasterBOQItem[]>(initialItems);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreviewCount, setImportPreviewCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for adding new item
  const [newItemCategory, setNewItemCategory] = useState<BOQCategory>("CONCRETE");
  const [newItemWbs, setNewItemWbs] = useState<string>("WBS-02.03");
  const [newItemDesc, setNewItemDesc] = useState<string>("");
  const [newItemSpec, setNewItemSpec] = useState<string>("IS 456");
  const [newItemUnit, setNewItemUnit] = useState<string>("cum");
  const [newItemQty, setNewItemQty] = useState<number>(100);
  const [newItemRate, setNewItemRate] = useState<number>(6500);

  // Summary calculations
  const summary = useMemo(() => calculateBOQSummary(items), [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.wbsCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specReference.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Inline edit quantity or rate
  const updateItemValue = (id: string, field: "quantity" | "unitRateINR", val: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedQty = field === "quantity" ? Math.max(0, val) : item.quantity;
        const updatedRate = field === "unitRateINR" ? Math.max(0, val) : item.unitRateINR;
        return {
          ...item,
          [field]: Math.max(0, val),
          totalAmountINR: Math.round(updatedQty * updatedRate),
        };
      })
    );
  };

  // Delete item
  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Add Item Submit
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;

    const newItem: MasterBOQItem = {
      id: `boq-${Date.now()}`,
      wbsCode: newItemWbs.trim() || `WBS-${items.length + 1}`,
      category: newItemCategory,
      description: newItemDesc.trim(),
      specReference: newItemSpec.trim() || "Standard IS Spec",
      unit: newItemUnit.trim() || "nos",
      quantity: Number(newItemQty) || 1,
      unitRateINR: Number(newItemRate) || 0,
      totalAmountINR: Math.round((Number(newItemQty) || 1) * (Number(newItemRate) || 0)),
    };

    setItems((prev) => [...prev, newItem]);
    setIsAddModalOpen(false);
    // Reset form
    setNewItemDesc("");
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    const csvData = exportBOQToCSV(items);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Ostaad_Master_BOQ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle File Upload for CSV Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const { items: parsed, errors } = parseBOQFromCSV(text);
        if (errors.length > 0) {
          setImportErrors(errors);
        } else {
          setImportErrors([]);
        }
        if (parsed.length > 0) {
          setItems(parsed);
          setImportPreviewCount(parsed.length);
          setIsImportModalOpen(false);
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    setItems(DEFAULT_MASTER_BOQ);
    setSelectedCategory("ALL");
    setSearchQuery("");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Master BOQ Template & Excel/CSV Engine (Tool 3)
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  CPWD / IS 1200 Standards
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hierarchical work packages, two-way CSV Excel import/export, dynamic quantity rates, and trade-wise sub-totals
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Upload className="h-3.5 w-3.5 text-indigo-600" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#122b45] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Add Line Item</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors shadow-xs"
              title="Reset Default Template"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total BOQ Value
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              ₹{summary.grandTotalCrores} Cr
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              (₹{summary.grandTotalLakhs} Lakhs)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Line Items Count
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              {summary.totalItems} Items
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Across 10 CPWD Trades
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Reinforcement Steel
            </div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">
              ₹{((summary.categorySubtotals["REBAR"] || 0) / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">
              Fe 550D TMT Package
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Concrete & Substructure
            </div>
            <div className="text-xl font-black text-blue-700 mt-0.5">
              ₹{((summary.categorySubtotals["CONCRETE"] || 0) / 10000000).toFixed(2)} Cr
            </div>
            <div className="text-[11px] text-slate-500">
              M10 & M30 Design Mix
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-3xl scrollbar-none">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "ALL"
                ? "bg-[#122b45] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Work Packages ({items.length})
          </button>
          {BOQ_CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isSelected ? "bg-white/30 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search WBS, item, spec..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Main BOQ Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
                <th className="py-3 px-4 w-24">WBS Code</th>
                <th className="py-3 px-3 w-32">Package</th>
                <th className="py-3 px-4">Item Description & Standard Specification</th>
                <th className="py-3 px-3 text-center w-20">Unit</th>
                <th className="py-3 px-3 text-right w-28">Quantity</th>
                <th className="py-3 px-3 text-right w-28">Rate (₹)</th>
                <th className="py-3 px-4 text-right w-36">Total Amount (₹)</th>
                <th className="py-3 px-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No BOQ line items match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {item.wbsCode}
                    </td>

                    <td className="py-3 px-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#122b45] leading-snug">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Ref: {item.specReference}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {item.unit}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemValue(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-mono font-semibold text-[#122b45] focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitRateINR}
                        onChange={(e) =>
                          updateItemValue(item.id, "unitRateINR", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-mono font-semibold text-[#122b45] focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-[#122b45]">
                      ₹{item.totalAmountINR.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="opacity-40 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity p-1"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-[#122b45]">
                <td colSpan={4} className="py-3.5 px-4 text-right uppercase text-[11px] tracking-wider text-slate-600">
                  {selectedCategory === "ALL" ? "Grand Master Total:" : `${selectedCategory} Subtotal:`}
                </td>
                <td colSpan={2} className="py-3.5 px-3 text-right font-mono text-xs text-slate-500">
                  {filteredItems.reduce((acc, i) => acc + i.quantity, 0).toLocaleString()} units
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-indigo-900">
                  ₹{filteredItems.reduce((acc, i) => acc + i.totalAmountINR, 0).toLocaleString("en-IN")}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ADD LINE ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Add Master BOQ Item</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">WBS Code</label>
                  <input
                    type="text"
                    required
                    value={newItemWbs}
                    onChange={(e) => setNewItemWbs(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                    placeholder="WBS-02.03"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Category Package</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as BOQCategory)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  >
                    {BOQ_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Item Description</label>
                <textarea
                  required
                  rows={3}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="Detailed work description as per CPWD / IS 1200 specifications..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Standard Spec Reference</label>
                <input
                  type="text"
                  value={newItemSpec}
                  onChange={(e) => setNewItemSpec(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs"
                  placeholder="e.g. IS 456 / IS 1200 Part 2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                    placeholder="cum / MT / sqm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Unit Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-right">
                <span className="text-xs text-slate-500 mr-2">Computed Total:</span>
                <span className="text-sm font-bold text-[#122b45]">
                  ₹{(newItemQty * newItemRate).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                >
                  Add to BOQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-[#122b45] text-base">Import BOQ from Excel/CSV</h4>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Upload a structured contractor or consultant BOQ in CSV format. Columns expected:
                <br />
                <code className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded mt-1 inline-block">
                  WBS Code, Category, Description, Spec, Unit, Quantity, Unit Rate (INR)
                </code>
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 p-8 text-center transition-all bg-slate-50/50"
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-[#122b45] block">
                  Click to select CSV file
                </span>
                <span className="text-[10px] text-slate-400">Supports .csv exported from MS Excel</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {importErrors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 max-h-36 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Parsing Warnings</span>
                  </div>
                  <ul className="text-[10px] text-rose-600 space-y-0.5 list-disc pl-4">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
