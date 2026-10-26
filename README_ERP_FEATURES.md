# Next-Gen Construction ERP & AI Estimation Platform
## Comprehensive Feature Specification & Architecture Roadmap

This document outlines the complete feature set consolidated from three leading open-source construction and takeoff platforms (**OpenConstructionERP**, **cad2data**, and **OpenTakeoff**). It provides an exhaustive, modular blueprint designed for sharing with clients, investors, estimators, and development teams.

---

## 1. Bill of Quantities (BOQ) & Cost Estimation

* **Hierarchical Tree Structure:** Organize estimates into Sections, Work Packages, Positions, and Sub-positions with drag-and-drop reordering.
* **Inline Spreadsheet Editing:** Click-to-edit cells, fast tab navigation, and full keyboard shortcuts (Undo/Redo with `Ctrl+Z` / `Ctrl+Y`).
* **Resource Recipes & Assemblies:** Link specific labor crews, materials, equipment, and plant machinery to each line item to create reusable cost templates.
* **Automatic Markup Calculations:** Apply custom overhead, contractor profit margin, VAT/taxes, and contingency percentages per project or by regional defaults.
* **Real-time Cost Rollups:** Automatic computation where `Quantity × Unit Rate = Item Total`, rolling up into section subtotals and grand totals with markups.
* **Global Cost Databases (120,000+ Items):** Pre-loaded with regional construction costs across 30+ international markets and 9 national building norms (China, Spain, Brazil, Turkey, Italy, Greece, Vietnam, Indonesia).
* **Semantic Cost Search:** AI-powered search that matches meaning rather than exact words (e.g., typing *"concrete wall"* finds *"reinforced partition C30/37"*).
* **Regional Price Scaling:** Automatically adjusts labor and material unit rates based on the project's geographic location.
* **Custom Database Import:** Upload company rate sheets and vendor catalogs via Excel, CSV, or REST API.

---

## 2. 2D Blueprint Takeoff & Canvas Measurement

* **Zero-Install Browser Canvas:** High-performance, client-side rendering running entirely in the browser (using HTML5 Canvas, WebAssembly, and local storage) with zero mandatory file uploads.
* **Multi-Format Plan Ingestion:** Drag and drop multi-page PDFs, scans, photos, screenshots, or entire `.zip` bid archives directly into the canvas.
* **Vector-Sharp Dynamic Zoom:** Re-renders linework directly from underlying PDF vectors at high zoom levels so architectural lines, text, and hatches never blur.
* **Dark Blueprint Mode:** One-click pixel inversion to view drawings in high-contrast dark mode (white lines on black background) to reduce eye fatigue.
* **Multi-Sheet & Match-Line Stitching:** View up to 4 sheets side-by-side and stitch large split drawings together across match lines to measure across floor sections seamlessly.
* **One-Click Room Tracing (Flood Fill):** Click inside an enclosed room to automatically trace wall boundaries into a clean polygon, automatically ignoring floor hatches and tile patterns.
* **Manual Measurement Toolkit:**
  * **Area Polygon:** Click room corners to calculate area and perimeter.
  * **Rectangle Tool:** Two-click bounding box for fast square/rectangular rooms.
  * **Linear Runs:** Wall, pipe, and trench runs with live segment lengths.
  * **Curved Line Tool:** Measure curved walls, arcs, and radius corners.
  * **Surface Area Tool:** Automatically calculates vertical wall surface areas based on measured perimeter and specified wall/ceiling height.
  * **Count & Deduct Stamps:** Point-and-click counter for fixtures/doors and cut-out tools to subtract column drops, stairs, and door openings.
* **Drafting Snapping & Angle Locks:** Automatic 45° and 90° orthogonal locks (holding `Shift` forces square lines) with endpoint snapping to CAD vertices.
* **Perpendicular Transition Detection:** Automatically detects floor finish boundary joints and highlights doorway thresholds that require transition strips.

---

## 3. Scale Calibration & Quality Control

* **Auto Scale Detection:** Automatically reads drawn title block scale notes (e.g., `1:100`, `1:250`, `1/4" = 1'-0"`).
* **Two-Point Calibration:** Calibrate scale by clicking two points across any known dimension line on the drawing.
* **Dimension Accuracy Checker (`K` Shortcut):** Click an existing dimension string and type its value to receive an instant tolerance grade (**Green** <1%, **Amber** <5%, **Red** >5%) with a one-click recalibration button.
* **Visual Calibrated Ruler Bar:** Drops an on-screen reference ruler onto the sheet immediately after setting the scale to visually catch 2× or 10× scale mistakes before takeoff begins.
* **Unit-Agnostic Storage:** Stores geometry in raw vector coordinates and allows one-click toggling between Imperial (SF, SY, LF) and Metric ($m^2$, $m$, 1:50 ratios) without altering recorded measurements.

---

## 4. Finish Schedules & Material Calculators

* **Architectural Schedule OCR Import:** Scans door, window, and finish schedule tables from the drawing and auto-creates condition items (matching tags like `WD-01`, `C-101`).
* **Condition Styling:** Assign distinct colors, line weights, and standard CAD hatch patterns to each finish condition.
* **Supporting Consumables Calculator:** Automatically calculates required job site consumables (adhesives, primers, thinset, grout, sealers) using coverage rates and rounds up to full commercial packaging units (bags/buckets).
* **Grout Bag Estimator:** Calculates exact grout bags required based on tile dimensions, tile thickness, grout joint width, and bag weight.
* **Roll Goods & Seam Layout Engine:** 
  * Automatically calculates roll laying patterns for carpets and sheet vinyl based on roll widths.
  * Nests cuts to scale and displays roll order footage.
  * Calculates exact seam linear footage (weld rods/seam tape) based on actual joined lane borders.

---

## 5. CAD & BIM File Ingestion (ETL Pipeline)

* **Standalone / Offline CAD Converters:** Convert closed CAD/BIM files without requiring Autodesk Revit, AutoCAD, or cloud SaaS licenses:
  * **Revit (`.rvt` 2015–2026):** Exports to Excel database, DAE 3D geometry, native schedules, and 2D PDF drawings.
  * **Revit to IFC (`RVT2IFC`):** Converts Revit models to standard IFC2x3, IFC4, IFC4.3, IFCXML, and HDF5.
  * **AutoCAD (`.dwg` 1983–2026):** Converts drawings into structured Excel property tables and 2D PDFs.
  * **IFC (`.ifc`):** Extracts property sets to Excel and 3D polygonal geometry.
  * **MicroStation (`.dgn` v7–v8):** Converts elements and levels into Excel databases.
* **Tabular Normalization (DataFrames):** Flattens complex 3D BIM objects into clean spreadsheet tables where rows represent unique elements (with bounding boxes X/Y/Z) and columns represent parameters.
* **Linked 3D BIM Viewer:** Interactive 3D model viewer (rotate, zoom, pan) with element IDs linked directly to BOQ line items.
* **BIM Quantity Picker:** Allows estimators to select volumes, surface areas, or lengths directly from 3D BIM objects and transfer them into BOQ lines with traceable source tags.
* **Bidirectional Sync (Excel to Revit):** Updates Revit model parameters directly from modified Excel spreadsheets.

---

## 6. AI Automation & Autonomous Agent Capabilities

* **MCP (Model Context Protocol) Integration:** Built-in MCP tool suite (50+ tools) allowing external AI agents (Claude, Gemini, Antigravity) to open drawings, calibrate scales, read schedules, trace rooms, and produce reports.
* **In-Canvas "Bring Your Own Key" AI Agent:** Connect any OpenAI- or Anthropic-compatible API endpoint directly within the browser canvas to autonomously measure drawings.
* **Proposal & Approval Workflow:** AI-generated measurements are rendered with dashed boundaries and cannot be finalized until a human estimator reviews and accepts them.
* **AI Prompt-to-BOQ Generator:** Describe a project in plain English, upload a site photo, or provide a PDF to have AI draft a complete Bill of Quantities with estimated market rates.
* **AI Cost Advisor Chatbot:** Context-aware assistant that answers questions regarding material alternatives, cost benchmarks, and estimating standards.
* **Universal BIM Classification with RAG:** Uses LLM + Vector databases (LanceDB / Qdrant) to classify unorganized CAD layers into MasterFormat, UniFormat, OmniClass, or DIN 276.
* **Embodied Carbon ($CO_2$) Estimator:** Uses AI to calculate environmental carbon footprints for building elements extracted from BIM files.

---

## 7. Revisions, Markup, RFIs & Site Collaboration

* **Quantity Revision Comparison:** Save named snapshot revisions (e.g., *Bid Set*, *Addendum 1*) and generate automated delta reports showing exactly which quantities changed without altering historical data.
* **Drawing Markup Layer:** Place revision clouds, arrows, callouts, text notes, highlighters, and image screenshots on a separate non-calculating drawing layer.
* **Estimator Approval Seals:** Digital stamp for verified drawings that adds a formal review tally to the cover page (*e.g., 42 Estimator-Approved · 8 Agent-Marked*).
* **Built-in RFI Register:** Convert drawing notes into formal Requests for Information (RFIs) with status tracking, priority, ball-in-court assignment, and cost/schedule impact flags.
* **BIM Clash Detection:** Identify spatial collisions between architectural, structural, and MEP models with automated rule-based grouping.
* **4D / 5D Project Scheduling:** Link BOQ line items and BIM geometry to Gantt schedules and cash flow forecasts.
* **Daily Site Diary & HSE Tracking:** Record on-site labor logs, weather conditions, equipment usage, and Health, Safety & Environment incident reports.
* **3D Geospatial Site Tracking (Cesium):** 3D globe visualization to locate and track multiple project sites geographically.

---

## 8. Auditing, Validation & Exports

* **158-Rule Compliance Checker:** Automated rule validation engine flagging missing quantities, zero prices, duplicate items, and checking standards compliance (DIN 276, NRM, MasterFormat, GAEB).
* **Measurement Provenance:** Every single measurement records its mathematical formula, scale, source layer, and whether it was created by an agent or human.
* **Distribution-Ready Marked Set PDF:** Exports a complete high-resolution planset PDF showing all color-coded takeoffs, stamps, and review seals ready for general contractors.
* **Full-Precision Excel Workbooks:** Multi-tab exports including *Project Summary*, *By-Sheet Breakdown*, *Materials Buy List*, *Room-by-Room Takeoff*, and *Geometry Audit Trails*.
* **Industry Standard Formats:** Export directly to CSV, JSON, and GAEB XML (X83) for international tendering.
* **Local-First & Optional Cloud Sync:** Operates offline with zero data leakage by default, with optional enterprise sync to cloud storage (Google Drive / S3 / PostgreSQL).
