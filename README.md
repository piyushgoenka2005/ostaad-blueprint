# Ostaad Blueprint-to-BOQ Engine

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-brightgreen.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-teal.svg)](https://fastapi.tiangolo.com)
[![Cloudflare](https://img.shields.io/badge/Subdomain-blueprint.ostaad.shop-orange.svg)](https://blueprint.ostaad.shop)

A clean-room, production-grade **Blueprint-to-Bill-of-Quantities (BOQ)** takeoff engine designed for architectural drawings (PDF vector drawings, PNG, and JPG).

Designed for complete, 100% decoupled deployment under **`blueprint.ostaad.shop`** with zero dependencies on the main `ostaad.shop` platform.

---

## 100% Decoupled Cloudflare Architecture

```
                    ┌───────────────────────────────┐
                    │     Cloudflare Edge / DNS     │
                    │         (ostaad.shop)         │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     Main Ostaad Platform      │               │     Blueprint BOQ Engine      │
│   (c:\...\Desktop\Ostaad)     │               │ (c:\...\Desktop\BlueprintBOQ) │
├───────────────────────────────┤               ├───────────────────────────────┤
│ Routes:                       │               │ Route:                        │
│   • ostaad.shop               │               │   • blueprint.ostaad.shop     │
│   • auth.ostaad.shop          │               │                               │
│ Worker: ostaad-v2             │               │ Worker: ostaad-blueprint-boq  │
│ Database: ostaad-db (D1)      │               │ Database: None (Isolated)     │
└───────────────────────────────┘               └───────────────────────────────┘
```

### Why this setup guarantees safety:
1. **Isolated Worker Service**: Named `ostaad-blueprint-boq`. Runs in its own Cloudflare V8 sandbox.
2. **Dedicated Subdomain Routing**: Bound strictly to `blueprint.ostaad.shop`. It cannot touch, modify, or intercept traffic intended for `ostaad.shop`, `auth.ostaad.shop`, or `admin.ostaad.shop`.
3. **Zero Shared Storage**: Uses no shared databases, KV namespaces, or cookies from the main project.
4. **1-Command Teardown**: If the project or feature is not approved, run:
   ```bash
   npx wrangler delete --name ostaad-blueprint-boq
   ```
   and delete the folder `c:\Users\goenk\Desktop\BlueprintBOQ`. The main site `ostaad.shop` will be 100% unaffected.

---

## Quick Start (Local)

### 1. Run the Interactive Web Console
```powershell
uv run uvicorn ostaad_boq.app:app --host 127.0.0.1 --port 8000 --reload
```
Navigate to **`http://127.0.0.1:8000`** in your browser. Drag and drop any blueprint or click the instant sample buttons ("Bengal 2BHK Plan", "Bengal 3BHK Plan").

### 2. Run Automated Regression Tests
```powershell
uv run pytest tests/test_ostaad_boq.py
```

---

## Deployment to `blueprint.ostaad.shop`

### Option A: Cloudflare Workers Edge Gateway (Fastest)
Deploy the standalone Worker directly to your Cloudflare account:
```bash
npx wrangler deploy
```
Wrangler will automatically:
1. Register `ostaad-blueprint-boq` in your Cloudflare dashboard.
2. Bind the custom domain `blueprint.ostaad.shop` with an automatic SSL certificate.
3. Proxy all requests to your backend origin (configured in `wrangler.toml` / `wrangler.jsonc`).

---

### Option B: Cloudflare Tunnel (Zero Trust Docker)
If running inside a Docker container:
1. In [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) &rarr; **Networks** &rarr; **Tunnels**, create a tunnel named `ostaad-blueprint-boq`.
2. Add a Public Hostname:
   - **Domain**: `blueprint.ostaad.shop`
   - **Service**: `HTTP`
   - **URL**: `ostaad-boq:8000`
3. Launch with Docker Compose:
   ```bash
   export CLOUDFLARE_TUNNEL_TOKEN="your_token_here"
   docker compose up -d
   ```

---

## Complete Project Teardown (If Rejected)

If you need to permanently remove this software without touching `ostaad.shop`:
```bash
# 1. Unbind the subdomain and delete the standalone Cloudflare Worker
npx wrangler delete --name ostaad-blueprint-boq

# 2. Delete the local folder: c:\Users\goenk\Desktop\BlueprintBOQ
```
Your primary domain `ostaad.shop` will continue running with zero downtime or leftover traces.
