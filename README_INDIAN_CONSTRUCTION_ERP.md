# BuildBharat ERP — Next-Gen Indian Construction ERP
## Enterprise Construction Management, Commercial Procurement Governance & Financial Cash Flow Control

---

## 1. Executive Summary & Vision

**BuildBharat ERP** is an internal, multi-departmental construction ERP engineered strictly for the Indian construction, contracting, and real estate ecosystem. 

Western ERPs fail in the Indian market because they enforce rigid international formats (DIN, NRM, MasterFormat), rely on static pre-populated price books, require high-spec laptops on dusty construction sites, and omit the ground realities of Indian commercial procurement.

BuildBharat ERP bridges the gap between field execution and corporate control through:
1. **Direct CAD/BIM Ingestion (No License Needed):** Parses raw Revit (`.rvt`), IFC, and DWG files into tabular data and 3D web models without costly CAD software licenses.
2. **Indian Bureau of Standards (BIS) & Material Engineering:** Native support for IS 1200, IS 456, IS 383, CPWD/State PWD schedules, standardized cement grades (**OPC 43, OPC 53, PPC**), and rebar grades (**Fe 500 / 550D**).
3. **Dynamic Vendor Quotations (No Static Price Book):** Material quantities automatically compile into trade-specific Requests for Quotations (RFQs) distributed to regional vendors via WhatsApp and SMS for competitive live market bidding.
4. **Mandatory Finance Budget Gate (Manager $\rightarrow$ Finance $\rightarrow$ Vendor):** After the Project Manager selects a preferred vendor quote, the order goes to the **Finance Department for final financial approval**. No Purchase Order (PO) is issued to a vendor without Finance clearance.
5. **Flexible Payment Terms Engine:** Finance configures payment schedules manually (Advance Payment, Part-by-Part milestone tranches, or Credit on delivery) and records transaction reference numbers (RTGS/UTR/Cheque).
6. **Site Delivery Receipts (GRN):** Storekeepers verify deliveries on mobile, record quantities, and upload delivery challan photos.
7. **Role-Isolated Dashboards:** Dedicated views for **Project Operations**, **Finance & Accounts**, **Site Stores**, **Labour & Contractors**, **Company Admin**, and **Platform Super Admin (Star Dashboard)**.

---

## 2. In-Scope vs. Out-of-Scope Capabilities

| Module / Domain | Status | Operational Logic & Justification |
| :--- | :--- | :--- |
| **BOQ & Hierarchical WBS** | **IN-SCOPE** | Indian standard work packages (Earthwork, RCC, Masonry, Finishing, MEP). |
| **Regional Price Scaling** | **IN-SCOPE** | Auto-scales transport freight and labor rates based on project state and district. |
| **Vendor Dynamic Quotations** | **IN-SCOPE** | Automated RFQ packages dispatched to local vendors via WhatsApp / web forms. |
| **Finance Budget Approval Gate** | **IN-SCOPE** | Mandatory check where Finance must clear the manager's selected quote before PO release. |
| **Flexible Payment Scheduling** | **IN-SCOPE** | Finance chooses Advance vs Part-by-Part milestone payments; logs UTR numbers manually. |
| **Site Store GRN & Delivery Photos** | **IN-SCOPE** | Storekeeper logs truck arrival on mobile with paper delivery challan photos. |
| **CAD/BIM ETL Pipeline** | **IN-SCOPE** | Converts `.rvt`, `.ifc`, `.dwg` into tabular DataFrames and lightweight 3D web meshes. |
| **Finish Schedules & Material Math**| **IN-SCOPE** | Dry-volume conversion for concrete, mortar (1:4, 1:6), plaster, brick count, and tiles. |
| **Revisions, Markups & RFIs** | **IN-SCOPE** | Digital change orders, drawing markups, site snagging, and formal RFIs. |
| **Indian Standards & Compliance** | **IN-SCOPE** | IS 1200, IS 456, IS 383, OPC 43/53, PPC, Fe 500/550D rebar, Indian GST/TDS rules. |
| **Client External Dashboard / View** | *REMOVED* | Eliminated. Software is strictly for internal company departments. |
| **QA/QC Testing Lab** | *REMOVED* | Eliminated. No digital Pour Cards or 7/14/28-day concrete cube breaking test registers. |
| **Theft & JMR Measuring Work** | *REMOVED* | Eliminated. No physical tape Joint Measurement Records or theoretical vs actual reconciliation. |
| **Real-time Cost Auto Roll-up** | *REMOVED* | Replaced by formal approval gates. Costs roll up only after vendor quotes are vetted. |
| **Global Cost DB & Semantic AI** | *REMOVED* | Eliminated. Western cost items replaced by Indian IS/CPWD material libraries. |
| **2D Blueprint Manual Canvas** | *REMOVED* | Eliminated. Quantities derived directly from CAD/BIM models or structured schedules. |
| **Scale Calibration Engine** | *REMOVED* | Eliminated. Measurements calculated from native 3D BIM vectors and dimensions. |
| **Autonomous AI Agents (MCP)** | *REMOVED* | Eliminated. Replaced by transparent, auditable Indian civil engineering formulas. |

---

## 3. High-Level Integrated System Architecture

```
                      ┌────────────────────────────────────────┐
                      │    CAD / BIM Models (.rvt, .ifc, .dwg) │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │  BIM/CAD Data Extraction Service (ETL) │
                      │  (Tabular DataFrames + 3D Web Meshes)  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Indian Material Calculator Engine   │
                      │  - IS 1200 / IS 456 Dry-Mix Formulas   │
                      │  - Cement (OPC 43/53, PPC), Sand, TMT  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Unpriced BOQ & Requisition Pack     │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        Vendor RFQ & Bidding Engine     │
                      │  (WhatsApp / SMS / Mobile Web Portal)  │
                      │  - Live Rates, Freight, GST Breakdown  │
                      │  - Automated L1 / L2 / L3 Comparative  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │  Project Manager Evaluates & Selects   │
                      │  Preferred Vendor Quotation            │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
══════════════════════════════════════════════════════════════════════════
  MANDATORY FINANCE CLEARANCE GATE (Finance Department)
  - Finance checks manager's selected quote against project budget
  - Configures Payment Structure: [Advance Payment] OR [Part-by-Part]
  - Approves PO ──▶ Formal Purchase Order Dispatched to Vendor
══════════════════════════════════════════════════════════════════════════
                                          │
     ┌────────────────────────────────────┼────────────────────────────────────┐
     │                                    │                                    │
     ▼                                    ▼                                    ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│   Finance Payment Log   │  │   Site Operations/Store │  │   Labour & Contractor   │
│ - Advance Paid (UTR)    │  │ - Goods Inward (GRN)    │  │ - Daily Muster Roll     │
│ - Milestone Payouts     │  │ - Delivery Challan Pics │  │ - Skilled/Unskilled Log │
│ - 2-Way Match to Invoice│  │ - Godown Stock Balance  │  │ - Contractor Billing    │
└────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
             │                            │                            │
             └────────────────────┬───────┴────────────────────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │ Admin & Star Platform   │
                     │ - Company Audit Logs    │
                     │ - Role & User Controls  │
                     │ - Multi-Tenant Health   │
                     │ - Regional Supply Chain │
                     └─────────────────────────┘
```

---

## 4. Departmental Dashboards

### 1. Operations & Project Management Dashboard
* **BOQ & Requisition:** View project quantities, review extracted building elements, and trigger vendor RFQs.
* **Comparative Bid Evaluation:** Automated L1 / L2 / L3 comparison matrix factoring base price, freight, and GST.
* **Vendor Recommendation:** Selects preferred vendor and submits request to Finance for budget approval.

### 2. Finance & Accounts Dashboard
* **Procurement Approval Gate:** Inbox of pending vendor selections submitted by Project Managers.
* **Budget Verification:** Compares order value against allocated project budget.
* **Payment Terms Configuration:** Selects Advance % or Part-by-Part milestone tranches for approved orders.
* **Manual Payment Logging:** Records transaction references (NEFT/RTGS UTR numbers, cheques, payment dates, bank names).
* **2-Way Invoice Matching:** Matches approved PO landed rate with Site Store GRN delivery receipt to clear vendor balance invoices.

### 3. Site Operations & Stores Dashboard
* **Digital Goods Inward (GRN):** Logs incoming delivery trucks on mobile, counts delivered units, and snaps photos of physical challans.
* **Godown Inventory Balance:** Live tracking of cement bags, sand, aggregates, and steel on site.
* **Plant & Machinery:** Operating logs for mixers, cranes, and site generators.

### 4. Labour & Contractor Dashboard
* **Daily Muster Roll:** Mobile headcount entry for skilled trades (masons, carpenters, bar benders) and helpers.
* **Contractor Billing:** Records work done by labor piece-rate contractors.
* **Advance (Kharcha) vs Settlement:** Tracks weekly cash advances against final billings.

### 5. Company Admin & Platform Super Admin (Star Dashboard)
* **Company Controls:** Multi-project creation, branch oversight, and granular role permissions.
* **Vendor Directory:** Pre-qualified vendor directory with performance ratings and GST verification.
* **Multi-Tenant Platform Health:** Global database metrics, tenant billing, and platform-wide supply chain price trends.
