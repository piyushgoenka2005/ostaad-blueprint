# OSTAAD BLUEPRINT-TO-BOQ: BENCHMARKING & TEST STRATEGY

This document establishes the empirical evaluation framework, dataset curation rules, mathematical metric formulations, regression benchmarks, and automated test suites for the Ostaad Blueprint-to-BOQ hybrid system.

---

## 1. Evaluation Architecture & Dataset Partitioning

To avoid data leakage and deceptive accuracy metrics, dataset partitioning follows strict construction project isolation principles:

```text
                                  BLUEPRINT CORPUS
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
            DEVELOPMENT SET                           LOCKED TEST SET
            (60% of Projects)                         (40% of Projects)
         - Algorithm tuning                        - Strictly Held-Out
         - Prompt engineering                      - Zero Hyperparameter Tuning
         - Failure mode discovery                  - Evaluated only on Releases
```

### Partitioning Invariant
> **SHEET ISOLATION RULE**: Under no circumstances may sheets, revisions, or page crops from the same construction project be split between the Development Set and the Locked Test Set. Variations in drafting style, CAD font conventions, and title block templates are project-specific; leaking project styles invalidates generalization testing.

### Benchmark Datasets Composition

| Dataset ID | Project Type | Format | Key Evaluation Criteria | Ground Truth Source |
| :--- | :--- | :--- | :--- | :--- |
| `CORPUS-BARAKAR-01` | Site / Topographical Survey | Multi-sheet Vector PDF (AutoCAD export) | Land boundary perimeter, stated area verification, absence of architectural rooms. | Registered Site Deed & Licensed Surveyor Stamp (`10,907.80 m²`) |
| `CORPUS-BENGAL-3BHK` | Residential Architectural Plan | Vector PDF with Door/Window Schedules | Room envelope polygons, wall lengths, opening counts, deduction geometry. | Registered Architectural Schedule & CAD Polyline Takeoff |
| `CORPUS-COMM-OFFICE` | Commercial Tenant Fit-out | Scanned Raster PDF (300 DPI) | Partitions, acoustical ceilings, door hardware schedules, OCR tolerance under noise. | Manual QS Takeoff |
| `CORPUS-STR-VILLA` | Structural Framing Drawing | Native CAD DXF / Vector PDF | Beam centerline lengths, column schedules, grid alignments. | Structural Engineer Schedule |
| `CORPUS-FAIL-EDGE` | Synthesized Stress Sheets | Vector & Scanned PDF | Missing scale, conflicting dual units, unclosed polygons, inverted axes. | Synthetic Boundary Ground Truth |

---

## 2. Formal Evaluation Metrics

Empirical performance is evaluated across five distinct dimensions. Arbitrary qualitative claims (e.g. "95% accuracy") are prohibited in favor of mathematically defined metrics.

### 2.1. Drawing Classification Metrics
For drawing classification across the 10 target classes ($C = 10$):
$$\text{Precision}_c = \frac{TP_c}{TP_c + FP_c}, \quad \text{Recall}_c = \frac{TP_c}{TP_c + FN_c}, \quad F1_c = 2 \cdot \frac{\text{Precision}_c \cdot \text{Recall}_c}{\text{Precision}_c + \text{Recall}_c}$$
$$\text{Macro-F1} = \frac{1}{|C|} \sum_{c \in C} F1_c$$
* **Critical Constraint**: For $c = \text{SITE\_TOPOGRAPHICAL\_SURVEY}$, False Positive Rate must be $0.0\%$.

### 2.2. Object Detection & Spatial Localization
For candidate elements (doors, windows, columns, plumbing fixtures):
$$\text{IoU}(B_{\text{pred}}, B_{\text{gt}}) = \frac{\text{Area}(B_{\text{pred}} \cap B_{\text{gt}})}{\text{Area}(B_{\text{pred}} \cup B_{\text{gt}})}$$
* A prediction is scored as True Positive ($TP$) if $\text{IoU} \ge 0.50$ and $\text{Class}_{\text{pred}} == \text{Class}_{\text{gt}}$.
* Mean Average Precision at IoU 0.50 ($m\text{AP}_{50}$) is reported per object category.

### 2.3. Deterministic Geometric Accuracy
Physical measurement error against ground-truth CAD vector geometry:
$$\text{Length Error \%} = \frac{|L_{\text{measured}} - L_{\text{true}}|}{L_{\text{true}}} \times 100$$
$$\text{Area Error \%} = \frac{|A_{\text{measured}} - A_{\text{true}}|}{A_{\text{true}}} \times 100$$
$$\text{Mean Absolute Error (MAE)} = \frac{1}{N} \sum_{i=1}^N |Q_i^{\text{measured}} - Q_i^{\text{true}}|$$
* **Acceptance Threshold**: Area Error $\le 1.5\%$ on native vector blueprints; $\le 3.0\%$ on scanned raster blueprints.

### 2.4. BOQ Item & Quantity Metrics
* **Item Precision**: Ratio of generated BOQ items that correspond to valid physical components on the blueprint.
* **Item Recall**: Ratio of true physical blueprint components captured in the BOQ.
* **Unsupported-Item Rate (Hallucination Rate)**:
  $$\text{Hallucination Rate} = \frac{\text{Count of Generated Items with ValidationStatus} == \text{REJECTED}}{\text{Total Items Generated}} \times 100$$
  * **Target**: $\mathbf{0.0\%}$ hallucinated architectural items on non-architectural drawings.

### 2.5. Telemetry & Cost Metrics
Every inference run records:
* End-to-End Latency ($T_{\text{total}}$) broken into: $T_{\text{ingest}}$, $T_{\text{ocr}}$, $T_{\text{gemini}}$, $T_{\text{geom}}$, $T_{\text{boq}}$.
* Gemini Input Tokens, Output Tokens, and Total API Cost in USD per sheet.
* Target Budget: $\le \$0.005$ per sheet on Gemini 3.8 Flash.

---

## 3. Automated Test Suite Specifications

### 3.1. Unit Test Layer (`tests/unit/`)

#### Scale and Unit Engine (`test_stage4_scale_coordinate_engine.py`)
* Test metric ratio parsing: `1:100`, `1:250`, `1:500`.
* Test imperial architectural callouts: `1/4" = 1'-0"`, `1/8" = 1'-0"`, `3/16" = 1'-0"`.
* Test dual-unit statement reconciliation:
  - Input: `"TOTAL PREMISES AREA = 10907.8046 SQ. M. OR 117411.609 SQ.FT."`
  - Assert: `unit_primary == METRIC_METER`, `scale_ratio == 250`, `stated_area_sqm == 10907.8046`, `stated_area_sqft == 117411.609`.
  - Assert conversion consistency: $|10907.8046 \times 10.7639 - 117411.609| < 0.1$.

#### Coordinate Transformation (`test_coordinate_transforms.py`)
* Test bidirectional transformations:
  - Normalize Gemini `[0, 1000]` box `[120, 250, 480, 600]` to Canonical `[0.0, 1.0]`.
  - Remap Canonical to high-res canvas $(2800 \times 3300 \text{ px})$.
  - Remap to PDF PostScript points $(841.89 \times 595.28 \text{ pt})$.
  - Verify inversion round-trip invariance: $\mathbf{x} \equiv \mathcal{T}^{-1}(\mathcal{T}(\mathbf{x}))$ within float epsilon $\le 10^{-6}$.

#### Deterministic Geometry (`test_stage5_geometry_engine.py`)
* Closed polygon Shoelace formula calculation on known CAD boundary coordinates.
* Wall polyline length calculation with T-junction and L-corner deduplication.
* Opening deduction subtractions: Wall Gross Area ($20 \text{ m}^2$) - Door Void ($2.1 \times 0.9 = 1.89 \text{ m}^2$) = Net Area ($18.11 \text{ m}^2$).
* Non-convex polygon self-intersection detection and automatic repair via Shapely `buffer(0)`.

#### Derived Material Formulas (`test_stage10_derived_materials.py`)
* Verify Brickwork Volume: $V = L \times H \times T$.
* Verify Dry Mortar Requirements: $V_{\text{mortar}} = V \times 0.25 \times 1.333$ (IS 2250 standard).
* Verify Plaster Area: Internal plaster (single face) vs external plaster (double face) with opening deductions following IS 1200 rules.

---

### 3.2. Integration Test Layer (`tests/integration/`)

#### Pipeline Ingestion to Normalized Representation (`test_stage3_ingestion_ocr.py`)
* Feed native vector PDF `assets/barakar 01.11.2025-Model WITHOUT GRID.pdf`.
* Verify extracted vector paths count $> 500$.
* Verify raster rendering achieves adaptive target dimensions $> 2500 \text{ px}$.
* Verify OCR token harvest produces spatial bounding boxes with non-null text.

#### Gemini Service Adapter (`test_gemini_service.py`)
* Test structured JSON generation using mock cassette and live test keys.
* Test rate-limit backoff under HTTP 429 response.
* Test escalation trigger: Ensure confidence score $< 0.70$ redirects request to `gemini-3.1-pro-preview`.
* Verify token accounting logs exact usage.

#### Evidence Fusion Graph (`test_stage7_evidence_fusion_graph.py`)
* Feed simulated candidate detections:
  - Node A: Gemini detects Door "D1" at `[0.2, 0.3, 0.25, 0.35]` (conf: 0.88).
  - Node B: OpenCV detects door opening arc at `[0.201, 0.299, 0.249, 0.352]` (conf: 0.95).
  - Node C: Schedule table states D1 count = 4.
* Assert fusion graph generates cross-edge between Node A and Node B ($\text{IoU} > 0.85$).
* Assert resulting item status is `VERIFIED`.

---

### 3.3. Regression Benchmarks (The Barakar Invariant)

#### Test Case: `test_regression_barakar_site_survey()`
* **Input File**: `assets/barakar 01.11.2025-Model WITHOUT GRID.pdf`.
* **Execution**: Full end-to-end takeoff run via `TakeoffEngine.process_document()`.
* **Strict Regression Assertions**:
  1. `classification.drawing_type == DrawingType.SITE_TOPOGRAPHICAL_SURVEY`
  2. `classification.confidence >= 0.90`
  3. `takeoff.doors_count == 0` (MUST NOT hallucinate 8 interior/balcony doors)
  4. `takeoff.windows_count == 0` (MUST NOT hallucinate 8 windows or louvered vents)
  5. `takeoff.plumbing_fixtures_count == 0` (MUST NOT hallucinate WC, wash basin, kitchen sink, showers)
  6. `takeoff.cabinetry_count == 0` (MUST NOT hallucinate kitchen cabinets, cooktop)
  7. `takeoff.room_count == 0` (MUST NOT extract "Main Living Space", "Secondary Suite")
  8. `takeoff.site_area_sqm` matches `10907.80 \pm 150 \text{ m}^2`
  9. `takeoff.boundary_wall_perimeter_m` calculated deterministically from boundary polyline.
  10. All generated items have valid `ValidationStatus` (`VERIFIED` or `SUPPORTED`). Zero `REJECTED` items promoted to final BOQ.

#### Test Case: `test_regression_bengal_architectural_floorplan()`
* **Input File**: Synthetic / CAD Bengal 3BHK Floor Plan.
* **Strict Regression Assertions**:
  1. `classification.drawing_type == DrawingType.ARCHITECTURAL_FLOOR_PLAN`
  2. All 3 bedrooms, living room, kitchen, and 2 toilets accurately bounded by closed polygon contours.
  3. Door count matches Door Schedule exactly ($\pm 0$).
  4. Floor finish area equals Net Carpet Area (Gross Area minus Wall Footprint).

---

### 3.4. Failure Mode & Adversarial Stress Tests (`tests/stress/`)

| Test ID | Stress Scenario | Expected System Behavior |
| :--- | :--- | :--- |
| `FAIL-01` | Blueprint with missing scale string | Sets `scale_ratio = None`. Calculates normalized polygon areas ($[0.0, 1.0]^2$). Flag items as `NEEDS_REVIEW`. Prevents physical unit conversion. Zero ungrounded guessing. |
| `FAIL-02` | Contradictory scale callouts (`1:100` in title block vs `1:200` under detail) | Flags drawing with `AmbiguityFlag = True`. Emits `NEEDS_REVIEW` alert. Escalates to human review in frontend UI. |
| `FAIL-03` | Rotated drawing ($90^\circ$ or $180^\circ$ orientation) | Ingestion layer reads PDF `/Rotate` dictionary and runs Tesseract/EasyOCR OSD (Orientation and Script Detection) to auto-upright canvas prior to OCR and Gemini ingestion. |
| `FAIL-04` | Scanned blueprint with heavy coffee stain / noise | OpenCV adaptive Gaussian thresholding cleans background. OCR returns low-confidence tokens. Gemini parses title block. High uncertainty items routed to `NEEDS_REVIEW`. |
| `FAIL-05` | Dense structural rebar grid overlapping floor plan | Vector path filtering separates fine grid lines by stroke color/dash pattern. Prevents grid lines from fragmenting room contour polygons. |
| `FAIL-06` | Network timeout during Gemini API call | Exponential backoff triggers 4 retries. If unresolvable, returns `SUPPORTED` vector/OCR items with warning banner: `"Semantic VLM enrichment unavailable. Running in deterministic-only mode."` Pipeline does NOT crash. |

---

## 4. Continuous Integration & Quality Gates

The test harness runs via `pytest` with code coverage enforcement:

```bash
# Run complete test suite with coverage
pytest tests/ -v --cov=ostaad_boq --cov-report=term-missing --cov-fail-under=85

# Run strict regression tests only
pytest tests/test_drawing_classifier.py tests/test_stage16_master_audit.py -v
```

### Pull Request Quality Gates
1. **Zero Regression**: `test_regression_barakar_site_survey` must pass with $100\%$ compliance.
2. **Coverage Threshold**: Code coverage across `ostaad_boq/` must not drop below $85\%$.
3. **Type Safety**: `mypy ostaad_boq/ --strict` must report 0 errors.
4. **Style Enforcement**: `ruff check ostaad_boq/` must report 0 lint violations.
