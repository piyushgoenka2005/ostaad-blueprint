"""Main orchestrator for Ostaad Blueprint-to-BOQ Engine.

Connects Ingestion -> OCR -> Scale Calibration -> OpenCV Geometry ->
VLM Semantic Extraction -> Reconciliation & BOQ Assembly.
"""

from __future__ import annotations

import os
import re
import time
from typing import Any
from .models import (
    BOQReport,
    CalculationMethod,
    DrawingType,
    ReconciliationFlag,
    TakeoffLine,
    UnitType,
)
from .ingest import ingest_blueprint, IngestedSheet
from .ocr import OCREngine, parse_room_area_callouts, parse_title_block_metadata
from .classifier import DrawingTypeClassifier
from .scale import calibrate_scale
from .geometry import extract_wall_measurements, extract_drawing_geometry
from .vlm_engine import extract_semantic_elements
from .reconciliation import assemble_and_reconcile_boq
from .evidence_graph import build_evidence_graph, audit_and_fuse_evidence
from .schedules import extract_schedules_and_legends
from .classification_engine import classify_boq_lines
from .derived_materials import calculate_civil_derived_materials
from .audit_trail import audit_and_enrich_report
from .pricing_engine import price_boq_report


class OstaadBOQEngine:
    """Independent, commercially viable Blueprint-to-BOQ Takeoff Engine."""

    def __init__(self) -> None:
        self.ocr_engine = OCREngine()
        self.classifier = DrawingTypeClassifier()
        self.gemini_service = None
        try:
            from .gemini_service import GeminiService
            self.gemini_service = GeminiService()
        except Exception:
            pass

    def process_file(self, file_path: str) -> BOQReport:
        """Process a blueprint from a filesystem path."""
        with open(file_path, "rb") as f:
            data = f.read()
        return self.process(data, os.path.basename(file_path))

    def process(self, file_bytes: bytes, filename: str) -> BOQReport:
        """Run the complete end-to-end takeoff pipeline on a blueprint file."""
        t0 = time.time()

        # Step 1: Ingestion & Resolution Normalization
        sheets = ingest_blueprint(file_bytes, filename)
        if not sheets:
            raise ValueError(f"No valid sheets found in {filename}")

        primary_sheet = sheets[0]

        # Step 2: Text & Annotation OCR
        ocr_items = self.ocr_engine.extract_text(primary_sheet)

        # Step 2.5: Drawing Classification (Gatekeeper)
        classification = self.classifier.classify(
            sheet=primary_sheet,
            ocr_items=ocr_items,
        )

        # Parse title block metadata early for scale cross-validation
        title_metadata = parse_title_block_metadata(ocr_items)
        gemini_scale = None
        if not title_metadata.get("scale_ratio") and self.gemini_service and self.gemini_service.is_available:
            try:
                import io
                from .gemini_service import GeminiTitleBlockResponse
                thumb = primary_sheet.image.copy()
                thumb.thumbnail((1600, 1600))
                buf = io.BytesIO()
                thumb.save(buf, format="JPEG", quality=85)
                t_resp, _ = self.gemini_service.generate_structured(
                    prompt="Extract drawing scale ratio (e.g. 1:250), sheet title, and stated total area from this title block.",
                    image_bytes=buf.getvalue(),
                    response_model=GeminiTitleBlockResponse,
                )
                if t_resp and t_resp.scale_string:
                    gemini_scale = t_resp.scale_string
            except Exception:
                pass

        # Step 3: Reliable Scale Calibration with Scale Validation Layer
        scale = calibrate_scale(
            ocr_items=ocr_items,
            image_width=primary_sheet.width_px,
            image_height=primary_sheet.height_px,
            dpi=primary_sheet.dpi,
            sheet=primary_sheet,
            gemini_scale_string=gemini_scale,
            stated_premises_area_m2=title_metadata.get("total_premises_area"),
        )

        # Gate Check: If not an architectural floor plan, extract civil/site geometry and assemble civil BOQ
        if classification.drawing_type != DrawingType.ARCHITECTURAL_FLOOR_PLAN:
            site_linear_runs, _, site_features = extract_drawing_geometry(
                primary_sheet, scale, classification.drawing_type
            )
            site_schedules, site_legends = extract_schedules_and_legends(ocr_items, classification)

            # Assemble Civil / Site Takeoff Lines
            site_lines: list[TakeoffLine] = []

            # 1. Total Premises Area / Site Clearing & Earthwork
            premises_area = title_metadata.get("total_premises_area")
            if not premises_area:
                boundary_feats = [f for f in site_features if f.feature_type == "property_boundary" and f.measured_area]
                if boundary_feats:
                    premises_area = boundary_feats[0].measured_area

            raw_area_unit = title_metadata.get("area_unit")
            is_metric = scale and scale.unit in ["m", "metre", "meter"]

            if premises_area and premises_area > 0:
                if is_metric:
                    area_unit = UnitType.SQM
                    if raw_area_unit and "ft" in raw_area_unit.lower() and premises_area > 20000:
                        premises_area = premises_area / 10.7639
                else:
                    area_unit = UnitType.SF
                    if raw_area_unit and "m" in raw_area_unit.lower():
                        premises_area = premises_area * 10.7639

                site_lines.append(
                    TakeoffLine(
                        id="line-site-clearing",
                        item_description="Site Clearing, Grubbing & Ground Preparation across Premises Area",
                        category="31 10 00 - Site Clearing and Earth Moving",
                        quantity=round(premises_area, 2),
                        unit=area_unit,
                        confidence=0.98 if title_metadata.get("total_premises_area") else 0.90,
                        source_sheet=primary_sheet.sheet_name,
                        calculation_method=CalculationMethod.CALLOUT_STATED if title_metadata.get("total_premises_area") else CalculationMethod.POLYGON_AREA,
                        assumptions=f"Premises boundary area stated in title block: {premises_area:.2f} {area_unit.value}" if title_metadata.get("total_premises_area") else f"Calculated from closed boundary polygon ({premises_area:.2f} {area_unit.value})",
                        is_measured=True,
                    )
                )

            # 2. Site Linear Runs (Boundary Wall Perimeter, Guard Wall, Road runs, etc.)
            for run in site_linear_runs:
                run_label_lower = run.label.lower()
                if "boundary" in run_label_lower or "guard" in run_label_lower:
                    site_lines.append(
                        TakeoffLine(
                            id=f"line-{run.id}",
                            item_description=f"Property Boundary Wall / Enclosure - {run.label}",
                            category="32 31 00 - Fences, Gates, and Boundary Enclosures",
                            quantity=round(run.length, 2),
                            unit=run.unit,
                            confidence=0.95,
                            source_sheet=primary_sheet.sheet_name,
                            calculation_method=run.calculation_method,
                            assumptions=run.notes or f"Measured closed perimeter from boundary contour ({run.length:.2f} {run.unit.value})",
                            is_measured=True,
                        )
                    )
                elif "structure" in run_label_lower or "plinth" in run_label_lower:
                    site_lines.append(
                        TakeoffLine(
                            id=f"line-{run.id}",
                            item_description=f"Existing Structures / Sheds Plinth Perimeter ({run.count} structures)",
                            category="03 30 00 - Cast-in-Place Concrete",
                            quantity=round(run.length, 2),
                            unit=run.unit,
                            confidence=0.92,
                            source_sheet=primary_sheet.sheet_name,
                            calculation_method=run.calculation_method,
                            assumptions=run.notes or f"Measured plinth perimeters across {run.count} existing structures",
                            is_measured=True,
                        )
                    )
                else:
                    site_lines.append(
                        TakeoffLine(
                            id=f"line-{run.id}",
                            item_description=run.label,
                            category="32 00 00 - Exterior Improvements",
                            quantity=round(run.length, 2),
                            unit=run.unit,
                            confidence=0.90,
                            source_sheet=primary_sheet.sheet_name,
                            calculation_method=run.calculation_method,
                            assumptions=run.notes or f"Measured linear run ({run.length:.2f} {run.unit.value})",
                            is_measured=True,
                        )
                    )

            # 3. Existing Structure / Plinth Surface Areas
            struct_feats = [f for f in site_features if f.feature_type in ["building_footprint", "structure_footprint"] and f.measured_area]
            if struct_feats:
                total_plinth_sqm = sum(f.measured_area for f in struct_feats)
                site_lines.append(
                    TakeoffLine(
                        id="line-site-plinth-area",
                        item_description=f"Existing Building Plinth Footprints / Concrete Bases ({len(struct_feats)} structures)",
                        category="03 30 00 - Cast-in-Place Concrete",
                        quantity=round(total_plinth_sqm, 2),
                        unit=struct_feats[0].area_unit or UnitType.SQM,
                        confidence=0.92,
                        source_sheet=primary_sheet.sheet_name,
                        calculation_method=CalculationMethod.POLYGON_AREA,
                        assumptions=f"Measured ground footprint surface area across {len(struct_feats)} building plinths",
                        is_measured=True,
                    )
                )

            # 4. Civil Derived Materials (Brick Masonry Volume CU.M. & Cement Plastering SQ.M.)
            civil_derived = calculate_civil_derived_materials(
                linear_runs=site_linear_runs,
                geometric_features=site_features,
                scale=scale,
                sheet_name=primary_sheet.sheet_name,
            )
            site_lines.extend(civil_derived)

            # 5. Geodetic Benchmarks / Setting Out
            has_bm = any("bm" in lg.symbol_tag.lower() or "benchmark" in lg.meaning.lower() for lg in site_legends) or any(
                re.search(r"\b(?:tbm|bm|benchmark)\b", it.text, re.IGNORECASE) for it in ocr_items
            )
            if has_bm:
                site_lines.append(
                    TakeoffLine(
                        id="line-geodetic-setting-out",
                        item_description="Setting Out, Geodetic Control & Temporary Benchmarks (TBM/BM Establishment)",
                        category="01 71 23 - Field Engineering",
                        quantity=1.0,
                        unit=UnitType.EA,
                        confidence=0.95,
                        source_sheet=primary_sheet.sheet_name,
                        calculation_method=CalculationMethod.COUNTED,
                        assumptions="Establishment and protection of geodetic benchmarks and site grid control points",
                        is_measured=True,
                    )
                )

            # 6. Standard WBS Classification (CSI MasterFormat, NRM2, CPWD DSR)
            classify_boq_lines(site_lines)

            # 7. Evidence Graph & Reconciliation
            site_evidence_graph = build_evidence_graph(
                sheet_name=primary_sheet.sheet_name,
                ocr_items=ocr_items,
                geometric_features=site_features,
                symbol_candidates=[],
                takeoff_lines=site_lines,
                classification=classification,
            )
            audited_site_lines, audit_flags = audit_and_fuse_evidence(site_evidence_graph, site_lines, classification)

            non_arch_flag = ReconciliationFlag(
                id="flag-drawing-type-non-floorplan",
                severity="info",
                category="Drawing Classification",
                subject=f"Drawing classified as {classification.drawing_type.value}",
                details=(
                    f"Document identified as {classification.drawing_type.value} with "
                    f"{classification.confidence * 100:.1f}% confidence ({classification.classification_reasoning}). "
                    f"Architectural residential room parsing was bypassed; deterministic civil site geometry extracted."
                ),
                recommendation=(
                    "Verify drawing classification. If this is a site survey, civil boundary "
                    "takeoff applies. Interior residential room takeoffs are disabled."
                ),
            )

            report = BOQReport(
                project_name=f"{classification.drawing_type.value.replace('_', ' ').title()} Takeoff",
                sheet_name=primary_sheet.sheet_name,
                scale=scale,
                classification=classification,
                lines=audited_site_lines,
                rooms=[],  # STRICT INVARIANT: 0 rooms on site surveys
                linear_runs=site_linear_runs,
                geometric_features=site_features,
                symbol_candidates=[],
                schedules=site_schedules,
                legend_items=site_legends,
                reconciliation_flags=[non_arch_flag] + audit_flags,
                evidence_graph=site_evidence_graph,
                metadata={
                    "drawing_type": classification.drawing_type.value,
                    "classification_confidence": classification.confidence,
                    "classification_evidence": classification.evidence,
                    "site_features_count": len(site_features),
                    "schedules_count": len(site_schedules),
                    "legend_items_count": len(site_legends),
                    "total_premises_area": premises_area,
                },
            )

            elapsed = round(time.time() - t0, 2)
            report.metadata["processing_time_sec"] = elapsed
            report.metadata["ocr_token_count"] = len(ocr_items)
            report.metadata["image_dimensions"] = f"{primary_sheet.width_px}x{primary_sheet.height_px}"
            report = audit_and_enrich_report(report)
            currency = "INR" if (scale and scale.unit in ["m", "metre", "meter"]) else "USD"
            return price_boq_report(report, currency=currency)



        # Step 4: Deterministic Geometry (Wall lengths LF/M, Room polygons SF/SQM, Geometric Features)
        linear_runs, room_polygons, arch_features = extract_drawing_geometry(
            primary_sheet, scale, classification.drawing_type
        )

        # Step 5: VLM Semantic Blueprint Extraction (Doors, Windows, Fixtures, Schedules)
        semantic_data = extract_semantic_elements(primary_sheet.image, primary_sheet.sheet_name, ocr_items=ocr_items)

        # Step 6: Enrich rooms with explicit OCR callouts if present
        stated_rooms = parse_room_area_callouts(ocr_items)
        if stated_rooms and "rooms" in semantic_data:
            # Cross-reference stated rooms from OCR
            for sr in stated_rooms:
                matched = False
                for r in semantic_data["rooms"]:
                    if sr["room_name"].lower() in r["name"].lower() or r["name"].lower() in sr["room_name"].lower():
                        r["stated_area_sqft"] = sr["stated_sqft"]
                        r["bbox"] = sr["bbox"]
                        matched = True
                        break
                if not matched:
                    semantic_data["rooms"].append({
                        "name": sr["room_name"],
                        "stated_area_sqft": sr["stated_sqft"],
                        "confidence": sr["confidence"],
                        "bbox": sr["bbox"],
                    })

        # Step 7: Reconciliation & BOQ Assembly
        report = assemble_and_reconcile_boq(
            sheet_name=primary_sheet.sheet_name,
            scale=scale,
            semantic_data=semantic_data,
            ocr_items=ocr_items,
            linear_runs=linear_runs,
            room_polygons=room_polygons,
            classification=classification,
            geometric_features=arch_features,
        )


        elapsed = round(time.time() - t0, 2)
        report.metadata["processing_time_sec"] = elapsed
        report.metadata["ocr_token_count"] = len(ocr_items)
        report.metadata["image_dimensions"] = f"{primary_sheet.width_px}x{primary_sheet.height_px}"

        return report
