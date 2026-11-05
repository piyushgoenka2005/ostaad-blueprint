"use client";

import React, { useState, useMemo } from "react";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Droplets,
  HardHat,
  FileCheck2,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  BoreholeRecord,
  BoreholeStrataLayer,
  SoilLayerType,
  evaluateGeotechBorehole,
  SOIL_TYPE_PROPERTIES,
  FoundationTypeAdvisory,
} from "@/lib/planning/geotech-cost";

const SAMPLE_BOREHOLES: BoreholeRecord[] = [
  {
    id: "bh-01",
    boreholeNumber: "BH-01 (South-West Tower Core)",
    coordinates: "18.5524° N, 73.9015° E",
    groundElevationM: 562.4,
    waterTableDepthM: 3.8,
    totalDepthM: 18.0,
    dateTested: "2026-01-20",
    agencyName: "GeoConsult India Pvt Ltd (NABL Accredited)",
    layers: [
      { depthFromM: 0, depthToM: 1.5, soilType: "TOPSOIL_ORGANIC", sptNValue: 4, description: "Filled surface soil with decomposed organics" },
      { depthFromM: 1.5, depthToM: 4.0, soilType: "MEDIUM_STIFF_CLAY", sptNValue: 14, description: "Brownish yellowish silty clay with high cohesion" },
      { depthFromM: 4.0, depthToM: 8.5, soilType: "MEDIUM_DENSE_SAND", sptNValue: 24, description: "Coarse sand with fine gravel lens" },
      { depthFromM: 8.5, depthToM: 13.0, soilType: "WEATHERED_ROCK_MURRUM", sptNValue: 55, description: "Hard yellowish brownish weathered murrum strata" },
      { depthFromM: 13.0, depthToM: 18.0, soilType: "HARD_BASALT_BEDROCK", sptNValue: 100, description: "Dense unweathered amygdaloidal basalt bedrock" },
    ],
  },
  {
    id: "bh-02",
    boreholeNumber: "BH-02 (North-East Podium)",
    coordinates: "18.5531° N, 73.9022° E",
    groundElevationM: 561.8,
    waterTableDepthM: 2.2,
    totalDepthM: 15.0,
    dateTested: "2026-01-22",
    agencyName: "GeoConsult India Pvt Ltd",
    layers: [
      { depthFromM: 0, depthToM: 2.0, soilType: "TOPSOIL_ORGANIC", sptNValue: 3, description: "Loose filled earth" },
      { depthFromM: 2.0, depthToM: 6.0, soilType: "SOFT_CLAY", sptNValue: 6, description: "Dark grey soft marine/expansive clay" },
      { depthFromM: 6.0, depthToM: 10.5, soilType: "MEDIUM_DENSE_SAND", sptNValue: 22, description: "Medium dense sand with gravel" },
      { depthFromM: 10.5, depthToM: 15.0, soilType: "WEATHERED_ROCK_MURRUM", sptNValue: 50, description: "Hard murrum stratum" },
    ],
  },
];

interface GeotechSoilTrackerProps {
  className?: string;
}

export default function GeotechSoilTracker({ className = "" }: GeotechSoilTrackerProps) {
  const [boreholes, setBoreholes] = useState<BoreholeRecord[]>(SAMPLE_BOREHOLES);
  const [activeBoreholeId, setActiveBoreholeId] = useState<string>("bh-01");
  const [foundationDepthM, setFoundationDepthM] = useState<number>(3.5);

  const activeBorehole = useMemo(() => {
    return boreholes.find((b) => b.id === activeBoreholeId) || boreholes[0];
  }, [boreholes, activeBoreholeId]);

  const analysis = useMemo(() => {
    return evaluateGeotechBorehole(activeBorehole, foundationDepthM);
  }, [activeBorehole, foundationDepthM]);

  const handleUpdateLayer = (
    layerIdx: number,
    field: keyof BoreholeStrataLayer,
    val: string | number
  ) => {
    setBoreholes((prev) =>
      prev.map((b) => {
        if (b.id !== activeBoreholeId) return b;
        const newLayers = b.layers.map((l, idx) =>
          idx === layerIdx ? { ...l, [field]: val } : l
        );
        return { ...b, layers: newLayers };
      })
    );
  };

  const handleAddLayer = () => {
    const last = activeBorehole.layers[activeBorehole.layers.length - 1];
    const newFrom = last ? last.depthToM : 0;
    const newLayer: BoreholeStrataLayer = {
      depthFromM: newFrom,
      depthToM: newFrom + 3.0,
      soilType: "WEATHERED_ROCK_MURRUM",
      sptNValue: 40,
      description: "Additional stratum layer",
    };

    setBoreholes((prev) =>
      prev.map((b) => (b.id === activeBoreholeId ? { ...b, layers: [...b.layers, newLayer] } : b))
    );
  };

  const handleRemoveLayer = (idx: number) => {
    if (activeBorehole.layers.length <= 1) return;
    setBoreholes((prev) =>
      prev.map((b) =>
        b.id === activeBoreholeId
          ? { ...b, layers: b.layers.filter((_, i) => i !== idx) }
          : b
      )
    );
  };

  const foundationBadgeStyles: Record<FoundationTypeAdvisory, { title: string; color: string }> = {
    SHALLOW_ISOLATED_FOOTINGS: { title: "Shallow Isolated Pad Footings", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
    COMBINED_STRIP_FOOTINGS: { title: "Combined Strip / Strap Footings", color: "bg-blue-50 text-blue-800 border-blue-300" },
    RAFT_MAT_FOUNDATION: { title: "Solid RC Raft / Mat Foundation", color: "bg-purple-50 text-purple-800 border-purple-300" },
    BORED_CAST_IN_SITU_PILES: { title: "Bored Cast-in-Situ RC Piling", color: "bg-rose-50 text-rose-800 border-rose-300" },
    UNDER_REAMED_PILES: { title: "Under-Reamed Bulb Piles", color: "bg-amber-50 text-amber-800 border-amber-300" },
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card & Borehole Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white shadow-md shadow-purple-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Geotechnical Soil Investigation & Strata Tracker (Tool 8)
                </h3>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                  IS 6403 & IS 2131 Standard
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sub-surface strata borehole logging, SPT N-value blow counts, and Safe Bearing Capacity (SBC) advisory
              </p>
            </div>
          </div>

          {/* Borehole Selection Pills */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
            {boreholes.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBoreholeId(b.id)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  activeBoreholeId === b.id
                    ? "bg-white text-[#122b45] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {b.boreholeNumber.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Foundation Depth Slider & Testing Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Testing Agency</div>
            <div className="font-semibold text-slate-800 mt-0.5">{activeBorehole.agencyName}</div>
            <div className="text-[10px] text-slate-500">Date: {activeBorehole.dateTested}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Ground Water Table Depth</div>
            <div className="font-bold text-blue-700 flex items-center gap-1 mt-0.5 font-mono">
              <Droplets className="h-3.5 w-3.5" />
              <span>{activeBorehole.waterTableDepthM} m below ground</span>
            </div>
            <div className="text-[10px] text-slate-500">Elevation: {activeBorehole.groundElevationM} m MSL</div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Design Foundation Depth
              </span>
              <span className="font-mono font-bold text-blue-700">{foundationDepthM} meters</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={foundationDepthM}
              onChange={(e) => setFoundationDepthM(Number(e.target.value))}
              className="w-full mt-2 accent-blue-600"
            />
            <div className="text-[10px] text-slate-400">Evaluates bearing strata at this founding level</div>
          </div>
        </div>
      </div>

      {/* Engineering Decision Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safe Bearing Capacity (SBC) */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
            Safe Bearing Capacity (SBC)
          </div>
          <div className="text-3xl font-black text-purple-950 font-mono">
            {analysis.designSbcKNm2}{" "}
            <span className="text-xs font-normal text-purple-700">kN/m²</span>
          </div>
          <div className="text-xs text-purple-800 font-medium">
            ≈ {analysis.designSbcTonsPerM2} Metric Tons / m²
          </div>
          <div className="text-[10px] text-purple-600 pt-1 border-t border-purple-200/60 mt-2">
            Corrected SPT N-Value: {analysis.averageCorrectedSptN} blows
          </div>
        </div>

        {/* Foundation Recommendation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Recommended Foundation Type
          </div>
          <div className="pt-1">
            <span
              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold border ${
                foundationBadgeStyles[analysis.recommendedFoundation].color
              }`}
            >
              {foundationBadgeStyles[analysis.recommendedFoundation].title}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 line-clamp-2 mt-1">
            {analysis.foundationJustification}
          </div>
        </div>

        {/* Dewatering Advisory */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Dewatering Requirement
          </div>
          <div className="flex items-center gap-1.5 mt-1 font-bold text-sm text-blue-950">
            {analysis.dewateringRequired ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Active Dewatering Required</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Dry Foundation Excavation</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-blue-800 line-clamp-2 mt-1">
            {analysis.dewateringMethod}
          </div>
        </div>

        {/* Chemical Aggression & Cement */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Cement Specification
          </div>
          <div className="font-bold text-emerald-950 text-xs mt-1">
            {analysis.recommendedCementType}
          </div>
          <div className="text-[11px] text-emerald-800 line-clamp-2 mt-1">
            {analysis.chemicalAggressionVerdict}
          </div>
        </div>
      </div>

      {/* Visual Geological Strata Column & Layer Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Geological Soil Column */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
              <Compass className="h-4 w-4 text-purple-600" />
              Sub-Surface Strata Profile
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Scale: 0 to {activeBorehole.totalDepthM}m</span>
          </div>

          <div className="my-4 flex-1 flex gap-3 min-h-[320px]">
            {/* Depth Ruler Axis */}
            <div className="w-12 flex flex-col justify-between text-[10px] font-mono text-slate-400 py-1 border-r border-slate-200 text-right pr-2">
              <span>0.0m</span>
              <span>4.0m</span>
              <span>8.0m</span>
              <span>12.0m</span>
              <span>16.0m</span>
              <span>{activeBorehole.totalDepthM}m</span>
            </div>

            {/* Geological Column Bands */}
            <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-300 relative shadow-inner">
              {activeBorehole.layers.map((l, i) => {
                const totalM = activeBorehole.totalDepthM || 18;
                const layerHeightPercent = ((l.depthToM - l.depthFromM) / totalM) * 100;
                const prop = SOIL_TYPE_PROPERTIES[l.soilType];

                return (
                  <div
                    key={i}
                    style={{ height: `${layerHeightPercent}%` }}
                    className={`p-2 flex flex-col justify-center border-b border-white/40 text-[10px] transition-all relative group ${prop.color}`}
                  >
                    <div className="font-bold leading-tight truncate">{prop.label}</div>
                    <div className="text-[9px] opacity-80 font-mono">
                      {l.depthFromM}m - {l.depthToM}m (SPT N: {l.sptNValue})
                    </div>
                  </div>
                );
              })}

              {/* Water Table Marker Line */}
              <div
                style={{
                  top: `${(activeBorehole.waterTableDepthM / (activeBorehole.totalDepthM || 18)) * 100}%`,
                }}
                className="absolute inset-x-0 border-b-2 border-dashed border-blue-500 z-10 flex items-center justify-end pr-2 pointer-events-none"
              >
                <span className="rounded bg-blue-600 text-[8px] font-bold text-white px-1 py-0.2 shadow-xs">
                  GWT {activeBorehole.waterTableDepthM}m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Strata Table */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[#122b45] text-sm">
                Stratum Layer Records & Standard Penetration Test (SPT)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Record continuous soil sample depths, blow counts ($N$), and geological classifications
              </p>
            </div>
            <button
              onClick={handleAddLayer}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Strata Layer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">From (m)</th>
                  <th className="px-3 py-2.5">To (m)</th>
                  <th className="px-4 py-2.5">Soil / Rock Classification</th>
                  <th className="px-3 py-2.5">SPT N-Value</th>
                  <th className="px-4 py-2.5">Geological Notes</th>
                  <th className="px-2 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeBorehole.layers.map((layer, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-mono">
                      <input
                        type="number"
                        step="0.5"
                        value={layer.depthFromM}
                        onChange={(e) => handleUpdateLayer(idx, "depthFromM", Number(e.target.value))}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <input
                        type="number"
                        step="0.5"
                        value={layer.depthToM}
                        onChange={(e) => handleUpdateLayer(idx, "depthToM", Number(e.target.value))}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={layer.soilType}
                        onChange={(e) => handleUpdateLayer(idx, "soilType", e.target.value as SoilLayerType)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                      >
                        {Object.entries(SOIL_TYPE_PROPERTIES).map(([key, val]) => (
                          <option key={key} value={key}>
                            {val.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <input
                        type="number"
                        value={layer.sptNValue}
                        onChange={(e) => handleUpdateLayer(idx, "sptNValue", Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-purple-700"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={layer.description}
                        onChange={(e) => handleUpdateLayer(idx, "description", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {activeBorehole.layers.length > 1 && (
                        <button
                          onClick={() => handleRemoveLayer(idx)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

