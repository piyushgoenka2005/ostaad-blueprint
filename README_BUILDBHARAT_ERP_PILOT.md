# BuildBharat ERP

## End-to-End Construction Project Management and Procurement ERP

### Updated Scope and Pilot Implementation Plan

**Document purpose:** Approval-ready scope and implementation blueprint
for the first client-led pilot.

**Current approach:** Build a practical, end-to-end ERP for construction
projects. Reuse the existing blueprint-to-BOQ software, require manual
verification before quantities are used for procurement, and keep
integrations and calculations simple for the first release.

------------------------------------------------------------------------

## 1. Executive Summary

BuildBharat ERP is a construction project operations platform for Indian
construction companies, contractors, developers, and project teams. It
connects project planning, BOQ review, procurement, site stores, quality
checks, work measurements, billing, and management reporting in one
system.

The first release will focus on a reliable end-to-end workflow rather
than advanced automation. Users will be able to manage project records,
review BOQ quantities, contact vendors manually, record quotations,
create purchase orders, track deliveries and stock, record QA/QC checks,
prepare work measurements and draft bills, and view project progress and
costs.

The system will use the existing blueprint-to-BOQ software for initial
quantity extraction. The resulting BOQ will remain a draft until a
designated person manually checks and approves the quantities. No
purchase request or order should rely on unverified extracted
quantities.

### First-release principles

-   Build one connected system with role-based screens for each
    department.
-   Keep the workflow understandable for site and office staff.
-   Use existing blueprint-to-BOQ software rather than building a new
    extraction engine.
-   Start with basic drawing support and add formats only when required
    and validated.
-   Require manual quantity review before procurement.
-   Let the team contact vendors by phone and enter quotations manually.
-   Keep tax calculations basic and configurable, with finance review
    before payment.
-   Keep approvals, audit history, security, backups, and error handling
    in scope.
-   Defer advanced AI, automatic theft detection, WhatsApp vendor
    automation, and complex integrations.

------------------------------------------------------------------------

## 2. Goals and Success Criteria

### Goals

1.  Maintain a single source of truth for projects, BOQs, vendors,
    procurement, site records, quality checks, measurements, and bills.
2.  Connect the key departments through a traceable workflow.
3.  Reduce duplicate data entry and improve visibility into project
    status, material availability, approvals, and costs.
4.  Keep important decisions under authorised human control.
5.  Allow the client to test the ERP independently using realistic
    project workflows.

### Pilot success criteria

The pilot is successful when the client can:

-   Create a project and assign users.
-   Upload a supported drawing or use the existing blueprint-to-BOQ
    tool.
-   Review, correct, and approve the generated BOQ.
-   Create material requests from approved quantities.
-   View vendor contact details, call vendors, and record their quoted
    prices and terms.
-   Compare quotations and approve a purchase order.
-   Record deliveries, rejected/damaged quantities, stock movements, and
    material issues.
-   Complete the agreed QA/QC and site measurement records.
-   Prepare draft RA bills and review material reconciliation.
-   View consistent project progress and cost information.
-   Trace key changes and approvals.
-   Complete the agreed client test cases without developer
    intervention.

------------------------------------------------------------------------

## 3. Scope: Included in the First Release

  -----------------------------------------------------------------------
  Module                              First-release capabilities
  ----------------------------------- -----------------------------------
  Project management                  Project setup, project details,
                                      dates, contract value, status, team
                                      members, and basic work breakdown
                                      structure (WBS).

  Drawing and BOQ                     Use the existing blueprint-to-BOQ
                                      software; support only the
                                      initially agreed input format(s);
                                      store extraction output and source
                                      reference; allow manual correction
                                      and approval.

  Material planning                   Convert approved BOQ items into
                                      material requirements and
                                      requisitions. Show units,
                                      quantities, and review status.

  Vendor directory                    Store vendor name, contact person,
                                      phone, location, GST details where
                                      applicable, material categories,
                                      and notes.

  Manual quotations                   Staff call vendors and enter quoted
                                      rate, quantity, freight, tax as
                                      quoted, delivery estimate,
                                      validity, and remarks.

  Procurement                         Compare recorded quotations,
                                      document approval, create purchase
                                      orders, and track order status.

  Site stores                         Record goods receipt, delivery
                                      challan details,
                                      received/rejected/damaged
                                      quantities, stock balance, material
                                      issues, returns, and adjustments.

  QA/QC                               Digital pre-pour checklist, basic
                                      inspection records, concrete
                                      cube-test schedule and results,
                                      steel certificate attachments where
                                      applicable, and defect/snags
                                      register.

  QS and measurements                 Joint Measurement Records (JMR),
                                      measured quantities, approval
                                      status, extra items/variations, and
                                      basic material reconciliation.

  Billing and finance                 Draft RA bills, vendor invoice
                                      records, PO/GRN/invoice checks,
                                      basic configurable tax and
                                      deduction fields, payment status,
                                      and authorised approval before
                                      payment.

  Labour and contractors              Basic contractor directory, daily
                                      attendance/muster records, work
                                      measurement or piece-rate records,
                                      and advance/settlement notes where
                                      required by the pilot.

  Client dashboard                    Plain-language project status,
                                      approved budget versus recorded
                                      costs, pending approvals,
                                      procurement status, work progress,
                                      quality alerts, and basic reports.

  Company administration              User management, project
                                      assignment, role permissions, and
                                      audit history.

  Platform administration             Basic tenant/company management,
                                      system health, and operational
                                      monitoring if the platform is
                                      deployed for multiple companies.
  -----------------------------------------------------------------------

The pilot does not need to launch every module at the same depth.
However, the selected pilot workflow must connect the modules it uses
without relying on developers to repair data or manually update the
database.

------------------------------------------------------------------------

## 4. Explicitly Deferred

The following are not required for the first client pilot:

-   WhatsApp/SMS vendor RFQ automation.
-   Automated vendor discovery or automatic live-market price
    collection.
-   Advanced theft detection or automatic contractor penalties.
-   Complex AI-based material estimation or autonomous engineering
    decisions.
-   Broad CAD/BIM format support beyond the agreed initial format.
-   Building a new blueprint extraction engine when the existing BOQ
    software can be reused.
-   Advanced 3D model visualisation and automatic model-based progress
    detection.
-   Advanced regional price intelligence and dynamic freight prediction.
-   Fully automated tax filing, accounting integrations, or payment
    disbursement.
-   Complex machinery maintenance and fuel analytics.
-   Advanced analytics that are not needed to complete the pilot
    workflow.

These items can be considered after the pilot feedback establishes a
clear business need.

------------------------------------------------------------------------

## 5. End-to-End Operational Workflow

### Step 1: Create project

An authorised user creates the project, enters the basic project
information, assigns the project team, and configures the initial work
packages and approval roles.

### Step 2: Generate and verify the BOQ

1.  Upload a drawing in the supported initial format and send it to the
    existing blueprint-to-BOQ software, or import its output.
2.  Save the source drawing reference and the generated BOQ output.
3.  Mark extracted quantities as **Draft / Pending Review**.
4.  An authorised estimator or engineer checks quantities, units,
    assumptions, and obvious omissions.
5.  The reviewer corrects the BOQ where necessary and records approval.
6.  Only an approved BOQ can be used to create material requisitions.

The system records who reviewed and approved the BOQ and when. The ERP
does not treat extracted quantities as automatically verified
engineering quantities.

### Step 3: Create material requisition

The project or site team selects required materials from the approved
BOQ, confirms the required quantity and unit, adds the required-by date
and site location, and submits the requisition for approval.

### Step 4: Contact vendors and record quotations

The user views suitable vendors from the vendor directory and contacts
them manually by phone or another agreed channel. The user enters each
quotation into the ERP, including the quoted rate, quantity, freight,
tax details as supplied, delivery estimate, quote validity, and notes.

The ERP compares the entered quotations. The system does not
automatically contact vendors or claim to have live market prices.

### Step 5: Approve quotation and create purchase order

An authorised user reviews the quotations, selects the vendor, records
the decision and reason, and creates a purchase order. Any changes after
approval must be traceable. A revised or cancelled order must have an
appropriate status and audit record.

### Step 6: Receive and inspect material

The stores user records the PO, delivery details, challan/reference,
quantities ordered and received, rejected or damaged quantities, and
supporting photos/documents where needed. Accepted quantities update
stock through a recorded stock movement. Rejected or damaged quantities
must not be silently counted as usable stock.

### Step 7: Track stock and material issues

The stores user records material issued to a site, work package, or
authorised recipient. Returns, transfers, and adjustments are also
recorded. The system maintains a movement history so the closing balance
can be reconciled.

### Step 8: Complete site and QA/QC records

The site and QA/QC teams record the agreed inspections, pre-pour
checklist, test sample details, due dates, results, defects, and
supporting documents. Pending, passed, failed, and waived/reviewed
states must be distinguishable where applicable. A failed or pending
check is escalated for authorised review rather than silently treated as
passed.

### Step 9: Record work measurements and reconcile materials

The QS/site team creates JMR records against the relevant BOQ item and
work location. The system calculates or records the measured quantity,
allows review and approval, and supports documented variations or extra
items.

Basic material reconciliation compares approved work quantities and the
agreed consumption assumptions with recorded material issues. Variances
are alerts for review, not automatic proof of theft or grounds for
automatic deductions.

### Step 10: Prepare bills and record payments

The system prepares draft RA bills from approved measurements and agreed
rates. Vendor invoices are checked against the purchase order and goods
receipt records. Basic tax and deduction fields are calculated or
entered using configured rules and are reviewed by authorised finance
staff.

The ERP records approval and payment status. Actual payment release
remains under the company's existing authorised process during the
pilot.

### Step 11: View project status and close the pilot records

The client dashboard shows project progress, procurement, stock, quality
status, pending approvals, and recorded costs. At the end of the pilot,
the team reconciles key records, exports the agreed reports, records
unresolved issues, and obtains client sign-off.

------------------------------------------------------------------------

## 6. Simplified Technical Architecture

### Application layers

1.  **Web application:** Role-based screens for project teams, stores,
    QA/QC, QS/billing, finance, administrators, and client executives.
2.  **Backend API:** Business rules, authentication, permissions,
    approvals, calculations, and workflow transitions.
3.  **PostgreSQL database:** Shared relational data with tenant/project
    boundaries and integrity constraints.
4.  **File storage:** Drawings, BOQ files, challans, inspection photos,
    test records, invoices, and other attachments.
5.  **Existing blueprint-to-BOQ software:** External or existing service
    used to produce draft quantities. The ERP stores its output and
    review status.
6.  **Notifications:** Basic in-app status indicators and, if needed,
    email notifications. Vendor WhatsApp/SMS automation is not part of
    this release.

### Suggested stack

-   Frontend: Next.js
-   Backend: FastAPI
-   Database: PostgreSQL
-   File storage: Private object storage or an equivalent controlled
    storage service
-   Deployment: Managed application/database hosting in an appropriate
    region
-   API documentation and testing: OpenAPI plus automated integration
    tests

The stack is a proposal and can be adapted to the existing codebase. The
team should avoid introducing a separate service unless it is needed for
the pilot.

### Basic architecture flow

``` text
Client / Project Team
        |
        v
Role-Based Web Application
        |
        v
Backend API and Workflow Rules
        |
        +--------------------+
        |                    |
        v                    v
PostgreSQL Database     Private File Storage
        |
        v
Project, BOQ, Procurement, Stores,
QA/QC, JMR, Billing and Reports

Existing Blueprint-to-BOQ Software
        |
        v
Draft BOQ Import -> Manual Review -> Approval
        |
        v
Material Requisition and Procurement
```

------------------------------------------------------------------------

## 7. Core Data Model

The following are the main entities required for the first release.
Exact table names and field definitions should be finalised during
implementation.

### Company and project

-   `tenants`: company/account details.
-   `users`: user identity and account status.
-   `tenant_memberships`: company membership and role.
-   `projects`: project details, location, contract value, dates, and
    status.
-   `project_members`: users assigned to a project and their
    project-level permissions.
-   `wbs_items`: work packages and parent-child hierarchy.

### Drawings and BOQ

-   `project_documents`: file reference, document type, uploaded by,
    upload date, and revision.
-   `boq_versions`: BOQ version, source document, status, reviewer,
    approval date, and notes.
-   `boq_items`: description, WBS, quantity, unit, rate where
    applicable, and review status.
-   `boq_item_changes`: material corrections or revision history where
    needed.
-   `material_requisitions`: project, requested-by user, required date,
    status, and approval.
-   `material_requisition_items`: material, quantity, unit, and linked
    BOQ item.

### Vendor and procurement

-   `vendors`: vendor contact and business details.
-   `vendor_materials`: materials supplied by a vendor.
-   `rfqs`: request reference, project, status, and dates.
-   `rfq_items`: materials and requested quantities.
-   `vendor_quotations`: vendor, quotation date, validity, terms, and
    status.
-   `quotation_items`: item-level rates, quantities, freight, and tax
    fields.
-   `purchase_orders`: vendor, project, order reference, total, and
    status.
-   `purchase_order_items`: ordered materials, quantity, unit, and
    agreed rate.

### Stores and inventory

-   `goods_receipt_notes`: purchase order, delivery reference, receiver,
    and receipt status.
-   `goods_receipt_items`: ordered, received, rejected, and damaged
    quantities.
-   `stock_movements`: receipt, issue, return, transfer, or adjustment,
    including quantity, unit, date, source, and author.
-   `stock_balances`: current material balance by project/site/store,
    reconcilable against movements.

### QA/QC and site work

-   `inspection_records`: inspection type, location, result, evidence,
    and reviewer.
-   `pour_cards`: planned pour, checklist, approval status, and
    responsible users.
-   `concrete_cube_tests`: sample details, test due dates, results, and
    supporting evidence.
-   `material_certificates`: material batch and certificate attachment
    where applicable.
-   `snag_items`: defect, location, photos, assigned party, status, and
    closure record.
-   `jmr_records`: project, BOQ item, work location, date, measurement,
    unit, and approval status.
-   `variation_records`: description, reason, quantity/rate impact, and
    approval status.

### Billing, finance and audit

-   `ra_bills`: bill period, project, gross amount, deductions, net
    amount, and status.
-   `ra_bill_items`: approved measurements, rates, quantities, and
    amounts.
-   `vendor_invoices`: invoice reference, vendor, PO/GRN references,
    amounts, tax fields, and status.
-   `payment_records`: payment reference, amount, date, status, and
    related bill/invoice.
-   `approval_records`: record type, record ID, decision, approver,
    timestamp, and remarks.
-   `audit_logs`: actor, action, record reference, timestamp, and
    relevant change details.
-   `notification_logs`: notification type, status, and error details if
    notifications are enabled.

The database must use foreign keys and appropriate uniqueness and
validation constraints. Financial amounts and quantities must use
suitable numeric types rather than floating-point values. Document and
attachment access must be controlled.

------------------------------------------------------------------------

## 8. Departmental Screens

### 1. Project dashboard

-   Project overview, dates, contract value, status, and team.
-   WBS and basic work progress.
-   Pending tasks and approvals.
-   Links to BOQ, procurement, site, quality, and billing records.

### 2. BOQ and material planning

-   Upload/import output from the existing blueprint-to-BOQ software.
-   Display draft quantities and units.
-   Correct quantities and record assumptions or comments.
-   Approve or reject the BOQ.
-   Create requisitions only from approved quantities.

### 3. Procurement

-   View requisitions and vendor contact details.
-   Record manually collected quotations.
-   Compare vendor rates, delivery estimates, and terms.
-   Record selection and approval reason.
-   Create, revise, cancel, and track purchase orders.

### 4. Site stores

-   Record incoming deliveries and supporting documents.
-   Capture received, damaged, and rejected quantities.
-   View stock balances and movement history.
-   Record material issues, returns, transfers, and adjustments.

### 5. QA/QC

-   Complete pre-pour checklists and inspections.
-   Record cube-test samples, due dates, and results.
-   Attach material certificates where required.
-   Raise and close defects/snags.
-   View overdue or failed checks.

### 6. QS and billing

-   Record and approve JMRs.
-   Track extra items and variations.
-   Compare material issues against agreed consumption assumptions.
-   Prepare draft RA bills and show calculation details.

### 7. Finance and accounts

-   Review vendor invoices against PO and GRN records.
-   Maintain basic tax and deduction fields.
-   Review draft bills and authorised deductions.
-   Record payment status and outstanding amounts.
-   Export records for the company's existing accounting process.

### 8. Company admin

-   Create and deactivate users.
-   Assign roles and project access.
-   Maintain vendor and project master data.
-   Review audit logs and approval history.

### 9. Client executive dashboard

-   Overall project status and milestone progress.
-   Approved budget versus recorded costs.
-   Pending procurement, delivery, quality, and billing items.
-   Simple cost and progress summaries.
-   Downloadable project reports.

------------------------------------------------------------------------

## 9. Basic Business Rules and Controls

### BOQ and quantities

-   Imported or extracted quantities are drafts.
-   An authorised reviewer must approve the BOQ before procurement.
-   Corrections and revisions must be traceable.
-   Each item must have a clear unit and quantity.
-   Unsupported or ambiguous drawings must be flagged for manual
    handling.

### Procurement

-   Quotations are entered by staff and reflect the information actually
    received from vendors.
-   A purchase order requires authorised approval.
-   The approved quote and PO values must be retained for comparison.
-   Changes and cancellations must be recorded.
-   A vendor's quoted price must not be represented as a verified live
    market price.

### Inventory

-   Every receipt, issue, return, transfer, or adjustment creates a
    stock movement.
-   Rejected or damaged materials are not counted as usable stock.
-   Stock balances must reconcile with the movement ledger.
-   Corrections to posted transactions must be traceable.

### QA/QC

-   Only authorised users can approve inspections and pre-pour checks.
-   Pending, passed, failed, and rejected statuses must be clear.
-   Test results and evidence must be linked to the relevant
    project/work record.
-   Failed checks must be visible and require an authorised decision.

### JMR and billing

-   Bills use approved measurements and applicable approved rates.
-   Variations require a recorded approval before inclusion in approved
    billing.
-   Material variance is a review flag, not an automatic finding of
    theft.
-   Draft and approved financial records must be distinguishable.

### Tax and payments

-   Use basic, configurable tax and deduction calculations for the
    pilot.
-   Do not claim to provide complete statutory filing or tax compliance
    automation.
-   Have authorised finance personnel verify the applicable rates and
    treatment.
-   Actual payment release remains under the company's existing approval
    process.

------------------------------------------------------------------------

## 10. Security, Reliability and Audit

Security and reliability are part of the first release, not optional
later enhancements.

### Access control

-   Users must authenticate before accessing project data.
-   Access is limited by company, project, and role.
-   The backend must enforce permissions, not rely only on hiding
    buttons in the frontend.
-   One company's users must not be able to access another company's
    restricted data.
-   Files and attachments must follow the same access restrictions as
    their associated records.

### Auditability

-   Record key approvals, rejections, quantity changes, quotation
    selection, PO changes, stock adjustments, JMR approvals, and bill
    status changes.
-   Record who performed the action and when.
-   Preserve previous values or a useful change history for important
    records.
-   Do not allow normal users to silently alter approved financial or
    procurement records.

### Reliability

-   Use database constraints and transactions for important operations.
-   Protect against duplicate submissions and repeated requests creating
    duplicate orders, receipts, or payments.
-   Provide visible error messages and retain server-side error logs.
-   Back up the database and files, and test that restoration works.
-   Keep development, testing, and pilot environments separate.
-   Provide a documented way to report issues and escalate critical
    failures.

### Minimum security tests

-   Attempt to access another project's data with a modified record ID.
-   Attempt to access another tenant's records and attachments.
-   Attempt approval actions using an unauthorised role.
-   Attempt duplicate receipt/payment submissions.
-   Verify audit history after editing or rejecting a record.
-   Verify that backup restoration recovers the agreed pilot data.

------------------------------------------------------------------------

## 11. Client-Led Pilot Implementation Plan

The proposed target is three weeks for a tightly scoped pilot, assuming
the existing BOQ software is usable, the development team is available,
and the client can provide timely decisions and test data. This is a
target, not a guarantee.

### Week 1: Foundation and core records

**Implementation** - Confirm pilot project, roles, and approval
matrix. - Set up hosting, PostgreSQL, migrations, authentication, and
project permissions. - Build project, document, BOQ, vendor, and
material master APIs/screens. - Integrate the existing blueprint-to-BOQ
output using the agreed input/output method. - Implement BOQ draft,
manual correction, review, and approval.

**Exit criteria** - Client test users can access only their authorised
project. - A BOQ can be imported, reviewed, corrected, approved, and
traced to its source. - Unapproved BOQ quantities cannot create
procurement orders.

### Week 2: Procurement and site operations

**Implementation** - Build requisitions, vendor directory, manual
quotation entry, comparison, and PO approval. - Build GRN,
rejected/damaged quantities, stock movements, and balances. - Build the
selected QA/QC records, JMR, and basic reconciliation. - Add audit
records and exception handling.

**Exit criteria** - A material request can move from an approved BOQ
through quotation and PO to delivery and stock. - Partial delivery and
rejected material are handled correctly. - Stock balances reconcile with
the movement ledger. - Site and quality records can be entered and
reviewed by authorised users.

### Week 3: Billing, dashboard, acceptance and release

**Implementation** - Build draft RA bills and vendor invoice checks. -
Add basic configurable tax/deduction fields and payment status
tracking. - Build the client executive dashboard and basic reports. -
Run internal end-to-end tests and security checks. - Train client users
and execute the agreed acceptance checklist. - Resolve critical defects,
document known limitations, and prepare support/rollback instructions.

**Exit criteria** - The client can complete the agreed end-to-end
scenarios independently. - The key outputs reconcile against the agreed
reference records. - Critical security, data integrity, and workflow
defects are resolved. - The client records acceptance or lists remaining
blockers before live use.

If the exit criteria are not met, the team should extend the relevant
stage rather than launch solely to meet the calendar.

------------------------------------------------------------------------

## 12. Client Acceptance Test Scenarios

The client should test the software using their own assigned accounts
and the agreed pilot dataset.

1.  Create a project and assign project users.
2.  Import a sample BOQ from the existing blueprint-to-BOQ software.
3.  Correct a quantity and approve the BOQ.
4.  Attempt to create a requisition from an unapproved BOQ and confirm
    it is blocked.
5.  Create a requisition from an approved BOQ.
6.  Add two or more manually collected vendor quotations and compare
    them.
7.  Approve a quotation and generate a purchase order.
8.  Record a partial delivery and a damaged/rejected quantity.
9.  Verify the stock balance and movement history.
10. Issue material to a work package and record a return or adjustment.
11. Complete a QA/QC record and record a pending or failed test.
12. Create, correct, and approve a JMR.
13. Compare material consumption with the agreed reference assumptions.
14. Generate a draft RA bill and verify the calculations.
15. Record a vendor invoice and check it against the PO and GRN.
16. Verify that an unauthorised user cannot approve a purchase order or
    bill.
17. Verify that another project's or tenant's records are inaccessible.
18. Review the audit trail and export the agreed reports.
19. Simulate a duplicate submission or network retry and verify that no
    duplicate financial or stock transaction is created.
20. Confirm that the client can report a defect and identify the support
    contact.

For each scenario, record the test user, date, expected result, actual
result, evidence, defect reference, and pass/fail status.

------------------------------------------------------------------------

## 13. Deployment and Pilot Operating Rules

Before the client begins testing:

-   Create named client test accounts with role-appropriate access.
-   Load only the agreed pilot project data.
-   Agree which existing records remain the official source during the
    pilot.
-   Train users on BOQ review, quotation entry, GRNs, stock, QA/QC, JMR,
    and draft billing.
-   Make clear which features are operational and which are deferred.
-   Keep existing approval and payment controls active.
-   Provide a support contact and a simple issue-reporting template.
-   Back up pilot data and document the recovery process.
-   Record client feedback and distinguish defects from new feature
    requests.
-   Obtain written pilot sign-off before expanding the rollout.

The pilot should not be considered successful merely because the screens
load. The client must be able to complete the agreed workflows, and the
resulting records must be consistent and traceable.

------------------------------------------------------------------------

## 14. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                First-release mitigation
  ----------------------------------- -----------------------------------
  Extracted BOQ quantities are wrong  Treat output as draft and require
  or incomplete                       manual review and approval.

  Input drawing is unsupported        State the supported format clearly
                                      and provide a manual/import
                                      fallback.

  Vendor quotes are entered           Store the quoted details,
  incorrectly                         source/contact, date, and user who
                                      entered them.

  Partial or damaged deliveries       Record ordered, received, accepted,
  distort stock                       rejected, and damaged quantities
                                      separately.

  Stock balance differs from physical Maintain a movement ledger and
  stock                               support documented stock counts and
                                      adjustments.

  Quality checks are missed           Show due dates, pending status,
                                      failed status, and responsible
                                      users.

  Billing does not match the client's Validate draft bills against
  process                             client-approved sample records
                                      before live use.

  Tax calculation is incorrect        Keep rules basic/configurable and
                                      require finance review.

  Users see data they should not      Enforce backend permissions and
  access                              test tenant/project isolation.

  A failure causes lost or duplicated Use transactions, duplicate-request
  records                             protection, backups, and recovery
                                      tests.

  Client cannot complete tasks        Provide short task guides,
  independently                       acceptance scenarios, and a defined
                                      support process.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Future Enhancements After the Pilot

Future improvements should be prioritised using client feedback and
evidence from actual usage. Possible enhancements include:

-   Additional drawing formats or deeper CAD/BIM integration.
-   More automated BOQ comparison and revision handling.
-   Vendor quotation portals and messaging automation.
-   More detailed accounting and tax integrations.
-   Advanced labour, equipment, and contractor workflows.
-   Improved project scheduling and progress tracking.
-   More detailed cost analytics and management reporting.
-   Additional integrations with the broader Ostaad
    construction-materials and supply-chain platform, if included in the
    approved product scope.

These enhancements are not prerequisites for the initial pilot unless
the client explicitly includes them in the agreed scope.

------------------------------------------------------------------------

## 16. Approval Summary

The proposed first release is an end-to-end construction ERP MVP. It
prioritises a connected, traceable workflow over advanced automation.

**Included in the pilot:** Project setup, existing blueprint-to-BOQ
integration, manual BOQ verification, requisitions, vendor directory,
manual quotation collection, procurement, stores, QA/QC, JMR, basic
material reconciliation, draft billing, basic tax fields, client
reporting, access control, audit logs, backups, and client acceptance
testing.

**Deferred:** WhatsApp/vendor automation, advanced material theft
detection, extensive CAD/BIM support, complex engineering automation,
full accounting/tax automation, advanced analytics, and nonessential
integrations.

**Approval requested for:** The defined first-release scope, the
proposed implementation sequence, the client-led acceptance process, and
the stated exclusions.

**Important:** This document defines the proposed scope and
implementation plan. It does not claim that the software has already
been built or that the pilot has passed testing. Readiness must be
demonstrated through working software and recorded test results.
