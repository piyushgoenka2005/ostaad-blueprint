# Ostaad Blueprint-to-BOQ Engine

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-teal.svg)](https://fastapi.tiangolo.com)
[![Pydantic v2](https://img.shields.io/badge/Pydantic-v2.6%2B-e92063.svg)](https://docs.pydantic.dev)
[![Gemini](https://img.shields.io/badge/Gemini_Multimodal-2.5%2F3.8_Flash-4285F4.svg)](https://ai.google.dev)
[![Cloudflare](https://img.shields.io/badge/Edge-blueprint.ostaad.shop-orange.svg)](https://blueprint.ostaad.shop)

A clean-room, production-grade **Blueprint-to-Bill-of-Quantities (BOQ)** takeoff engine designed for architectural drawings, civil/site surveys, structural plans, and P&ID diagrams (PDF vector drawings, PNG, and JPG).

The engine transforms complex 2D construction drawings into fully reconciled, costed, auditable, and standardized Bills of Quantities using a **Hybrid AI Architecture**: Google Gemini multimodal perception for semantic extraction combined with deterministic coordinate geometry and multi-source evidence fusion.

---

## Table of Contents
1. [Core Architectural Principle](#1-core-architectural-principle)
2. [End-to-End Hybrid Architecture](#2-end-to-end-hybrid-architecture)
3. [The 16-Stage Takeoff Pipeline](#3-the-16-stage-takeoff-pipeline)
4. [Scale Validation Layer & Outlier Rejection](#4-scale-validation-layer--outlier-rejection)
5. [Evidence Fusion & Anti-Hallucination System](#5-evidence-fusion--anti-hallucination-system)
6. [Repository & Codebase Structure](#6-repository--codebase-structure)
7. [Installation & Setup](#7-installation--setup)
8. [Running the Application](#8-running-the-application)
   - [Interactive Web Console](#interactive-web-console)
   - [Command-Line Interface (CLI)](#command-line-interface-cli)
   - [Running the Test Suites](#running-the-test-suites)
9. [REST API Documentation](#9-rest-api-documentation)
10. [Multi-Format Commercial Export](#10-multi-format-commercial-export)
11. [Deployment & Decoupled Architecture](#11-deployment--decoupled-architecture)

---

## 1. Core Architectural Principle

> **Vision-Language Models (Gemini) provide SEMANTIC PERCEPTION AND CANDIDATE EVIDENCE, NEVER AUTHORITATIVE MEASUREMENTS.**

In construction estimating, a 10% discrepancy in concrete volume, rebar tonnage, or boundary wall length causes contractors to lose bids or face catastrophic financial overruns on site. Physical quantities (lengths, perimeters, closed polygon areas, opening deductions) are computed strictly by deterministic coordinate geometry and verified mathematical algorithms (Green's Theorem, Shoelace Formula, Euclidean vector math).

### Division of Responsibilities

| Responsibility | Handled By | Method / Technology |
|---|---|---|
| **Drawing Classification** | Stage 2 Classifier | Vector token & textual taxonomy gate |
| **Document Ingestion & CAD Paths** | PyMuPDF / OpenCV | Vector path harvesting, adaptive DPI rendering |
| **Text Harvesting & Spatial Tokens** | EasyOCR + Native TrueType | Dual-stream OCR with normalized bounding boxes |
| **Scale Ratio & Outlier Rejection** | Scale Validation Engine | Multi-source corroboration, rejection of noisy OCR |
| **Semantic Interpretation** | Gemini 2.5/3.8 Flash | Title block parsing, schedules, candidate detection |
| **Geometric Quantities** | Geometry Engine | Vector skeletonization, Shoelace closed-contour areas |
| **Evidence Corroboration** | Evidence Fusion Graph | Bipartite spatial matching (VERIFIED / SUPPORTED / REVIEW) |
| **Safety Invariants** | Anti-Hallucination Gates | Type enforcement, unit conversions, scale quarantine |
| **Cost Estimation** | Regional Pricing Engine | CSI MasterFormat 2020 + CPWD DSR 2023 + RSMeans |
| **Commercial Output** | Export Engine | 5-tab Excel workbook, RFC 4180 CSV, JSON, PDF |

---

## 2. End-to-End Hybrid Architecture

```text
                               UPLOAD BLUEPRINT
                      (PDF / CAD Vector / Raster Image)
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
      NATIVE PDF/CAD EXTRACTION                 RASTER RENDERING & OCR
      - PyMuPDF Vector Paths (lines, arcs)      - Adaptive Resolution (2800-3300px)
      - Native Text Blocks (TrueType)           - EasyOCR / PaddleOCR Text Harvest
      - Layer & Color Attribution               - Spatial Token Bounding Boxes
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     ▼
                        CANONICAL COORDINATE SYSTEM
               Normalized Space: x, y ∈ [0.0, 1.0], origin (0, 0) top-left
                                     │
                                     ▼
                         DRAWING CLASSIFIER GATE
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
ARCHITECTURAL FLOOR PLAN     SITE/TOPOGRAPHICAL SURVEY         STRUCTURAL / OTHER
(Room Envelopes, Doors,      (Property Boundaries, Plinths,    (Beams, Columns, Slabs,
Windows, Partitions)         Clearing, Retaining Walls)        Earthwork, Electrical)
     │                               │                               │
     └───────────────────────────────┼───────────────────────────────┘
                                     │
                                     ▼
                         SCALE VALIDATION LAYER
      - Title Block Scale String Parsing (1:100, 1:250, 1/4"=1'-0")
      - Suspicious OCR Filtering (fixes "1.250" -> "1:250")
      - Multi-source Candidate Cross-Checking (Vector vs Dim vs OCR)
      - Engineering Outlier Rejection (>2x variance discarded)
                                     │
                                     ▼
                 GEMINI MULTIMODAL SEMANTIC PERCEPTION
                 (gemini-2.5-flash / Escalation: gemini-2.5-pro)
      - Title Block Extraction (Project Name, Revision, Stated Area)
      - Schedule Parsing (Door/Window Schedule, Area Summary Statement)
      - Legend Interpretation (Symbol Tags: BW, GW, CR, TBM, BM)
      - Candidate Object Detection (Bounding Boxes normalized to [0, 1000])
      - Room Label to Space Association
                                     │
                                     ▼
                          EVIDENCE FUSION GRAPH
       Multi-Modal Corroboration Graph (OCR + Vectors + Gemini + Dimensions)
        Statuses: VERIFIED | SUPPORTED | NEEDS_REVIEW | REJECTED
                                     │
                                     ▼
                      DETERMINISTIC GEOMETRY ENGINE
      - Scaled Wall Polyline Tracing (Meters / Linear Feet)
      - Closed Contour Room & Boundary Polygon Measurement (Green's Shoelace)
      - Exact Deduction of Openings (Sub-pixel vector subtractions)
      - Calibrated Scale Application (px/meter or px/foot from Authoritative String)
                                     │
                                     ▼
                         ANTI-HALLUCINATION GATES
      - Gate 1: No Independent Evidence = No Quantity (REJECTED)
      - Gate 2: Unresolved Scale = Normalized Units Only (No Silent Guessing)
      - Gate 3: Site Survey Invariant = 0 Residential Rooms (Strict Prohibition)
      - Gate 4: Imperial/Metric Unit Reconciler (117,411 SF ↔ 10,907 SQM)
                                     │
                                     ▼
                             BOQ PRICING ENGINE
      - Standardized WBS: CSI MasterFormat 2020 + CPWD DSR 2023 + RICS NRM2
      - Quantities Split: MEASURED_QUANTITY vs. DERIVED_QUANTITY
      - Currency Selection: INR (₹) for Metric drawings; USD ($) for Imperial
      - Markups: Direct Cost + Overhead (10%) + Profit (10%) + Contingency (5%)
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
      INTERACTIVE BLUEPRINT VIEWER              MULTI-FORMAT EXPORT
   - Two-Way Interactive Highlighting         - Multi-Tab Excel Workbook (.xlsx)
   - Click BOQ item -> Highlight Geometry     - RFC 4180 Tabular Dump (.csv)
   - Click Blueprint Polygon -> Show Audit    - Lossless Schema Dump (.json)
   - Review & Correction Panel                - Executive Summary Package (.pdf)
```

---

## 3. The 16-Stage Takeoff Pipeline

The engine executes 16 structured, pipelined stages to process any blueprint:

1. **Stage 1: Multi-Format Ingestion & Adaptive DPI Rendering** (`ostaad_boq/ingest.py`)
   - Normalizes PDF, DWG raster exports, PNG, and JPEG.
   - Computes dynamic render DPI based on physical bounding box dimensions to ensure the major axis reaches 2,800 to 3,300 pixels for optimal OCR without distorting fine lines.
2. **Stage 2: Drawing Type Classifier Gate** (`ostaad_boq/classifier.py`)
   - Categorizes blueprints into `ARCHITECTURAL_PLAN`, `SITE_TOPOGRAPHICAL_SURVEY`, `STRUCTURAL_PLAN`, `MEP_DRAWING`, or `PID_DIAGRAM`.
   - Prevents domain cross-contamination (e.g., stops interior residential room extraction on external land surveys).
3. **Stage 3: High-Res OCR & Text Harvesting** (`ostaad_boq/ocr.py`)
   - Dual-engine extraction: PyMuPDF native vector text harvesting plus EasyOCR spatial raster recognition with confidence scoring and bounding box tracking.
4. **Stage 4: Scale Validation & Coordinate Calibration** (`ostaad_boq/scale.py`)
   - Multi-candidate scale detection with automated noise filtering, ratio parsing, and outlier rejection.
5. **Stage 5: Gemini Multimodal Semantic Perception** (`ostaad_boq/gemini_service.py`, `ostaad_boq/vlm_engine.py`)
   - Calls Google Gemini using structured Pydantic schemas (`response_schema`) to extract title blocks, schedules, legends, and candidate visual boxes. Graceful offline fallback when no API key is provided.
6. **Stage 6: Coordinate Normalization Engine** (`ostaad_boq/coordinate_transform.py`)
   - Maps heterogeneous coordinate formats (native points, pixels, Gemini `[0, 1000]` format) into a unified canonical space: $x, y \in [0.0, 1.0]$ with top-left origin.
7. **Stage 7: Evidence Corroboration Fusion Graph** (`ostaad_boq/evidence_graph.py`)
   - Bipartite matching across vector paths, OCR tokens, and Gemini semantic candidates. Assigns statuses: `VERIFIED`, `SUPPORTED`, `NEEDS_REVIEW`, `REJECTED`.
8. **Stage 8: Schedules & Legends Associative Parser** (`ostaad_boq/schedules.py`)
   - Extracts door/window schedules, finish schedules, and symbol legends; matches drawing callouts (e.g., `D1`, `W2`, `BW`) with schedule dimensions and descriptions.
9. **Stage 9: Deterministic Geometry & Takeoff Engine** (`ostaad_boq/geometry.py`)
   - Wall centerline tracing via morphological skeletonization; closed-contour polygon area calculation via Green's Shoelace Formula; opening deduction subtractions.
10. **Stage 10: Anti-Hallucination & Invariant Enforcement** (`ostaad_boq/anti_hallucination.py`)
    - Hard gate invariants: 0 residential rooms on site surveys; scale quarantine if ambiguous; metric/imperial cross-validation.
11. **Stage 11: Derived Materials & Construction Logic Engine** (`ostaad_boq/derived_materials.py`)
    - Computes secondary quantities: mortar volume (1:6 / 1:4 mix), brick counts, plaster area (internal 12mm / external 18mm), drywall boards, and paint coverage.
12. **Stage 12: Cost Estimation & Regional WBS** (`ostaad_boq/pricing_engine.py`, `ostaad_boq/classification_engine.py`)
    - Assigns CSI MasterFormat 2020 division codes and CPWD DSR / RSMeans unit rates; applies itemized contractor markups (overhead, profit, contingency).
13. **Stage 13: Room & Boundary Reconciliation** (`ostaad_boq/reconciliation.py`)
    - Audits closed spaces against stated premises area; flags boundary gaps or overlapping envelopes.
14. **Stage 14: Audit Trail & Provenance Tracking** (`ostaad_boq/audit_trail.py`)
    - Generates SHA-256 drawing hashes and step-by-step mathematical calculation logs for full regulatory auditability.
15. **Stage 15: Visual Traceability & Interactive Highlighting** (`ostaad_boq/app.py`)
    - Two-way interactive canvas highlighting: click a BOQ line item to highlight its geometry on the drawing; click a polygon to view its evidence sources.
16. **Stage 16: Multi-Format Commercial Exporter** (`ostaad_boq/export_engine.py`, `ostaad_boq/exporter.py`)
    - Generates 5-sheet commercial Excel workbooks, RFC 4180 CSVs, lossless JSON, and printable PDFs.

---

## 4. Scale Validation Layer & Outlier Rejection

One of the most critical challenges in automated takeoff is corrupted or noisy scale data. On dense engineering drawings:
* OCR engines frequently misread colons as periods (e.g., `SCALE 1:250` read as `1.250`).
* CAD grid coordinates (e.g., `131.89 mE`) can be mistakenly parsed as scale factors.

The **Scale Validation Layer** (`ostaad_boq/scale.py`) prevents inaccurate calculations through multi-source corroboration:

### How It Works:
1. **Candidate Gathering**:
   - Title block regex matching (`1:100`, `1:250`, `1/4"=1'-0"`, `1:500`).
   - Dimension callout corroboration (pixel distance between witness lines vs. stated distance).
   - Gemini perception metadata extraction.
2. **Suspicious Dot-Delimiter Resolution**:
   - Detects patterns like `SCALE 1.250` or `1.100` and normalizes them to their engineering ratios (`1:250`, `1:100`).
3. **Engineering Outlier Rejection**:
   - Calculates the implied scale in pixels-per-meter for every candidate.
   - Compares candidates against the consensus distribution.
   - If a candidate deviates by $> 2.0\times$ from the verified title block scale, it is **discarded**.
   - If candidates disagree irreconcilably, the drawing scale is quarantined as `NEEDS_REVIEW` and quantities are reported in normalized units only.

#### Real-World Example (Barakar Topographical Survey):
* Noisy grid coordinate OCR suggested `131.89 px/m`.
* Title block scale verified at `1:250` gives `23.62 px/m`.
* Discrepancy: $5.58\times$ variance $\to$ `131.89 px/m` **rejected**.
* Result: Boundary perimeter accurately computed at **`251.95 M`** rather than a corrupted fraction.

---

## 5. Evidence Fusion & Anti-Hallucination System

Every quantified line item in the BOQ carries a strict **Validation Status**:

* **`VERIFIED`**: Confirmed by $\ge 2$ independent concurring streams (e.g., Gemini schedule extraction + vector polyline contour + dimension callout).
* **`SUPPORTED`**: Confirmed by a single high-confidence evidence stream with geometric plausibility (e.g., closed contour polygon).
* **`NEEDS_REVIEW`**: Discrepancy between sources (e.g., schedule states 8 doors, but drawing geometry contains 7), or confidence $< 0.85$.
* **`REJECTED`**: Uncorroborated AI hallucination with zero geometric backing (quarantined and excluded from final takeoff).

### Measured vs. Derived Quantities

To maintain contractor trust, the engine strictly separates:
* **`MEASURED_QUANTITY`**: Primary physical measurements directly extracted from vector geometry or scaled pixels (e.g., wall lengths, floor areas, door counts).
* **`DERIVED_QUANTITY`**: Secondary materials estimated via construction formulas (e.g., dry mortar volume, number of standard bricks, paint coverage in liters). Each derived item documents its exact engineering formula in the export audit trail.

---

## 6. Repository & Codebase Structure

```text
BlueprintBOQ/
├── assets/                               # Sample blueprints, benchmark drawings & showcase media
│   ├── barakar 01.11.2025-Model WITHOUT GRID.pdf
│   ├── barakar_grid_sample.png
│   ├── barakar_verified_output.xlsx
│   ├── indian_bengal_floorplan.png
│   └── showcase/                         # Architecture & UI screenshots
├── ostaad_boq/                           # Core Python Package
│   ├── __init__.py                       # Package exports and version
│   ├── anti_hallucination.py             # Domain invariants & hallucination gates
│   ├── app.py                            # FastAPI web server & interactive dashboard
│   ├── audit_trail.py                    # SHA-256 provenance & calculation audit log
│   ├── classification_engine.py          # CSI MasterFormat 2020 / CPWD classification
│   ├── classifier.py                     # Drawing Type Classifier (Stage 2)
│   ├── cli.py                            # Command Line Interface runner
│   ├── coordinate_transform.py           # Canonical coordinate normalization ([0, 1])
│   ├── derived_materials.py              # Secondary material calculators (mortar, bricks, paint)
│   ├── engine.py                         # Master Takeoff Pipeline Orchestrator
│   ├── evidence_graph.py                 # Multi-Modal Evidence Corroboration Graph
│   ├── export_engine.py                  # Comprehensive 5-sheet commercial exporter (XLSX, CSV, JSON, PDF)
│   ├── exporter.py                       # Lightweight single-sheet tabular exporter
│   ├── gemini_service.py                 # Google GenAI SDK adapter with cost tracking & offline fallback
│   ├── geometry.py                       # Deterministic Geometry Engine (Shoelace, skeletonization)
│   ├── ingest.py                         # Multi-format ingestion & adaptive DPI rendering
│   ├── models.py                         # Pydantic v2 data contracts, schemas & enums
│   ├── ocr.py                            # Dual-stream OCR (Native vector text + EasyOCR raster)
│   ├── pricing_engine.py                 # Regional pricing databases (INR / USD) & markups
│   ├── reconciliation.py                 # Closed-space & boundary area reconciler
│   ├── scale.py                          # Scale validation layer & outlier rejection
│   ├── schedules.py                      # Schedules & legends associative parser
│   └── vlm_engine.py                     # Multimodal perception prompts & bounding box parser
├── tests/                                # Automated Test Suites (106 unit & integration tests)
│   ├── fixtures/                         # Baseline metrics and gold-standard benchmarks
│   ├── unit/                             # Isolated unit tests for core modules
│   │   ├── test_anti_hallucination_gates.py
│   │   ├── test_coordinate_transforms.py
│   │   ├── test_evidence_schema.py
│   │   ├── test_gemini_service.py
│   │   ├── test_scale_validation_layer.py
│   │   └── test_vlm_engine_refactor.py
│   ├── test_drawing_classifier.py
│   ├── test_ostaad_boq.py
│   ├── test_stage10_derived_materials.py
│   ├── test_stage11_audit_trail_provenance.py
│   ├── test_stage12_cost_estimation.py
│   ├── test_stage13_export_engine.py
│   ├── test_stage14_api_contracts.py
│   ├── test_stage15_frontend_dashboard.py
│   └── test_stage16_master_audit.py
├── .env.example                          # Environment configuration template
├── docker-compose.yml                    # Containerized multi-service deployment
├── Dockerfile                            # Production Linux container image
├── pyproject.toml                        # Build configuration & dependency specifications
├── requirements.txt                      # Locked Python package requirements
├── worker.js                             # Cloudflare Workers reverse proxy script
├── wrangler.jsonc                        # Cloudflare Wrangler configuration
├── wrangler.toml                         # Subdomain routing definition
└── README.md                             # Unified system documentation (this file)
```

---

## 7. Installation & Setup

### Prerequisites
* **Operating System**: Windows 10/11, macOS, or Linux (Ubuntu 22.04+ recommended)
* **Python**: `Python 3.11` or higher
* **Package Manager**: [`uv`](https://github.com/astral-sh/uv) (recommended) or standard `pip`
* **System Libraries**:
  - Linux: `apt-get install -y libgl1 libglib2.0-0` (for OpenCV)

### Step 1: Clone Repository
```bash
git clone https://github.com/piyushgoenka2005/ostaad-blueprint.git
cd ostaad-blueprint
```

### Step 2: Create Virtual Environment & Install Dependencies
Using `uv`:
```bash
uv venv .venv
# Windows PowerShell:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

uv pip install -r requirements.txt
```

Or using standard `pip`:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to configure your settings:
```ini
# Google Gemini API Key (Optional: Engine falls back gracefully to offline mode if empty)
GEMINI_API_KEY="your-gemini-api-key-here"

# Model Selection
GEMINI_PRIMARY_MODEL="gemini-2.5-flash"
GEMINI_ESCALATION_MODEL="gemini-2.5-pro"

# System Configuration
OSTAAD_ENV="development"
LOG_LEVEL="INFO"
```

---

## 8. Running the Application

### Interactive Web Console

Launch the FastAPI application with live-reloading:
```bash
uvicorn ostaad_boq.app:app --host 127.0.0.1 --port 8000 --reload
```
Open **`http://127.0.0.1:8000`** in your browser.

#### Web Interface Features:
* **Drag-and-Drop Blueprint Upload**: Supports multi-page PDFs, high-resolution scans, and CAD drawings.
* **Instant Demo Blueprints**: Click "Bengal 2BHK Plan" or "Site Survey" to run instant test extractions.
* **Two-Way Visual Traceability**: Hover over or click any BOQ line item to illuminate its corresponding vector polygon on the drawing canvas.
* **Review & Verification Panel**: Filter items by `VERIFIED`, `SUPPORTED`, or `NEEDS_REVIEW`.
* **One-Click Commercial Exports**: Download complete 5-tab Excel workbooks, RFC 4180 CSV files, or raw JSON.

---

### Command-Line Interface (CLI)

Run automated batch takeoffs directly from your terminal:

```bash
# Basic takeoff with auto-scale detection
python -m ostaad_boq.cli --input "barakar 01.11.2025.pdf" --output-dir "./output"

# Takeoff with explicit scale override and CSV output
python -m ostaad_boq.cli --input "barakar 01.11.2025.pdf" --scale "1:250" --format csv

# Full commercial takeoff with comprehensive 5-tab Excel export
python -m ostaad_boq.cli --input "assets/barakar 01.11.2025-Model WITHOUT GRID.pdf" --format xlsx
```

#### CLI Options:
* `--input, -i`: Path to the blueprint file (PDF, PNG, JPG). *(Required)*
* `--output-dir, -o`: Directory to write generated takeoffs. *(Default: `./output`)*
* `--scale, -s`: Manual scale string override (e.g., `1:100`, `1:250`, `1/4"=1'-0"`).
* `--format, -f`: Output format (`xlsx`, `csv`, `json`, `all`). *(Default: `xlsx`)*
* `--page, -p`: Page index for multi-page PDFs (0-indexed). *(Default: `0`)*

---

### Running the Test Suites

The repository includes a comprehensive 106-test test suite covering all 16 pipeline stages:

```bash
# Run all tests
pytest -q

# Run fast unit tests only
pytest tests/unit/ -v

# Run the Master Stage 16 Integration Audit
pytest tests/test_stage16_master_audit.py -v

# Run with test coverage report
pytest --cov=ostaad_boq tests/
```

---

## 9. REST API Documentation

### 1. `POST /api/analyze`
Uploads and executes the full 16-stage takeoff pipeline on a blueprint.

* **Content-Type**: `multipart/form-data`
* **Form Fields**:
  - `file`: Blueprint document (`.pdf`, `.png`, `.jpg`, `.jpeg`).
  - `page`: Page index (default: `0`).
  - `scale_override`: (Optional) Manual scale override string (e.g., `1:250`).
  - `drawing_type_override`: (Optional) Force drawing classification.

#### Response Schema (`200 OK`):
```json
{
  "job_id": "job_a1b2c3d4",
  "project_name": "Commercial Complex Phase 1",
  "sheet_name": "Ground Floor Plan",
  "drawing_type": "SITE_TOPOGRAPHICAL_SURVEY",
  "scale": {
    "raw_scale_text": "1:250",
    "pixels_per_unit": 23.622,
    "unit": "m",
    "scale_known": true,
    "validation_status": "VERIFIED"
  },
  "summary": {
    "total_cost": 482500.0,
    "currency": "INR",
    "verified_items_count": 14,
    "review_items_count": 2,
    "total_measured_area": 10907.8
  },
  "lines": [
    {
      "id": "item_01",
      "wbs_code": "32 31 00",
      "wbs_title": "Fences and Gates",
      "csi_division": "Division 32 - Exterior Improvements",
      "item_description": "Boundary Wall / Perimeter Fencing",
      "category": "Perimeter",
      "quantity": 251.95,
      "unit": "M",
      "unit_cost": 1500.0,
      "total_cost": 377925.0,
      "validation_status": "SUPPORTED",
      "quantity_type": "MEASURED_QUANTITY",
      "confidence": 0.88,
      "needs_review": false,
      "corroborating_evidence_ids": ["cad_boundary_contour", "title_block_scale"]
    }
  ],
  "telemetry": {
    "execution_time_ms": 1420.5,
    "gemini_tokens": 1240,
    "gemini_cost_usd": 0.00015
  }
}
```

---

### 2. `GET /api/export/{job_id}/{format}`
Downloads the processed takeoff in the requested commercial format.

* **Parameters**:
  - `job_id`: Unique identifier returned by `/api/analyze`.
  - `format`: One of `xlsx`, `csv`, `json`, or `pdf`.
* **Response**: Binary file attachment with proper MIME type and filename header.

---

### 3. `GET /api/health`
Health check endpoint reporting engine status, GPU/CPU execution mode, and Gemini service availability.

---

## 10. Multi-Format Commercial Export

The `export_engine.py` module generates professional, commercial-ready deliverables:

### 1. Multi-Tab Excel Workbook (`.xlsx`)
Designed with corporate styling (Navy headers `#1E3A8A`, alternating zebra striping, currency formatting):
* **Tab 1: Executive Summary**: Project details, drawing metadata, total estimated cost, contractor markups.
* **Tab 2: Bill of Quantities (BOQ)**: Complete takeoff table with CSI MasterFormat division codes, measured vs. derived flags, confidence percentages, and audit notes.
* **Tab 3: Room Reconciliation**: Enclosed room polygon schedule, measured vs. stated area discrepancies, net perimeter.
* **Tab 4: Openings & Schedules**: Door/window dimension schedule and deducted opening areas.
* **Tab 5: Audit Log & Provenance**: Step-by-step formula trace, SHA-256 integrity hash, and coordinate bounding boxes.

### 2. RFC 4180 Tabular CSV (`.csv`)
Clean tabular dump formatted for direct ingestion into commercial estimating systems (HeavyBid, Procore, PlanSwift, Excel).

### 3. Lossless JSON (`.json`)
Full Pydantic v2 schema dump containing every vector coordinate, OCR token, Gemini response, and evidence edge for integration with downstream microservices.

---

## 11. Deployment & Decoupled Architecture

The engine is engineered for **100% decoupled deployment** under **`blueprint.ostaad.shop`** with zero runtime dependencies on the main `ostaad.shop` web platform.

```text
                    ┌───────────────────────────────┐
                    │     Cloudflare Edge / DNS     │
                    │         (ostaad.shop)         │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     Main Ostaad Platform      │               │     Blueprint BOQ Engine      │
│   (ostaad.shop)               │               │   (blueprint.ostaad.shop)     │
├───────────────────────────────┤               ├───────────────────────────────┤
│ Routes:                       │               │ Route:                        │
│   • ostaad.shop               │               │   • blueprint.ostaad.shop     │
│   • auth.ostaad.shop          │               │                               │
│ Worker: ostaad-v2             │               │ Worker: ostaad-blueprint-boq  │
│ Database: D1 Database         │               │ Database: None (Isolated)     │
└───────────────────────────────┘               └───────────────────────────────┘
```

### Safety & Isolation Guarantees:
1. **Isolated Cloudflare Worker**: Named `ostaad-blueprint-boq`. Operates in its own V8 sandbox.
2. **Dedicated Subdomain Routing**: Bound strictly to `blueprint.ostaad.shop`. Cannot access or intercept traffic for `ostaad.shop` or `auth.ostaad.shop`.
3. **Zero Shared Storage**: Uses no shared sessions, cookies, or databases.
4. **Instant 1-Command Teardown**:
   ```bash
   npx wrangler delete --name ostaad-blueprint-boq
   ```

### Option A: Cloudflare Workers Edge Gateway
Deploy the edge gateway script:
```bash
npx wrangler deploy
```

### Option B: Docker Container Deployment
Build and run using Docker Compose:
```bash
docker compose up -d --build
```
The service will be live at `http://localhost:8000`.

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
