# BuildBharat ERP

> **Enterprise Indian Construction Operations, Procurement & Blueprint-to-BOQ Automation Platform**

BuildBharat ERP is a purpose-built construction operations management system engineered specifically for Indian general contractors, infrastructure developers, and commercial builders. It seamlessly bridges AI-powered 2D/CAD blueprint takeoff with full enterprise procurement, dual approval gates (Operations & Finance), site store physical inventory tracking (GRN), and two-way invoice reconciliation.

---

## 1. Architectural Highlights

* **Pure PostgreSQL Architecture**: Backed by standard PostgreSQL (AWS RDS / Self-Hosted Docker) with SQLAlchemy 2.0 ORM. Zero third-party proprietary BaaS (no Supabase dependency).
* **Strictly Internal Enterprise Operations**: No external client dashboard or customer-facing views. Dedicated exclusively to internal corporate teams (Project Managers, Finance Executives, and Site Storekeepers).
* **Streamlined Site Workflows**: Removed bureaucratic QA/QC lab registers and manual tape-measurement JMR theft reconciliation to focus strictly on operational speed and financial accuracy.
* **Mandatory Dual Approval Gates**:
  1. **Operations Verification Gate**: Project Managers must inspect and sign off on all blueprint draft BOQ items before procurement can be initiated.
  2. **Finance Budget Approval Gate**: Project Managers recommend vendor quotes, but Purchase Orders (POs) remain strictly **locked**. Only the Finance Department can approve the procurement budget and unlock PO transmission to vendors.
* **Flexible Payment Scheduling**: Finance configures advance payments (0% to 100%) or milestone tranches (Part-by-Part) and logs all disbursements with bank reference numbers (UTR, RTGS/NEFT, Cheque No).
* **Site Store Physical Delivery (GRN)**: Site storekeepers record incoming materials at the project godown with mandatory delivery challan photo URLs, vehicle numbers, damaged goods deduction, and a 5% maximum over-delivery guard.
* **Two-Way Match Settlement Engine**: Automated matching comparing contracted PO landed rates against physical net accepted GRN goods against vendor tax invoices. Caps rates at the PO contract and quantities at physical store receipts before authorizing final balance disbursements.

---

## 2. End-to-End Operational Lifecycle

```
[2D Blueprint / CAD Ingestion]
               │
               ▼
   [Draft BOQ Generation] ──(Unverified)──> [Procurement Blocked]
               │
               ▼
[1. Project Manager Sign-off Gate]
               │
               ▼
[2. IS 456 Material Decomposition]
  (e.g., Concrete -> Cement bags, Sand, Aggregate, Steel)
               │
               ▼
[3. Vendor RFQ Packages & Multi-Bid Collection]
  (WhatsApp magic link tokens, 72h auto-expiry)
               │
               ▼
[4. Landed Cost Evaluation & L1/L2/L3 Comparative Statement]
  (Base Rate + Freight + GST % = True Landed Unit Cost)
               │
               ▼
[5. Manager Quote Recommendation]
  (PO Created with PENDING_FINANCE_APPROVAL status - LOCKED)
               │
               ▼
[6. MANDATORY FINANCE BUDGET APPROVAL GATE]
  (Finance selects Advance vs Part-by-Part; unlocks PO Dispatch)
               │
               ▼
[7. Advance Payment Disbursement & Bank UTR Logging]
               │
               ▼
[8. Site Store Physical Receiving (GRN)]
  (Challan photo URL, truck no., damaged quantity deducted, godown stock synced)
               │
               ▼
[9. Two-Way Match Invoice Reconciliation]
  - Invoiced Rate > PO Rate? -> Automatically capped at contracted PO rate.
  - Invoiced Qty > Net GRN?  -> Automatically capped at physical accepted goods.
               │
               ▼
[10. Final Balance Settlement & PO Closure]
  (Disburse remaining balance with UTR; mark PO FULLY_SETTLED)
               │
               ▼
[11. Executive Operational & Financial Reports]
```

---

## 3. Role-Based Access Control (RBAC)

| Role | System Scope & Permissions |
| :--- | :--- |
| **`OPERATIONS`** | Project Managers & Site Engineers. Upload blueprints, review draft BOQ items, perform BOQ verification signoff, decompose materials, generate RFQs, and recommend vendor bids. |
| **`FINANCE`** | Chief Financial Officers & Accounts Managers. Review recommended POs, grant budget clearance, select payment terms (Advance % vs Part-by-Part), log manual bank UTR/RTGS/Cheque disbursements, perform two-way match invoice reconciliation, and execute final settlements. |
| **`SITE_STORE`** | Godown Managers & Site Storekeepers. Log physical gate receipts against dispatched POs, record challan numbers, truck numbers, and challan photo URLs, deduct damaged items, and increment godown stock. |
| **`ADMIN` / `SUPERADMIN`** | Enterprise Administrators. Full multi-tenant configuration, project provisioning, user onboarding, and access to all operational & financial audit logs. |

---

## 4. Corporate Codebase Structure

```
BlueprintBOQ/
├── ostaad_boq/
│   ├── app.py                         # FastAPI web application entrypoint
│   ├── engine.py                      # Core Blueprint-to-BOQ takeoff engine
│   ├── models.py                      # Pydantic schemas for takeoff
│   └── erp_core/                      # BuildBharat ERP Core Package
│       ├── api.py                     # All 17 FastAPI REST endpoints
│       ├── database/
│       │   ├── session.py             # PostgreSQL SQLAlchemy engine & session factory
│       │   ├── models.py              # Pure PostgreSQL ORM schemas (15-digit GSTIN, RBAC)
│       │   └── verification_service.py# PM BOQ verification gatekeeper
│       ├── boq/                       # Quantity formula & hierarchical WBS calculations
│       ├── materials/                 # Indian Standard IS 456 & packaging calculators
│       ├── procurement/
│       │   ├── procurement_service.py # Decomposition, RFQs, Landed cost & L1 engine
│       │   ├── finance_approval_service.py # Finance gate, payment & GRN receiving
│       │   └── settlement_service.py  # 2-way match reconciliation & executive reporting
│       └── stores/                    # Godown inventory management
├── tests/
│   └── unit/                          # 67 unit tests covering 100% of ERP workflows
├── simulate_pilot_workflow.py         # Full standalone live pilot simulation script
└── README.md                          # This architecture & operations documentation
```

---

## 5. REST API Reference

The ERP endpoints are mounted on prefix `/api/v1/erp`:

### A. BOQ Verification Gate
* `POST /api/v1/erp/boq/verify`: PM verifies a specific BOQ item.
* `POST /api/v1/erp/boq/verify-all`: PM performs bulk signoff on all draft project BOQ items.
* `GET  /api/v1/erp/boq/can-dispatch/{project_id}`: Checks if project BOQ is verified for procurement.

### B. Material Decomposition & RFQs
* `POST /api/v1/erp/procurement/decompose`: Decomposes verified BOQ items into raw materials (IS 456).
* `POST /api/v1/erp/procurement/rfq`: Creates an RFQ package with 72h expiry and WhatsApp magic tokens.
* `POST /api/v1/erp/procurement/bids`: Vendor submits quote; computes GST and landed cost per unit.
* `GET  /api/v1/erp/procurement/comparative/{rfq_id}`: Generates dynamic L1/L2/L3 comparative statement.
* `POST /api/v1/erp/procurement/recommend`: PM selects preferred vendor quote (creates locked PO).

### C. Mandatory Finance Budget Approval Gate
* `POST /api/v1/erp/finance/approve`: Finance approves budget, sets payment terms (Advance vs Part-by-Part), and unlocks PO dispatch.
* `POST /api/v1/erp/finance/reject`: Finance rejects proposed PO with audit reason.
* `POST /api/v1/erp/finance/payment`: Records manual bank disbursement (Bank UTR / RTGS / Cheque No).

### D. Site Store Physical Delivery (GRN)
* `POST /api/v1/erp/stores/grn`: Storekeeper logs physical delivery with challan photo, vehicle number, and damaged goods deduction; increments warehouse stock.

### E. Two-Way Match Settlement & Order Closure
* `POST /api/v1/erp/reconciliation/invoice`: Matches PO landed rate vs Site GRN net accepted qty vs Vendor Invoice.
* `POST /api/v1/erp/reconciliation/settle`: Disburses final settlement with UTR and closes PO (`is_fully_settled = True`).

### F. Executive Reports
* `GET  /api/v1/erp/reports/procurement/{project_id}`: Real-time procurement and warehouse godown report.
* `GET  /api/v1/erp/reports/expenditure/{project_id}`: Financial cash outflow & outstanding liabilities report.
* `GET  /api/v1/erp/reports/vendor-ledger/{vendor_id}`: Vendor commercial ledger with bank audit trail.

---

## 6. How to Run the Server & Interactive Testing

### Step 1: Start the Backend Server
Run the FastAPI development server using Uvicorn:
```powershell
.venv\Scripts\python.exe -m uvicorn ostaad_boq.app:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at `http://localhost:8000`. You can explore interactive Swagger documentation at:
**`http://localhost:8000/docs`**

---

### Step 2: Run the Live End-to-End Pilot Simulation
To see the entire real-world lifecycle executed in seconds (from master setup to final bank UTR settlement and executive reports):
```powershell
.venv\Scripts\python.exe simulate_pilot_workflow.py
```

**Expected Output**:
```text
================================================================================
 BUILDBHARAT ERP - FULL PILOT LIFECYCLE SIMULATION
================================================================================
>>> STEP 1: Master Data Setup (Tenant, RBAC Roles, Project)
 [OK] Tenant: Larsen & Toubro Construction Ltd (GSTIN: 27AAACL1234F1Z1)
 [OK] Project: Navi Mumbai International Airport - Terminal 2 (Zone A) | Contract: Rs 250,000,000.00
 [OK] Personnel: PM (Rajesh Sharma), Finance (Sunita Iyer), Site Store (Ramesh Pawar)

>>> STEP 2: Blueprint Takeoff -> Draft BOQ Generated
 [OK] Extracted Item: M25 Grade Reinforced Cement Concrete for Substructure Footings and Columns
      Quantity: 120.0 CUM @ Rs 6,500.00 = Rs 780,000.00
      Verification Status: UNVERIFIED (Procurement Strictly Blocked)

>>> STEP 3: Project Manager Verification Gate
 [OK] BOQ verification completed by PM Rajesh Sharma.
 [OK] Eligibility for Procurement: True

>>> STEP 4: Material Decomposition via IS 456
 [OK] Decomposed 120.0 CUM of M25 concrete into raw materials:
      - OPC 53 Cement (C-101): 1331.0 BAG
      - Coarse Sand (C-101): 16.315 BRASS
      - 20mm Coarse Aggregate (C-101): 32.631 BRASS

>>> STEP 5: RFQ Package Generation & Multi-Vendor Bidding
 [OK] Issued RFQ Package for 1331.0 BAG of OPC 53 Cement (C-101)
 [OK] Dynamic Comparative Statement Generated (L1 Bidder: Ultratech Cement Ltd @ Rs 454.40)

>>> STEP 6: Project Manager Quote Recommendation Gate
 [OK] PO Generated: PO-XXXX | Value: Rs 604,806.40
 [!] PO Status: PENDING_FINANCE_APPROVAL | Dispatched to Vendor: False
     -> PO is strictly LOCKED. It CANNOT be sent to vendor without Finance Budget Approval.

>>> STEP 7: MANDATORY FINANCE BUDGET APPROVAL GATE
 [OK] Finance Clearance Granted by Sunita Iyer!
      Payment Structure: PART_BY_PART | Advance: 25.0%
      Advance Amount Due: Rs 151,201.60
      PO Dispatch Status: DISPATCHED TO VENDOR (True)

>>> STEP 8: Advance Payment Disbursement & Bank UTR Logging
 [OK] Advance Payment Logged: Rs 151,201.60 via NEFT_RTGS | UTR: HDFCR52026102600881234

>>> STEP 9: Site Store Physical Receiving (GRN) & Godown Inventory
 [OK] GRN 1 Logged: Truck MH-04-AZ-9988 -> 700 bags accepted.
 [OK] GRN 2 Logged: Truck MH-04-BY-1122 -> 631 bags received (11 damaged, 620 net accepted).
 [OK] Total Net Physical Accepted at Site: 1,320 Bags
 [OK] Real-time Warehouse Inventory: 1320.0 BAG in stock.

>>> STEP 10: Two-Way Match Reconciliation
 [!] Reconciliation Status: QUANTITY_DISCREPANCY
     Vendor Claimed: 1331.0 Bags (Rs 604,806.40)
     Site GRN Net Received: 1320.0 Bags
     System Approved Payable: 1320.0 Bags @ Rs 454.40 = Rs 599,808.00
     Audit Variance Note: Invoiced quantity 1331.0 exceeds physical net received 1320.0. Capped at physical goods received.

>>> STEP 11: Final Balance Settlement & Purchase Order Closure
 [OK] Final Settlement Paid: Rs 448,606.40 via NEFT_RTGS | UTR: SBINR52026102600987654
      Total Paid to Vendor: Rs 599,808.00 | Outstanding Balance: Rs 0.00
      Purchase Order Status: FULLY SETTLED = True

>>> STEP 12: Executive Reports & Audit Statements
 [A] PROJECT PROCUREMENT STATUS REPORT
 [B] EXECUTIVE FINANCIAL EXPENDITURE REPORT
 [C] VENDOR COMMERCIAL LEDGER
================================================================================
 PILOT SIMULATION COMPLETED WITH 100% SUCCESS
================================================================================
```

---

### Step 3: Run the Automated Unit Test Suite
To verify the entire test suite (all 67 unit tests across all milestones):
```powershell
.venv\Scripts\python.exe -m pytest tests/unit/ -v
```
All 67 tests will pass with 100% success rate.
