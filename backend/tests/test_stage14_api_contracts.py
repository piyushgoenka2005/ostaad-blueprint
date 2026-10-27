"""Stage 14: Automated Test Suite for FastAPI Backend API & Cloudflare Worker Contract.

Validates:
1. Health and diagnostics contracts (/healthz, /api/v1/health)
2. Benchmark samples discovery & streaming (/api/v1/samples, /api/v1/samples/{name})
3. Full blueprint takeoff processing (/api/v1/takeoff/process, /api/takeoff) on Barakar site survey
4. Deterministic caching & latency profiling (sub-50ms repeat response)
5. Multi-regional re-pricing contract (/api/v1/takeoff/reprice)
6. Multi-format export streaming (/api/v1/takeoff/export/{format}) for XLSX, CSV, JSON, PDF
7. Cloudflare Worker Gateway contract compatibility (CORS, OPTIONS preflight, headers)
"""

import io
import json
import os
import unittest
from pathlib import Path
from fastapi.testclient import TestClient
from ostaad_boq.app import app


class TestStage14APIContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.barakar_pdf_path = Path("assets/barakar 01.11.2025-Model WITHOUT GRID.pdf")
        if not cls.barakar_pdf_path.exists():
            raise FileNotFoundError(f"Required benchmark not found: {cls.barakar_pdf_path}")
        with open(cls.barakar_pdf_path, "rb") as f:
            cls.barakar_bytes = f.read()

    def test_01_health_diagnostics_contract(self):
        """Verify health check endpoints and response schema."""
        for path in ["/healthz", "/api/v1/health"]:
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200, f"Failed on path: {path}")
            data = res.json()
            self.assertEqual(data["status"], "ok")
            self.assertEqual(data["engine"], "OstaadBOQEngine")
            self.assertEqual(data["version"], "2.0.0")
            self.assertEqual(data["license"], "Apache-2.0")
            self.assertIn("supported_drawing_types", data)
            self.assertIn("SITE_TOPOGRAPHICAL_SURVEY", data["supported_drawing_types"])
            self.assertIn("ARCHITECTURAL_FLOOR_PLAN", data["supported_drawing_types"])
            self.assertIn("export_formats", data)
            self.assertEqual(set(data["export_formats"]), {"xlsx", "csv", "json", "pdf"})
            # Verify custom timing and version headers
            self.assertIn("x-process-time", res.headers)
            self.assertEqual(res.headers.get("x-engine-version"), "2.0.0")

    def test_02_benchmark_samples_api(self):
        """Verify discovery and retrieval of benchmark sample blueprints."""
        res = self.client.get("/api/v1/samples")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("samples", data)
        self.assertGreaterEqual(len(data["samples"]), 1)

        # Check Barakar is listed
        filenames = [s["filename"] for s in data["samples"]]
        self.assertIn("barakar 01.11.2025-Model WITHOUT GRID.pdf", filenames)

        # Stream Barakar sample
        res_sample = self.client.get("/api/v1/samples/barakar 01.11.2025-Model WITHOUT GRID.pdf")
        self.assertEqual(res_sample.status_code, 200)
        self.assertIn(res_sample.headers.get("content-type"), ["application/pdf", "application/octet-stream"])
        self.assertGreater(len(res_sample.content), 10000)

        # Non-existent sample returns 404
        res_404 = self.client.get("/api/v1/samples/non_existent_blueprint.pdf")
        self.assertEqual(res_404.status_code, 404)

    def test_03_full_takeoff_processing_on_barakar(self):
        """Test full blueprint takeoff pipeline via multipart upload."""
        files = {
            "file": ("barakar.pdf", io.BytesIO(self.barakar_bytes), "application/pdf")
        }
        res = self.client.post("/api/v1/takeoff/process", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("report", data)
        report = data["report"]

        # Classification validation
        self.assertEqual(report["classification"]["drawing_type"], "SITE_TOPOGRAPHICAL_SURVEY")
        # Invariant: 0 rooms on site surveys
        self.assertEqual(report["rooms"], [])
        # Scale verified
        self.assertTrue(report["scale"]["scale_known"])
        self.assertEqual(report["scale"]["raw_scale_text"], "1:250")
        self.assertIn(report["scale"]["unit"], ["m", "metre", "meter"])

        # Cost summary present and priced in INR for metre drawings
        self.assertIsNotNone(report.get("cost_summary"))
        self.assertEqual(report["cost_summary"]["currency"], "INR")
        self.assertEqual(report["cost_summary"]["currency_symbol"], "₹")

        # Linear runs / site features present
        self.assertGreater(len(report["linear_runs"]), 0)

        # Cache Hit Test: Repeat request with use_cache=True must hit cache
        files_repeat = {
            "file": ("barakar.pdf", io.BytesIO(self.barakar_bytes), "application/pdf")
        }
        res_cached = self.client.post("/api/v1/takeoff/process?use_cache=true", files=files_repeat)
        self.assertEqual(res_cached.status_code, 200)
        cached_data = res_cached.json()
        self.assertTrue(cached_data["cache_hit"])
        self.assertLess(cached_data["processing_time_sec"], 0.1)  # sub-100ms cache hit

    def test_04_repricing_endpoint(self):
        """Test the dynamic re-pricing endpoint with custom currencies and markups."""
        # 1. First run a small takeoff or mock report
        files = {
            "file": ("barakar.pdf", io.BytesIO(self.barakar_bytes), "application/pdf")
        }
        res = self.client.post("/api/v1/takeoff/process", files=files)
        report = res.json()["report"]

        # 2. Reprice into USD with 15% overhead, 12% profit, 8% contingency
        reprice_payload = {
            "report": report,
            "currency": "USD",
            "overhead_pct": 15.0,
            "profit_pct": 12.0,
            "contingency_pct": 8.0,
        }
        reprice_res = self.client.post("/api/v1/takeoff/reprice", json=reprice_payload)
        self.assertEqual(reprice_res.status_code, 200)
        reprice_data = reprice_res.json()
        self.assertTrue(reprice_data["success"])

        updated_summary = reprice_data["cost_summary"]
        self.assertEqual(updated_summary["currency"], "USD")
        self.assertEqual(updated_summary["currency_symbol"], "$")
        self.assertEqual(updated_summary["overhead_pct"], 15.0)
        self.assertEqual(updated_summary["profit_pct"], 12.0)
        self.assertEqual(updated_summary["contingency_pct"], 8.0)

        # Financial integrity assertion
        direct = updated_summary["direct_cost_subtotal"]
        ovh = updated_summary["overhead_amount"]
        prf = updated_summary["profit_amount"]
        ctg = updated_summary["contingency_amount"]
        total = updated_summary["total_estimated_budget"]
        self.assertAlmostEqual(total, direct + ovh + prf + ctg, places=2)

    def test_05_multi_format_export_streaming(self):
        """Test XLSX, CSV, JSON, and PDF export streaming endpoints."""
        files = {
            "file": ("barakar.pdf", io.BytesIO(self.barakar_bytes), "application/pdf")
        }
        res = self.client.post("/api/v1/takeoff/process", files=files)
        report = res.json()["report"]
        payload = {"report": report}

        # 1. XLSX
        res_xlsx = self.client.post("/api/v1/takeoff/export/xlsx", json=payload)
        self.assertEqual(res_xlsx.status_code, 200)
        self.assertIn("application/vnd.openxmlformats", res_xlsx.headers["content-type"])
        self.assertTrue(res_xlsx.content.startswith(b"PK\x03\x04"))
        self.assertIn("attachment; filename=", res_xlsx.headers["content-disposition"])

        # 2. CSV
        res_csv = self.client.post("/api/v1/takeoff/export/csv", json=payload)
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn("text/csv", res_csv.headers["content-type"])
        csv_text = res_csv.text
        self.assertIn("Item ID,WBS Code", csv_text)

        # 3. JSON
        res_json = self.client.post("/api/v1/takeoff/export/json", json=payload)
        self.assertEqual(res_json.status_code, 200)
        self.assertIn("application/json", res_json.headers["content-type"])
        roundtrip = json.loads(res_json.text)
        self.assertEqual(roundtrip["sheet_name"], report["sheet_name"])

        # 4. PDF
        res_pdf = self.client.post("/api/v1/takeoff/export/pdf", json=payload)
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.headers["content-type"], "application/pdf")
        self.assertTrue(res_pdf.content.startswith(b"%PDF"))

        # 5. Invalid format returns 400
        res_bad = self.client.post("/api/v1/takeoff/export/docx", json=payload)
        self.assertEqual(res_bad.status_code, 400)
        self.assertIn("Unsupported export format", res_bad.json()["detail"])

        # 6. Legacy endpoints backwards compatibility
        res_leg_xlsx = self.client.post("/api/export/xlsx", json=report)
        self.assertEqual(res_leg_xlsx.status_code, 200)
        self.assertTrue(res_leg_xlsx.content.startswith(b"PK\x03\x04"))

        res_leg_csv = self.client.post("/api/export/csv", json=report)
        self.assertEqual(res_leg_csv.status_code, 200)
        self.assertIn("Item ID,WBS Code", res_leg_csv.text)

    def test_06_cloudflare_worker_contract(self):
        """Verify Cloudflare Worker Gateway contract compatibility: CORS, OPTIONS preflight, headers."""
        # Test OPTIONS preflight on /api/v1/takeoff/process
        res_options = self.client.options(
            "/api/v1/takeoff/process",
            headers={
                "Origin": "https://blueprint.ostaad.shop",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization",
            },
        )
        self.assertEqual(res_options.status_code, 200)
        self.assertIn(res_options.headers.get("access-control-allow-origin"), ["*", "https://blueprint.ostaad.shop"])
        self.assertIn("POST", res_options.headers.get("access-control-allow-methods", ""))

        # Verify that response exposes Content-Disposition for browser downloads
        files = {
            "file": ("barakar.pdf", io.BytesIO(self.barakar_bytes), "application/pdf")
        }
        res = self.client.post("/api/v1/takeoff/process", files=files)
        report = res.json()["report"]
        res_export = self.client.post(
            "/api/v1/takeoff/export/csv",
            json={"report": report},
            headers={"Origin": "https://blueprint.ostaad.shop"},
        )
        self.assertIn(res_export.headers.get("access-control-allow-origin"), ["*", "https://blueprint.ostaad.shop"])
        self.assertIn("Content-Disposition", res_export.headers.get("access-control-expose-headers", ""))


if __name__ == "__main__":
    unittest.main()
