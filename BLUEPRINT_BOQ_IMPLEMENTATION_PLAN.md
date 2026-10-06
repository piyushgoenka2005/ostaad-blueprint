# OSTAAD BLUEPRINT-TO-BOQ: PHASE-BY-PHASE IMPLEMENTATION PLAN

This document provides the definitive, dependency-aware, step-by-step engineering roadmap for implementing the Gemini 3.8 Flash Hybrid Blueprint-to-BOQ Architecture in the Ostaad codebase.

---

## Master Implementation Sequence Overview

```text
[Phase 0: Baseline & Audit] 
       │
[Phase 1: Evidence Schema Definition]
       │
[Phase 2: Drawing Classification Gate]
       │
[Phase 3: Coordinate Normalization Engine]
       │
[Phase 4: Gemini 3.8 Flash SDK Adapter]
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[Phase 5: Semantic Extraction]   [Phase 6: Object Detection]
       │                                 │
       └────────────────┬────────────────┘
                        ▼
           [Phase 7: Evidence Fusion Graph]
                        │
       [Phase 8: Anti-Hallucination Validation]
                        │
         [Phase 9: Geometry Engine Integration]
                        │
             [Phase 10: BOQ Engine Refactor]
                        │
       [Phase 11: Frontend Visual Traceability]
                        │
           [Phase 12: Comprehensive Benchmarks]
                        │
       [Phase 13: Performance & Cost Optimization]
                        │
          [Phase 14: Production Hardening]
```

---

## Phase 0: Audit & Baseline Calibration
* **Objective**: Establish the quantitative baseline performance, error rates, and hallucination footprint of the existing pipeline against test fixtures before any code modifications occur.
* **Files to modify**: None.
* **Files to create**: `tests/baseline_run.py`, `tests/fixtures/baseline_metrics.json`.
* **Implementation steps**:
  1. Instrument `tests/baseline_run.py` to run the current pipeline on `assets/barakar 01.11.2025-Model WITHOUT GRID.pdf` and `assets/barakar 01.11.2025.pdf`.
  2. Record baseline execution time, memory usage, detected item count, door/window counts, and hallucinated room labels.
  3. Commit the raw output and baseline metrics to `tests/fixtures/baseline_metrics.json`.
* **Dependencies**: Existing `ostaad_boq` codebase and `.venv` packages.
* **Tests**: `pytest tests/test_ostaad_boq.py`.
* **Expected result**: Baseline metrics document that the current fallback logic generates hallucinated doors, windows, and residential rooms on the Barakar site survey.
* **Failure conditions**: Pipeline fails to run or crashes on the baseline files.
* **Rollback strategy**: N/A (read-only benchmarking scripts).
* **Definition of Done**: `baseline_metrics.json` recorded with exact item counts and timing profiles across all test assets.

---

## Phase 1: Unified Evidence Schema
* **Objective**: Define strongly typed, auditable Pydantic v2 schemas for multi-modal evidence candidates, validation statuses, and quantity classifications.
* **Files to modify**: `ostaad_boq/models.py`.
* **Files to create**: `tests/unit/test_evidence_schema.py`.
* **Implementation steps**:
  1. Add `ValidationStatus` enum (`VERIFIED`, `SUPPORTED`, `NEEDS_REVIEW`, `REJECTED`).
  2. Add `QuantityType` enum (`MEASURED_QUANTITY`, `DERIVED_QUANTITY`, `ESTIMATED_QUANTITY`).
  3. Create `EvidenceCandidate` Pydantic model with fields: `id`, `item_type`, `category`, `source`, `source_model`, `model_version`, `sheet_id`, `page_number`, `bbox_normalized`, `polygon_normalized`, `raw_text`, `normalized_text`, `quantity`, `unit`, `scale_ratio`, `confidence`, `corroborating_evidence_ids`, `calculation_method`, `assumptions`, `validation_status`, `quantity_type`.
  4. Update `BOQItem` to include `evidence_ids: List[str]`, `validation_status: ValidationStatus`, and `quantity_type: QuantityType`.
* **Dependencies**: `pydantic>=2.0.0`.
* **Tests**: `pytest tests/unit/test_evidence_schema.py`.
* **Expected result**: Schemas serialize and deserialize to JSON losslessly with complete validation.
* **Failure conditions**: Type check errors or breaks in existing model serialization.
* **Rollback strategy**: `git checkout ostaad_boq/models.py`.
* **Definition of Done**: Schemas compile cleanly with `mypy --strict`, full serialization test coverage $> 95\%$, zero breaking changes to existing downstream model consumers.

---

## Phase 2: Drawing Classification Gate
* **Objective**: Implement and enforce a pre-extraction classification gate that categorizes drawings into 10 standard types and prevents architectural extraction from running on site surveys or structural drawings.
* **Files to modify**: `ostaad_boq/classifier.py`, `ostaad_boq/engine.py`.
* **Files to create**: `tests/unit/test_drawing_classifier_rules.py`.
* **Implementation steps**:
  1. Enhance `DrawingClassifier` in `ostaad_boq/classifier.py` to evaluate native vector layer names, title block keywords, OCR token densities, and aspect ratios.
  2. Support 10 canonical classes: `ARCHITECTURAL_FLOOR_PLAN`, `STRUCTURAL_DRAWING`, `ELECTRICAL_DRAWING`, `PLUMBING_DRAWING`, `HVAC_DRAWING`, `SITE_TOPOGRAPHICAL_SURVEY`, `ELEVATION`, `SECTION`, `SCHEDULE`, `UNKNOWN`.
  3. Enforce strict pipeline branching in `engine.py`: If `classification == SITE_TOPOGRAPHICAL_SURVEY`, bypass all room polygon and interior door/window extraction modules.
* **Dependencies**: Phase 1 (`models.py`).
* **Tests**: `pytest tests/test_drawing_classifier.py tests/unit/test_drawing_classifier_rules.py`.
* **Expected result**: `barakar 01.11.2025.pdf` is classified as `SITE_TOPOGRAPHICAL_SURVEY` with confidence $> 0.90$.
* **Failure conditions**: Barakar survey classified as `ARCHITECTURAL_FLOOR_PLAN`.
* **Rollback strategy**: Revert `classifier.py` and `engine.py` changes.
* **Definition of Done**: Classification runs in $< 200\text{ ms}$, achieves $100\%$ precision on the Barakar fixture, and successfully gates downstream execution.

---

## Phase 3: Canonical Coordinate Normalization Engine
* **Objective**: Build an authoritative coordinate transformation module that maps coordinates between Gemini (`[0, 1000]`), Canonical Space (`[0.0, 1.0]`), High-Res Pixels, PDF Points, and Real-World units (meters/feet).
* **Files to modify**: None.
* **Files to create**: `ostaad_boq/coordinate_transform.py`, `tests/unit/test_coordinate_transforms.py`.
* **Implementation steps**:
  1. Define coordinate space enums: `GEMINI_NORMALIZED_1000`, `CANONICAL_UNIT`, `RASTER_PIXEL`, `PDF_POINTS`, `WORLD_METRIC`, `WORLD_IMPERIAL`.
  2. Implement `CoordinateTransformer` class with methods:
     - `gemini_to_canonical(box_1000)`: Descales `[ymin, xmin, ymax, xmax]` from `[0, 1000]` to `[0.0, 1.0]`.
     - `canonical_to_pixel(coords, width_px, height_px)`: Scales canonical float coordinates to rendered raster dimensions.
     - `canonical_to_pdf_points(coords, page_w_pt, page_h_pt, rotation)`: Maps to PyMuPDF PostScript coordinates.
     - `pixels_to_world(length_px, px_per_unit)`: Converts pixel lengths to meters or feet using verified scale ratio.
  3. Add bounds clamping and inversion validation tests.
* **Dependencies**: None.
* **Tests**: `pytest tests/unit/test_coordinate_transforms.py`.
* **Expected result**: All coordinate transformations are mathematically exact and invertible within float precision ($10^{-6}$).
* **Failure conditions**: Inversion error $> 0.001$ pixels or axis inversion.
* **Rollback strategy**: Remove `coordinate_transform.py`.
* **Definition of Done**: 100% unit test pass rate with coverage on rotation ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) and non-square aspect ratios.

---

## Phase 4: Gemini Service Adapter & Cost Control
* **Objective**: Create a robust, production-grade Gemini API adapter with structured JSON schema enforcement, automatic retry with exponential backoff, token telemetry, and escalation from Flash to Pro.
* **Files to modify**: None.
* **Files to create**: `ostaad_boq/gemini_service.py`, `tests/unit/test_gemini_service.py`.
* **Implementation steps**:
  1. Implement `GeminiService` using `google-genai` SDK.
  2. Configure primary model `gemini-3.8-flash` and escalation model `gemini-3.1-pro-preview`.
  3. Enforce Pydantic structured output mode via `response_mime_type="application/json"` and `response_schema`.
  4. Implement retry handler for HTTP 429 and HTTP 503 errors (maximum 4 attempts with exponential backoff and jitter).
  5. Add telemetry tracker logging `prompt_tokens`, `candidate_tokens`, latency, and estimated USD cost per request.
  6. Add escalation logic: If `confidence < 0.70` or `ambiguity_flag == True`, escalate prompt to `gemini-3.1-pro-preview`.
* **Dependencies**: `google-genai>=0.1.1`, Phase 1 (`models.py`).
* **Tests**: `pytest tests/unit/test_gemini_service.py` (with mocked API client and live key integration).
* **Expected result**: Structured JSON is validated against Pydantic schemas; token usage and latency are tracked accurately.
* **Failure conditions**: Unhandled API rate limits, schema validation crashes, or missing token telemetry.
* **Rollback strategy**: Delete `ostaad_boq/gemini_service.py`.
* **Definition of Done**: Adapter handles transient network failures gracefully, returns typed responses, and tracks costs accurately.

---

## Phase 5: Gemini Semantic Extraction (Title Blocks, Schedules, Legends)
* **Objective**: Use Gemini 3.8 Flash to interpret drawing metadata, project titles, door/window schedules, revision tables, and drawing legends.
* **Files to modify**: `ostaad_boq/schedules.py`, `ostaad_boq/vlm_engine.py`.
* **Files to create**: `tests/integration/test_semantic_extraction.py`.
* **Implementation steps**:
  1. Formulate zero-shot structured prompts for title block extraction (Project Name, Sheet Number, Scale String, Stated Area, Revision Date).
  2. Implement schedule extraction prompt capturing Door/Window Schedules: Symbol (`D1`, `W1`), Width, Height, Material, Stated Count.
  3. Implement legend extraction prompt capturing line/symbol keys (e.g. `BW` = Boundary Wall, `GW` = Gate Wall).
  4. Ensure all extracted items are wrapped in `EvidenceCandidate` objects with `source="GEMINI_SEMANTIC"`.
* **Dependencies**: Phase 4 (`gemini_service.py`).
* **Tests**: `pytest tests/integration/test_semantic_extraction.py`.
* **Expected result**: Extracts title block metadata and schedules accurately from complex blueprints.
* **Failure conditions**: Gemini returns ungrounded or hallucinated schedule rows not present on the drawing.
* **Rollback strategy**: Revert changes in `schedules.py` and `vlm_engine.py`.
* **Definition of Done**: Output verified against ground-truth schedules on test corpus with Schedule Item Recall $\ge 95\%$.

---

## Phase 6: Gemini Candidate Object Detection
* **Objective**: Detect candidate spatial locations for architectural, structural, and civil symbols (doors, windows, columns, boundary markers) returning normalized bounding boxes.
* **Files to modify**: `ostaad_boq/vlm_engine.py`.
* **Files to create**: `tests/integration/test_object_detection.py`.
* **Implementation steps**:
  1. Purge the legacy mock fallback `_dynamic_local_fallback()` from `vlm_engine.py`.
  2. Formulate spatial detection prompt requiring Gemini to return candidate bounding boxes in `[0, 1000]` format.
  3. Transform boxes to Canonical `[0.0, 1.0]` using `CoordinateTransformer`.
  4. Map candidates to `EvidenceCandidate` instances with `validation_status=NEEDS_REVIEW` (pending evidence fusion).
  5. Explicitly prohibit Gemini from outputting physical dimensions or quantities; only bounding boxes and labels are accepted.
* **Dependencies**: Phase 3 (`coordinate_transform.py`), Phase 4 (`gemini_service.py`).
* **Tests**: `pytest tests/integration/test_object_detection.py`.
* **Expected result**: Candidate boxes align with visual elements without hallucinated items on blank areas.
* **Failure conditions**: Unscaled boxes or synthetic fallback mock generation.
* **Rollback strategy**: Revert `vlm_engine.py`.
* **Definition of Done**: Candidate detections produced with verified spatial alignment; zero synthetic mock data present in the codebase.

---

## Phase 7: Multi-Modal Evidence Fusion Graph
* **Objective**: Corroborate detections across OCR tokens, native vector paths, OpenCV contours, schedule tables, and Gemini candidates into an integrated evidence graph.
* **Files to modify**: `ostaad_boq/evidence_graph.py`, `ostaad_boq/reconciliation.py`.
* **Files to create**: `tests/unit/test_evidence_fusion_engine.py`.
* **Implementation steps**:
  1. Implement spatial intersection and IoU calculation between Gemini bounding boxes and native vector path clusters.
  2. Implement schedule cross-referencing: If Gemini detects 8 doors labeled "D1" and the OCR Door Schedule explicitly lists `D1 Count = 8`, assign strong cross-corroboration edge.
  3. Calculate composite confidence score:
     $$C_{\text{composite}} = w_{\text{vector}} C_{\text{vector}} + w_{\text{ocr}} C_{\text{ocr}} + w_{\text{gemini}} C_{\text{gemini}} + w_{\text{schedule}} C_{\text{schedule}}$$
  4. Mark items corroborated by $\ge 2$ independent modalities as `VERIFIED`.
  5. Mark items supported by 1 modality meeting threshold ($C \ge 0.85$) as `SUPPORTED`.
  6. Route items with conflicts (e.g. Schedule says 8, detected 6) to `NEEDS_REVIEW`.
* **Dependencies**: Phase 1 (`models.py`), Phase 5, Phase 6.
* **Tests**: `pytest tests/test_stage7_evidence_fusion_graph.py tests/unit/test_evidence_fusion_engine.py`.
* **Expected result**: Detections are corroborated multi-modally; single-source AI predictions are never marked `VERIFIED`.
* **Failure conditions**: Uncorroborated AI hallucination assigned `VERIFIED` status.
* **Rollback strategy**: Revert changes in `evidence_graph.py` and `reconciliation.py`.
* **Definition of Done**: Multi-modal fusion graph successfully correlates candidates with exact audit edge tracking.

---

## Phase 8: Anti-Hallucination Guardrails & Gates
* **Objective**: Enforce hard domain invariants that reject impossible or unsupported items before they can enter the BOQ.
* **Files to modify**: `ostaad_boq/engine.py`.
* **Files to create**: `ostaad_boq/anti_hallucination.py`, `tests/unit/test_anti_hallucination_gates.py`.
* **Implementation steps**:
  1. Implement **Gate 1 (No Evidence = No Quantity)**: Reject any candidate without independent vector or OCR evidence.
  2. Implement **Gate 2 (Scale Invariant)**: If drawing scale is unresolved, reject dimensional physical quantities (set to normalized/pixel counts only) and trigger `NEEDS_REVIEW`.
  3. Implement **Gate 3 (Site Survey Invariant)**: If drawing type is `SITE_TOPOGRAPHICAL_SURVEY`, reject all residential doors, windows, drywall partitions, plumbing fixtures, and kitchen cabinetry.
  4. Implement **Gate 4 (Area Sanity Check)**: Ensure sum of individual room areas does not exceed Stated Gross Building Area by $> 5\%$.
* **Dependencies**: Phase 2 (`classifier.py`), Phase 7 (`evidence_graph.py`).
* **Tests**: `pytest tests/unit/test_anti_hallucination_gates.py`.
* **Expected result**: All hallucinated items on the Barakar site survey are assigned `REJECTED` and purged from final BOQ.
* **Failure conditions**: Doors, windows, or bathrooms slip into final BOQ on `SITE_TOPOGRAPHICAL_SURVEY`.
* **Rollback strategy**: Revert `ostaad_boq/anti_hallucination.py`.
* **Definition of Done**: Barakar regression test achieves $100\%$ pass rate with strictly zero hallucinated items.

---

## Phase 9: Authoritative Deterministic Geometry Engine
* **Objective**: Connect verified spatial locations to deterministic vector and polygon calculation routines for lengths, perimeters, closed room areas, and opening deductions.
* **Files to modify**: `ostaad_boq/geometry.py`.
* **Files to create**: `tests/unit/test_deterministic_geometry.py`.
* **Implementation steps**:
  1. Integrate OpenCV contour extraction with Shapely polygon processing.
  2. Calculate closed room areas using Green's theorem / Shoelace algorithm.
  3. Apply scale conversion: $\text{Area}_{\text{real}} = \text{Area}_{\text{px}} \times (\text{scale\_ratio} / \text{DPI})^2$.
  4. Deduct door and window openings from wall volume calculations using exact vector dimensions.
  5. Compute site boundary perimeters using Euclidean polyline segment aggregation.
* **Dependencies**: Phase 3 (`coordinate_transform.py`), `shapely`, `cv2`.
* **Tests**: `pytest tests/test_stage5_geometry_engine.py tests/unit/test_deterministic_geometry.py`.
* **Expected result**: Geometric measurements match CAD ground truth within $\le 1.0\%$ error.
* **Failure conditions**: Geometric area discrepancy $> 2.0\%$ against native CAD polylines.
* **Rollback strategy**: Revert `geometry.py`.
* **Definition of Done**: Lengths and areas computed deterministically; zero AI-estimated quantities in measured items.

---

## Phase 10: BOQ Engine & Classification Refactor
* **Objective**: Refactor the BOQ pricing and export engines to reflect `MEASURED_QUANTITY` vs `DERIVED_QUANTITY` classifications, link evidence IDs, and update multi-format exporters.
* **Files to modify**: `ostaad_boq/export_engine.py`, `ostaad_boq/pricing_engine.py`.
* **Files to create**: `tests/integration/test_boq_export_validation.py`.
* **Implementation steps**:
  1. Update `export_engine.py` to add "Validation Status" and "Evidence Sources" columns to Excel and CSV outputs.
  2. Highlight `NEEDS_REVIEW` rows with soft amber fill and `VERIFIED` rows with soft green fill in Excel.
  3. Partition summary sheet into: Measured Items (Direct Takeoff) and Derived Items (Mortar, Plaster, Paint).
  4. Retain regional currency handling (INR ₹ for metric, USD $ for imperial).
* **Dependencies**: Phase 1 (`models.py`), Phase 9 (`geometry.py`).
* **Tests**: `pytest tests/test_stage13_export_engine.py tests/integration/test_boq_export_validation.py`.
* **Expected result**: Generated `.xlsx` and `.csv` files contain full validation provenance and cleanly segregated quantities.
* **Failure conditions**: Excel file corruption, missing validation columns, or incorrect currency symbols.
* **Rollback strategy**: Revert `export_engine.py`.
* **Definition of Done**: Exported Excel sheets open without warnings, display correct audit columns, and pass automated formula checks.

---

## Phase 11: Frontend Visual Traceability & Human Review
* **Objective**: Upgrade the interactive blueprint viewer and dashboard to support two-way visual traceability (BOQ item $\leftrightarrow$ Blueprint highlight) and human review/correction workflows.
* **Files to modify**: `ostaad_boq/app.py`.
* **Files to create**: `tests/integration/test_frontend_api_endpoints.py`.
* **Implementation steps**:
  1. Update SVG canvas overlay in `app.py` to render color-coded bounding boxes and polygons based on `ValidationStatus`.
  2. Implement two-way interaction:
     - Clicking a BOQ row highlights the corresponding polygon/box on the blueprint.
     - Clicking a polygon on the blueprint scrolls to and highlights the corresponding BOQ line item.
  3. Add Human Review panel for items marked `NEEDS_REVIEW`:
     - Provide `Accept`, `Reject`, and `Edit Quantity` actions.
     - Submitting review updates the item status to `VERIFIED_BY_USER`.
  4. Display Gemini token consumption, latency, and estimated cost badge in the header.
* **Dependencies**: Phase 10 (`export_engine.py`), FastAPI backend.
* **Tests**: `pytest tests/test_stage14_api_contracts.py tests/test_stage15_frontend_dashboard.py`.
* **Expected result**: User can interactively inspect, verify, and correct all extracted quantities visually.
* **Failure conditions**: SVG scaling misalignments, broken review API endpoints.
* **Rollback strategy**: Revert `app.py`.
* **Definition of Done**: Visual highlighting functions seamlessly on all zoom/pan levels; review actions persist correctly.

---

## Phase 12: Comprehensive Benchmarking & Locked Test Set Evaluation
* **Objective**: Execute the complete evaluation harness across both the Development Set and the Locked Test Set to quantify accuracy, recall, and cost metrics.
* **Files to modify**: None.
* **Files to create**: `tests/benchmark_suite.py`, `tests/fixtures/final_benchmark_report.json`.
* **Implementation steps**:
  1. Run `tests/benchmark_suite.py` against all locked test blueprints:
     - `CORPUS-BARAKAR-01` (Site Survey)
     - `CORPUS-BENGAL-3BHK` (Architectural Floor Plan)
     - `CORPUS-COMM-OFFICE` (Scanned Commercial Plan)
  2. Compute Macro-F1 for classification, $m\text{AP}_{50}$ for object detection, Area Error % for geometry, and Hallucination Rate for BOQ items.
  3. Verify that average cost per sheet is $\le \$0.01$ and latency is $\le 15\text{ seconds}$.
* **Dependencies**: All preceding phases.
* **Tests**: `python tests/benchmark_suite.py`.
* **Expected result**: Hallucination Rate $= 0.0\%$; Area Error $\le 1.5\%$; Macro-F1 $\ge 0.95$.
* **Failure conditions**: Hallucination rate $> 0.0\%$ on test set or cost exceeds budget.
* **Rollback strategy**: N/A (read-only evaluation).
* **Definition of Done**: Formal benchmark report generated and signed off with all criteria meeting acceptance thresholds.

---

## Phase 13: Performance, Cost & Latency Optimization
* **Objective**: Minimize Gemini API invocations, optimize image payloads, implement intelligent caching, and reduce CPU bottleneck in OCR and contour tracing.
* **Files to modify**: `ostaad_boq/gemini_service.py`, `ostaad_boq/ocr.py`.
* **Files to create**: `tests/unit/test_caching_and_optimization.py`.
* **Implementation steps**:
  1. Implement SHA-256 image payload caching: Identical drawings or pages served from local cache without repeating Gemini calls.
  2. Implement selective page routing: Multi-page drawing sets only send title block sheets and plan sheets to Gemini; schedule-only or notes sheets bypass heavy vision detection.
  3. Profile OCR pipeline: Maintain downsampled canvas size ($1600\text{ px}$) for initial text detection with full-res patch zooms for dense schedules.
* **Dependencies**: Phase 4 (`gemini_service.py`), Phase 12.
* **Tests**: `pytest tests/unit/test_caching_and_optimization.py`.
* **Expected result**: Processing time reduced by $\ge 30\%$; duplicate sheet processing costs drop to $\$0.00$.
* **Failure conditions**: Cache collisions or stale results returned for modified drawings.
* **Rollback strategy**: Revert caching wrapper in `gemini_service.py`.
* **Definition of Done**: Average sheet latency $\le 8\text{ seconds}$, zero cache invalidation errors.

---

## Phase 14: Production Hardening & Canary Deployment
* **Objective**: Deploy the Gemini Hybrid Pipeline behind the feature flag router, execute shadow evaluation, and complete canary rollout to production users.
* **Files to modify**: `ostaad_boq/config.py`, `ostaad_boq/engine.py`.
* **Files to create**: `tests/production_smoke_test.py`.
* **Implementation steps**:
  1. Verify feature flag routing in `engine.py`:
     - If `ENABLE_GEMINI_HYBRID_PIPELINE=true`, route to Hybrid Engine.
     - If `ENABLE_GEMINI_HYBRID_PIPELINE=false`, route to deterministic legacy engine.
  2. Run shadow mode on live staging traffic for 72 hours; verify zero crashes and zero hallucinations.
  3. Execute canary rollout (10% $\to$ 50% $\to$ 100%).
  4. Perform production smoke test verifying health check, upload, SVG rendering, and Excel export.
* **Dependencies**: All preceding phases.
* **Tests**: `pytest tests/production_smoke_test.py`.
* **Expected result**: 100% production traffic served by hybrid engine with zero unhandled exceptions.
* **Failure conditions**: Production error rate exceeds $0.1\%$ or latency exceeds SLA.
* **Rollback strategy**: Instant cutover to legacy engine by setting `ENABLE_GEMINI_HYBRID_PIPELINE=false`.
* **Definition of Done**: Hybrid engine active in production, monitoring dashboards green, zero regressions reported.
