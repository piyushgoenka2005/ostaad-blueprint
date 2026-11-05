# Ostaad ERP

> **Feature-Rich, Lightweight Construction ERP**  
> Single-Worker Cloudflare Full-Stack Architecture (Next.js + Cloudflare D1 + Cloudflare R2)

---

## Overview

Ostaad ERP is an integrated construction business management platform designed to manage the entire construction project lifecycle:
- **Pre-Construction Planning**: 15 integrated engineering tools (Site Survey, Cost Estimator, BOQ Template, Timeline Gantt, Permit Tracker, Plot Area Calculator, Vendor Comparison, Soil Test Tracker, Feasibility Report, Phase Planner, Site Layout, Zoning & Setback, Cost vs Budget, Selection Scorecard, Kickoff Checklist).
- **Project Management**: Multi-project tracking, team assignments, and milestone progress.
- **BOQ & Cost Management**: Item-wise BOQs, rate analysis, Excel import/export, and Running Account (RA) billing.
- **Vendor Management & Procurement**: RFQs, quotation logging, dynamic L1/L2/L3 comparative statements, and Purchase Orders (POs).
- **Finance & Accounts**: Budget allocation, mandatory finance approval gates, payment tracking (UTR / Cheque), and invoice reconciliation.
- **Site Operations & Inventory**: Goods Receipt Notes (GRNs), damaged quantity deduction, inventory stock ledger, and material issues.
- **Reports & Administration**: Multi-company tenancy, role-based access control (RBAC), and immutable audit logs.

---

## Architecture

- **Full-Stack Application**: Next.js 16 (App Router) + TypeScript.
- **Hosting & Compute**: Single Cloudflare Worker serving both frontend pages and same-origin `/api` routes.
- **Database**: Cloudflare D1 (Serverless SQLite at edge).
- **Object Storage**: Cloudflare R2 for drawings, quotations, challans, and invoices.
- **Zero Third-Party Database**: No external PostgreSQL or microservices required.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Deploy to Cloudflare
```bash
npx wrangler deploy
```
