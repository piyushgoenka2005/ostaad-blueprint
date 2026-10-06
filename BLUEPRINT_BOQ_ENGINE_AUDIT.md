# TECHNICAL AUDIT OF THE BLUEPRINT-TO-BOQ ENGINE
**Document Version:** 1.0.0  
**Target Drawing Under Audit:** `assets/barakar 01.11.2025-Model WITHOUT GRID.pdf`  
**Audit Status:** COMPLETE — FORENSIC ROOT CAUSES IDENTIFIED

---

## 1. Executive Summary

This audit establishes the forensic root cause of why the existing Blueprint-to-BOQ engine produced fabricated architectural quantities (doors, windows, water closets, showers, kitchen cabinets, cooktops, and interior drywall) when given a **civil topographical/site survey** (`barakar 01.11.2025-Model WITHOUT GRID.pdf`).

### The Critical Fact
`barakar 01.11.2025-Model WITHOUT GRID.pdf` is **NOT an architectural floor plan**. It is a **topographical and boundary site survey** of a 10,907.80 sq. metre compound executed by Finetech Associates in Kolkata, featuring:
- Bituminous roads and concrete roads
- Green fields and a playground
- A swimming pool
- Boundary walls, guard walls, and fencing
- Electrical posts, lamp posts, and temporary benchmarks
- Scale 1:250

The existing engine has **zero drawing classification logic**. When ingested, the drawing was pushed down an unconstrained residential apartment pipeline, where fallback defaults hallucinated an entire 2-bedroom home on an outdoor survey.

---

## 2. Forensic Failure Analysis: The 5 Hallucination Mechanisms

### Mechanism 1: Missing Drawing-Type Classification Layer
- **Location:** `ostaad_boq/engine.py` (lines 30–55)
- **Root Cause:** The pipeline directly assumes every incoming PDF or image is an architectural floor plan. There is no pre-extraction classification stage to distinguish between `SITE_TOPOGRAPHICAL_SURVEY`, `STRUCTURAL_DRAWING`, `ELECTRICAL_DRAWING`, and `ARCHITECTURAL_FLOOR_PLAN`.
- **Impact:** Site boundary lines were interpreted as interior wall boundaries.

### Mechanism 2: Native Vector Text Early-Exit Dropping SHX Stroked Fonts
- **Location:** `ostaad_boq/ocr.py` (lines 104–122)
- **Code:**
  ```python
  # 1. Native CAD / Vector PDF Text
  if sheet.is_vector_pdf and sheet.native_text:
      for block in sheet.native_text:
          ...
      if items:
          return items  # <-- EARLY RETURN DROPS OCR!
  ```
- **Root Cause:** The Barakar PDF contains 43 TrueType text blocks (such as "FINETECH ASSOCIATES" and "GREEN FIELD") and **17,022 native CAD vector paths**. In AutoCAD, technical annotations (`SCALE 1:250`, `TOTAL PREMISES AREA = 10907.8046 SQ. M.`) are plotted as stroked vector lines (SHX fonts). Because `items` had 43 entries, the engine returned immediately, **completely bypassing EasyOCR** and throwing away the 218 stroked text callouts on the drawing!

### Mechanism 3: Scale Calibration Missing 1:250 and Decimal OCR Delimiters
- **Location:** `ostaad_boq/scale.py` (line 19)
- **Code:**
  ```python
  METRIC_SCALE_PATTERN = re.compile(r"""1\s*:\s*(?P<ratio>20|50|100|200|500)""", re.IGNORECASE)
  ```
- **Root Cause:**
  1. The regex only matches ratios `20, 50, 100, 200, 500`. Scale `250` was hardcoded out!
  2. OCR often reads `1:250` as `1.250` or `1 250` due to stroked colon dots. The regex strictly demanded a colon `:`.
- **Impact:** Drawing scale was marked `unresolved`, but downstream processing proceeded anyway without disabling dimensional takeoff.

### Mechanism 4: Unconditional Residential Fallback Template in VLM Engine
- **Location:** `ostaad_boq/vlm_engine.py` (lines 142–188)
- **Smoking Gun Code:**
  ```python
  if d_tags:
      ...
  else:
      int_doors = max(room_count - 2, 4)  # <-- FORCED 4 INTERIOR DOORS
      ext_doors = 2                        # <-- FORCED 2 EXTERIOR DOORS

  if w_tags or v_tags:
      ...
  else:
      casement_windows = max(int(room_count * 1.1), 6) # <-- FORCED 6 WINDOWS
      vent_windows = 2                                 # <-- FORCED 2 VENTS

  # Fixtures based on room presence
  has_kitchen = any("kitchen" in r["name"].lower() for r in extracted_rooms) or True  # <-- HARDCODED or True!
  bath_count = sum(...) or 2                                                           # <-- HARDCODED or 2!

  # Rooms fallback
  "rooms": extracted_rooms or [
      {"name": "Main Living Space", "stated_area_sqft": 450.0, "confidence": 0.80},
      {"name": "Secondary Suite", "stated_area_sqft": 250.0, "confidence": 0.80},
  ]
  ```
- **Forensic Truth:** When 0 door tags, 0 window tags, and 0 room callouts were found on the Barakar site survey, the engine **fabricated**:
  - 4 Interior Doors
  - 2 Exterior Doors
  - 6 Casement Windows
  - 2 Louvered Ventilators
  - 2 Water Closets
  - 2 Wash Basins
  - 1 Kitchen Sink
  - 2 Showers
  - 1 Range/Cooktop
  - 1 Kitchen Countertop
  - 2 Rooms ("Main Living Space" 450 SF, "Secondary Suite" 250 SF)

### Mechanism 5: Unchecked Material Derivation on Survey Geometry
- **Location:** `ostaad_boq/reconciliation.py` (lines 205–235)
- **Root Cause:**
  - It took the fabricated 700 SF of fallback rooms and generated: `Finished Flooring Underlayment & Surface: 700.0 SF [Measured]`.
  - It took the closed contour lines of the site survey fence/roads (3,800+ LF) and multiplied by 9 ft wall height and 2 sides, generating: `1/2" Gypsum Wallboard: 68,000+ SF [Estimated]` on outdoor ground!

---

## 3. Comprehensive Repository Component Audit

| Subsystem | File | Current Implementation | Flaws / Vulnerabilities | Action Needed |
| :--- | :--- | :--- | :--- | :--- |
| **Ingestion** | `ostaad_boq/ingest.py` | PyMuPDF raster rendering (150 DPI) + vector text blocks | Drops vector drawings paths; does not fuse vector strokes with raster OCR | **Modify** in Stage 3 |
| **OCR** | `ostaad_boq/ocr.py` | Native PDF text + EasyOCR fallback | Drops OCR if any native text exists; fails on stroked SHX CAD fonts | **Modify** in Stage 3 |
| **Scale Engine** | `ostaad_boq/scale.py` | Imperial & metric regex | Missing 1:250 ratio, dot delimiters, and dimension line reconciliation | **Modify** in Stage 4 |
| **Geometry** | `ostaad_boq/geometry.py` | OpenCV Otsu thresholding + morphology | Assumes all closed contours are building rooms (`SITE GEOMETRY == ROOM GEOMETRY`) | **Modify** in Stage 5 |
| **VLM / Semantic** | `ostaad_boq/vlm_engine.py` | Gemini 2.5 Flash + local fallback | Hardcoded residential defaults (`or True`, `or 2`, default doors/windows) | **Modify** in Stage 6 & 7 |
| **Reconciliation** | `ostaad_boq/reconciliation.py` | Stated vs measured area comparison | Lacks `NO EVIDENCE = NO QUANTITY` guard; derives drywall on unresolved scale | **Modify** in Stage 7 & 8 |
| **Classifier** | *Non-existent* | None | **Missing entirely**; treats all files as residential floor plans | **Create** in Stage 2 |
| **Evidence Graph** | *Non-existent* | None | No fusion between schedules, geometry, detector, and OCR | **Create** in Stage 7 |
| **Web UI** | `ostaad_boq/app.py` | FastAPI + HTML5/CSS canvas dashboard | Does not display validation statuses or allow estimator line rejection | **Modify** in Stage 12 |
| **Export** | `ostaad_boq/exporter.py` | openpyxl XLSX + CSV | Mixes estimated and derived quantities into active totals | **Modify** in Stage 13 |

---

## 4. Licensing Audit

| Dependency / Component | Current License | Commercial Viability | Risk Analysis |
| :--- | :--- | :--- | :--- |
| `FastAPI` / `Starlette` | MIT | 100% Permissible | Zero risk |
| `Pydantic` V2 | MIT | 100% Permissible | Zero risk |
| `OpenCV Headless` | Apache 2.0 | 100% Permissible | Zero risk |
| `EasyOCR` | Apache 2.0 | 100% Permissible | Zero risk |
| `PyMuPDF` (`fitz`) | GNU AGPL / Commercial | AGPL copyleft if modified; standard wrapper | Safe for standalone backend API; commercial license available if closed-source binary linking required |
| `OpenPyXL` | MIT | 100% Permissible | Zero risk |
| `Shapely` | BSD 3-Clause | 100% Permissible | Zero risk |
| `Pillow` | HPND | 100% Permissible | Zero risk |
| `PolyForm Noncommercial` | **PURGED** | **ELIMINATED** | All legacy files deleted in previous cleanup pass |

---

## 5. Architectural Redesign Recommendations

```
[Uploaded Blueprint PDF / Image]
               │
               ▼
┌───────────────────────────────┐
│ Stage 2: Drawing Classifier   │ ──► [Non-Architectural / Site Survey] ──► [Specialized Civil / Site Takeoff]
└──────────────┬────────────────┘                                           (Earthwork, Fencing, Paving)
               │ (Architectural Floor Plan ONLY)
               ▼
┌───────────────────────────────┐
│ Stage 3 & 4: Ingestion & Scale│ ──► [Scale Unresolved?] ──► [Flag NEEDS_REVIEW; Block Dimensional Takeoff]
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Stage 5 & 6: Geometry + CV    │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Stage 7: Evidence Fusion      │ ──► [Strict Rule: NO EVIDENCE = NO QUANTITY]
│ & Anti-Hallucination Graph    │      (Quarantine unsupported items to REJECTED / NEEDS_REVIEW)
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ Stage 8: Deterministic BOQ    │
└───────────────────────────────┘
```

---

## 6. Codebase File Action Matrix

### Files to Reuse As-Is
- `ostaad_boq/models.py`: Solid Pydantic V2 data structures (extend with validation status).
- `assets/indian_bengal_floorplan.png`: Valid 2BHK benchmark.
- `assets/indian_bengal_3bhk_plan.png`: Valid 3BHK benchmark.
- `Dockerfile`, `docker-compose.yml`, `wrangler.toml`: Cloudflare deployment infrastructure.

### Files to Modify
- `ostaad_boq/engine.py`: Insert drawing classification before entity extraction; enforce evidence fusion gates.
- `ostaad_boq/ocr.py`: Prevent native-text early exit; parse stroked vector SHX text.
- `ostaad_boq/scale.py`: Add `1:250`, decimal dot notation, and explicit dimension line constraints.
- `ostaad_boq/geometry.py`: Strictly separate site area from room area; prevent survey polygons from becoming rooms.
- `ostaad_boq/vlm_engine.py`: Remove all hardcoded default fallbacks (`or True`, `or 2`, default rooms).
- `ostaad_boq/reconciliation.py`: Implement multi-source evidence fusion and validation status tagging.
- `ostaad_boq/app.py`: Support bi-directional canvas tracing and human review actions.
- `ostaad_boq/exporter.py`: Segregate Verified vs Needs Review vs Rejected line items in Excel.

### Files to Create
- `ostaad_boq/classifier.py` (Stage 2)
- `ostaad_boq/evidence_graph.py` (Stage 7)
- `tests/test_drawing_classifier.py` (Stage 2)
- `tests/test_barakar_negative.py` (Stage 11)
