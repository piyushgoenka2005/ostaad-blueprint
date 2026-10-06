# OSTAAD BLUEPRINT-TO-BOQ: ZERO-RISK MIGRATION & ROLLBACK PLAN

This document outlines the operational migration strategy for introducing the Gemini 3.8 Flash Hybrid Architecture into the Ostaad Blueprint-to-BOQ engine. It ensures zero production downtime, uninterrupted client estimating workflows, and an immediate rollback capability at every step.

---

## 1. Migration Philosophy: Dual-Run Shadow Architecture

A "big-bang" replacement of the existing blueprint processing logic is strictly prohibited. The system transitions through a phased **Dual-Run Shadow Architecture**:

```text
                                INCOMING BLUEPRINT
                                        │
                                        ▼
                                FEATURE ROUTER
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
             ACTIVE PIPELINE                         SHADOW PIPELINE
         (Deterministic + OCR)                 (Gemini Hybrid Architecture)
                    │                                       │
                    ▼                                       ▼
             CLIENT RESPONSE                         AUDIT LOGGER
          (Guaranteed Uptime)                               │
                                                            ▼
                                                    DISCREPANCY ENGINE
                                            - Compares BOQ Quantities
                                            - Analyzes Hallucination Delta
                                            - Validates Coordinate Alignment
```

---

## 2. Configuration & Feature Flag Controls

The runtime behavior of the engine is governed by explicit environment variables and dynamic feature flags (`ostaad_boq/config.py`):

```bash
# ==============================================================================
# OSTAAD PIPELINE CONFIGURATION & FEATURE FLAGS
# ==============================================================================

# Master Flag: Enables the Gemini Hybrid Pipeline
ENABLE_GEMINI_HYBRID_PIPELINE=false

# Shadow Execution Flag: Runs Gemini pipeline asynchronously and logs diffs
ENABLE_SHADOW_EVALUATION=true

# AI Provider Credentials
GEMINI_API_KEY=""
GEMINI_PRIMARY_MODEL="gemini-3.8-flash"
GEMINI_ESCALATION_MODEL="gemini-3.1-pro-preview"

# Cost & Token Hard Limits per Sheet
GEMINI_MAX_TOKENS_PER_PAGE=8192
GEMINI_BUDGET_LIMIT_USD_PER_RUN=0.05
GEMINI_REQUEST_TIMEOUT_SECONDS=30
GEMINI_MAX_RETRIES=3

# Anti-Hallucination Thresholds
MIN_DETECTION_CONFIDENCE_THRESHOLD=0.75
MIN_CORROBORATION_IOU_THRESHOLD=0.50
STRICT_SITE_SURVEY_INVARIANTS=true
```

### Dynamic Runtime Toggling
The API supports instant runtime toggling via admin endpoints without requiring server restarts:
* `POST /api/v1/admin/feature-flags` with payload `{"ENABLE_GEMINI_HYBRID_PIPELINE": true}` switches active traffic instantly.

---

## 3. Four-Stage Migration Sequence

### Stage 1: Non-Invasive Foundation (Days 1–3)
* **Goal**: Deploy data models, coordinate transformation engines, and test harness without touching existing runtime execution paths.
* **Operations**:
  - Deploy `EvidenceCandidate` and `ValidationStatus` schemas in `ostaad_boq/models.py`.
  - Deploy `ostaad_boq/coordinate_transform.py`.
  - Deploy test fixtures and regression harnesses.
* **Production Impact**: Zero. All legacy endpoints continue executing identical code.
* **Rollback Trigger**: Any regression in existing test suite (`pytest tests/`).
* **Rollback Action**: `git revert` stage commit; zero state changes required.

---

### Stage 2: Shadow Mode Execution (Days 4–7)
* **Goal**: Execute Gemini 3.8 Flash semantic extraction in the background on live uploads, silently logging diffs against deterministic output.
* **Operations**:
  - Deploy `ostaad_boq/gemini_service.py` and `ostaad_boq/vlm_engine.py` (with mock fallback deleted).
  - Activate `ENABLE_SHADOW_EVALUATION=true`.
  - On user upload, client receives response from proven deterministic pipeline in $< 3$ seconds.
  - A background task executes the Gemini Hybrid Pipeline, recording outputs to the `takeoff_discrepancy_log`.
* **Discrepancy Analysis**:
  - Analyze quantity deltas: $|\Delta Q| = |Q_{\text{hybrid}} - Q_{\text{legacy}}|$.
  - Verify that the Barakar site survey consistently yields 0 hallucinated doors/windows in shadow runs.
  - Track token expenditure and latency distributions.
* **Rollback Trigger**: Unhandled exceptions in background worker, Gemini rate-limit spikes, or memory leaks.
* **Rollback Action**: Set `ENABLE_SHADOW_EVALUATION=false` via environment variable or API call. Background worker immediately ceases AI calls.

---

### Stage 3: Canary Deployment (Days 8–10)
* **Goal**: Route a controlled fraction of live user traffic to the Gemini Hybrid Pipeline.
* **Operations**:
  - Configure traffic split: 10% of uploads routed to Hybrid Engine, 90% to Legacy Engine.
  - Enable interactive Visual Traceability and Review drawer in frontend for Canary users.
  - Collect user feedback on `NEEDS_REVIEW` workflow.
  - Monitor automated error reporting (Sentry / CloudWatch).
* **Progression Criteria**:
  - Zero unhandled 500 errors over 500 consecutive Canary sheets.
  - Hallucination rate strictly $0.0\%$.
  - End-to-end processing time $\le 12$ seconds per sheet.
* **Rollback Trigger**: Any user-reported hallucination or latency exceeding 25 seconds.
* **Rollback Action**: Reset traffic routing to 100% legacy instantly via admin toggle.

---

### Stage 4: Full Cutover & Obsolete Logic Deprecation (Days 11–14)
* **Goal**: 100% of traffic served by Gemini Hybrid Engine.
* **Operations**:
  - Set `ENABLE_GEMINI_HYBRID_PIPELINE=true` across all instances.
  - Maintain legacy pipeline code as an isolated fallback module (`ostaad_boq/legacy/`).
  - Deprecate `ostaad_boq/exporter.py` in favor of `ostaad_boq/export_engine.py`.
  - Retain fallback safety path: If Gemini API is unreachable, engine automatically degrades gracefully to deterministic-only mode with an audit flag.

---

## 4. Subsystem-Level Rollback Playbooks

| Subsystem | Potential Failure Mode | Rollback Procedure | Maximum Recovery Time |
| :--- | :--- | :--- | :--- |
| **Gemini API Adapter** | Upstream Google outage, HTTP 429 rate limit exhaustion, unexpected API format change. | Engine catches exception in `vlm_engine.py` and falls back to deterministic vector/OCR mode. Sets `ai_enrichment_status: "OFFLINE"`. | $< 100\text{ ms}$ (Automatic In-Flight) |
| **Coordinate Transformation** | Bounding box misalignment or aspect ratio distortion in SVG overlays. | Revert coordinate transformation module to legacy pixel-offset mapping via flag `USE_LEGACY_COORDINATES=true`. | $< 1\text{ minute}$ |
| **Evidence Fusion Engine** | Overly aggressive rejection of valid architectural elements. | Adjust `MIN_DETECTION_CONFIDENCE_THRESHOLD` from 0.75 to 0.60 via dynamic configuration API. | $< 30\text{ seconds}$ |
| **Database / Storage Schema** | Ingestion of `EvidenceCandidate` records fails or corrupts persistence layer. | SQLite/PostgreSQL schema changes are strictly additive (new nullable columns and new isolated audit tables). Revert involves ignoring new tables. | Zero database downtime |

---

## 5. Deployment Verification Checklist

Before toggling production traffic to the new pipeline, the release engineer must verify:

- [ ] All unit tests pass (`pytest tests/ -v`).
- [ ] Barakar regression test (`test_regression_barakar_site_survey`) passes with exactly 0 doors, 0 windows, 0 plumbing fixtures.
- [ ] Bengal architectural test passes with closed room polygons and 100% schedule alignment.
- [ ] Gemini API token consumption is verified and within budget ($\le \$0.01$ per run).
- [ ] Excel export renders cleanly with new `Verification Status` and `Evidence Sources` columns.
- [ ] Frontend SVG viewer correctly highlights `VERIFIED` (green) and `NEEDS_REVIEW` (orange) elements.
- [ ] Emergency kill-switch (`ENABLE_GEMINI_HYBRID_PIPELINE=false`) tested and verified to restore legacy behavior within 2 seconds.
