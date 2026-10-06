# OSTAAD BLUEPRINT-TO-BOQ HYBRID ENGINE
## Comprehensive System Architecture & Engineering Specification

---

### 1. Executive Summary & Core Architectural Principle

The **Ostaad Blueprint-to-BOQ Engine** transforms complex 2D construction drawings (PDF, CAD vectors, raster scans) into fully reconciled, standardized, and auditable Bills of Quantities (BOQ).

#### The Non-Negotiable Invariant
> **Vision-Language Models (Gemini) provide SEMANTIC PERCEPTION AND CANDIDATE EVIDENCE, NEVER AUTHORITATIVE MEASUREMENTS.**
>
> In construction estimating, a 10% discrepancy in concrete volume, rebar tonnage, or boundary wall length causes contractors to lose bids or face catastrophic financial overruns on site. Physical quantities (lengths, perimeters, closed polygon areas, opening deductions) are computed strictly by deterministic coordinate geometry and verified mathematical algorithms (Green's Theorem, Shoelace Formula, Euclidean vector math).

---

### 2. End-to-End Target Architecture

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
                   GEMINI 3.8 FLASH SEMANTIC PERCEPTION LAYER
                   (Escalation: Gemini 3.1 Pro Preview on ambiguity)
     - Title Block Extraction (Project Name, Scale String, Revision, Stated Area)
     - Schedule Parsing (Door/Window Schedule, Area Summary Statement)
     - Legend Interpretation (Symbol Tags: BW, GW, CR, TBM, BM)
     - Candidate Object Detection (Bounding Boxes normalized to [0, 1000])
     - Room Label to Space Association
                                       │
                                       ▼
                            EVIDENCE FUSION ENGINE
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

### 3. Subsystem Specifications

#### 3.1. Ingestion & Coordinate Canonicalization Layer
Blueprints arrive in varied physical sizes (ARCH D 36"×24", ISO A1, ISO A3, or arbitrary CAD model spaces). The system establishes a single **Canonical Coordinate Space**:
* **Normalized Coordinates**: All bounding boxes and vector vertices are normalized to `float` ranges `x ∈ [0.0, 1.0]`, `y ∈ [0.0, 1.0]`, with origin `(0.0, 0.0)` at the **top-left corner**.
* **Adaptive DPI Rendering**: 
  $$\text{effective\_dpi} = \max\left(\text{target\_dpi}, \text{int}\left(\text{target\_dpi} \times \frac{1120.0}{\max(\min(\text{pw}, \text{ph}), 400.0)}\right)\right)$$
  Guarantees that regardless of point size (e.g. 800×600 pt CAD exports vs. 2400×1800 pt sheets), the raster canvas achieves a uniform resolution between 2,500 and 3,300 pixels along its major axis, preventing OCR degradation across fine SHX stroked CAD lines.
* **Vector Path Harvesting**: PyMuPDF extracts native drawing paths (`lines`, `rects`, `curves`, `polylines`), preserving layer names and stroke properties without raster blur.

#### 3.2. Gemini 3.8 Flash Semantic Perception Layer
Gemini acts as an advanced **perceptual observer**:
1. **Target Model**: `gemini-3.8-flash` via the official Google GenAI SDK (`google-genai`).
2. **Escalation Path**: If confidence falls below 0.70 or schedule table structural conflicts occur, auto-escalate to `gemini-3.1-pro-preview`.
3. **Structured Schemas (`response_mime_type="application/json"`)**:
   - `TitleBlockMetadata`: Stated scale ratio, drawing title, total premises/gross area, unit strings, revision date.
   - `ScheduleExtraction`: Door/window/finish schedules parsed into tabular lists.
   - `SymbolLegendMapping`: Abbreviation to full description mapping (`BW` → Boundary Wall, `TBM` → Temporary Benchmark).
   - `DetectedCandidates`: Bounding boxes (`box_2d` in `[0, 1000]` format) and object classes.
4. **Coordinate Transformation Function**:
   $$\text{bbox}_{\text{norm}} = \left(\frac{y_{\min}}{1000}, \frac{x_{\min}}{1000}, \frac{y_{\max}}{1000}, \frac{x_{\max}}{1000}\right) \xrightarrow{\text{standard}} \left(\frac{x_{\min}}{1000}, \frac{y_{\min}}{1000}, \frac{x_{\max}}{1000}, \frac{y_{\max}}{1000}\right)$$

#### 3.3. Multi-Modal Evidence Fusion Engine
The engine models all perception streams as nodes in an **Evidence Corroboration Graph**:
* **Evidence Node Sources**:
  1. `native_vector_text`: PyMuPDF native TrueType text blocks (Weight: 1.0).
  2. `native_vector_path`: Direct CAD line geometry (Weight: 1.0).
  3. `ocr_raster`: EasyOCR / PaddleOCR text extractions (Weight: 0.85).
  4. `gemini_perception`: Gemini 3.8 Flash semantic extractions (Weight: 0.90).
  5. `dimension_callout`: Explicitly stated dimensions on drawing (Weight: 0.95).
  6. `tabular_schedule`: Door/window schedules (Weight: 0.95).
* **Validation Status Classification**:
  - `VERIFIED`: Confirmed by $\ge 2$ independent, concurring evidence streams (e.g. Gemini detection + vector opening contour + door schedule entry).
  - `SUPPORTED`: Single high-confidence detection with geometric plausibility.
  - `NEEDS_REVIEW`: Conflict between streams (e.g. Schedule states 8 doors, but Gemini detects 7, or stated area differs by $>10\%$ from polygon measurement).
  - `REJECTED`: Pure VLM hallucination with zero geometric, vector, or OCR backing.

#### 3.4. Deterministic Geometry Engine
The geometry engine is the **sole mathematical authority**:
* **Wall Linear Runs**: Wall centerlines traced via morphological skeletonization or native vector collinear clustering, multiplied by calibrated scale.
* **Closed Polygon Areas**: Shoelace formula across contour vertices:
  $$\text{Area}_{\text{real}} = \frac{\frac{1}{2} \left| \sum_{i=1}^{n-1} (x_i y_{i+1} - x_{i+1} y_i) + (x_n y_1 - x_1 y_n) \right|}{\text{pixels\_per\_unit}^2}$$
* **Opening Deductions**: Door and window openings automatically deducted from gross wall face area:
  $$\text{Area}_{\text{net}} = \text{Area}_{\text{gross}} - \sum (\text{Width}_{\text{opening}} \times \text{Height}_{\text{opening}})$$

#### 3.5. Anti-Hallucination & Invariant Enforcement
* **Invariant 1: Drawing Classification Gate**:
  If `classification.drawing_type == SITE_TOPOGRAPHICAL_SURVEY`, the architectural room extractor is hard-disabled. `report.rooms` is guaranteed `[]`.
* **Invariant 2: Unit Conversion Reconciler**:
  If `title_block.total_premises_area` is extracted with unit `SQ.FT.` (`117,411.609`), but the scale is metric, it is automatically converted:
  $$\text{Area}_{\text{SQM}} = \frac{117411.609}{10.7639} = 10,907.80\text{ SQ.M.}$$
* **Invariant 3: Unresolved Scale Quarantine**:
  If scale cannot be calibrated from explicit strings or corroborated dimensions, all lengths and areas are emitted in `UnitType.NORM` and `UnitType.NORM_SQ`. Unit costs are suppressed to prevent bogus financial projections.

#### 3.6. Work Breakdown Structure (WBS) & Regional Pricing
* **CSI MasterFormat 2020**: 50 Divisions with 6-digit section codes (e.g., `31 10 00` Site Clearing, `32 31 00` Fences & Boundary Walls, `03 30 00` Cast-in-Place Concrete, `04 20 00` Unit Masonry, `09 24 00` Portland Cement Plastering).
* **CPWD Delhi Schedule of Rates (DSR 2023)**: Metric Indian benchmark pricing database with itemized labor, material, and equipment percentages.
* **RSMeans Standard Estimating**: Imperial US benchmark pricing database in USD.
* **Separation of Quantities**:
  - `MEASURED_QUANTITY`: Primary geometric measurements (`is_measured = True`).
  - `DERIVED_QUANTITY`: Rule-of-thumb secondary materials (`is_measured = False`), such as mortar volume, drywall sheets, paint coverage, or plaster area, with explicit mathematical formulas documented.
