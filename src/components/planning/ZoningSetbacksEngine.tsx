"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Compass,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Ruler,
  TrendingUp,
} from "lucide-react";
import {
  RoadWidthCategory,
  ZoningClassification,
  evaluateZoningAndFAR,
  ZoningAnalysisResult,
  INDIAN_LAND_FACTORS,
} from "@/lib/planning/geometry-zoning";

interface ZoningSetbacksEngineProps {
  initialPlotAreaSqFt?: number;
  className?: string;
}

export default function ZoningSetbacksEngine({
  initialPlotAreaSqFt = 45000,
  className = "",
}: ZoningSetbacksEngineProps) {
  const [plotAreaSqFt, setPlotAreaSqFt] = useState<number>(initialPlotAreaSqFt);
  const [roadWidth, setRoadWidth] = useState<RoadWidthCategory>("18M_TO_24M");
  const [zoningClass, setZoningClass] = useState<ZoningClassification>("C2_COMMERCIAL_OFFICE");
  const [heightMeters, setHeightMeters] = useState<number>(45); // e.g. 45m ~15 floors
  const [includeTDR, setIncludeTDR] = useState<boolean>(true);
  const [includeFungible, setIncludeFungible] = useState<boolean>(true);

  // Manual setback override toggles & inputs
  const [customSetbacks, setCustomSetbacks] = useState(false);
  const [manualFront, setManualFront] = useState<number>(30);
  const [manualRear, setManualRear] = useState<number>(20);
  const [manualSide1, setManualSide1] = useState<number>(15);
  const [manualSide2, setManualSide2] = useState<number>(15);

  const analysis: ZoningAnalysisResult = useMemo(() => {
    return evaluateZoningAndFAR({
      grossPlotAreaSqFt: plotAreaSqFt,
      roadWidthCategory: roadWidth,
      zoningClass,
      proposedBuildingHeightMeters: heightMeters,
      includeTDRPremium: includeTDR,
      includeFungibleFSI: includeFungible,
      manualFrontSetbackFt: customSetbacks ? manualFront : undefined,
      manualRearSetbackFt: customSetbacks ? manualRear : undefined,
      manualSide1SetbackFt: customSetbacks ? manualSide1 : undefined,
      manualSide2SetbackFt: customSetbacks ? manualSide2 : undefined,
    });
  }, [
    plotAreaSqFt,
    roadWidth,
    zoningClass,
    heightMeters,
    includeTDR,
    includeFungible,
    customSetbacks,
    manualFront,
    manualRear,
    manualSide1,
    manualSide2,
  ]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview & Regulation Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white shadow-md shadow-indigo-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Zoning, Setbacks & FAR Permissible Area Engine (Tool 12)
                </h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>NBC 2016 Compliant</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Calculates municipal setback deductions, maximum ground coverage footprint, and Floor Area Ratio (FAR/FSI)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Effective FSI:</span>
            <span className="rounded-xl bg-blue-600 px-3 py-1 font-mono text-sm font-bold text-white shadow-xs">
              {analysis.effectiveFSI} FSI
            </span>
          </div>
        </div>

        {/* Input Parameters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs">
          {/* Plot Area */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Gross Plot Area (sq.ft)</label>
            <input
              type="number"
              value={plotAreaSqFt}
              onChange={(e) => setPlotAreaSqFt(Math.max(1000, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
            />
            <div className="text-[10px] text-slate-400">
              ≈ {(plotAreaSqFt / INDIAN_LAND_FACTORS.ACRE).toFixed(3)} Acres •{" "}
              {(plotAreaSqFt / INDIAN_LAND_FACTORS.GUNTHA).toFixed(1)} Guntha
            </div>
          </div>

          {/* Road Width */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Abutting Road Width</label>
            <select
              value={roadWidth}
              onChange={(e) => setRoadWidth(e.target.value as RoadWidthCategory)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="LESS_THAN_9M">Less than 9.0 m (Sub-arterial)</option>
              <option value="9M_TO_12M">9.0 m to 12.0 m (Collector)</option>
              <option value="12M_TO_18M">12.0 m to 18.0 m (Major Road)</option>
              <option value="18M_TO_24M">18.0 m to 24.0 m (Arterial)</option>
              <option value="ABOVE_24M">Above 24.0 m (Expressway / Boulevard)</option>
            </select>
            <div className="text-[10px] text-slate-400">Determines base permissible FSI</div>
          </div>

          {/* Zoning Classification */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Zoning Classification</label>
            <select
              value={zoningClass}
              onChange={(e) => setZoningClass(e.target.value as ZoningClassification)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="R1_RESIDENTIAL_LOW">R1 - Low Density Residential</option>
              <option value="R2_RESIDENTIAL_HIGH">R2 - High Density Residential</option>
              <option value="C1_COMMERCIAL_RETAIL">C1 - Commercial Retail</option>
              <option value="C2_COMMERCIAL_OFFICE">C2 - Commercial Office / IT Park</option>
              <option value="MIXED_USE">Mixed Use (Commercial + Residential)</option>
              <option value="INDUSTRIAL">Industrial / Logistics</option>
            </select>
            <div className="text-[10px] text-slate-400">Governs coverage & fungible limits</div>
          </div>

          {/* Proposed Building Height */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-semibold text-slate-700">Proposed Height</label>
              <span className="font-mono text-blue-700 font-bold">{heightMeters} m (~G+{Math.ceil(heightMeters / 3)})</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              step="1"
              value={heightMeters}
              onChange={(e) => setHeightMeters(Number(e.target.value))}
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Setbacks scale progressively with height</div>
          </div>
        </div>

        {/* Incentive FSI Toggles */}
        <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeTDR}
              onChange={(e) => setIncludeTDR(e.target.checked)}
              className="rounded accent-blue-600 h-4 w-4"
            />
            <span>Include TDR / Premium FSI (+0.50 FSI)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeFungible}
              onChange={(e) => setIncludeFungible(e.target.checked)}
              className="rounded accent-blue-600 h-4 w-4"
            />
            <span>Include Fungible / Ancillary FSI (+35% / +20%)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 ml-auto">
            <input
              type="checkbox"
              checked={customSetbacks}
              onChange={(e) => setCustomSetbacks(e.target.checked)}
              className="rounded accent-blue-600 h-4 w-4"
            />
            <span>Override NBC Setbacks Manually</span>
          </label>
        </div>

        {/* Manual Setbacks Inputs (when enabled) */}
        {customSetbacks && (
          <div className="grid grid-cols-4 gap-3 mt-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
            <div>
              <label className="font-semibold text-amber-900">Front Setback (ft)</label>
              <input
                type="number"
                value={manualFront}
                onChange={(e) => setManualFront(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-amber-300 bg-white p-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-amber-900">Rear Setback (ft)</label>
              <input
                type="number"
                value={manualRear}
                onChange={(e) => setManualRear(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-amber-300 bg-white p-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-amber-900">Side 1 Setback (ft)</label>
              <input
                type="number"
                value={manualSide1}
                onChange={(e) => setManualSide1(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-amber-300 bg-white p-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-amber-900">Side 2 Setback (ft)</label>
              <input
                type="number"
                value={manualSide2}
                onChange={(e) => setManualSide2(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-amber-300 bg-white p-1.5 font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Results Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Permissible BUA */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Permissible Gross Built-Up Area
          </div>
          <div className="text-2xl font-black text-blue-950 font-mono">
            {analysis.permissibleGrossBUASqFt.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-normal text-blue-700">sq.ft</span>
          </div>
          <div className="text-xs text-blue-800 font-medium">
            {analysis.permissibleGrossBUASqM.toLocaleString("en-IN")} sq.meters BUA
          </div>
          <div className="text-[10px] text-blue-600 pt-1 border-t border-blue-200/60 mt-2">
            Base: {analysis.baseFSI} + TDR: {analysis.premiumTdrFSI} + Fungible: {analysis.fungibleFSI}
          </div>
        </div>

        {/* Net Carpet Area */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Est. Net Carpet Area (RERA)
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {analysis.estimatedNetCarpetAreaSqFt.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-normal text-emerald-700">sq.ft</span>
          </div>
          <div className="text-xs text-emerald-800 font-medium">
            72% Loading Efficiency Ratio
          </div>
          <div className="text-[10px] text-emerald-600 pt-1 border-t border-emerald-200/60 mt-2">
            Usable saleable carpet area index
          </div>
        </div>

        {/* Ground Coverage Footprint */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Buildable Ground Footprint
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analysis.netBuildableFootprintSqFt.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-normal text-slate-500">sq.ft</span>
          </div>
          <div className="text-xs font-bold text-slate-700">
            {analysis.permissibleGroundCoveragePercent}% Ground Coverage
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 mt-2">
            After NBC mandatory setback deductions
          </div>
        </div>

        {/* Estimated Floors */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
            Max Floor Capacity
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">
            ~{analysis.estimatedMaxFloors}{" "}
            <span className="text-xs font-normal text-purple-700">Floors</span>
          </div>
          <div className="text-xs text-purple-800 font-medium">
            Structure: Typical Commercial Tower
          </div>
          <div className="text-[10px] text-purple-600 pt-1 border-t border-purple-200/60 mt-2">
            Based on maximum floor-plate footprint
          </div>
        </div>
      </div>

      {/* Detailed Setback Rules & Footprint Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Setback Breakdown Table */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4 text-blue-600" />
              Statutory Setbacks Deductions (NBC 2016)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Minimum peripheral clearance required for firefighting vehicle movement and ventilation
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="p-3 bg-slate-50 flex items-center justify-between font-semibold text-slate-700">
              <span>Boundary Side</span>
              <span>Required Setback</span>
              <span>Regulatory Basis</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="font-bold text-slate-800">Front Setback</span>
              <span className="font-mono font-bold text-blue-700">
                {analysis.setbacks.frontSetbackFt} ft ({(analysis.setbacks.frontSetbackFt * 0.3048).toFixed(1)} m)
              </span>
              <span className="text-[10px] text-slate-500">Road Width ({roadWidth})</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="font-bold text-slate-800">Rear Setback</span>
              <span className="font-mono font-bold text-blue-700">
                {analysis.setbacks.rearSetbackFt} ft ({(analysis.setbacks.rearSetbackFt * 0.3048).toFixed(1)} m)
              </span>
              <span className="text-[10px] text-slate-500">Building Height H / 4</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="font-bold text-slate-800">Side 1 (Left)</span>
              <span className="font-mono font-bold text-blue-700">
                {analysis.setbacks.side1SetbackFt} ft ({(analysis.setbacks.side1SetbackFt * 0.3048).toFixed(1)} m)
              </span>
              <span className="text-[10px] text-slate-500">Fire Driveway Min 6.0m</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <span className="font-bold text-slate-800">Side 2 (Right)</span>
              <span className="font-mono font-bold text-blue-700">
                {analysis.setbacks.side2SetbackFt} ft ({(analysis.setbacks.side2SetbackFt * 0.3048).toFixed(1)} m)
              </span>
              <span className="text-[10px] text-slate-500">Ventilation / Driveway</span>
            </div>

            <div className="p-3 bg-emerald-50/50 flex items-center justify-between">
              <span className="font-bold text-emerald-950">Mandatory Green Open Space</span>
              <span className="font-mono font-bold text-emerald-800">
                {analysis.setbacks.mandatoryOpenSpacePercent}% of Gross Plot
              </span>
              <span className="text-[10px] text-emerald-700">Recreation Space Ground</span>
            </div>
          </div>
        </div>

        {/* Visual Footprint CAD Diagram */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-600" />
              Buildable Core vs. Setbacks Footprint
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual representation of gross land parcel boundary versus net permissible building envelope
            </p>
          </div>

          <div className="my-4 relative h-56 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-6">
            {/* Outer Parcel Boundary */}
            <div className="absolute inset-4 border-2 border-slate-700 rounded-lg flex flex-col justify-between p-2">
              <div className="text-[9px] font-mono text-center text-slate-500">
                Front Setback: {analysis.setbacks.frontSetbackFt} ft
              </div>

              {/* Inner Buildable Core */}
              <div className="mx-auto my-auto w-3/5 h-3/5 rounded-md bg-emerald-500/20 border-2 border-emerald-600 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="text-xs font-black text-emerald-950 font-mono">
                  {analysis.netBuildableFootprintSqFt.toLocaleString()} sq.ft
                </div>
                <div className="text-[10px] font-bold text-emerald-800">
                  Net Buildable Footprint ({analysis.permissibleGroundCoveragePercent}%)
                </div>
              </div>

              <div className="text-[9px] font-mono text-center text-slate-500">
                Rear Setback: {analysis.setbacks.rearSetbackFt} ft
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border-2 border-slate-700 bg-transparent inline-block" />
              <span>Gross Land Boundary</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-500/30 border border-emerald-600 inline-block" />
              <span>Net Permissible Ground Envelope</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
