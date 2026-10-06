"""Stage 15: Automated Test Suite for Frontend Web App & Interactive Canvas.

Validates:
1. Interactive side-by-side UI layout & DOM structure (HTML, CSS, SVG canvas overlay)
2. Bi-directional linking contract between BOQ rows and SVG drawing geometry
3. Canvas layer filter toggles (All, Spaces, Openings, Walls, Flags)
4. Human Estimator Financial Control Panel (multi-currency, markups)
5. Multi-format export actions (XLSX, PDF, CSV, JSON)
6. 5-tab structure (BOQ, Rooms, Linear Runs, Audit & Evidence, Cost Breakdown)
7. Instant benchmark sample blueprint integrations
"""

import unittest
from fastapi.testclient import TestClient
from ostaad_boq.app import app, _HTML_DASHBOARD


class TestStage15FrontendDashboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_index_html_dashboard_structure(self):
        """Verify the main UI endpoint returns high-polish, structured HTML dashboard."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/html", res.headers.get("content-type", ""))
        html = res.text

        # 1. Branding and Title
        self.assertIn("<title>OSTAAD — Autonomous Blueprint-to-BOQ Engine</title>", html)
        self.assertIn("OSTAAD BOQ", html)
        self.assertIn("Clean-Room Apache 2.0", html)
        self.assertIn("Cloudflare Edge Ready", html)

        # 2. Canvas & SVG Overlay Architecture
        self.assertIn('id="canvas-container"', html)
        self.assertIn('id="blueprint-img"', html)
        self.assertIn('id="canvas-overlay"', html)
        self.assertIn('id="canvas-tooltip"', html)

        # 3. Layer Filter Toggles
        self.assertIn('id="layer-toggles"', html)
        self.assertIn('data-layer="all"', html)
        self.assertIn('data-layer="rooms"', html)
        self.assertIn('data-layer="openings"', html)
        self.assertIn('data-layer="walls"', html)
        self.assertIn('data-layer="flags"', html)

        # 4. Human Estimator Financial Controls
        self.assertIn('id="sel-currency"', html)
        self.assertIn('id="inp-overhead"', html)
        self.assertIn('id="inp-profit"', html)
        self.assertIn('id="inp-contingency"', html)

        # 5. All 5 Interactive Studio Tabs
        self.assertIn('id="tab-boq"', html)
        self.assertIn('id="tab-rooms"', html)
        self.assertIn('id="tab-walls"', html)
        self.assertIn('id="tab-audit"', html)
        self.assertIn('id="tab-cost"', html)

        # 6. All 4 Commercial Export Actions
        self.assertIn('id="btn-xlsx"', html)
        self.assertIn('id="btn-pdf"', html)
        self.assertIn('id="btn-csv"', html)
        self.assertIn('id="btn-json"', html)

        # 7. One-Click Benchmark Sample Blueprints
        self.assertIn("indian_bengal_floorplan.png", html)
        self.assertIn("indian_bengal_3bhk_plan.png", html)
        self.assertIn("barakar 01.11.2025-Model WITHOUT GRID.pdf", html)

    def test_02_javascript_canvas_linking_functions(self):
        """Verify client-side JavaScript implements bi-directional linking and layer toggles."""
        html = _HTML_DASHBOARD

        # Key interactive canvas controller functions
        self.assertIn("function renderCanvasOverlay(", html)
        self.assertIn("function highlightCanvasElement(", html)
        self.assertIn("function highlightTableRow(", html)
        self.assertIn("function toggleLayerFilter(", html)
        self.assertIn("function triggerReprice(", html)
        self.assertIn("function updateLineQuantity(", html)
        self.assertIn("function downloadExport(", html)

        # Bi-directional visual event bindings
        self.assertIn("rect.addEventListener('click'", html)
        self.assertIn("highlightTableRow(idx)", html)
        self.assertIn("highlightCanvasElement", html)
        self.assertIn("svg-element", html)
        self.assertIn("viewBox", html)

    def test_03_css_design_system_and_color_tokens(self):
        """Verify Stage 15 styling follows the required dark-mode and status-coded design tokens."""
        html = _HTML_DASHBOARD

        # Typography
        self.assertIn("JetBrains Mono", html)
        self.assertIn("Outfit", html)
        self.assertIn("Plus Jakarta Sans", html)

        # Design tokens
        self.assertIn("--bg-base: #06080d", html)
        self.assertIn("--accent-cyan: #38bdf8", html)
        self.assertIn("--accent-emerald: #10b981", html)
        self.assertIn("--accent-amber: #f59e0b", html)
        self.assertIn("--accent-rose: #f43f5e", html)

        # Status coding classes for SVG takeoff elements
        self.assertIn(".svg-element.verified", html)
        self.assertIn(".svg-element.supported", html)
        self.assertIn(".svg-element.needs-review", html)
        self.assertIn(".svg-element.rejected", html)
        self.assertIn(".svg-element.wall-run", html)
        self.assertIn(".svg-element.boundary-run", html)


if __name__ == "__main__":
    unittest.main()
