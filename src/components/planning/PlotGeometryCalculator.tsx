"use client";

import React, { useState, useMemo } from "react";
import {
  Ruler,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Compass,
  Layers,
  ArrowRight,
  Info,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import {
  CoordinatePoint,
  PlotShapeType,
  calculateShoelaceArea,
  calculatePolygonPerimeter,
  convertLandUnits,
  LandUnitConversions,
} from "@/lib/planning/geometry-zoning";

interface PlotGeometryCalculatorProps {
  onAreaChange?: (areaSqFt: number) => void;
  className?: string;
}

export default function PlotGeometryCalculator({
  onAreaChange,
  className = "",
}: PlotGeometryCalculatorProps) {
  const [shape, setShape] = useState<PlotShapeType>("polygon");

  // Regular dimensions
  const [rectLength, setRectLength] = useState<number>(250);
  const [rectWidth, setRectWidth] = useState<number>(180);

  // Trapezoid dimensions
  const [trapSideA, setTrapSideA] = useState<number>(200);
  const [trapSideB, setTrapSideB] = useState<number>(280);
  const [trapHeight, setTrapHeight] = useState<number>(160);

  // Triangle dimensions
  const [triBase, setTriBase] = useState<number>(240);
  const [triHeight, setTriHeight] = useState<number>(190);

  // Irregular polygon Cartesian coordinates (in feet)
  const [polygonPoints, setPolygonPoints] = useState<CoordinatePoint[]>([
    { x: 0, y: 0, label: "P1 (SW Corner)" },
    { x: 260, y: 15, label: "P2 (SE Corner)" },
    { x: 235, y: 195, label: "P3 (NE Corner)" },
    { x: 30, y: 175, label: "P4 (NW Corner)" },
  ]);

  const [copiedUnit, setCopiedUnit] = useState<string | null>(null);

  // Compute points and area based on active shape
  const activeGeometry = useMemo(() => {
    let area = 0;
    let perimeter = 0;
    let points: CoordinatePoint[] = [];

    if (shape === "rectangle") {
      area = rectLength * rectWidth;
      perimeter = 2 * (rectLength + rectWidth);
      points = [
        { x: 0, y: 0, label: "P1" },
        { x: rectLength, y: 0, label: "P2" },
        { x: rectLength, y: rectWidth, label: "P3" },
        { x: 0, y: rectWidth, label: "P4" },
      ];
    } else if (shape === "trapezoid") {
      area = ((trapSideA + trapSideB) / 2) * trapHeight;
      const slant = Math.sqrt(
        Math.pow((trapSideB - trapSideA) / 2, 2) + Math.pow(trapHeight, 2)
      );
      perimeter = trapSideA + trapSideB + 2 * slant;
      const offset = (trapSideB - trapSideA) / 2;
      points = [
        { x: 0, y: 0, label: "P1" },
        { x: trapSideB, y: 0, label: "P2" },
        { x: trapSideB - offset, y: trapHeight, label: "P3" },
        { x: offset, y: trapHeight, label: "P4" },
      ];
    } else if (shape === "triangle") {
      area = 0.5 * triBase * triHeight;
      const side = Math.sqrt(Math.pow(triBase / 2, 2) + Math.pow(triHeight, 2));
      perimeter = triBase + 2 * side;
      points = [
        { x: 0, y: 0, label: "P1" },
        { x: triBase, y: 0, label: "P2" },
        { x: triBase / 2, y: triHeight, label: "P3" },
      ];
    } else {
      area = calculateShoelaceArea(polygonPoints);
      perimeter = calculatePolygonPerimeter(polygonPoints);
      points = polygonPoints;
    }

    const conversions = convertLandUnits(area);

    if (onAreaChange) {
      onAreaChange(area);
    }

    return {
      area,
      perimeter: Math.round(perimeter * 10) / 10,
      points,
      conversions,
    };
  }, [
    shape,
    rectLength,
    rectWidth,
    trapSideA,
    trapSideB,
    trapHeight,
    triBase,
    triHeight,
    polygonPoints,
    onAreaChange,
  ]);

  // Coordinate point modifiers
  const handleUpdatePoint = (idx: number, field: "x" | "y" | "label", val: string | number) => {
    setPolygonPoints((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );
  };

  const handleAddPoint = () => {
    const last = polygonPoints[polygonPoints.length - 1] || { x: 100, y: 100 };
    setPolygonPoints((prev) => [
      ...prev,
      {
        x: last.x + 40,
        y: last.y + 20,
        label: `P${prev.length + 1}`,
      },
    ]);
  };

  const handleRemovePoint = (idx: number) => {
    if (polygonPoints.length <= 3) {
      alert("A polygon requires a minimum of 3 coordinate vertices.");
      return;
    }
    setPolygonPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUnit(label);
    setTimeout(() => setCopiedUnit(null), 2000);
  };

  // SVG dynamic normalization & scaling
  const svgRenderData = useMemo(() => {
    const pts = activeGeometry.points;
    if (pts.length === 0) return { viewBox: "0 0 400 300", pathD: "", scaledPoints: [] };

    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));

    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);

    const pad = 40;
    const width = 380;
    const height = 260;

    const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY);

    const scaledPoints = pts.map((p, i) => {
      const sx = pad + (p.x - minX) * scale;
      // Invert Y for cartesian upward representation
      const sy = height - (pad + (p.y - minY) * scale);
      return { sx, sy, origX: p.x, origY: p.y, label: p.label || `P${i + 1}` };
    });

    const pathD =
      scaledPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`, "") +
      " Z";

    return {
      viewBox: `0 0 ${width} ${height}`,
      pathD,
      scaledPoints,
    };
  }, [activeGeometry.points]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Controller Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#122b45] text-base">
                  Plot Area & Geometric Boundary Engine (Tool 6)
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  Cartesian Shoelace Algorithm
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Accurate land measurement for regular and irregular land parcels with instant Indian unit conversion
              </p>
            </div>
          </div>

          {/* Shape Selector Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            {(
              [
                { id: "polygon", label: "Irregular Polygon" },
                { id: "rectangle", label: "Rectangle" },
                { id: "trapezoid", label: "Trapezoid" },
                { id: "triangle", label: "Triangle" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setShape(item.id)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  shape === item.id
                    ? "bg-white text-[#122b45] font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters & Interactive Canvas Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          {/* Left Column: Shape Dimensions / Coordinate Editor */}
          <div className="lg:col-span-5 space-y-4">
            {shape === "rectangle" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Length (Feet)</label>
                  <input
                    type="number"
                    value={rectLength}
                    onChange={(e) => setRectLength(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Width (Feet)</label>
                  <input
                    type="number"
                    value={rectWidth}
                    onChange={(e) => setRectWidth(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {shape === "trapezoid" && (
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Parallel Side A</label>
                  <input
                    type="number"
                    value={trapSideA}
                    onChange={(e) => setTrapSideA(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Parallel Side B</label>
                  <input
                    type="number"
                    value={trapSideB}
                    onChange={(e) => setTrapSideB(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Height (Ft)</label>
                  <input
                    type="number"
                    value={trapHeight}
                    onChange={(e) => setTrapHeight(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {shape === "triangle" && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Base (Feet)</label>
                  <input
                    type="number"
                    value={triBase}
                    onChange={(e) => setTriBase(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Height (Feet)</label>
                  <input
                    type="number"
                    value={triHeight}
                    onChange={(e) => setTriHeight(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {shape === "polygon" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Vertex Coordinates ({polygonPoints.length} Points)
                  </span>
                  <button
                    onClick={handleAddPoint}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Vertex</span>
                  </button>
                </div>

                <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                  {polygonPoints.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-100 font-mono text-[10px] font-bold text-blue-800">
                        P{idx + 1}
                      </span>
                      <input
                        type="number"
                        value={p.x}
                        onChange={(e) => handleUpdatePoint(idx, "x", Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                        placeholder="X (ft)"
                      />
                      <input
                        type="number"
                        value={p.y}
                        onChange={(e) => handleUpdatePoint(idx, "y", Number(e.target.value))}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                        placeholder="Y (ft)"
                      />
                      <input
                        type="text"
                        value={p.label || ""}
                        onChange={(e) => handleUpdatePoint(idx, "label", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 outline-none focus:border-blue-500"
                        placeholder="Description..."
                      />
                      {polygonPoints.length > 3 && (
                        <button
                          onClick={() => handleRemovePoint(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                          title="Remove point"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculated Key Summaries */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                <div className="text-[10px] font-bold uppercase text-blue-800">Gross Plot Area</div>
                <div className="text-xl font-black text-blue-950 mt-0.5">
                  {activeGeometry.area.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-normal text-blue-700">sq.ft</span>
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5">
                  ({activeGeometry.conversions.sqm.toLocaleString("en-IN")} sq.m)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[10px] font-bold uppercase text-slate-500">Perimeter Length</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {activeGeometry.perimeter.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-normal text-slate-500">ft</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ({(activeGeometry.perimeter * 0.3048).toFixed(1)} meters)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual SVG Plot Drawing */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Compass className="h-4 w-4 text-blue-600" />
                <span>Plan View & Boundary CAD Render</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Cartesian Standard (X, Y)</span>
            </div>

            <div className="relative flex-1 min-h-[260px] rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center p-4">
              {/* Background Grid */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Rendered SVG Polygon */}
              <svg
                viewBox={svgRenderData.viewBox}
                className="w-full h-full max-h-[250px] relative z-10"
              >
                {/* Polygon Fill & Boundary Stroke */}
                <path
                  d={svgRenderData.pathD}
                  fill="rgba(56, 189, 248, 0.15)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Vertices & Coordinate Labels */}
                {svgRenderData.scaledPoints.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.sx}
                      cy={pt.sy}
                      r="4.5"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.sx + 6}
                      y={pt.sy - 6}
                      fill="#f8fafc"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {pt.label} ({pt.origX}, {pt.origY})
                    </text>
                  </g>
                ))}
              </svg>

              {/* Center Watermark Tag */}
              <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono text-emerald-400 border border-slate-800">
                Area: {activeGeometry.area.toLocaleString()} sq.ft
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Indian Regional Land Conversion Matrix */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-[#122b45] text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              Indian Regional Land Unit Conversions
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardized conversions recognized across municipal corporations and state revenue departments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Square Feet", val: `${activeGeometry.conversions.sqft.toLocaleString()} sq.ft`, sub: "Base Unit" },
            { label: "Square Meters", val: `${activeGeometry.conversions.sqm.toLocaleString()} sq.m`, sub: "1 sq.m = 10.76 sq.ft" },
            { label: "Guntha (Maharashtra/KA)", val: `${activeGeometry.conversions.guntha} Guntha`, sub: "1 Guntha = 1,089 sq.ft" },
            { label: "Gaj / Sq. Yards", val: `${activeGeometry.conversions.gaj.toLocaleString()} Gaj`, sub: "1 Gaj = 9.0 sq.ft" },
            { label: "Acres", val: `${activeGeometry.conversions.acres} Acres`, sub: "1 Acre = 43,560 sq.ft" },
            { label: "Pucca Bigha (North India)", val: `${activeGeometry.conversions.bighaPucca} Bigha`, sub: "1 Bigha = 27,225 sq.ft" },
            { label: "Bengal Bigha (East India)", val: `${activeGeometry.conversions.bighaBengal} Bigha`, sub: "1 Bigha = 14,400 sq.ft" },
            { label: "UP Bigha", val: `${activeGeometry.conversions.bighaUP} Bigha`, sub: "1 Bigha = 27,000 sq.ft" },
            { label: "Hectares", val: `${activeGeometry.conversions.hectares} Ha`, sub: "1 Ha = 10,000 sq.m" },
            { label: "Brass (Civil Finish Unit)", val: `${activeGeometry.conversions.brass} Brass`, sub: "1 Brass = 100 sq.ft" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all relative group"
            >
              <div className="text-[10px] font-bold uppercase text-slate-500">{item.label}</div>
              <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{item.val}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>

              <button
                onClick={() => copyToClipboard(item.val, item.label)}
                title="Copy Value"
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-opacity"
              >
                {copiedUnit === item.label ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
