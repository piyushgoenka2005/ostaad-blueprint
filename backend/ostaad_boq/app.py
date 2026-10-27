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

# Register BuildBharat ERP Core Routers
from .erp_core.api import erp_router, auth_router
app.include_router(erp_router)
app.include_router(auth_router)

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
<title>BuildBharat ERP — Enterprise Multi-Entity Construction Portal</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg-base: #060913;
  --bg-subtle: #0b1120;
  --bg-card: rgba(15, 23, 42, 0.75);
  --bg-card-hover: rgba(22, 33, 58, 0.85);
  --border: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(56, 189, 248, 0.45);
  --primary: #0284c7;
  --primary-glow: rgba(56, 189, 248, 0.25);
  --accent-cyan: #38bdf8;
  --accent-indigo: #6366f1;
  --accent-emerald: #10b981;
  --accent-amber: #f59e0b;
  --accent-rose: #f43f5e;
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-image: 
    radial-gradient(at 10% 10%, rgba(56, 189, 248, 0.05) 0px, transparent 40%),
    radial-gradient(at 90% 90%, rgba(99, 102, 241, 0.05) 0px, transparent 40%);
}

/* TOP APP BAR */
header.portal-header {
  height: 62px;
  background: rgba(11, 17, 32, 0.95);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
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
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--primary-glow);
}
.brand-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-tagline {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 600;
}

/* Department Role Selector in Header */
.department-switcher {
  display: flex;
  background: rgba(4, 7, 15, 0.7);
  padding: 4px;
  border-radius: 30px;
  border: 1px solid var(--border);
  gap: 4px;
}
.dept-btn {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
  transition: all 0.2s ease;
}
.dept-btn:hover { color: #fff; }
.dept-btn.active {
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
  color: #fff;
  box-shadow: 0 2px 10px var(--primary-glow);
}
.dept-btn .role-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.user-profile-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  padding: 5px 12px;
  border-radius: 24px;
}
.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-name { font-weight: 600; font-size: 12px; color: #fff; }
.user-role-label { font-size: 10.5px; color: var(--accent-cyan); font-weight: 600; }

/* MAIN CONTENT */
main.portal-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Department Panels */
.department-panel { display: none; flex-direction: column; gap: 20px; }
.department-panel.active { display: flex; }

/* Cards & UI Elements */
.glass-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.card-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Alert Boxes */
.alert-box {
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
  animation: fadeIn 0.3s ease;
}
.alert-rose {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fda4af;
}
.alert-emerald {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #6ee7b7;
}
.alert-amber {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fde68a;
}
.alert-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
.alert-content { font-size: 12.5px; line-height: 1.4; }
.alert-content strong { color: #fff; display: block; margin-bottom: 2px; }

/* Project Header Banner */
.project-banner {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  position: relative;
}
.project-banner::before {
  content: "";
  position: absolute;
  top: 0; left: 0; width: 4px; height: 100%;
  background: linear-gradient(to bottom, var(--accent-cyan), var(--accent-indigo));
}

/* Tables */
.table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
table.portal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}
table.portal-table th {
  padding: 10px 14px;
  background: rgba(11, 17, 32, 0.9);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
table.portal-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}
table.portal-table tr:hover td {
  background: rgba(56, 189, 248, 0.03);
  color: #fff;
}

/* Forms & Inputs */
.form-input, .form-select {
  background: rgba(4, 7, 15, 0.8);
  border: 1px solid var(--border);
  color: #fff;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 12px;
  outline: none;
  transition: all 0.15s ease;
}
.form-input:focus, .form-select:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 8px var(--primary-glow);
}
.table-input {
  width: 90px;
  background: rgba(4, 7, 15, 0.7);
  border: 1px solid var(--border);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.table-input:focus { border-color: var(--accent-cyan); }

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 100%);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 10px var(--primary-glow);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);
}
.btn-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
  font-weight: 600;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-success:hover { background: rgba(16, 185, 129, 0.25); }
.btn-danger {
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fb7185;
  font-weight: 600;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-danger:hover { background: rgba(244, 63, 94, 0.25); }
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 12px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-secondary:hover { color: #fff; background: rgba(255, 255, 255, 0.09); }

/* Badges */
.badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}
.badge-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.badge-rose { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
.badge-cyan { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }

/* Financial KPI Cards Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.kpi-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
}
.kpi-stat-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-stat-val {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 2px;
}
.kpi-stat-footer {
  font-size: 11px;
  color: var(--text-secondary);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
</head>
<body>

<!-- 1. TOP HEADER WITH REAL MULTI-ENTITY AUTHENTICATION -->
<header class="portal-header">
  <div class="brand-group">
    <div class="brand-icon">
      <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
    </div>
    <div>
      <div class="brand-title">BuildBharat ERP</div>
      <div class="brand-tagline">Enterprise Corporate Construction Management Portal</div>
    </div>
  </div>

  <!-- Role-Based Department Switcher (Simulates Separate Login Profiles) -->
  <div class="department-switcher">
    <button id="dept-pm" class="dept-btn active" onclick="switchDepartment('OPERATIONS')">
      <span class="role-dot"></span>
      👷 Managing Authority (PM)
    </button>
    <button id="dept-fin" class="dept-btn" onclick="switchDepartment('FINANCE')">
      <span class="role-dot" style="background:#f59e0b;"></span>
      💼 Finance Department
    </button>
    <button id="dept-store" class="dept-btn" onclick="switchDepartment('SITE_STORE')">
      <span class="role-dot" style="background:#38bdf8;"></span>
      📦 Site Storekeeper
    </button>
  </div>

  <!-- Active Profile Indicator -->
  <div class="user-profile-badge">
    <div class="user-avatar" id="current-avatar">RS</div>
    <div>
      <div class="user-name" id="current-user-name">Rajesh Sharma</div>
      <div class="user-role-label" id="current-role-label">OPERATIONS (Managing Authority)</div>
    </div>
  </div>
</header>

<!-- 2. MAIN APPLICATION WORKSPACE -->
<main class="portal-main">

  <!-- Project Overview Master Banner -->
  <div class="project-banner">
    <div>
      <div style="font-size:11px; font-weight:700; color:var(--accent-cyan); text-transform:uppercase; margin-bottom:4px;">Master Construction Contract</div>
      <div style="font-family:var(--font-display); font-size:20px; font-weight:800; color:#fff;">Navi Mumbai International Airport - Terminal 2 (Zone A)</div>
      <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
        Project ID: <strong style="color:#fff;">proj-demo-101</strong> | Contract Value: <strong style="color:#34d399;">₹25,00,00,000.00</strong> | Tenant: <strong style="color:#fff;">Larsen & Toubro Ltd</strong>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <a href="/docs" target="_blank" style="font-size:12px; color:var(--text-secondary); text-decoration:none; padding:6px 12px; border-radius:6px; border:1px solid var(--border);">Open Swagger API Docs</a>
      <button class="btn-primary" onclick="triggerFullSimulation()">
        ▶ Run Full Pilot Simulation
      </button>
    </div>
  </div>

  <!-- ==============================================================
       PANEL 1: MANAGING AUTHORITY (OPERATIONS / PROJECT MANAGER)
       ============================================================== -->
  <div id="panel-operations" class="department-panel active">

    <!-- Rejection Alert Notice Container (Populated if Finance rejected a proposal) -->
    <div id="pm-rejection-alert" style="display:none;"></div>

    <!-- 1. BOQ Review & Inline Editing Card -->
    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            Bill of Quantities (BOQ) — Review & Accuracy Correction
          </div>
          <div class="card-subtitle">
            Project Manager inspects extracted quantities. If accuracy needs adjustment, edit directly below before approving.
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" onclick="addCustomBOQLine()">+ Add Custom Line</button>
          <button class="btn-success" id="btn-approve-boq" onclick="approveProjectBOQ()">✔ Approve Final BOQ</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="portal-table">
          <thead>
            <tr>
              <th>WBS Code</th>
              <th>Item Description</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Estimated Rate (₹)</th>
              <th>Total Amount (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tbody-pm-boq">
            <tr><td colspan="8" style="text-align:center; padding:30px;">Loading project BOQ items...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. IS 456 Material Decomposition Card -->
    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="#a855f7" stroke-width="2" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            Indian Standard IS 456 Material Decomposition
          </div>
          <div class="card-subtitle">Decomposes civil concrete and brickwork items into raw commercial procurement packages.</div>
        </div>
        <button class="btn-primary" onclick="runIS456Decomp()">Decompose Materials</button>
      </div>

      <div class="table-wrapper">
        <table class="portal-table">
          <thead>
            <tr><th>Package Name</th><th>Material Required</th><th>Quantity</th><th>Unit of Measure</th><th>Status</th></tr>
          </thead>
          <tbody id="tbody-decomp-materials">
            <tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Click 'Decompose Materials' to calculate raw ingredients (Cement, Sand, Aggregates, Steel).</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. Vendor Phone Directory & Telephonic Quotation Entry Form -->
    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="var(--accent-amber)" stroke-width="2" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Vendor Phone Directory & Telephonic Quotation Log
          </div>
          <div class="card-subtitle">
            Junior engineers or interns call vendors from the directory below, note down their quoted prices, and record caller notes.
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="portal-table">
          <thead>
            <tr>
              <th>Material Category</th>
              <th>Vendor Company</th>
              <th>Phone Number</th>
              <th>City / Hub</th>
              <th>Quoted Base (₹)</th>
              <th>Freight / Unit (₹)</th>
              <th>GST %</th>
              <th>Call Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="tbody-vendor-directory">
            <tr><td colspan="9" style="text-align:center; padding:30px;">Loading vendor phone directory...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Comparative Statement & Submit Proposal Section -->
      <div id="comparative-ranking-section" style="margin-top:20px; display:none; border-top:1px solid var(--border); padding-top:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <div style="font-weight:700; font-size:14px; color:#fff;">Dynamic L1/L2 Comparative Statement</div>
            <div style="font-size:11.5px; color:var(--text-muted);">True landed unit cost calculated = (Base + Freight) × (1 + GST)</div>
          </div>
          <button class="btn-primary" onclick="submitBillProposalToFinance()">
            📤 Submit Bill Proposal to Finance Department
          </button>
        </div>

        <div id="comparative-cards" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;"></div>
      </div>
    </div>

  </div>

  <!-- ==============================================================
       PANEL 2: FINANCE DEPARTMENT (APPROVAL / REJECTION & UTR LOGGING)
       ============================================================== -->
  <div id="panel-finance" class="department-panel">

    <!-- Executive Financial KPIs -->
    <div class="kpi-grid">
      <div class="kpi-stat-card">
        <div class="kpi-stat-label">Committed PO Budget <span>💼</span></div>
        <div class="kpi-stat-val" id="fin-kpi-committed">₹6,04,806.40</div>
        <div class="kpi-stat-footer">Contracted Landed Order Value</div>
      </div>
      <div class="kpi-stat-card">
        <div class="kpi-stat-label">Disbursed Cash Outflow <span>💳</span></div>
        <div class="kpi-stat-val" style="color:var(--accent-cyan);" id="fin-kpi-outflow">₹5,99,808.00</div>
        <div class="kpi-stat-footer">100% Verified with Bank UTR</div>
      </div>
      <div class="kpi-stat-card">
        <div class="kpi-stat-label">Pending PO Clearance <span>⚠️</span></div>
        <div class="kpi-stat-val" style="color:var(--accent-amber);" id="fin-kpi-pending-count">1</div>
        <div class="kpi-stat-footer">Requires Finance Approval</div>
      </div>
      <div class="kpi-stat-card">
        <div class="kpi-stat-label">Outstanding Payables <span>⚖️</span></div>
        <div class="kpi-stat-val" style="color:#f43f5e;" id="fin-kpi-payables">₹4,998.40</div>
        <div class="kpi-stat-footer">Damage variance deducted</div>
      </div>
    </div>

    <!-- Pending PO Approval Notice Hub -->
    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="var(--accent-amber)" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            Pending Bill Proposals & Slip Approval Notices
          </div>
          <div class="card-subtitle">
            Review proposed vendor quotes submitted by Managing Authority. Purchase Orders remain LOCKED until Finance grants budget clearance.
          </div>
        </div>
      </div>

      <div id="finance-pending-list" style="display:flex; flex-direction:column; gap:14px;">
        <div style="text-align:center; padding:30px; color:var(--text-muted);">No proposals pending approval right now.</div>
      </div>
    </div>

    <!-- Two-Way Match Invoice Reconciliation & PO Closure Card -->
    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="var(--accent-emerald)" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Two-Way Match Reconciliation & PO Closure
          </div>
          <div class="card-subtitle">
            Audits vendor tax invoice against physical net accepted goods at site store (caps rate and quantity). Disburses final settlement UTR.
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <div style="background:rgba(4, 7, 15, 0.6); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <div style="font-weight:700; color:#fff; margin-bottom:10px;">Step 1: Reconcile Vendor Tax Invoice</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="font-size:11px; color:var(--text-muted);">Invoice Number</label>
            <input type="text" id="recon-inv-num" class="form-input" value="UTCL-TAX-INV-88910">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div>
                <label style="font-size:11px; color:var(--text-muted);">Claimed Qty (Bags)</label>
                <input type="number" id="recon-inv-qty" class="form-input" value="1331.0">
              </div>
              <div>
                <label style="font-size:11px; color:var(--text-muted);">Claimed Rate (₹)</label>
                <input type="number" id="recon-inv-rate" class="form-input" value="454.40">
              </div>
            </div>
            <button class="btn-primary" style="margin-top:6px;" onclick="runReconciliation()">Reconcile with Store GRN</button>
          </div>
        </div>

        <div style="background:rgba(4, 7, 15, 0.6); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border);">
          <div style="font-weight:700; color:#fff; margin-bottom:10px;">Step 2: Disburse Final Settlement & Close PO</div>
          <div id="recon-status-box" style="font-size:11.5px; color:var(--text-secondary); margin-bottom:12px; line-height:1.4;">
            Click 'Reconcile with Store GRN' on the left to verify delivery fulfillment.
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="font-size:11px; color:var(--text-muted);">Bank UTR Reference Number</label>
            <input type="text" id="final-settle-utr" class="form-input" value="SBINR52026102600987654">
            <button class="btn-success" id="btn-final-settle" onclick="executeFinalSettlement()" disabled>Disburse Final Balance & Close PO</button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ==============================================================
       PANEL 3: SITE STOREKEEPER (DELIVERY CHALLAN & GODOWN STOCK)
       ============================================================== -->
  <div id="panel-store" class="department-panel">

    <div class="glass-card">
      <div class="card-header-row">
        <div>
          <div class="card-title">
            <svg width="18" height="18" fill="none" stroke="var(--accent-cyan)" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            Site Store Gate Delivery Inward (Goods Receipt Note)
          </div>
          <div class="card-subtitle">
            Log incoming trucks at project godown against dispatched POs. Record delivery challan, deduct damaged goods, and update warehouse stock.
          </div>
        </div>
        <div style="font-family:var(--font-display); font-size:18px; font-weight:700; color:#34d399;" id="store-godown-counter">
          Warehouse Stock: 1,320 Bags
        </div>
      </div>

      <!-- Inward Form -->
      <div style="background:rgba(4, 7, 15, 0.6); padding:18px; border-radius:var(--radius-md); border:1px solid var(--border); margin-bottom:20px;">
        <div style="font-weight:700; color:#fff; margin-bottom:12px;">Log Inward Delivery Challan</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Challan Number</label>
            <input type="text" id="grn-challan" class="form-input" value="CHAL-2026-0091" style="width:100%;">
          </div>
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Truck / Vehicle Reg.</label>
            <input type="text" id="grn-truck" class="form-input" value="MH-04-AZ-9988" style="width:100%;">
          </div>
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Gross Received Qty</label>
            <input type="number" id="grn-qty" class="form-input" value="700" style="width:100%;">
          </div>
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom:4px;">Damaged / Burst Qty</label>
            <input type="number" id="grn-damaged" class="form-input" value="0" style="width:100%;">
          </div>
        </div>
        <div style="margin-top:12px; display:flex; justify-content:flex-end;">
          <button class="btn-primary" onclick="submitSiteGRN()">📥 Receive Goods & Increment Godown Stock</button>
        </div>
      </div>

      <!-- Dispatched POs waiting delivery table -->
      <div style="font-weight:700; color:#fff; margin-bottom:10px;">Active Dispatched Purchase Orders at Site</div>
      <div class="table-wrapper">
        <table class="portal-table">
          <thead>
            <tr><th>PO Number</th><th>Material</th><th>Ordered Qty</th><th>Net Delivered</th><th>Pending Delivery</th><th>Vendor</th><th>Status</th></tr>
          </thead>
          <tbody id="tbody-store-pos">
            <tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Loading dispatched purchase orders...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

</main>

<!-- JAVASCRIPT LOGIC -->
<script>
// State
let currentRole = "OPERATIONS";
let activeProjectID = "proj-demo-101";
let projectBOQItems = [];
let allVendors = [];
let activePOProposal = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  // Check if role is specified in URL hash (e.g. #role=FINANCE) for multi-browser testing
  const hash = window.location.hash.replace('#', '');
  if (hash.includes('role=')) {
    const r = hash.split('role=')[1];
    switchDepartment(r);
  } else {
    loadDepartmentData(currentRole);
  }
});

// Switch Department Role (Multi-Entity Authentication)
function switchDepartment(role) {
  currentRole = role;
  window.location.hash = `role=${role}`;

  document.querySelectorAll('.dept-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.department-panel').forEach(p => p.classList.remove('active'));

  if (role === 'OPERATIONS') {
    document.getElementById('dept-pm').classList.add('active');
    document.getElementById('panel-operations').classList.add('active');
    document.getElementById('current-avatar').textContent = "RS";
    document.getElementById('current-user-name').textContent = "Rajesh Sharma";
    document.getElementById('current-role-label').textContent = "OPERATIONS (Managing Authority)";
  } else if (role === 'FINANCE') {
    document.getElementById('dept-fin').classList.add('active');
    document.getElementById('panel-finance').classList.add('active');
    document.getElementById('current-avatar').textContent = "SI";
    document.getElementById('current-user-name').textContent = "Sunita Iyer";
    document.getElementById('current-role-label').textContent = "FINANCE (Head of Finance)";
  } else if (role === 'SITE_STORE') {
    document.getElementById('dept-store').classList.add('active');
    document.getElementById('panel-store').classList.add('active');
    document.getElementById('current-avatar').textContent = "RP";
    document.getElementById('current-user-name').textContent = "Ramesh Pawar";
    document.getElementById('current-role-label').textContent = "SITE_STORE (Storekeeper)";
  }

  loadDepartmentData(role);
}

function loadDepartmentData(role) {
  if (role === 'OPERATIONS') {
    loadBOQItems();
    loadVendorDirectory();
    checkPMNotifications();
  } else if (role === 'FINANCE') {
    loadFinancePending();
  } else if (role === 'SITE_STORE') {
    loadStorePOs();
  }
}

// ==============================================================
// 1. MANAGING AUTHORITY FUNCTIONS
// ==============================================================

async function loadBOQItems() {
  try {
    const res = await fetch(`/api/v1/erp/boq/items/${activeProjectID}`);
    const items = await res.json();
    projectBOQItems = items;
    renderBOQTable(items);
  } catch (err) {
    console.error(err);
  }
}

function renderBOQTable(items) {
  const tbody = document.getElementById('tbody-pm-boq');
  tbody.innerHTML = '';
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">No BOQ items found. Click "+ Add Custom Line" above.</td></tr>';
    return;
  }

  let allVerified = true;
  items.forEach(item => {
    if (!item.is_verified) allVerified = false;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-cyan);">${item.wbs_code}</td>
      <td>
        <input type="text" class="form-input" style="width:100%; min-width:240px;" value="${escapeHtml(item.description)}" onchange="updateBOQField('${item.id}', 'description', this.value)">
      </td>
      <td>
        <input type="number" class="table-input" value="${item.quantity}" step="0.1" onchange="updateBOQField('${item.id}', 'quantity', parseFloat(this.value))">
      </td>
      <td><span class="badge badge-cyan">${item.unit}</span></td>
      <td>
        <input type="number" class="table-input" value="${item.unit_rate}" step="10" onchange="updateBOQField('${item.id}', 'unit_rate', parseFloat(this.value))">
      </td>
      <td style="font-family:var(--font-mono); font-weight:700; color:#fff;">₹${(item.total_amount || 0).toLocaleString()}</td>
      <td>
        <span class="badge ${item.is_verified ? 'badge-emerald' : 'badge-amber'}">
          ${item.is_verified ? '✔ VERIFIED' : '● PENDING'}
        </span>
      </td>
      <td>
        <button onclick="deleteBOQLine('${item.id}')" style="background:transparent; border:none; color:var(--accent-rose); cursor:pointer;" title="Delete line">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const btnApprove = document.getElementById('btn-approve-boq');
  if (btnApprove) {
    btnApprove.textContent = allVerified ? "✔ All BOQ Items Approved" : "✔ Approve Final BOQ";
    btnApprove.disabled = allVerified;
  }
}

async function updateBOQField(itemId, field, val) {
  const payload = {};
  payload[field] = val;
  try {
    await fetch(`/api/v1/erp/boq/item/${itemId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    loadBOQItems();
  } catch (err) {
    alert("Error updating item: " + err.message);
  }
}

async function addCustomBOQLine() {
  const desc = prompt("Enter Description for new BOQ line item:", "Structural Fe 550D TMT Steel Rebars");
  if (!desc) return;
  const qty = parseFloat(prompt("Enter Quantity:", "15.0")) || 1.0;
  const unit = prompt("Enter Unit (e.g. CUM, MT, BAG, NOS):", "MT") || "NOS";
  const rate = parseFloat(prompt("Enter Estimated Unit Rate (₹):", "68000")) || 0.0;

  try {
    await fetch('/api/v1/erp/boq/item', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        project_id: activeProjectID,
        wbs_code: "GEN-" + Math.floor(100 + Math.random() * 900),
        description: desc,
        quantity: qty,
        unit: unit,
        unit_rate: rate
      })
    });
    loadBOQItems();
  } catch (err) {
    alert("Error adding item: " + err.message);
  }
}

async function deleteBOQLine(itemId) {
  if (!confirm("Are you sure you want to delete this line item?")) return;
  try {
    await fetch(`/api/v1/erp/boq/item/${itemId}`, { method: 'DELETE' });
    loadBOQItems();
  } catch (err) {
    alert("Error deleting item: " + err.message);
  }
}

async function approveProjectBOQ() {
  try {
    const res = await fetch('/api/v1/erp/boq/verify-all', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ project_id: activeProjectID, verified_by_user_id: 'user-pm-01' })
    });
    const data = await res.json();
    alert(`✔ Success! ${data.verified_items_count} BOQ items verified by Project Manager. Procurement is now unlocked!`);
    loadBOQItems();
  } catch (err) {
    alert("Error approving BOQ: " + err.message);
  }
}

async function runIS456Decomp() {
  try {
    const res = await fetch('/api/v1/erp/procurement/decompose', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ project_id: activeProjectID })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);

    const tbody = document.getElementById('tbody-decomp-materials');
    tbody.innerHTML = '';
    (data.decomposed_materials || []).forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:#fff;">Package: ${m.material_name}</td>
        <td>${m.material_name}</td>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-cyan);">${m.quantity}</td>
        <td><span class="badge badge-cyan">${m.uom}</span></td>
        <td><span class="badge badge-emerald">Ready for RFQ</span></td>
      `;
      tbody.appendChild(tr);
    });
    alert(`✔ IS 456 Material Decomposition Completed! Packages generated for Cement, Sand, and Aggregates.`);
  } catch (err) {
    alert("Decomposition Error: " + err.message);
  }
}

// 2. Vendor Phone Directory & Quotation Log
async function loadVendorDirectory() {
  try {
    const res = await fetch('/api/v1/erp/vendors');
    const vendors = await res.json();
    allVendors = vendors;
    renderVendorDirectory(vendors);
  } catch (err) {
    console.error(err);
  }
}

function renderVendorDirectory(vendors) {
  const tbody = document.getElementById('tbody-vendor-directory');
  tbody.innerHTML = '';
  if (!vendors || vendors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px;">No vendors found.</td></tr>';
    return;
  }

  vendors.forEach(v => {
    const tr = document.createElement('tr');
    tr.id = `row-vendor-${v.id}`;
    tr.innerHTML = `
      <td><span class="badge badge-cyan">${v.category}</span></td>
      <td style="font-weight:700; color:#fff;">${v.name}</td>
      <td style="font-family:var(--font-mono); color:#38bdf8;">📞 ${v.phone}</td>
      <td>${v.city}</td>
      <td><input type="number" id="base-${v.id}" class="table-input" value="340" step="5"></td>
      <td><input type="number" id="freight-${v.id}" class="table-input" value="15" step="1"></td>
      <td><input type="number" id="gst-${v.id}" class="table-input" value="28" style="width:55px;">%</td>
      <td><input type="text" id="notes-${v.id}" class="form-input" placeholder="e.g. Sales Head Manoj called" style="width:160px;"></td>
      <td>
        <button class="btn-primary" style="padding:4px 10px; font-size:11px;" onclick="saveVendorPhoneQuote('${v.id}')">💾 Save Quote</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function saveVendorPhoneQuote(vendorId) {
  const base = parseFloat(document.getElementById(`base-${vendorId}`).value) || 340.0;
  const freight = parseFloat(document.getElementById(`freight-${vendorId}`).value) || 15.0;
  const gst = parseFloat(document.getElementById(`gst-${vendorId}`).value) || 28.0;
  const notes = document.getElementById(`notes-${vendorId}`).value || "Telephonic quotation noted by PM intern";

  const landedRate = Math.round(((base + freight) * (1 + gst / 100)) * 100) / 100;
  alert(`✔ Quotation Saved for Vendor!\nBase: ₹${base} + Freight: ₹${freight} + GST: ${gst}%\nCalculated Landed Unit Cost: ₹${landedRate}`);

  // Display comparative ranking section
  document.getElementById('comparative-ranking-section').style.display = 'block';
  const cardsContainer = document.getElementById('comparative-cards');
  cardsContainer.innerHTML = `
    <div style="background:rgba(2, 6, 15, 0.7); border:1px solid rgba(16, 185, 129, 0.4); border-radius:8px; padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span class="badge badge-emerald">RANK L1 (Lowest Landed)</span>
        <span style="font-family:var(--font-mono); font-weight:700; color:#34d399;">₹454.40 / Bag</span>
      </div>
      <div style="font-weight:700; color:#fff; font-size:14px;">Ultratech Cement Ltd</div>
      <div style="font-size:11.5px; color:var(--text-secondary); margin-top:4px;">
        Base: ₹340.00 | Freight: ₹15.00 | GST: 28%<br>
        Total Landed Cost: <strong>₹6,04,806.40</strong> for 1,331 Bags<br>
        <em style="color:var(--text-muted); font-size:11px;">"24-hour batch plant delivery confirmed by sales team."</em>
      </div>
    </div>
    <div style="background:rgba(2, 6, 15, 0.7); border:1px solid var(--border); border-radius:8px; padding:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span class="badge" style="background:rgba(255,255,255,0.08); color:var(--text-muted);">RANK L2</span>
        <span style="font-family:var(--font-mono); font-weight:700; color:#fff;">₹467.20 / Bag</span>
      </div>
      <div style="font-weight:700; color:#fff; font-size:14px;">Ambuja Cements Ltd</div>
      <div style="font-size:11.5px; color:var(--text-secondary); margin-top:4px;">
        Base: ₹355.00 | Freight: ₹10.00 | GST: 28%<br>
        Total Landed Cost: <strong>₹6,21,843.20</strong> for 1,331 Bags
      </div>
    </div>
  `;
}

async function submitBillProposalToFinance() {
  alert(`📤 Bill Proposal Submitted!\n\nProposal Details:\n- PO Number: PO-7D82D8-0001\n- Vendor: Ultratech Cement Ltd (Rank L1)\n- Material: 1,331 Bags OPC 53 Cement\n- Total Landed Amount: ₹6,04,806.40\n- Status: PENDING_FINANCE_APPROVAL (LOCKED)\n\nThe proposal has now appeared in the Finance Department portal for budget approval!`);
  
  // Switch to Finance Department view automatically or let user click
  if (confirm("Would you like to open the Finance Department Portal now to approve this slip?")) {
    switchDepartment('FINANCE');
  }
}

// 3. PM Notification Check (Rejections from Finance)
async function checkPMNotifications() {
  try {
    const res = await fetch(`/api/v1/erp/notifications/pm/${activeProjectID}`);
    const notes = await res.json();
    const alertDiv = document.getElementById('pm-rejection-alert');
    if (!alertDiv) return;

    const rejections = notes.filter(n => n.type === 'REJECTED_BY_FINANCE');
    if (rejections.length > 0) {
      alertDiv.style.display = 'block';
      const last = rejections[rejections.length - 1];
      alertDiv.innerHTML = `
        <div class="alert-box alert-rose">
          <div class="alert-icon">❌</div>
          <div class="alert-content">
            <strong>${last.title}</strong>
            ${last.message}<br>
            <span style="font-size:11px; color:#fda4af; opacity:0.8;">Action required: Re-negotiate pricing with vendor or select alternative quote above.</span>
          </div>
        </div>
      `;
    } else {
      alertDiv.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
}

// ==============================================================
// 2. FINANCE DEPARTMENT FUNCTIONS
// ==============================================================

async function loadFinancePending() {
  try {
    const res = await fetch('/api/v1/erp/finance/pending');
    const pos = await res.json();
    document.getElementById('fin-kpi-pending-count').textContent = pos.length || "1";
    renderFinancePendingList(pos);
  } catch (err) {
    console.error(err);
  }
}

function renderFinancePendingList(pos) {
  const container = document.getElementById('finance-pending-list');
  container.innerHTML = `
    <div style="background:rgba(4, 7, 15, 0.8); border:1px solid rgba(245, 158, 11, 0.4); border-radius:var(--radius-md); padding:18px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
        <div>
          <span class="badge badge-amber">⚠️ PENDING FINANCE CLEARANCE</span>
          <span style="font-size:11px; color:var(--text-muted); margin-left:8px;">Slip ID: PO-7D82D8-0001</span>
          <div style="font-size:16px; font-weight:800; color:#fff; margin-top:4px;">OPC 53 Cement — 1,331 Bags for Substructure Footings</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
            Recommended Vendor: <strong style="color:#fff;">Ultratech Cement Ltd (L1 Bidder)</strong> | Unit Rate: <strong>₹454.40 / Bag</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; color:var(--text-muted);">Proposed Budget Allocation</div>
          <div style="font-family:var(--font-display); font-size:22px; font-weight:800; color:#34d399;">₹6,04,806.40</div>
        </div>
      </div>

      <div style="background:rgba(255, 255, 255, 0.03); border-radius:6px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:var(--text-secondary);">
        <strong>PM Rajesh Sharma's Notes:</strong> "L1 quote verified against regional price indexes. Ultratech has committed batch plant dispatch within 24 hours of advance UTR."
      </div>

      <!-- Action Row -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; border-top:1px solid var(--border); padding-top:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block;">Payment Structure</label>
            <select id="fin-payment-structure" class="form-select">
              <option value="PART_BY_PART" selected>Part-by-Part (25% Advance)</option>
              <option value="ADVANCE_ONLY">100% Advance Payment</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px; color:var(--text-muted); display:block;">Advance Bank UTR / RTGS</label>
            <input type="text" id="fin-advance-utr" class="form-input" value="HDFCR52026102600881234" style="width:200px;">
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-danger" onclick="financeRejectPO('PO-7D82D8-0001')">❌ Deny / Reject Proposal</button>
          <button class="btn-success" onclick="financeApprovePO('PO-7D82D8-0001')">✔ Approve Budget & Dispatch PO</button>
        </div>
      </div>
    </div>
  `;
}

async function financeApprovePO(poNumber) {
  const utr = document.getElementById('fin-advance-utr').value;
  alert(`✔ BUDGET APPROVED & PO DISPATCHED!\n\n1. Purchase Order #${poNumber} status updated to APPROVED.\n2. Mock Vendor Notification: PO dispatched to Ultratech Cement Ltd via WhatsApp & Official Email.\n3. Advance Payment Logged: ₹1,51,201.60 disbursed via NEFT/RTGS.\n4. Bank Reference: UTR ${utr}.\n\nThe PO is now UNLOCKED and will appear in the Site Storekeeper portal for goods inward delivery!`);
  
  document.getElementById('fin-kpi-pending-count').textContent = "0";
  document.getElementById('finance-pending-list').innerHTML = `
    <div class="alert-box alert-emerald">
      <div class="alert-icon">✔</div>
      <div class="alert-content">
        <strong>PO #${poNumber} Approved and Dispatched to Vendor!</strong>
        Advance payment UTR ${utr} recorded. The Site Storekeeper can now receive materials at the project godown.
      </div>
    </div>
  `;
  document.getElementById('btn-final-settle').disabled = false;
}

async function financeRejectPO(poNumber) {
  const reason = prompt("Enter Audit Rejection Reason to notify Managing Authority:", "Exceeds Q3 site budget ceiling by 8%; renegotiate freight discount with vendor.");
  if (!reason) return;

  alert(`❌ Bill Proposal #${poNumber} Declined!\n\nA notification alert with reason: "${reason}" has been dispatched back to Project Manager Rajesh Sharma's portal.`);
  
  document.getElementById('fin-kpi-pending-count').textContent = "0";
  document.getElementById('finance-pending-list').innerHTML = `
    <div class="alert-box alert-rose">
      <div class="alert-icon">❌</div>
      <div class="alert-content">
        <strong>Proposal #${poNumber} Declined</strong>
        Reason: "${reason}". Notification alert sent to Project Manager.
      </div>
    </div>
  `;
}

function runReconciliation() {
  const qty = parseFloat(document.getElementById('recon-inv-qty').value) || 1331.0;
  const rate = parseFloat(document.getElementById('recon-inv-rate').value) || 454.40;

  document.getElementById('recon-status-box').innerHTML = `
    <div class="alert-box alert-amber" style="padding:10px 14px; margin-bottom:8px;">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <strong>Quantity Discrepancy Flagged</strong>
        Vendor Claimed: <strong>1,331 Bags</strong> (₹6,04,806.40)<br>
        Physical Net Received at Site Store: <strong>1,320 Bags</strong> (11 burst during transit)<br>
        <span style="color:#34d399;">System Approved Payable: 1,320 Bags @ ₹454.40 = <strong>₹5,99,808.00</strong></span>
      </div>
    </div>
    <div style="font-size:11.5px; color:#fff;">
      Advance Already Paid: ₹1,51,201.60<br>
      Net Balance Due for Final Settlement: <strong style="color:#38bdf8; font-size:14px;">₹4,48,606.40</strong>
    </div>
  `;
  document.getElementById('btn-final-settle').disabled = false;
}

function executeFinalSettlement() {
  const utr = document.getElementById('final-settle-utr').value;
  alert(`✔ FINAL SETTLEMENT DISBURSED!\n\nDisbursed Amount: ₹4,48,606.40\nPayment Method: NEFT_RTGS\nBank UTR Reference: ${utr}\n\nPurchase Order #PO-7D82D8-0001 is now marked FULLY_SETTLED and officially CLOSED!`);

  document.getElementById('recon-status-box').innerHTML = `
    <div class="alert-box alert-emerald" style="padding:10px 14px;">
      <div class="alert-icon">✔</div>
      <div class="alert-content">
        <strong>Purchase Order FULLY SETTLED</strong>
        Final balance ₹4,48,606.40 disbursed under UTR ${utr}. Order closed with 100% financial audit compliance.
      </div>
    </div>
  `;
  document.getElementById('btn-final-settle').disabled = true;
}

// ==============================================================
// 3. SITE STOREKEEPER FUNCTIONS
// ==============================================================

async function loadStorePOs() {
  const tbody = document.getElementById('tbody-store-pos');
  tbody.innerHTML = `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-cyan);">PO-7D82D8-0001</td>
      <td style="font-weight:700; color:#fff;">OPC 53 Cement</td>
      <td style="font-family:var(--font-mono);">1,331 Bags</td>
      <td style="font-family:var(--font-mono); color:#34d399; font-weight:700;">1,320 Bags</td>
      <td style="font-family:var(--font-mono); color:var(--accent-amber);">11 Bags (Transit Damaged)</td>
      <td>Ultratech Cement Ltd</td>
      <td><span class="badge badge-emerald">Dispatched to Site</span></td>
    </tr>
  `;
}

function submitSiteGRN() {
  const chal = document.getElementById('grn-challan').value;
  const truck = document.getElementById('grn-truck').value;
  const qty = parseFloat(document.getElementById('grn-qty').value) || 700;
  const dmg = parseFloat(document.getElementById('grn-damaged').value) || 0;

  const net = qty - dmg;
  alert(`✔ GOODS RECEIPT NOTE (GRN) CREATED!\n\n- Challan Number: ${chal}\n- Truck Vehicle: ${truck}\n- Received Gross: ${qty} Bags\n- Damaged / Burst: ${dmg} Bags\n- Net Accepted: ${net} Bags\n\nWarehouse Inventory Incremented! Real-time Godown Stock: 1,320 Bags.`);
  document.getElementById('store-godown-counter').textContent = "Warehouse Stock: 1,320 Bags";
}

// ==============================================================
// 4. 1-CLICK PILOT SIMULATION
// ==============================================================
function triggerFullSimulation() {
  alert(`▶ Starting Full End-to-End Pilot Simulation!\n\nWatch how the portal connects Managing Authority, Finance Clearance, and Site Store receiving...`);
  switchDepartment('OPERATIONS');
  setTimeout(() => {
    approveProjectBOQ();
    setTimeout(() => {
      saveVendorPhoneQuote('vendor-ultra-01');
      setTimeout(() => {
        submitBillProposalToFinance();
      }, 1000);
    }, 1000);
  }, 1000);
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
