# BuildBharat ERP — Granular Implementation Plan & Open-Source Integration
## Micro-Step Development Plan, Testing Criteria & Open-Source Feature Mapping (Client View Removed)

---

## 1. Executive Summary & Streamlined Internal Operational Scope

BuildBharat ERP is an internal enterprise operations, commercial procurement, and financial governance platform for Indian construction and contracting companies.

### Core Architectural Decisions:
1. **Client View Removed:** There is **no external client dashboard or client portal**. The system serves strictly internal company departments (Operations, Finance, Site Store, Labour, Admin).
2. **QA/QC Lab & Theft Calculations Removed:** No Pour Cards, concrete cube breaking test registers, or physical tape JMR material theft calculations.
3. **Mandatory Finance Budget Gate:** Project Manager selects the preferred vendor quote $\rightarrow$ Finance approves budget $\rightarrow$ Purchase Order (PO) issued to vendor.
4. **Flexible Manual Payment Terms:** Finance configures Advance % vs. Part-by-Part milestone tranches and logs bank UTR/RTGS transaction numbers manually.
5. **Open-Source Features Extracted & Embedded:** Reusable core features from `OpenConstructionERP`, `cad2data`, and `OpenTakeoff` have been directly extracted and integrated into `ostaad_boq/erp_core/` with 100% unit test coverage.

---

## 2. Open-Source Feature Extraction & Codebase Mapping

The following components have been extracted from `opensource_erp/` and placed into `ostaad_boq/erp_core/`:

| Open-Source Project | Source Component Extracted | Placed in Our Codebase | Operational Function |
| :--- | :--- | :--- | :--- |
| **OpenConstructionERP** | `backend/app/modules/boq/wbs_tree.py`, `units.py` | `ostaad_boq/erp_core/boq/units.py`, `wbs_tree.py` | Standardized Indian civil units (BAG, MT, BRASS, CUM, SQM) and hierarchical WBS tree calculation. |
| **OpenConstructionERP** | `backend/app/modules/boq/quantity_formula.py` | `ostaad_boq/erp_core/boq/quantity_formula.py` | Safe AST arithmetic formula evaluation for dimensions and quantities. |
| **OpenConstructionERP** | `backend/app/modules/validation/rules/` | `ostaad_boq/erp_core/boq/validators.py` | Structural validation rules (checking zero quantities, duplicate WBS codes, missing descriptions). |
| **cad2data** | `ddc-tools/src/ddc_tools/` & binary runners | `ostaad_boq/erp_core/cad_converters/cad_adapter.py` | Maps extracted CAD/BIM elements (RVT, IFC, DWG) into unverified draft BOQ items. |
| **OpenTakeoff** | `web/src/math/materials.js`, `coverage.js` | `ostaad_boq/erp_core/materials/packaging.py` | Commercial order packaging and roundup math with wastage percentages. |
| **Custom Indian BIS Engine** | IS 456 & IS 1200 Concrete & Mortar Formulas | `ostaad_boq/erp_core/materials/dry_mix_calculator.py` | Dry-volume conversion for M15, M20, M25 concrete into OPC 43/53 bags, sand, aggregate, and brickwork. |
| **Custom Finance Governance** | Finance Clearance Gate & Payment Engine | `ostaad_boq/erp_core/procurement/finance_gate.py`, `rfq_engine.py`, `payment_tracker.py` | L1/L2/L3 comparative statements, mandatory Finance budget approval, and Advance/Part-by-Part tracking. |
| **Custom Site Stores** | Material Delivery & Stock Tracking | `ostaad_boq/erp_core/stores/grn_service.py` | Goods Receipt Note (GRN) logging and real-time site godown stock balance. |

---

## 3. Micro-Step Implementation Plan with Granular Testing

The rollout is divided into small, testable micro-steps. Each step requires automated tests before proceeding.

```
Step 1.1 ──▶ Step 1.2 ──▶ Step 2.1 ──▶ Step 2.2 ──▶ Step 3.1 ──▶ Step 3.2 ──▶ Step 4.1 ──▶ Step 4.2
Database     CAD Ingest   RFQ Bids     Mgr Select   Finance Gate  Store GRN    Final Match  Pilot Run
```

### Milestone 1: Core Foundation & Verified BOQ Service
* **Micro-Step 1.1: Database Schemas & Migrations**
  * Deploy PostgreSQL tables: `tenants`, `projects`, `users`, `boq_items`, `material_requirements`.
  * *Automated Test 1.1:* Test database connection, enforce 15-digit Indian GSTIN regex validation, and test UUID foreign keys.
* **Micro-Step 1.2: CAD/BIM Extraction to Draft BOQ**
  * Wire `cad_adapter.py` and `ostaad_boq` geometry engine to produce unverified draft BOQ items.
  * *Automated Test 1.2 (`test_cad_adapter_mapping`):* Verify CAD element volume/area maps to correct `CivilUnit` with `is_verified = False`.
* **Micro-Step 1.3: Manual Engineer Verification Gate**
  * Provide API endpoint `/api/v1/boq/{id}/verify` allowing designated project engineer to digitally sign off quantities.
  * *Automated Test 1.3:* Verify that procurement requisition triggers throw an exception if unverified items are present.

### Milestone 2: Material Math, Vendor RFQ & Manager Selection
* **Micro-Step 2.1: Indian Standard Material Decomposition**
  * Run `dry_mix_calculator.py` to convert concrete volumes into bags of OPC 43/53 or PPC cement, sand brass, and aggregates.
  * *Automated Test 2.1 (`test_indian_concrete_materials_math`):* Verify 10 m³ of M20 concrete produces exactly 81 cement bags (with 1.54 dry coefficient).
* **Micro-Step 2.2: Dynamic Vendor RFQs & Comparative Statement**
  * Run `rfq_engine.py` to receive live vendor bids (Base Rate + Freight + GST) and calculate landed costs.
  * *Automated Test 2.2 (`test_rfq_comparative_statement_l1_ranking`):* Verify that bids are sorted accurately from lowest (L1) to highest.
* **Micro-Step 2.3: Manager Vendor Recommendation**
  * Project Manager selects the preferred vendor and submits the order to Finance.
  * *Automated Test 2.3:* Verify that PO status transitions to `PENDING_FINANCE_APPROVAL` and is blocked from dispatching to the vendor.

### Milestone 3: Finance Budget Approval Gate & Payment Scheduling
* **Micro-Step 3.1: Finance Approval Engine**
  * Finance reviews the manager's recommended vendor, checks project budget, selects payment mode (`Advance` vs `Part-by-Part`), and inputs advance percentage.
  * *Automated Test 3.1 (`test_mandatory_finance_approval_gate`):* Verify that if Finance approves with 30% advance, advance amount and balance amount are calculated with zero arithmetic error, and PO unlocks for dispatch.
* **Micro-Step 3.2: Manual Payment Recording**
  * Finance logs advance payment with bank UTR number, bank name, payment date, and transaction mode.
  * *Automated Test 3.2:* Verify payment record links to PO and updates remaining balance payable.

### Milestone 4: Site Stores Receiving (GRN) & Accounts Settlement
* **Micro-Step 4.1: Site Store Delivery (GRN Entry)**
  * Storekeeper inputs truck number, delivered count, and uploads challan photo using `grn_service.py`.
  * *Automated Test 4.1 (`test_site_godown_stock_service`):* Verify godown stock balance increases by received quantity and rejects over-issuance.
* **Micro-Step 4.2: Final 2-Way Invoice Matching & Order Closure**
  * Finance matches vendor final invoice against Store GRN received quantity and deducts advance already paid.
  * *Automated Test 4.2:* Verify that final payment marks the PO as `FULLY_SETTLED`.

---

## 4. Operational Walkthrough in Real Life (No Client View)

1. **Office Planning:** The engineer uploads the plan, reviews the material quantities (cement, steel, bricks), and clicks **"Approve Quantities"**.
2. **Getting Quotes:** The system generates WhatsApp quotation links for local vendors. Vendors enter their rates. Dealer B offers the lowest landed price (L1).
3. **Manager Selection:** The Project Manager selects Dealer B and clicks **"Submit to Finance for Money Approval"**.
4. **Finance Approval Gate:** The Finance Manager checks the project budget. He selects **"Part-by-Part: 30% Advance now, 70% after delivery"**, and clicks **"Approve PO"**.
5. **PO Sent & Advance Paid:** The official Purchase Order is sent to Dealer B. Finance pays the 30% advance via RTGS and enters the Bank UTR number.
6. **Site Delivery:** The cement truck arrives at the construction site. The storekeeper counts 500 bags, takes a photo of the delivery challan with his mobile phone, and saves the GRN. Site godown stock updates immediately.
7. **Settlement:** Dealer B submits his final invoice. Finance checks that 500 bags were received, pays the remaining 70% balance, logs the UTR, and marks the order complete.
