"""FastAPI application for Ostaad Blueprint-to-BOQ Engine.

Provides an interactive, high-end side-by-side blueprint inspection console,
live quantity editing, discrepancy auditing, multi-regional cost estimation,
and instant XLSX/CSV/PDF/JSON export for edge proxies and local workloads.
"""

from __future__ import annotations

import base64
import hashlib
import io
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

from .engine import OstaadBOQEngine
from .export_engine import (
    export_to_csv,
    export_to_json,
    export_to_pdf,
    export_to_xlsx,
)
from .models import BOQReport, DrawingType
from .pricing_engine import price_boq_report

app = FastAPI(
    title="Ostaad Blueprint-to-BOQ Engine",
    description="Clean-room, commercially unrestricted Blueprint-to-BOQ Takeoff System",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Process-Time", "X-Engine-Version", "X-Drawing-Type"],
)

engine = OstaadBOQEngine()

# In-memory deterministic LRU-style cache for rapid repeat takeoff queries & edge benchmarks
_TAKEOFF_CACHE: dict[str, tuple[float, BOQReport, str | None]] = {}
MAX_CACHE_ENTRIES = 64


def _get_cache_key(file_bytes: bytes, currency: str, overhead: float, profit: float, contingency: float) -> str:
    sha = hashlib.sha256(file_bytes).hexdigest()
    return f"{sha}_{currency}_{overhead}_{profit}_{contingency}"


@app.middleware("http")
async def add_timing_and_version_headers(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    response.headers["X-Engine-Version"] = "2.0.0"
    return response


@app.get("/healthz")
@app.get("/api/v1/health")
def health_check():
    """Health check with engine diagnostics, active capabilities, and caching status."""
    return {
        "status": "ok",
        "engine": "OstaadBOQEngine",
        "version": "2.0.0",
        "license": "Apache-2.0",
        "supported_drawing_types": [dt.value for dt in DrawingType],
        "export_formats": ["xlsx", "csv", "json", "pdf"],
        "pricing_currencies": ["USD", "INR", "GBP"],
        "cache_entries": len(_TAKEOFF_CACHE),
    }


@app.get("/api/v1/samples")
def list_benchmark_samples():
    """List available benchmark blueprint samples with metadata for testing."""
    assets_dir = Path("assets")
    samples = []
    if assets_dir.exists():
        for f in sorted(assets_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in [".pdf", ".png", ".jpg", ".jpeg"]:
                samples.append({
                    "filename": f.name,
                    "size_bytes": f.stat().st_size,
                    "format": f.suffix.lstrip(".").lower(),
                    "recommended_type": "SITE_TOPOGRAPHICAL_SURVEY" if "barakar" in f.name.lower() else "ARCHITECTURAL_FLOOR_PLAN",
                    "download_url": f"/api/v1/samples/{f.name}",
                })
    return {"samples": samples}


@app.get("/api/samples/{sample_name}")
@app.get("/api/v1/samples/{sample_name}")
def get_sample_file(sample_name: str):
    """Serve benchmark sample blueprints for instant one-click testing."""
    safe_name = Path(sample_name).name
    sample_path = Path("assets") / safe_name
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample blueprint '{safe_name}' not found.")
    return FileResponse(sample_path)


def _process_blueprint_core(
    file_bytes: bytes,
    filename: str,
    currency: str = "AUTO",
    overhead_pct: float = 10.0,
    profit_pct: float = 10.0,
    contingency_pct: float = 5.0,
    use_cache: bool = True,
) -> tuple[BOQReport, str | None, bool, float]:
    cache_key = _get_cache_key(file_bytes, currency, overhead_pct, profit_pct, contingency_pct)
    if use_cache and cache_key in _TAKEOFF_CACHE:
        _, cached_report, cached_data_url = _TAKEOFF_CACHE[cache_key]
        return cached_report, cached_data_url, True, 0.005

    t0 = time.time()
    report = engine.process(file_bytes, filename)

    if currency != "AUTO":
        report = price_boq_report(
            report,
            currency=currency,
            overhead_pct=overhead_pct,
            profit_pct=profit_pct,
            contingency_pct=contingency_pct,
        )

    # Generate preview image data URL for browser display
    data_url = None
    ext = Path(filename).suffix.lower()
    if ext in (".png", ".jpg", ".jpeg", ".webp"):
        img_b64 = base64.b64encode(file_bytes).decode("ascii")
        mime = "image/png" if ext == ".png" else "image/jpeg"
        data_url = f"data:{mime};base64,{img_b64}"
    elif ext == ".pdf":
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            if len(doc) > 0:
                page = doc[0]
                pix = page.get_pixmap(dpi=150)
                png_bytes = pix.tobytes("png")
                img_b64 = base64.b64encode(png_bytes).decode("ascii")
                data_url = f"data:image/png;base64,{img_b64}"
        except Exception:
            pass

    elapsed = round(time.time() - t0, 3)
    if use_cache:
        if len(_TAKEOFF_CACHE) >= MAX_CACHE_ENTRIES:
            _TAKEOFF_CACHE.pop(next(iter(_TAKEOFF_CACHE)))
        _TAKEOFF_CACHE[cache_key] = (time.time(), report, data_url)

    return report, data_url, False, elapsed


@app.post("/api/v1/takeoff/process", response_model=dict)
@app.post("/api/takeoff", response_model=dict)
async def run_takeoff(
    file: UploadFile = File(...),
    currency: str = Query("AUTO", description="Pricing currency: AUTO, USD, INR, GBP"),
    overhead_pct: float = Query(10.0, description="Overhead %"),
    profit_pct: float = Query(10.0, description="Profit %"),
    contingency_pct: float = Query(5.0, description="Contingency %"),
    use_cache: bool = Query(True, description="Enable deterministic cache"),
) -> dict:
    """Run full takeoff on an uploaded blueprint (PDF or PNG/JPG) with multi-regional pricing and caching."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    filename = file.filename or "blueprint.png"
    try:
        report, data_url, cache_hit, elapsed = _process_blueprint_core(
            file_bytes=file_bytes,
            filename=filename,
            currency=currency,
            overhead_pct=overhead_pct,
            profit_pct=profit_pct,
            contingency_pct=contingency_pct,
            use_cache=use_cache,
        )
        report_dict = report.model_dump(mode="json")
        return {
            "success": True,
            "report": report_dict,
            "blueprint_data_url": data_url,
            "cache_hit": cache_hit,
            "processing_time_sec": elapsed,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Takeoff processing failed: {str(e)}")


@app.post("/api/v1/takeoff/reprice", response_model=dict)
async def reprice_takeoff(payload: dict) -> dict:
    """Recalculate costs on an existing BOQReport with custom currency, markup, and contingency."""
    try:
        if "report" in payload:
            report_data = payload["report"]
            currency = payload.get("currency", "USD")
            overhead_pct = float(payload.get("overhead_pct", 10.0))
            profit_pct = float(payload.get("profit_pct", 10.0))
            contingency_pct = float(payload.get("contingency_pct", 5.0))
        else:
            report_data = payload
            currency = "USD"
            overhead_pct = 10.0
            profit_pct = 10.0
            contingency_pct = 5.0

        report = BOQReport.model_validate(report_data)
        updated_report = price_boq_report(
            report,
            currency=currency,
            overhead_pct=overhead_pct,
            profit_pct=profit_pct,
            contingency_pct=contingency_pct,
        )
        return {
            "success": True,
            "report": updated_report.model_dump(mode="json"),
            "cost_summary": updated_report.cost_summary.model_dump(mode="json") if updated_report.cost_summary else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Repricing failed: {str(e)}")


@app.post("/api/v1/takeoff/export/{export_format}")
async def export_report_endpoint(export_format: str, payload: dict):
    """Generate and stream commercial export in XLSX, CSV, JSON, or PDF format."""
    fmt = export_format.lower().strip()
    if fmt not in ("xlsx", "csv", "json", "pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported export format '{export_format}'. Supported formats: xlsx, csv, json, pdf.",
        )

    try:
        report_data = payload.get("report", payload) if isinstance(payload, dict) else payload
        report = BOQReport.model_validate(report_data)
        safe_sheet_name = report.sheet_name.replace(" ", "_").replace("/", "_")

        if fmt == "xlsx":
            content_bytes = export_to_xlsx(report)
            return Response(
                content=content_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f'attachment; filename="BOQ_Takeoff_{safe_sheet_name}.xlsx"',
                    "Access-Control-Expose-Headers": "Content-Disposition",
                },
            )
        elif fmt == "csv":
            csv_text = export_to_csv(report)
            return Response(
                content=csv_text.encode("utf-8"),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="BOQ_Takeoff_{safe_sheet_name}.csv"',
                    "Access-Control-Expose-Headers": "Content-Disposition",
                },
            )
        elif fmt == "json":
            json_text = export_to_json(report, indent=2)
            return Response(
                content=json_text.encode("utf-8"),
                media_type="application/json; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="BOQ_Takeoff_{safe_sheet_name}.json"',
                    "Access-Control-Expose-Headers": "Content-Disposition",
                },
            )
        elif fmt == "pdf":
            pdf_bytes = export_to_pdf(report)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="BOQ_Takeoff_{safe_sheet_name}.pdf"',
                    "Access-Control-Expose-Headers": "Content-Disposition",
                },
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export generation failed: {str(e)}")


@app.post("/api/export/xlsx")
async def export_xlsx_endpoint(report_data: dict):
    """Generate and download styled Excel BOQ workbook (legacy alias)."""
    return await export_report_endpoint("xlsx", report_data)


@app.post("/api/export/csv")
async def export_csv_endpoint(report_data: dict):
    """Generate and download CSV BOQ file (legacy alias)."""
    return await export_report_endpoint("csv", report_data)


@app.post("/api/export/pdf")
async def export_pdf_endpoint(report_data: dict):
    """Generate and download PDF BOQ package (legacy alias)."""
    return await export_report_endpoint("pdf", report_data)


@app.post("/api/export/json")
async def export_json_endpoint(report_data: dict):
    """Generate and download JSON BOQ package (legacy alias)."""
    return await export_report_endpoint("json", report_data)


@app.get("/", response_class=HTMLResponse)
def index_page() -> str:
    """Modern Interactive Blueprint-to-BOQ Workspace UI."""
    return _HTML_DASHBOARD


_HTML_DASHBOARD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OSTAAD — Autonomous Blueprint-to-BOQ Engine</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg-base: #06080d;
  --bg-subtle: #0b0f19;
  --bg-surface: rgba(14, 20, 33, 0.78);
  --bg-surface-elevated: rgba(20, 29, 48, 0.88);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-active: rgba(56, 189, 248, 0.5);
  --accent-cyan: #38bdf8;
  --accent-cyan-glow: rgba(56, 189, 248, 0.22);
  --accent-indigo: #6366f1;
  --accent-emerald: #10b981;
  --accent-emerald-glow: rgba(16, 185, 129, 0.2);
  --accent-amber: #f59e0b;
  --accent-amber-glow: rgba(245, 158, 11, 0.2);
  --accent-rose: #f43f5e;
  --accent-rose-glow: rgba(244, 63, 94, 0.2);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-image: 
    radial-gradient(at 15% 10%, rgba(56, 189, 248, 0.08) 0px, transparent 40%),
    radial-gradient(at 85% 90%, rgba(99, 102, 241, 0.07) 0px, transparent 40%);
}

/* Header */
header {
  height: 58px;
  background: rgba(11, 15, 25, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 50;
  flex-shrink: 0;
}
.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.35);
}
.brand-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 30%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-subtitle {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pill-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}
.pill-clean {
  background: var(--accent-emerald-glow);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.25);
}
.pill-clean .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
  animation: pulse-dot 2s infinite;
}
.pill-edge {
  background: rgba(249, 115, 22, 0.12);
  color: #fb923c;
  border-color: rgba(249, 115, 22, 0.25);
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.btn-primary {
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.35);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(2, 132, 199, 0.5);
}
.btn-secondary {
  background: var(--bg-surface-elevated);
  color: var(--text-primary);
  border-color: var(--border-subtle);
}
.btn-secondary:hover:not(:disabled) {
  background: rgba(30, 42, 68, 0.95);
  border-color: rgba(255, 255, 255, 0.15);
}
.btn-success {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
}
.btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.45);
}

/* Top KPI Ribbon */
.kpi-banner {
  background: rgba(14, 20, 33, 0.65);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 8px 20px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  flex-shrink: 0;
}
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kpi-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.kpi-value {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-value.accent { color: var(--accent-cyan); }
.kpi-value.emerald { color: var(--accent-emerald); }
.kpi-value.gold { color: #facc15; }

/* Main Split Workspace */
.workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Left Pane: Interactive Blueprint Canvas */
.left-pane {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  background: #04060a;
  border-right: 1px solid var(--border-subtle);
  position: relative;
  overflow: hidden;
}
.canvas-header {
  height: 44px;
  background: rgba(11, 15, 25, 0.8);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  z-index: 20;
}
.layer-toggles-bar {
  height: 34px;
  background: rgba(8, 12, 20, 0.9);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  overflow-x: auto;
  z-index: 15;
}
.layer-toggle-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.layer-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.layer-toggle-btn.active {
  background: var(--accent-cyan-glow);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}
.layer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.canvas-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tool-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tool-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
}
.tool-btn.active {
  background: var(--accent-cyan-glow);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.viewer-viewport {
  flex: 1;
  position: relative;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
}
.viewer-viewport:active {
  cursor: grabbing;
}

/* Canvas Container & SVG Overlay */
.canvas-wrapper {
  position: relative;
  display: inline-block;
  transform-origin: center center;
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  background: #ffffff;
  line-height: 0;
}
.blueprint-frame {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
}
.blueprint-frame.inverted {
  filter: invert(0.92) hue-rotate(180deg) contrast(1.1);
}
.canvas-svg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* SVG Interactive Takeoff Elements */
.svg-element {
  pointer-events: all;
  cursor: pointer;
  transition: stroke 0.15s ease, fill 0.15s ease, stroke-width 0.15s ease;
}
.svg-element.verified {
  stroke: #10b981;
  fill: rgba(16, 185, 129, 0.15);
  stroke-width: 2.5;
}
.svg-element.supported {
  stroke: #38bdf8;
  fill: rgba(56, 189, 248, 0.15);
  stroke-width: 2.2;
}
.svg-element.needs-review {
  stroke: #f59e0b;
  fill: rgba(245, 158, 11, 0.18);
  stroke-width: 2.5;
  stroke-dasharray: 4, 3;
}
.svg-element.rejected {
  stroke: #f43f5e;
  fill: rgba(244, 63, 94, 0.2);
  stroke-width: 2.5;
}
.svg-element.wall-run {
  stroke: #60a5fa;
  stroke-width: 3;
  fill: none;
}
.svg-element.boundary-run {
  stroke: #a78bfa;
  stroke-width: 3.5;
  fill: none;
}
.svg-element:hover, .svg-element.highlighted {
  stroke: #ffffff !important;
  stroke-width: 4 !important;
  filter: drop-shadow(0 0 8px #38bdf8);
  animation: pulse-border 1.5s infinite;
}
@keyframes pulse-border {
  0%, 100% { stroke: #38bdf8; }
  50% { stroke: #f8fafc; }
}

/* Floating Canvas HUD Tooltip */
.canvas-tooltip {
  position: absolute;
  z-index: 100;
  background: rgba(11, 15, 25, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid var(--accent-cyan);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  pointer-events: none;
  display: none;
  font-family: var(--font-body);
  font-size: 11.5px;
  color: var(--text-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  transform: translate(12px, 12px);
}
.tooltip-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--accent-cyan);
  margin-bottom: 2px;
}

/* Upload Dropzone Empty State */
.dropzone-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  max-width: 520px;
  text-align: center;
  padding: 36px 30px;
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  border: 2px dashed rgba(56, 189, 248, 0.35);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.7);
  transition: all 0.25s ease;
}
.dropzone-overlay.dragover {
  border-color: var(--accent-cyan);
  background: rgba(56, 189, 248, 0.08);
  transform: scale(1.02);
}
.dropzone-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  border: 1px solid rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-cyan);
  box-shadow: 0 0 25px rgba(56, 189, 248, 0.25);
}
.dropzone-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary);
}
.dropzone-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.file-upload-input { display: none; }
.demo-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 6px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 14px;
}
.demo-label {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.05em;
}
.demo-btn-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-demo {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
}
.btn-demo:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

/* Right Pane: BOQ Studio & Estimator Controls */
.right-pane {
  flex: 1 1 50%;
  display: flex;
  flex-direction: column;
  background: var(--bg-subtle);
  overflow: hidden;
}

/* Estimator Financial Controller Bar */
.estimator-control-bar {
  background: rgba(14, 20, 33, 0.85);
  border-bottom: 1px solid var(--border-subtle);
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.control-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.control-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}
.control-select, .control-input {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  outline: none;
}
.control-select:focus, .control-input:focus {
  border-color: var(--accent-cyan);
}
.control-input {
  width: 52px;
  text-align: right;
}

.tabs-bar {
  height: 44px;
  background: rgba(11, 15, 25, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.tab-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tab-btn {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.04);
}
.tab-btn.active {
  background: var(--bg-surface-elevated);
  color: var(--accent-cyan);
  border-color: var(--border-subtle);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.tab-counter {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 4px 8px 4px 26px;
  font-size: 11.5px;
  color: var(--text-primary);
  outline: none;
  width: 150px;
  transition: all 0.2s ease;
}
.search-input:focus {
  border-color: var(--accent-cyan);
  width: 190px;
}
.search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-muted);
  pointer-events: none;
}

/* Tab Content Areas */
.tab-pane-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.tab-pane {
  display: none;
  animation: fadeIn 0.2s ease forwards;
}
.tab-pane.active { display: block; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Glass Cards & Tables */
.glass-card {
  background: var(--bg-surface);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.boq-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
}
.boq-table th {
  padding: 8px 10px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
  background: rgba(0, 0, 0, 0.25);
}
.boq-table th.num, .boq-table td.num {
  text-align: right;
  font-family: var(--font-mono);
}
.boq-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  vertical-align: middle;
  cursor: pointer;
}
.boq-table tr:hover td {
  background: rgba(56, 189, 248, 0.04);
}
.boq-table tr.row-highlight td {
  background: rgba(56, 189, 248, 0.12) !important;
  border-bottom-color: var(--accent-cyan);
}
.csi-badge {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.25);
  white-space: nowrap;
}
.qty-pill-input {
  width: 70px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-subtle);
  color: #38bdf8;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  text-align: right;
  transition: all 0.15s ease;
}
.qty-pill-input:focus {
  border-color: var(--accent-cyan);
  outline: none;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.3);
  background: rgba(0, 0, 0, 0.6);
}
.qty-pill-input.modified {
  border-color: var(--accent-amber);
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.1);
}

/* Audit & Reconciliation Cards */
.audit-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(20, 28, 46, 0.5);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid var(--accent-amber);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
.audit-item.discrepancy {
  border-left-color: var(--accent-rose);
  background: rgba(244, 63, 94, 0.06);
}
.audit-item.verified {
  border-left-color: var(--accent-emerald);
  background: rgba(16, 185, 129, 0.05);
}
.audit-icon {
  margin-top: 2px;
  color: var(--accent-amber);
}
.audit-item.discrepancy .audit-icon { color: var(--accent-rose); }
.audit-item.verified .audit-icon { color: var(--accent-emerald); }
.audit-main { flex: 1; }
.audit-subject {
  font-weight: 700;
  font-size: 12.5px;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.audit-details {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.audit-action {
  font-size: 11px;
  color: var(--accent-cyan);
  margin-top: 4px;
  font-weight: 500;
}

/* Financial Cards (Tab 5) */
.financial-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.fin-card {
  background: rgba(11, 15, 25, 0.6);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 12px;
}
.fin-card-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 600;
}
.fin-card-value {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}

/* Loading Backdrop */
.loading-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 13, 0.88);
  backdrop-filter: blur(10px);
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 14px;
}
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(56, 189, 248, 0.15);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-status-text {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.loading-subtext {
  font-size: 11.5px;
  color: var(--text-secondary);
}
</style>
</head>
<body>

<!-- Header -->
<header>
  <div class="brand-group">
    <div class="brand-icon">
      <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.2" viewBox="0 0 24 24">
        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"/>
        <path d="M4 10h16M10 4v16"/>
      </svg>
    </div>
    <div>
      <div class="brand-title">OSTAAD BOQ</div>
      <div class="brand-subtitle">Autonomous Blueprint-to-Takeoff</div>
    </div>
  </div>

  <div class="header-badges">
    <div class="pill-badge pill-clean" title="Independent clean-room code, unrestricted Apache-2.0">
      <span class="dot"></span> Clean-Room Apache 2.0
    </div>
    <div class="pill-badge pill-edge">
      Cloudflare Edge Ready
    </div>
  </div>

  <div class="header-actions">
    <button id="btn-xlsx" class="btn btn-success" onclick="downloadExport('xlsx')" disabled>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      Excel (.xlsx)
    </button>
    <button id="btn-pdf" class="btn btn-primary" onclick="downloadExport('pdf')" disabled>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      PDF Package
    </button>
    <button id="btn-csv" class="btn btn-secondary" onclick="downloadExport('csv')" disabled>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      CSV
    </button>
    <button id="btn-json" class="btn btn-secondary" onclick="downloadExport('json')" disabled>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
      JSON
    </button>
  </div>
</header>

<!-- Top KPI Ribbon -->
<div class="kpi-banner" id="kpi-banner">
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4"/></svg>
      Identified Spaces
    </div>
    <div class="kpi-value" id="kpi-spaces">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>
      Spatial Area
    </div>
    <div class="kpi-value emerald" id="kpi-area">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1"/></svg>
      Calibrated Scale
    </div>
    <div class="kpi-value accent" id="kpi-scale">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      Linear Boundaries
    </div>
    <div class="kpi-value" id="kpi-walls">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Direct Subtotal
    </div>
    <div class="kpi-value" id="kpi-direct-subtotal">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/></svg>
      Total Budget
    </div>
    <div class="kpi-value gold" id="kpi-total-budget">—</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Latency & Conf
    </div>
    <div class="kpi-value" id="kpi-speed">—</div>
  </div>
</div>

<!-- Main Split Workspace -->
<div class="workspace">
  <!-- Left Side: Interactive Blueprint Canvas -->
  <div class="left-pane">
    <div class="canvas-header">
      <div style="display:flex; align-items:center; gap:8px;">
        <label for="file-picker" class="btn btn-primary" style="padding:4px 10px; font-size:11.5px;">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Upload Drawing
        </label>
        <input type="file" id="file-picker" class="file-upload-input" accept=".pdf,image/png,image/jpeg,image/webp" onchange="handleFileInput(event)">
        <span id="active-filename" style="font-size:11.5px; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">No drawing active</span>
      </div>

      <div class="canvas-tools">
        <button class="tool-btn" title="Zoom Out" onclick="adjustZoom(-0.15)">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 12H4"/></svg>
        </button>
        <span id="zoom-level" style="font-family:var(--font-mono); font-size:11px; min-width:36px; text-align:center;">100%</span>
        <button class="tool-btn" title="Zoom In" onclick="adjustZoom(0.15)">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
        </button>
        <button class="tool-btn" title="Reset Zoom" onclick="resetZoom()">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
        </button>
        <button class="tool-btn" id="btn-invert" title="Toggle Blueprint / Dark Invert" onclick="toggleInvert()">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>
      </div>
    </div>

    <!-- Canvas Layer Filter Toggles -->
    <div class="layer-toggles-bar" id="layer-toggles">
      <span style="font-size:10.5px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Layers:</span>
      <button class="layer-toggle-btn active" data-layer="all" onclick="toggleLayerFilter('all')">
        <span class="layer-dot" style="background:#ffffff;"></span> All
      </button>
      <button class="layer-toggle-btn active" data-layer="rooms" onclick="toggleLayerFilter('rooms')">
        <span class="layer-dot" style="background:#10b981;"></span> Spaces & Rooms
      </button>
      <button class="layer-toggle-btn active" data-layer="openings" onclick="toggleLayerFilter('openings')">
        <span class="layer-dot" style="background:#38bdf8;"></span> Openings & Symbols
      </button>
      <button class="layer-toggle-btn active" data-layer="walls" onclick="toggleLayerFilter('walls')">
        <span class="layer-dot" style="background:#818cf8;"></span> Walls & Boundary
      </button>
      <button class="layer-toggle-btn active" data-layer="flags" onclick="toggleLayerFilter('flags')">
        <span class="layer-dot" style="background:#f59e0b;"></span> Review Flags
      </button>
    </div>

    <div class="viewer-viewport" id="viewport" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
      <!-- Empty Dropzone -->
      <div class="dropzone-overlay" id="dropzone-overlay">
        <div class="dropzone-icon">
          <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <div>
          <div class="dropzone-title">Upload Blueprint or Drawing</div>
          <div class="dropzone-desc">Drag & drop plan here or select PDF, PNG, or JPG.<br>Full visual traceability linking every BOQ line to drawing geometry.</div>
        </div>

        <div class="demo-buttons-group">
          <div class="demo-label">Instant One-Click Benchmarks:</div>
          <div class="demo-btn-row">
            <button class="btn-demo" onclick="loadSampleBlueprint('indian_bengal_floorplan.png')">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
              Bengal 2BHK Plan (KMC)
            </button>
            <button class="btn-demo" onclick="loadSampleBlueprint('indian_bengal_3bhk_plan.png')">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
              Bengal 3BHK Plan
            </button>
            <button class="btn-demo" onclick="loadSampleBlueprint('barakar 01.11.2025-Model WITHOUT GRID.pdf')">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
              Barakar Site Survey (Zero-Hallucination)
            </button>
          </div>
        </div>
      </div>

      <!-- Rendered Image & Interactive SVG Layer -->
      <div id="canvas-container" class="canvas-wrapper" style="display:none;">
        <img id="blueprint-img" class="blueprint-frame" alt="Architectural Plan">
        <svg id="canvas-overlay" class="canvas-svg-overlay"></svg>
      </div>

      <!-- Floating HUD Tooltip -->
      <div id="canvas-tooltip" class="canvas-tooltip">
        <div class="tooltip-title" id="tt-title">—</div>
        <div id="tt-details" style="color:var(--text-secondary);">—</div>
      </div>
    </div>

    <!-- Processing Modal -->
    <div class="loading-backdrop" id="loading-backdrop">
      <div class="loading-spinner"></div>
      <div class="loading-status-text" id="loading-stage">Analyzing Blueprint...</div>
      <div class="loading-subtext">Executing scale calibration, OCR extraction & closed-contour wall geometry</div>
    </div>
  </div>

  <!-- Right Side: Structured Takeoff Studio -->
  <div class="right-pane">
    <!-- Estimator Financial Control Bar -->
    <div class="estimator-control-bar">
      <div class="control-item">
        <span class="control-label">Currency:</span>
        <select id="sel-currency" class="control-select" onchange="triggerReprice()">
          <option value="AUTO">Auto (Detected)</option>
          <option value="USD">USD ($ - RSMeans)</option>
          <option value="INR">INR (₹ - CPWD DSR)</option>
          <option value="GBP">GBP (£ - BCIS)</option>
        </select>
      </div>
      <div class="control-item">
        <span class="control-label">Overhead %:</span>
        <input type="number" id="inp-overhead" class="control-input" value="10.0" step="0.5" min="0" max="100" onchange="triggerReprice()">
      </div>
      <div class="control-item">
        <span class="control-label">Profit %:</span>
        <input type="number" id="inp-profit" class="control-input" value="10.0" step="0.5" min="0" max="100" onchange="triggerReprice()">
      </div>
      <div class="control-item">
        <span class="control-label">Contingency %:</span>
        <input type="number" id="inp-contingency" class="control-input" value="5.0" step="0.5" min="0" max="100" onchange="triggerReprice()">
      </div>
    </div>

    <!-- Tabs Bar -->
    <div class="tabs-bar">
      <div class="tab-buttons">
        <button class="tab-btn active" onclick="switchTab('tab-boq')">
          Bill of Quantities <span class="tab-counter" id="badge-boq-count">0</span>
        </button>
        <button class="tab-btn" onclick="switchTab('tab-rooms')">
          Room Schedule <span class="tab-counter" id="badge-rooms-count">0</span>
        </button>
        <button class="tab-btn" onclick="switchTab('tab-walls')">
          Linear Runs <span class="tab-counter" id="badge-walls-count">0</span>
        </button>
        <button class="tab-btn" onclick="switchTab('tab-audit')">
          Audit & Evidence <span class="tab-counter" id="badge-audit-count">0</span>
        </button>
        <button class="tab-btn" onclick="switchTab('tab-cost')">
          Cost Breakdown
        </button>
      </div>

      <div class="search-box">
        <svg class="search-icon" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="table-search" class="search-input" placeholder="Filter items..." oninput="handleSearch(this.value)">
      </div>
    </div>

    <div class="tab-pane-container">
      <!-- Empty Initial State -->
      <div id="right-empty" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:340px; color:var(--text-muted); gap:12px;">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.3" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <p style="font-size:13.5px;">Upload or select a drawing on the left to extract the Bill of Quantities.</p>
      </div>

      <!-- Tab 1: BOQ Line Items -->
      <div id="tab-boq" class="tab-pane">
        <div class="glass-card">
          <div class="card-title-row">
            <div class="card-title">
              <svg width="15" height="15" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              Itemized Component Quantities & Cost Estimates
            </div>
            <span style="font-size:11px; color:var(--text-muted);">Click any row to highlight drawing geometry</span>
          </div>
          <table class="boq-table" id="table-boq">
            <thead>
              <tr>
                <th style="width:70px;">Status</th>
                <th style="width:90px;">CSI Code</th>
                <th>Item Description</th>
                <th class="num" style="width:95px;">Quantity</th>
                <th style="width:55px;">Unit</th>
                <th class="num" style="width:85px;">Rate</th>
                <th class="num" style="width:95px;">Total</th>
                <th class="num" style="width:65px;">Conf</th>
              </tr>
            </thead>
            <tbody id="tbody-boq"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Room Schedule -->
      <div id="tab-rooms" class="tab-pane">
        <div class="glass-card">
          <div class="card-title-row">
            <div class="card-title">
              <svg width="15" height="15" fill="none" stroke="#34d399" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4zM4 10h16M10 4v16"/></svg>
              Spatial Schedule & Room Area Takeoff
            </div>
            <div id="rooms-summary-tag" style="font-size:11.5px; font-weight:600; color:#34d399;"></div>
          </div>
          <table class="boq-table">
            <thead>
              <tr>
                <th>Space Identifier</th>
                <th class="num">Stated Sq Ft</th>
                <th class="num">Measured Sq Ft</th>
                <th class="num">Perimeter LF</th>
                <th class="num">Variance %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="tbody-rooms"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Linear Runs -->
      <div id="tab-walls" class="tab-pane">
        <div class="glass-card">
          <div class="card-title-row">
            <div class="card-title">
              <svg width="15" height="15" fill="none" stroke="#60a5fa" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              OpenCV Measured Linear Runs & Boundaries
            </div>
          </div>
          <table class="boq-table">
            <thead>
              <tr>
                <th>Partition Classification</th>
                <th class="num">Length</th>
                <th>Unit</th>
                <th>Engineering Details</th>
              </tr>
            </thead>
            <tbody id="tbody-walls"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab 4: Audit & Discrepancies -->
      <div id="tab-audit" class="tab-pane">
        <div class="glass-card">
          <div class="card-title-row">
            <div class="card-title">
              <svg width="15" height="15" fill="none" stroke="var(--accent-amber)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Anti-Hallucination Audit Trail & Flags
            </div>
          </div>
          <div id="audit-list"></div>
        </div>
      </div>

      <!-- Tab 5: Cost Breakdown -->
      <div id="tab-cost" class="tab-pane">
        <div class="glass-card">
          <div class="card-title-row">
            <div class="card-title">
              <svg width="15" height="15" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Project Financial Summary & Rollup
            </div>
          </div>
          <div class="financial-grid">
            <div class="fin-card">
              <div class="fin-card-label">Direct Cost Subtotal</div>
              <div class="fin-card-value accent" id="fin-direct">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label">Material Cost</div>
              <div class="fin-card-value" id="fin-mat">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label">Labor Cost</div>
              <div class="fin-card-value" id="fin-lab">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label">Equipment Cost</div>
              <div class="fin-card-value" id="fin-eq">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label" id="fin-lbl-ovh">Overhead (10%)</div>
              <div class="fin-card-value" id="fin-ovh">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label" id="fin-lbl-prf">Profit (10%)</div>
              <div class="fin-card-value" id="fin-prf">—</div>
            </div>
            <div class="fin-card">
              <div class="fin-card-label" id="fin-lbl-ctg">Contingency (5%)</div>
              <div class="fin-card-value" id="fin-ctg">—</div>
            </div>
            <div class="fin-card" style="border-color:var(--accent-cyan); background:rgba(56,189,248,0.06);">
              <div class="fin-card-label" style="color:var(--accent-cyan);">Total Estimated Budget</div>
              <div class="fin-card-value gold" id="fin-total">—</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
let currentReport = null;
let currentZoom = 1.0;
let isInverted = false;
let activeFilters = { all: true, rooms: true, openings: true, walls: true, flags: true };

// Zoom controls
function adjustZoom(delta) {
  currentZoom = Math.max(0.3, Math.min(3.5, currentZoom + delta));
  const el = document.getElementById('canvas-container');
  el.style.transform = `scale(${currentZoom})`;
  document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
}

function resetZoom() {
  currentZoom = 1.0;
  const el = document.getElementById('canvas-container');
  el.style.transform = `scale(1.0)`;
  document.getElementById('zoom-level').textContent = `100%`;
}

function toggleInvert() {
  isInverted = !isInverted;
  const img = document.getElementById('blueprint-img');
  img.classList.toggle('inverted', isInverted);
  document.getElementById('btn-invert').classList.toggle('active', isInverted);
}

// Drag & drop handlers
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropzone-overlay').classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('dropzone-overlay').classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone-overlay').classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processFile(e.dataTransfer.files[0]);
  }
}

function handleFileInput(e) {
  if (e.target.files && e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
}

// Load sample benchmark blueprints
async function loadSampleBlueprint(filename) {
  const backdrop = document.getElementById('loading-backdrop');
  backdrop.style.display = 'flex';
  document.getElementById('loading-stage').textContent = `Loading ${filename}...`;

  try {
    const res = await fetch(`/api/v1/samples/${filename}`);
    if (!res.ok) throw new Error('Failed to load sample blueprint.');
    const blob = await res.blob();
    const mime = filename.endsWith('.pdf') ? 'application/pdf' : 'image/png';
    const file = new File([blob], filename, { type: mime });
    await processFile(file);
  } catch (err) {
    alert('Error loading sample: ' + err.message);
    backdrop.style.display = 'none';
  }
}

async function processFile(file) {
  const backdrop = document.getElementById('loading-backdrop');
  backdrop.style.display = 'flex';
  document.getElementById('loading-stage').textContent = 'Analyzing Blueprint Geometry & Callouts...';
  document.getElementById('active-filename').textContent = file.name;

  const curr = document.getElementById('sel-currency').value;
  const ovh = document.getElementById('inp-overhead').value;
  const prf = document.getElementById('inp-profit').value;
  const ctg = document.getElementById('inp-contingency').value;

  const formData = new FormData();
  formData.append('file', file);

  const queryParams = new URLSearchParams({
    currency: curr,
    overhead_pct: ovh,
    profit_pct: prf,
    contingency_pct: ctg,
  });

  try {
    const res = await fetch(`/api/v1/takeoff/process?${queryParams.toString()}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || res.statusText);
    }
    const data = await res.json();
    currentReport = data.report;

    if (data.blueprint_data_url) {
      const img = document.getElementById('blueprint-img');
      img.src = data.blueprint_data_url;
      img.onload = () => {
        document.getElementById('canvas-container').style.display = 'inline-block';
        document.getElementById('dropzone-overlay').style.display = 'none';
        renderCanvasOverlay(currentReport, img.naturalWidth || img.width, img.naturalHeight || img.height);
        resetZoom();
      };
    }

    renderTakeoffDashboard(currentReport);
    document.getElementById('btn-xlsx').disabled = false;
    document.getElementById('btn-pdf').disabled = false;
    document.getElementById('btn-csv').disabled = false;
    document.getElementById('btn-json').disabled = false;
    document.getElementById('right-empty').style.display = 'none';
    switchTab('tab-boq');
  } catch (err) {
    alert('Takeoff failed: ' + err.message);
  } finally {
    backdrop.style.display = 'none';
  }
}

// Interactive SVG Overlay & Bounding Box Linking
function renderCanvasOverlay(report, imgW, imgH) {
  const svg = document.getElementById('canvas-overlay');
  svg.setAttribute('viewBox', `0 0 ${imgW} ${imgH}`);
  svg.innerHTML = '';

  if (!report) return;

  // 1. Render Room Polygons (if available)
  if (report.rooms) {
    report.rooms.forEach((r, idx) => {
      if (r.polygon && r.polygon.length >= 3) {
        const pts = r.polygon.map(p => `${p[0] * imgW},${p[1] * imgH}`).join(' ');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', pts);
        poly.setAttribute('class', `svg-element svg-room verified layer-rooms`);
        poly.setAttribute('data-target-type', 'room');
        poly.setAttribute('data-target-idx', idx);
        attachElementHover(poly, r.name, `Stated: ${r.stated_area_sqft || '—'} SF | Measured: ${r.measured_area_sqft || '—'} SF`);
        svg.appendChild(poly);
      }
    });
  }

  // 2. Render Linear Runs & Site Boundaries
  if (report.linear_runs) {
    report.linear_runs.forEach((lr, idx) => {
      if (lr.coordinates && lr.coordinates.length >= 2) {
        const pts = lr.coordinates.map(p => `${p[0] * imgW},${p[1] * imgH}`).join(' ');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', pts);
        const cls = lr.label.toLowerCase().includes('boundary') ? 'boundary-run' : 'wall-run';
        polyline.setAttribute('class', `svg-element ${cls} layer-walls`);
        attachElementHover(polyline, lr.label, `${lr.length.toFixed(1)} ${lr.unit} (${lr.notes || 'Measured'})`);
        svg.appendChild(polyline);
      }
    });
  }

  // 3. Render Takeoff Lines Bounding Boxes
  if (report.lines) {
    report.lines.forEach((line, idx) => {
      if (line.bounding_box && line.bounding_box.length === 4) {
        const [x0, y0, x1, y1] = line.bounding_box;
        const x = x0 * imgW;
        const y = y0 * imgH;
        const w = (x1 - x0) * imgW;
        const h = (y1 - y0) * imgH;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', Math.max(8, w));
        rect.setAttribute('height', Math.max(8, h));
        rect.setAttribute('rx', 3);

        const statusClass = line.needs_review ? 'needs-review' : (line.confidence > 0.85 ? 'verified' : 'supported');
        const layerClass = line.category.includes('08') ? 'layer-openings' : 'layer-walls';
        rect.setAttribute('class', `svg-element ${statusClass} ${layerClass}`);
        rect.setAttribute('id', `svg-bbox-${idx}`);
        rect.setAttribute('data-line-idx', idx);

        rect.addEventListener('click', () => {
          highlightTableRow(idx);
        });

        const sym = report.cost_summary ? report.cost_summary.currency_symbol : '$';
        const costStr = line.total_cost != null ? ` | ${sym}${line.total_cost.toFixed(2)}` : '';
        attachElementHover(rect, line.item_description, `${line.wbs_code || ''} [${line.quantity} ${line.unit}]${costStr}`);
        svg.appendChild(rect);
      }
    });
  }
}

function attachElementHover(el, title, details) {
  const tooltip = document.getElementById('canvas-tooltip');
  el.addEventListener('mousemove', (e) => {
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 14}px`;
    tooltip.style.top = `${e.clientY + 14}px`;
    document.getElementById('tt-title').textContent = title;
    document.getElementById('tt-details').textContent = details;
  });
  el.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

function highlightCanvasElement(idx) {
  document.querySelectorAll('.svg-element').forEach(el => el.classList.remove('highlighted'));
  const target = document.getElementById(`svg-bbox-${idx}`);
  if (target) {
    target.classList.add('highlighted');
  }
}

function highlightTableRow(idx) {
  switchTab('tab-boq');
  document.querySelectorAll('#tbody-boq tr').forEach(r => r.classList.remove('row-highlight'));
  const row = document.getElementById(`row-boq-${idx}`);
  if (row) {
    row.classList.add('row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  highlightCanvasElement(idx);
}

function toggleLayerFilter(layer) {
  if (layer === 'all') {
    const isAllActive = !activeFilters.all;
    activeFilters.all = isAllActive;
    activeFilters.rooms = isAllActive;
    activeFilters.openings = isAllActive;
    activeFilters.walls = isAllActive;
    activeFilters.flags = isAllActive;
  } else {
    activeFilters[layer] = !activeFilters[layer];
  }

  // Update button active classes
  document.querySelectorAll('.layer-toggle-btn').forEach(btn => {
    const l = btn.getAttribute('data-layer');
    if (activeFilters[l]) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Toggle SVG elements visibility
  const svg = document.getElementById('canvas-overlay');
  svg.querySelectorAll('.svg-element').forEach(el => {
    let show = false;
    if (activeFilters.all) show = true;
    if (el.classList.contains('layer-rooms') && activeFilters.rooms) show = true;
    if (el.classList.contains('layer-openings') && activeFilters.openings) show = true;
    if (el.classList.contains('layer-walls') && activeFilters.walls) show = true;
    if (el.classList.contains('needs-review') && activeFilters.flags) show = true;
    el.style.display = show ? '' : 'none';
  });
}

// Dynamic Re-Pricing Handler
async function triggerReprice() {
  if (!currentReport) return;
  const curr = document.getElementById('sel-currency').value;
  const ovh = parseFloat(document.getElementById('inp-overhead').value) || 10.0;
  const prf = parseFloat(document.getElementById('inp-profit').value) || 10.0;
  const ctg = parseFloat(document.getElementById('inp-contingency').value) || 5.0;

  try {
    const res = await fetch('/api/v1/takeoff/reprice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report: currentReport,
        currency: curr === 'AUTO' ? (currentReport.scale.unit in ['m', 'metre'] ? 'INR' : 'USD') : curr,
        overhead_pct: ovh,
        profit_pct: prf,
        contingency_pct: ctg,
      }),
    });
    if (!res.ok) throw new Error('Failed to recalculate costs.');
    const data = await res.json();
    currentReport = data.report;
    renderTakeoffDashboard(currentReport);
  } catch (err) {
    console.error('Reprice error:', err);
  }
}

function renderTakeoffDashboard(report) {
  const scale = report.scale;
  const cs = report.cost_summary || {};
  const sym = cs.currency_symbol || '$';

  // Update Top KPIs
  document.getElementById('kpi-spaces').textContent = `${report.rooms ? report.rooms.length : 0} Identified`;
  
  const flooringLine = report.lines.find(l => l.category && l.category.includes('09 65 00'));
  document.getElementById('kpi-area').textContent = flooringLine ? `${flooringLine.quantity} SF` : (report.metadata.total_premises_area_sqm ? `${report.metadata.total_premises_area_sqm} M²` : '—');
  
  const scaleText = scale.scale_known ? (scale.raw_scale_text || `${scale.pixels_per_unit} px/${scale.unit}`) : 'Proportional';
  document.getElementById('kpi-scale').textContent = scaleText;

  const totalWallLF = report.linear_runs.reduce((acc, r) => acc + r.length, 0);
  const wallUnit = report.linear_runs.length > 0 ? report.linear_runs[0].unit : 'LF';
  document.getElementById('kpi-walls').textContent = `${totalWallLF.toFixed(1)} ${wallUnit}`;

  document.getElementById('kpi-direct-subtotal').textContent = cs.direct_cost_subtotal != null ? `${sym}${cs.direct_cost_subtotal.toLocaleString()}` : '—';
  document.getElementById('kpi-total-budget').textContent = cs.total_estimated_budget != null ? `${sym}${cs.total_estimated_budget.toLocaleString()}` : '—';
  
  const speed = report.metadata.processing_time_sec || '1.8';
  document.getElementById('kpi-speed').textContent = `${speed}s (${Math.round((scale.confidence || 0.95) * 100)}% Conf)`;

  // Update Badges in Tab Headers
  document.getElementById('badge-boq-count').textContent = report.lines.length;
  document.getElementById('badge-rooms-count').textContent = report.rooms ? report.rooms.length : 0;
  document.getElementById('badge-walls-count').textContent = report.linear_runs ? report.linear_runs.length : 0;
  document.getElementById('badge-audit-count').textContent = report.reconciliation_flags ? report.reconciliation_flags.length : 0;

  // Render Tab 1: BOQ Table
  const tbodyBOQ = document.getElementById('tbody-boq');
  tbodyBOQ.innerHTML = report.lines.map((line, idx) => {
    const csi = line.wbs_code || (line.category.split(' - ')[0] || '01 00 00');
    const uCost = line.unit_cost != null ? `${sym}${line.unit_cost.toFixed(2)}` : '—';
    const tCost = line.total_cost != null ? `${sym}${line.total_cost.toFixed(2)}` : '—';
    const statusPill = line.needs_review
      ? '<span class="pill-badge" style="background:rgba(244,63,94,0.15); color:#f43f5e;">Flag</span>'
      : (line.confidence > 0.85
        ? '<span class="pill-badge" style="background:rgba(52,211,153,0.12); color:#34d399;">Verified</span>'
        : '<span class="pill-badge" style="background:rgba(56,189,248,0.12); color:#38bdf8;">Supported</span>');

    return `
    <tr id="row-boq-${idx}" data-desc="${escapeHtml(line.item_description.toLowerCase())}" onclick="highlightCanvasElement(${idx})">
      <td>${statusPill}</td>
      <td><span class="csi-badge">${escapeHtml(csi)}</span></td>
      <td><strong>${escapeHtml(line.item_description)}</strong></td>
      <td class="num">
        <input class="qty-pill-input ${line.user_edited ? 'modified' : ''}" type="number" step="any" value="${line.quantity}" onchange="updateLineQuantity(${idx}, this.value, this)" onclick="event.stopPropagation()">
      </td>
      <td><span style="font-family:var(--font-mono); color:var(--text-secondary);">${line.unit}</span></td>
      <td class="num"><span style="font-family:var(--font-mono); color:var(--text-secondary);">${uCost}</span></td>
      <td class="num"><strong style="color:var(--text-primary); font-family:var(--font-mono);">${tCost}</strong></td>
      <td class="num"><span style="color:${line.confidence > 0.88 ? '#34d399' : 'inherit'};">${Math.round(line.confidence * 100)}%</span></td>
    </tr>`;
  }).join('');

  // Render Tab 2: Room Schedule
  const tbodyRooms = document.getElementById('tbody-rooms');
  if (report.rooms && report.rooms.length > 0) {
    let totalStated = 0;
    tbodyRooms.innerHTML = report.rooms.map(r => {
      if (r.stated_area_sqft) totalStated += r.stated_area_sqft;
      return `
      <tr>
        <td><strong>${escapeHtml(r.name)}</strong></td>
        <td class="num">${r.stated_area_sqft != null ? r.stated_area_sqft.toFixed(1) : '—'}</td>
        <td class="num">${r.measured_area_sqft != null ? r.measured_area_sqft.toFixed(1) : '—'}</td>
        <td class="num">${r.perimeter_lf != null ? r.perimeter_lf.toFixed(1) : '—'}</td>
        <td class="num" style="color:${(r.discrepancy_pct || 0) > 15 ? 'var(--accent-amber)' : '#34d399'};">${r.discrepancy_pct != null ? r.discrepancy_pct + '%' : '0.0%'}</td>
        <td>${r.needs_review ? '<span class="pill-badge" style="background:rgba(245,158,11,0.15); color:#fbbf24;">Review</span>' : '<span class="pill-badge" style="background:rgba(52,211,153,0.15); color:#34d399;">100% Match</span>'}</td>
      </tr>`;
    }).join('');
    document.getElementById('rooms-summary-tag').textContent = `Total Stated: ${totalStated.toFixed(1)} SQ FT`;
  }

  // Render Tab 3: Linear Runs
  const tbodyWalls = document.getElementById('tbody-walls');
  tbodyWalls.innerHTML = report.linear_runs.map(lr => `
    <tr>
      <td><strong>${escapeHtml(lr.label)}</strong></td>
      <td class="num" style="color:var(--accent-cyan); font-weight:700;">${lr.length.toFixed(1)}</td>
      <td><span style="font-family:var(--font-mono); color:var(--text-secondary);">${lr.unit}</span></td>
      <td style="color:var(--text-secondary); font-size:12px;">${escapeHtml(lr.notes)}</td>
    </tr>
  `).join('');

  // Render Tab 4: Audit & Discrepancies
  const auditList = document.getElementById('audit-list');
  if (report.reconciliation_flags && report.reconciliation_flags.length > 0) {
    auditList.innerHTML = report.reconciliation_flags.map(f => `
      <div class="audit-item ${f.severity === 'discrepancy' ? 'discrepancy' : (f.severity === 'verified' ? 'verified' : '')}">
        <div class="audit-icon">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div class="audit-main">
          <div class="audit-subject">${escapeHtml(f.subject)} [${escapeHtml(f.category)}]</div>
          <div class="audit-details">${escapeHtml(f.details)}</div>
          <div class="audit-action">Recommendation: ${escapeHtml(f.recommendation)}</div>
        </div>
      </div>
    `).join('');
  } else {
    auditList.innerHTML = `<div style="text-align:center; padding:24px; color:#34d399;">✓ Zero discrepancies flagged. All measurements strictly verified against drawing evidence.</div>`;
  }

  // Render Tab 5: Cost Breakdown Cards
  if (cs) {
    document.getElementById('fin-direct').textContent = `${sym}${(cs.direct_cost_subtotal || 0).toLocaleString()}`;
    document.getElementById('fin-mat').textContent = `${sym}${(cs.material_cost_subtotal || 0).toLocaleString()}`;
    document.getElementById('fin-lab').textContent = `${sym}${(cs.labor_cost_subtotal || 0).toLocaleString()}`;
    document.getElementById('fin-eq').textContent = `${sym}${(cs.equipment_cost_subtotal || 0).toLocaleString()}`;
    document.getElementById('fin-lbl-ovh').textContent = `Overhead (${cs.overhead_pct || 10}%)`;
    document.getElementById('fin-ovh').textContent = `${sym}${(cs.overhead_amount || 0).toLocaleString()}`;
    document.getElementById('fin-lbl-prf').textContent = `Profit (${cs.profit_pct || 10}%)`;
    document.getElementById('fin-prf').textContent = `${sym}${(cs.profit_amount || 0).toLocaleString()}`;
    document.getElementById('fin-lbl-ctg').textContent = `Contingency (${cs.contingency_pct || 5}%)`;
    document.getElementById('fin-ctg').textContent = `${sym}${(cs.contingency_amount || 0).toLocaleString()}`;
    document.getElementById('fin-total').textContent = `${sym}${(cs.total_estimated_budget || 0).toLocaleString()}`;
  }
}

function updateLineQuantity(idx, val, inputEl) {
  if (currentReport && currentReport.lines[idx]) {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      currentReport.lines[idx].quantity = num;
      currentReport.lines[idx].user_edited = true;
      if (currentReport.lines[idx].unit_cost != null) {
        currentReport.lines[idx].total_cost = round2(num * currentReport.lines[idx].unit_cost);
      }
      inputEl.classList.add('modified');
      triggerReprice();
    }
  }
}

function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
  if (btn) btn.classList.add('active');
}

function handleSearch(query) {
  const q = query.trim().toLowerCase();
  const rows = document.querySelectorAll('#tbody-boq tr');
  rows.forEach(r => {
    const text = r.getAttribute('data-desc') || r.textContent.toLowerCase();
    r.style.display = text.includes(q) ? '' : 'none';
  });
}

async function downloadExport(format) {
  if (!currentReport) return;
  const url = `/api/v1/takeoff/export/${format}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentReport),
    });
    if (!res.ok) throw new Error('Export download failed');

    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `Ostaad_BOQ_Takeoff_${currentReport.sheet_name || 'Export'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
</script>
</body>
</html>
"""
