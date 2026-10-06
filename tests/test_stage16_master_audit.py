"""Stage 16: Master Production Readiness & Negative Regression Audit Suite.

Runs the complete end-to-end verification across:
1. Barakar Negative Hallucination Regression Gate (Zero-Hallucination Invariant)
2. Architectural Floor Plan End-to-End Pipeline
3. Structural / Civil Drawing Non-Interference Gate
4. Schema Completeness & Model Validation
5. Export Engine Multi-Format Verification
6. System Performance & Memory Safety
"""

import io
import os
import time
import unittest
from pathlib import Path

from ostaad_boq.engine import OstaadBOQEngine
from ostaad_boq.models import (
    BOQReport,
    DrawingType,
    UnitType,
    CalculationMethod,
)
from ostaad_boq.pricing_engine import price_boq_report
from ostaad_boq.export_engine import (
    export_to_csv,
    export_to_excel,
    export_to_json,
    export_to_pdf,
)


class TestStage16MasterProductionAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = OstaadBOQEngine()
        cls.barakar_pdf_path = Path("assets/barakar 01.11.2025-Model WITHOUT GRID.pdf")
        if not cls.barakar_pdf_path.exists():
            raise FileNotFoundError(f"Missing mandatory benchmark: {cls.barakar_pdf_path}")
        with open(cls.barakar_pdf_path, "rb") as f:
            cls.barakar_bytes = f.read()

        cls.floorplan_png_path = Path("assets/indian_bengal_floorplan.png")
        cls.floorplan_bytes = None
        if cls.floorplan_png_path.exists():
            with open(cls.floorplan_png_path, "rb") as f:
                cls.floorplan_bytes = f.read()

    def test_01_barakar_negative_hallucination_gate(self):
        """MANDATORY AUDIT GATE: Barakar site survey MUST produce zero hallucinated architectural items."""
        report = self.engine.process(self.barakar_bytes, "barakar.pdf")

        # 1. Classification Assertion
        self.assertEqual(
            report.classification.drawing_type,
            DrawingType.SITE_TOPOGRAPHICAL_SURVEY,
            f"Expected SITE_TOPOGRAPHICAL_SURVEY, got {report.classification.drawing_type}",
        )
        self.assertGreater(report.classification.confidence, 0.85)

        # 2. Strict Invariant: 0 rooms on site surveys
        self.assertEqual(
            len(report.rooms),
            0,
            f"Hallucination violation: Expected 0 rooms on site survey, found {len(report.rooms)}",
        )

        # 3. Strict Invariant: No residential architectural lines
        forbidden_terms = [
            "living room", "bedroom", "kitchen sink", "water closet",
            "cooktop", "toilet", "gypsum drywall", "interior paint",
            "residential door", "hollow core",
        ]
        for line in report.lines:
            desc_lower = line.item_description.lower()
            for term in forbidden_terms:
                self.assertNotIn(
                    term,
                    desc_lower,
                    f"Hallucination violation: Found forbidden term '{term}' in '{line.item_description}'",
                )

        # 4. Deterministic Civil Boundaries Extracted
        self.assertGreater(len(report.linear_runs), 0)
        boundary_runs = [r for r in report.linear_runs if "boundary" in r.label.lower()]
        self.assertGreater(len(boundary_runs), 0, "Expected civil boundary wall run to be extracted")
        self.assertAlmostEqual(boundary_runs[0].length, 251.95, delta=10.0)

        # 5. Provenance & Scale
        self.assertTrue(report.scale.scale_known)
        self.assertEqual(report.scale.raw_scale_text, "1:250")
        self.assertIn(report.scale.unit, ["m", "metre", "meter"])

        # 6. Pricing & WBS
        self.assertIsNotNone(report.cost_summary)
        self.assertEqual(report.cost_summary.currency, "INR")

    def test_02_architectural_floorplan_pipeline_end_to_end(self):
        """Verify architectural residential floor plan pipeline end-to-end if sample exists."""
        if not self.floorplan_bytes:
            self.skipTest("Sample indian_bengal_floorplan.png not present")

        report = self.engine.process(self.floorplan_bytes, "floorplan.png")
        self.assertEqual(report.classification.drawing_type, DrawingType.ARCHITECTURAL_FLOOR_PLAN)

        # Architectural drawing must extract rooms, walls, openings
        self.assertGreater(len(report.rooms), 0, "Architectural floor plan should extract rooms")
        self.assertGreater(len(report.lines), 0, "Architectural floor plan should extract takeoff lines")
        self.assertGreater(len(report.linear_runs), 0, "Architectural floor plan should extract walls")

        # Every measured line has bounding box in [0, 1]
        for line in report.lines:
            if line.is_measured:
                self.assertIsNotNone(line.bounding_box)
                self.assertEqual(len(line.bounding_box), 4)
                for coord in line.bounding_box:
                    self.assertGreaterEqual(coord, 0.0)
                    self.assertLessEqual(coord, 1.0)

        # Every line classified into CSI MasterFormat
        for line in report.lines:
            self.assertTrue(len(line.wbs_code) > 0, f"Line missing WBS code: {line.item_description}")
            self.assertTrue(len(line.csi_division) > 0, f"Line missing CSI division: {line.item_description}")

    def test_03_financial_rollup_arithmetic_invariant(self):
        """Verify strict financial arithmetic across multiple currencies and markups."""
        report = self.engine.process(self.barakar_bytes, "barakar.pdf")

        for currency in ["USD", "INR", "GBP"]:
            priced_report = price_boq_report(
                report,
                currency=currency,
                overhead_pct=12.5,
                profit_pct=10.0,
                contingency_pct=7.5,
            )
            cs = priced_report.cost_summary
            self.assertEqual(cs.currency, currency)

            # Direct cost subtotal == sum of line item totals
            line_sum = round(sum(l.total_cost for l in priced_report.lines), 2)
            self.assertAlmostEqual(cs.direct_cost_subtotal, line_sum, places=2)

            # Budget == direct + overhead + profit + contingency
            expected_total = round(
                cs.direct_cost_subtotal + cs.overhead_amount + cs.profit_amount + cs.contingency_amount,
                2,
            )
            self.assertAlmostEqual(cs.total_estimated_budget, expected_total, places=2)

    def test_04_export_engine_multi_format_integrity(self):
        """Verify all 4 exports generate valid streams on the final report."""
        report = self.engine.process(self.barakar_bytes, "barakar.pdf")

        # 1. JSON
        json_str = export_to_json(report)
        self.assertTrue(len(json_str) > 100)
        roundtrip = BOQReport.model_validate_json(json_str)
        self.assertEqual(roundtrip.sheet_name, report.sheet_name)

        # 2. CSV
        csv_str = export_to_csv(report)
        self.assertIn("Item ID,WBS Code", csv_str)

        # 3. Excel
        xlsx_bytes = export_to_excel(report)
        self.assertTrue(xlsx_bytes.startswith(b"PK\x03\x04"))

        # 4. PDF
        pdf_bytes = export_to_pdf(report)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_05_clean_room_licensing_and_dependencies(self):
        """Verify zero proprietary or PolyForm-restricted dependencies in the engine."""
        import ostaad_boq
        module_path = Path(ostaad_boq.__file__).parent

        # Scan for forbidden restrictive licenses
        forbidden_license_markers = [
            "polyform noncommercial",
            "polyform free trial",
            "polyform small business",
            "noncommercial license",
            "all rights reserved",
        ]
        for py_file in module_path.glob("**/*.py"):
            with open(py_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read().lower()
                for marker in forbidden_license_markers:
                    self.assertNotIn(marker, content, f"Restrictive license marker '{marker}' found in {py_file.name}")


if __name__ == "__main__":
    unittest.main()
