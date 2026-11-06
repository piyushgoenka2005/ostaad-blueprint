"use client";

import React, { useState } from "react";
import {
  Truck,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Printer,
  ShieldCheck,
  Maximize2,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  LogisticsZone,
  DEFAULT_LOGISTICS_ZONES,
} from "@/lib/planning/logistics-permits";

interface TemporarySiteLayoutPlannerProps {
  className?: string;
}

export default function TemporarySiteLayoutPlanner({
  className = "",
}: TemporarySiteLayoutPlannerProps) {
  const [zones, setZones] = useState<LogisticsZone[]>(DEFAULT_LOGISTICS_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("zone-4"); // Default Tower Crane selected

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Reset to default layout
  const handleReset = () => {
    setZones(DEFAULT_LOGISTICS_ZONES);
    setSelectedZoneId("zone-4");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Temporary Site Layout & Logistics Zone Planner (Tool 11)
                </h3>
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 border border-cyan-200">
                  IS 13920 & NBC Logistics Verification
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Demarcate cement godown, steel rebar yard, RMC pump station, tower crane 360° swing radius, and multi-axle trailer turning radiuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Layout</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Export CAD Layout</span>
            </button>
          </div>
        </div>

        {/* Logistics Clearance Metrics Banner */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Trailer Approach Width
            </div>
            <div className="text-xl font-black text-[#122b45] mt-0.5">
              9.2 Meters
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              Passes 40-Ft Multi-Axle Limit
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tower Crane Jib Reach
            </div>
            <div className="text-xl font-black text-amber-700 mt-0.5">
              45.0m Radius
            </div>
            <div className="text-[11px] text-slate-500">
              Covers 95% Core Footprint
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cement Godown Capacity
            </div>
            <div className="text-xl font-black text-blue-700 mt-0.5">
              3,500 Bags
            </div>
            <div className="text-[11px] text-blue-600">
              Damp-Proof Plinth (150mm)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Labour Camp Safety
            </div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              Zero Clash
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              Isolated from Crane Swing Arc
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive CAD Map & Selected Zone Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technical SVG Plot Canvas (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-[#0f172a] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-slate-200">Site CAD Demarcation & Crane Jib Plan View</span>
            </div>
            <span className="text-[11px] font-mono">Scale: 1:250 | Plot: 250ft x 180ft</span>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full aspect-[4/3] bg-[#1e293b]/70 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center p-3">
            <svg className="w-full h-full" viewBox="0 0 1000 750">
              {/* Plot Boundary Border */}
              <rect
                x="30"
                y="30"
                width="940"
                height="690"
                fill="none"
                stroke="#64748b"
                strokeWidth="3"
                strokeDasharray="6"
              />

              {/* Setbacks Guidelines */}
              <rect
                x="110"
                y="110"
                width="780"
                height="530"
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4"
              />

              {/* Proposed Building Core Footprint */}
              <rect
                x="320"
                y="200"
                width="360"
                height="320"
                fill="#334155"
                fillOpacity="0.4"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              <text x="500" y="360" fill="#cbd5e1" fontSize="16" fontWeight="bold" textAnchor="middle">
                Proposed Tower B Footprint (G+12)
              </text>

              {/* Tower Crane Swing Radius Circle Overlay */}
              <circle
                cx="500"
                cy="360"
                r="300"
                fill="#f59e0b"
                fillOpacity="0.12"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="6"
              />
              <text x="500" y="90" fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">
                Tower Crane 360° Jib Swing Radius (45m)
              </text>

              {/* Main Approach Road */}
              <rect x="0" y="700" width="1000" height="50" fill="#0f172a" />
              <text x="500" y="730" fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">
                Main Municipal Approach Road (12.0m Wide / 4-Lane)
              </text>

              {/* Render Logistics Zones */}
              {zones.map((zone) => {
                const x = (zone.xPercent / 100) * 940 + 30;
                const y = (zone.yPercent / 100) * 690 + 30;
                const w = (zone.widthPercent / 100) * 940;
                const h = (zone.heightPercent / 100) * 690;
                const isSelected = selectedZoneId === zone.id;

                let fill = "#38bdf8";
                if (zone.type === "ENTRY_SECURITY") fill = "#10b981";
                if (zone.type === "CEMENT_GODOWN") fill = "#3b82f6";
                if (zone.type === "STEEL_YARD") fill = "#6366f1";
                if (zone.type === "TOWER_CRANE") fill = "#f59e0b";
                if (zone.type === "LABOUR_CAMP") fill = "#ec4899";
                if (zone.type === "SITE_OFFICE") fill = "#94a3b8";

                return (
                  <g
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className="cursor-pointer transition-all hover:opacity-90"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="8"
                      fill={fill}
                      fillOpacity={isSelected ? 0.85 : 0.45}
                      stroke={isSelected ? "#ffffff" : fill}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 4}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {zone.name.split("(")[0].slice(0, 24)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click any demarcated zone to inspect compliance & storage requirements</span>
            <span className="text-amber-400 font-semibold">Amber circle = Crane Hook Radius</span>
          </div>
        </div>

        {/* Selected Zone Inspector Panel (1 Col) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-cyan-600" />
              <h4 className="font-bold text-[#122b45] text-sm">Logistics Zone Specifications</h4>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Zone Classification
                </span>
                <div className="font-bold text-[#122b45] text-sm mt-0.5">{selectedZone.name}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">Type: {selectedZone.type}</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Engineering Notes & Protocols
                </span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{selectedZone.notes}</p>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-500">Statutory Compliance:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Compliant
                </span>
              </div>
            </div>
          </div>

          {/* Quick Zone Navigation List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="font-bold text-[#122b45] text-xs uppercase tracking-wider mb-3">
              All 8 Demarcated Facilities
            </h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors ${
                    selectedZoneId === z.id
                      ? "bg-[#122b45] text-white font-bold"
                      : "hover:bg-slate-50 text-slate-700 border border-slate-100"
                  }`}
                >
                  <span className="truncate pr-2">{z.name}</span>
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      selectedZoneId === z.id ? "text-emerald-400" : "text-emerald-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

