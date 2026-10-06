# OSTAAD BLUEPRINT-TO-BOQ: FILE-LEVEL CHANGE MAP

This document details the exact file-by-file audit, action classification, responsibilities, input/output contracts, dependencies, affected endpoints, and risk assessments for transitioning the Ostaad Blueprint-to-BOQ engine to the Gemini 3.8 Flash Hybrid Architecture.

---

## 1. File Classification Master Matrix

| File / Directory | Current Role | Action | Why | Dependencies | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ostaad_boq/ingest.py` | PyMuPDF PDF ingestion, vector path harvesting, adaptive DPI raster rendering | **KEEP** | Already delivers canonical coordinate normalization (`[0.0, 1.0]`), native vector stroke extraction, and sub-second rendering. | `fitz (PyMuPDF)`, `PIL` | Low |
| `ostaad_boq/ocr.py` | EasyOCR raster engine with spatial token deduplication against native PDF text | **KEEP** | Robust coordinate extraction, word grouping, canvas downsampling, and spatial deduplication already implemented. | `easyocr`, `numpy`, `PIL` | Low |
| `ostaad_boq/scale.py` | Scale string detection, unit inference (`SQ.FT.`, `SQ.M.`, `METRE`), coordinate transformation | **KEEP** | Authoritative and handles Barakar ratio `1:250` and dual unit statements (`10,907 SQ.M. = 117,411 SQ.FT.`) correctly. | `re`, `math` | Low |
| `ostaad_boq/classifier.py` | Pre-extraction drawing type classification (10 categories) using token frequency & regex | **MODIFY** | Needs to accept Gemini Title Block & Sheet semantic perception as secondary evidence fusion for low-OCR/scanned drawings. | `ostaad_boq.models` | Low |
| `ostaad_boq/models.py` | Pydantic v2 data models for Ingestion, OCR, Detections, Geometry, and BOQ | **MODIFY** | Must incorporate the comprehensive `EvidenceCandidate` schema, `ValidationStatus`, Gemini detection types, and provenance links. | `pydantic` | Medium |
| `ostaad_boq/vlm_engine.py` | Gemini / VLM client wrapper with mock fallback | **REFACTOR** | Must be refactored into a structured Google GenAI SDK (`google-genai`) adapter targeting `gemini-3.8-flash` with JSON Schema mode and coordinate unscaling. Fallback mock data that hallucinated doors/windows on site surveys must be permanently removed. | `google-genai`, `ostaad_boq.models` | High |
| `ostaad_boq/gemini_service.py` | N/A | **NEW** | Dedicated service implementing retry policies, rate limit handling, prompt engineering, token/cost tracking, and escalation to `gemini-3.1-pro-preview`. | `google-genai`, `ostaad_boq.models` | Medium |
| `ostaad_boq/coordinate_transform.py` | N/A | **NEW** | Authoritative bidirectional coordinate mapper translating Gemini `[0, 1000]` boxes, OCR pixel boxes, PDF points, and world units (meters/feet). | `ostaad_boq.models` | Low |
| `ostaad_boq/geometry.py` | OpenCV contour detection, wall polygon extraction, Green's Shoelace area | **KEEP** | Authoritative deterministic measurement engine for physical lengths and areas. Must remain independent of AI estimations. | `cv2`, `numpy`, `shapely` | Low |
| `ostaad_boq/evidence_graph.py` | Multi-modal corroboration graph (`EvidenceNode`, `EvidenceEdge`) with confidence scoring | **MODIFY** | Incorporate Gemini candidate detections and schedules as weighted evidence nodes with strict anti-hallucination validation rules. | `dataclasses`, `uuid` | Medium |
| `ostaad_boq/reconciliation.py` | Deduplication and conflict resolution across detection sources | **MODIFY** | Update IoU matching thresholds to reconcile Gemini semantic labels with OpenCV vector contours and OCR schedule counts. | `ostaad_boq.models`, `shapely` | Medium |
| `ostaad_boq/schedules.py` | Schedule and legend table parsing from OCR tokens | **MODIFY** | Wire Gemini structured table extraction as primary/corroborating source for door/window schedules and drawing legends. | `ostaad_boq.models` | Low |
| `ostaad_boq/derived_materials.py` | Secondary material computations (masonry volume, mortar, plaster, paint) with formulas | **KEEP** | Complete, deterministic, transparent formulas with waste allowances adhering to CPWD / IS standards. | `ostaad_boq.models` | Low |
| `ostaad_boq/classification_engine.py` | CSI MasterFormat 2020 & CPWD DSR WBS categorization | **KEEP** | Robust rule-based mapping engine assigning standardized 6-digit WBS codes and divisions. | `ostaad_boq.models` | Low |
| `ostaad_boq/pricing_engine.py` | Regional unit cost lookup (INR/USD), material/labor breakdown, markup application | **KEEP** | Fully functional pricing model calculating Direct Cost, Overhead (10%), Profit (10%), Contingency (5%). | `ostaad_boq.models` | Low |
| `ostaad_boq/audit_trail.py` | Provenance chain logging step-by-step transformations from raw pixels to BOQ items | **MODIFY** | Add Gemini model ID, token usage, temperature, prompt signature, and raw LLM response hashes to audit metadata. | `ostaad_boq.models`, `hashlib` | Low |
| `ostaad_boq/export_engine.py` | Multi-tab Excel (.xlsx), CSV, JSON, and PDF generation | **MODIFY** | Add "Validation Status" and "Evidence Sources" columns to Excel and CSV exports; highlight `NEEDS_REVIEW` items. | `openpyxl`, `csv`, `json` | Low |
| `ostaad_boq/exporter.py` | Legacy export utility | **DEPRECATE** | Superseded by the comprehensive `ostaad_boq.export_engine`. Keep as backwards-compatible shim. | `ostaad_boq.export_engine` | Low |
| `ostaad_boq/engine.py` | Master pipeline orchestrator connecting ingestion to export | **MODIFY** | Orchestrate the new hybrid workflow: Pre-classifier -> Gemini Semantic -> Evidence Fusion -> Deterministic Geometry -> BOQ. | All `ostaad_boq` modules | High |
| `ostaad_boq/app.py` | FastAPI application, REST endpoints, integrated HTML5 SVG Blueprint Viewer & BOQ UI | **MODIFY** | Add endpoints for reviewing/updating candidate validation statuses (`/api/v1/takeoff/{id}/verify`), model cost telemetry, and visual overlays. | `fastapi`, `ostaad_boq` | Medium |
| `ostaad_boq/cli.py` | Command-line interface for batch processing blueprints | **MODIFY** | Add flags for `--gemini-model`, `--escalate-ambiguity`, and `--export-audit-graph`. | `argparse`, `ostaad_boq.engine` | Low |

---

## 2. Detailed Specification for Modified, Refactored, and New Files

### 2.1. `ostaad_boq/models.py` (ACTION: MODIFY)
* **Exact Responsibility**: Single source of truth for all domain entities, validation schemas, API requests, and response envelopes.
* **Inputs**: Raw dictionaries from ingest, OCR, Gemini API, and user overrides.
* **Outputs**: Strongly typed Pydantic v2 models with JSON schema serialization.
* **Key Additions**:
  ```python
  class ValidationStatus(str, Enum):
      VERIFIED = "VERIFIED"          # Independently corroborated by 2+ sources (e.g. Schedule + Vector)
      SUPPORTED = "SUPPORTED"        # Detected with high confidence by 1 strong source
      NEEDS_REVIEW = "NEEDS_REVIEW"  # Conflicting evidence or VLM-only uncorroborated detection
      REJECTED = "REJECTED"          # Failed anti-hallucination gate or invalid geometry

  class QuantityType(str, Enum):
      MEASURED_QUANTITY = "MEASURED_QUANTITY"  # Direct geometric measurement (area, length)
      DERIVED_QUANTITY = "DERIVED_QUANTITY"    # Formula-based secondary material (e.g. mortar from masonry)
      ESTIMATED_QUANTITY = "ESTIMATED_QUANTITY"# VLM or schedule count without vector verification

  class EvidenceCandidate(BaseModel):
      id: str = Field(default_factory=lambda: str(uuid.uuid4()))
      item_type: str
      category: str
      source: str                          # "GEMINI", "VECTOR", "OCR_SCHEDULE", "OPENCV"
      source_model: Optional[str] = None   # "gemini-3.8-flash"
      model_version: Optional[str] = None
      sheet_id: str
      page_number: int
      bbox_normalized: List[float]         # [ymin, xmin, ymax, xmax] in [0.0, 1.0]
      polygon_normalized: Optional[List[List[float]]] = None
      raw_text: Optional[str] = None
      normalized_text: Optional[str] = None
      quantity: float
      unit: str
      scale_ratio: Optional[float] = None
      confidence: float = Field(ge=0.0, le=1.0)
      corroborating_evidence_ids: List[str] = Field(default_factory=list)
      calculation_method: str
      assumptions: List[str] = Field(default_factory=list)
      validation_status: ValidationStatus
      quantity_type: QuantityType
  ```
* **Dependencies**: `pydantic`
* **Affected APIs**: `/api/v1/takeoff`, `/api/v1/takeoff/{id}`, `/api/v1/takeoff/{id}/evidence`
* **Affected Frontend Components**: Blueprint SVG overlay layer, BOQ tabular columns, Audit drawer.
* **Affected Tests**: All unit tests in `tests/test_stage*.py`.

---

### 2.2. `ostaad_boq/coordinate_transform.py` (ACTION: NEW)
* **Exact Responsibility**: Authoritative bidirectional coordinate transformation utility. Prevents subtle coordinate drifting, inversion of y-axes, or improper scaling between distinct subsystems.
* **Coordinate Systems Handled**:
  1. `Gemini Normalized`: Box format `[ymin, xmin, ymax, xmax]` normalized to `[0, 1000]`.
  2. `Canonical Normalized`: `x, y ∈ [0.0, 1.0]`, origin at Top-Left `(0, 0)`.
  3. `Raster Image Pixels`: `(px_x, px_y)` at high-res rendering DPI (e.g., 2800×3300).
  4. `PDF Page Points`: 72 DPI PostScript space, origin bottom-left or top-left.
  5. `CAD Model Coordinates`: Arbitrary units mapped via scale ratio.
  6. `Real-World Physical Space`: Metric (meters, mm) or Imperial (feet, inches).
* **Inputs**: Coordinate tuple/box, source space enum, target space enum, page dimensions, DPI, scale ratio.
* **Outputs**: Transformed coordinates in target space with mathematically verified bounds.
* **Dependencies**: `math`, `ostaad_boq.models`
* **Affected APIs**: Used internally by `ingest.py`, `vlm_engine.py`, `geometry.py`, and `app.py`.
* **Affected Frontend Components**: Blueprint SVG `<rect>` and `<polygon>` viewBox mappings.
* **Affected Tests**: `tests/test_stage4_scale_coordinate_engine.py`, `tests/test_coordinate_transforms.py`.

---

### 2.3. `ostaad_boq/gemini_service.py` (ACTION: NEW)
* **Exact Responsibility**: High-reliability Gemini client adapter managing authentication, connection pooling, structured JSON schema enforcement, rate-limiting, and cost telemetry.
* **Inputs**:
  - Rendered blueprint image PIL / bytes or PDF stream.
  - Extraction task enum (`CLASSIFY_DRAWING`, `EXTRACT_TITLE_BLOCK`, `PARSE_SCHEDULES_LEGENDS`, `DETECT_OBJECT_CANDIDATES`).
  - Structured Pydantic response schema.
* **Outputs**: Strongly typed JSON responses adhering strictly to the requested schema.
* **Core Logic**:
  - Primary model: `gemini-3.8-flash`.
  - Escalation model: `gemini-3.1-pro-preview` triggered if `confidence < 0.70` or `ambiguity_flag == True`.
  - Exponential backoff with jitter on HTTP 429 / 503 (up to 4 retries).
  - Exact token usage capture (`prompt_tokens`, `candidates_tokens`, `total_tokens`).
  - Strict refusal to guess dimensional lengths or areas; outputs bounding boxes and symbolic tags only.
* **Dependencies**: `google-genai>=0.1.1`, `pydantic`, `ostaad_boq.models`
* **Affected APIs**: Background processing pipelines.
* **Affected Frontend Components**: Cost and Token usage telemetry badge.
* **Affected Tests**: `tests/test_gemini_service.py` (with mocked VCR cassettes and live test fixtures).

---

### 2.4. `ostaad_boq/vlm_engine.py` (ACTION: REFACTOR)
* **Exact Responsibility**: Translates blueprint artifacts into semantic prompts and maps raw Gemini API responses into standardized `EvidenceCandidate` lists.
* **Key Refactoring Tasks**:
  1. **Purge Fallback Mock**: Delete the `_dynamic_local_fallback()` function that previously injected 8 fake doors, 8 fake windows, WC, kitchen sink, and showers on drawings when an API key was not configured.
  2. **Schema-Constrained Inference**: Bind calls to Gemini structured output mode using Pydantic schemas.
  3. **Coordinate Unscaling**: Automatically remap Gemini `[0, 1000]` coordinates into Canonical `[0.0, 1.0]` coordinates via `coordinate_transform.py`.
* **Inputs**: `IngestionResult`, `OCRResult`, `DrawingClassification`.
* **Outputs**: `List[EvidenceCandidate]` representing semantic entities (title block, schedules, legends, candidate symbols).
* **Dependencies**: `ostaad_boq.gemini_service`, `ostaad_boq.coordinate_transform`, `ostaad_boq.models`
* **Affected APIs**: Pipeline execution.
* **Affected Frontend Components**: None directly.
* **Affected Tests**: `tests/test_stage6_symbol_detection.py`, `tests/test_stage8_schedules_legends.py`.

---

### 2.5. `ostaad_boq/evidence_graph.py` (ACTION: MODIFY)
* **Exact Responsibility**: Construct a multi-modal corroboration graph connecting OCR tokens, native vector paths, Gemini candidate detections, and schedule table entries.
* **Inputs**: `List[EvidenceCandidate]` from all sources.
* **Outputs**: `ReconciledTakeoff` where every item possesses an auditable `ValidationStatus`, confidence score, and list of cross-corroborating evidence node IDs.
* **Corroboration Logic**:
  - **VERIFIED**: Item detected by Gemini AND corroborated by Native Vector path (IoU > 0.50) OR matching schedule table callout (e.g. Schedule calls for D1 = 8, exactly 8 D1 instances identified).
  - **SUPPORTED**: Item detected by single high-confidence source (Confidence > 0.85) matching drawing classifier domain rules.
  - **NEEDS_REVIEW**: Conflicting counts (e.g. Schedule says 10 doors, geometry locates 8) or single-source detection below threshold.
  - **REJECTED**: Item violating drawing classification invariants (e.g., residential interior rooms or plumbing fixtures on a `SITE_TOPOGRAPHICAL_SURVEY`).
* **Dependencies**: `ostaad_boq.models`, `uuid`
* **Affected APIs**: `/api/v1/takeoff/{id}/evidence-graph`
* **Affected Frontend Components**: Evidence Graph visualizer, Audit drawer.
* **Affected Tests**: `tests/test_stage7_evidence_fusion_graph.py`.

---

### 2.6. `ostaad_boq/engine.py` (ACTION: MODIFY)
* **Exact Responsibility**: Top-level workflow coordinator executing the end-to-end pipeline in safe, isolated stages.
* **Workflow Stages**:
  ```text
  Stage 1: Ingestion & Vector Extraction (PyMuPDF)
  Stage 2: High-Resolution Rendering & OCR (EasyOCR / Native Text)
  Stage 3: Scale & Coordinate Engine Initialization
  Stage 4: Drawing Classification Gate (Pre-Extraction Rule Check)
  Stage 5: Gemini Semantic Perception (Title Block, Schedules, Legends)
  Stage 6: Gemini Candidate Detection (Object boxes, room labels)
  Stage 7: Deterministic Geometry Engine (Closed polygons, wall lengths)
  Stage 8: Multi-Modal Evidence Fusion & Validation Status Assignment
  Stage 9: Anti-Hallucination Guardrails Enforcement
  Stage 10: CSI / CPWD Standardized Classification
  Stage 11: Unit Pricing & Derived Materials Calculation
  Stage 12: Audit Trail Assembly & Artifact Generation
  ```
* **Inputs**: File path or file bytes, optional project metadata, optional user overrides.
* **Outputs**: `MasterTakeoffResult` containing verified items, review queue, summary KPIs, and export paths.
* **Dependencies**: All sub-modules in `ostaad_boq/`.
* **Affected APIs**: `/api/v1/takeoff`, `/api/v1/upload`
* **Affected Frontend Components**: Entire takeoff workflow.
* **Affected Tests**: `tests/test_stage16_master_audit.py`, `tests/test_ostaad_boq.py`.

---

### 2.7. `ostaad_boq/export_engine.py` (ACTION: MODIFY)
* **Exact Responsibility**: Generates publication-ready Excel workbooks, CSV tables, and JSON packages.
* **Modifications**:
  1. Add dedicated **"Verification Status"** column (`VERIFIED`, `SUPPORTED`, `NEEDS_REVIEW`).
  2. Add **"Evidence Sources"** column listing corroborating tags (`[Vector, Schedule]`, `[Gemini, OCR]`).
  3. Conditional formatting: Apply soft green fill to `VERIFIED` rows and soft amber fill to `NEEDS_REVIEW` rows.
  4. Ensure `MEASURED_QUANTITY` vs `DERIVED_QUANTITY` distinction is explicitly preserved in distinct columns.
* **Inputs**: `MasterTakeoffResult`.
* **Outputs**: Formatted `.xlsx` file, RFC 4180 `.csv` file, JSON schema file.
* **Dependencies**: `openpyxl`, `ostaad_boq.models`
* **Affected APIs**: `/api/v1/takeoff/{id}/export/{format}`
* **Affected Frontend Components**: Export download buttons.
* **Affected Tests**: `tests/test_stage13_export_engine.py`.

---

### 2.8. `ostaad_boq/app.py` (ACTION: MODIFY)
* **Exact Responsibility**: FastAPI web service providing REST endpoints and serving the responsive HTML5/SVG interactive takeoff interface.
* **Modifications**:
  1. Add endpoint `POST /api/v1/takeoff/{id}/review` allowing human estimators to accept, reject, or edit quantities for `NEEDS_REVIEW` items.
  2. Add endpoint `GET /api/v1/takeoff/{id}/telemetry` returning Gemini token consumption, latency, and estimated cost breakdown.
  3. Enhance SVG Viewer to color-code overlays by `ValidationStatus`:
     - Green: `VERIFIED`
     - Blue: `SUPPORTED`
     - Orange / Amber: `NEEDS_REVIEW`
     - Red Strikethrough: `REJECTED`
* **Inputs**: HTTP requests, multipart file uploads.
* **Outputs**: JSON responses, HTML streaming pages, binary file downloads.
* **Dependencies**: `fastapi`, `uvicorn`, `ostaad_boq.engine`
* **Affected APIs**: All external client integrations.
* **Affected Frontend Components**: Interactive viewer, take-off table, review sidebar.
* **Affected Tests**: `tests/test_stage14_api_contracts.py`, `tests/test_stage15_frontend_dashboard.py`.
