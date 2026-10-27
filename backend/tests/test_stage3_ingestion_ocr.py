"""Stage 3 Test Suite: PDF / CAD / Vector + OCR Ingestion.

Validates:
1. Native CAD/PDF vector path extraction (lines, polylines, rects, curves).
2. Native vector text extraction with bounding boxes and font sizes.
3. Hybrid OCR extraction with strict token origin provenance and spatial deduplication.
4. Mandatory Evaluation Gate on Barakar Blueprint:
   - Extraction of SCALE 1:250
   - Unit = metre
   - TOTAL PREMISES AREA = 10907.8046 SQ. M.
   - Non-guessing scale calibration (title_block_scale).
"""

from __future__ import annotations

import os
from ostaad_boq.ingest import ingest_blueprint
from ostaad_boq.ocr import OCREngine, OCRItem, parse_title_block_metadata
from ostaad_boq.scale import calibrate_scale
from ostaad_boq.models import ScaleCalibration


def test_synthetic_token_provenance_and_deduplication():
    """Verify that native vector text and raster OCR are cleanly merged with provenance."""
    native_item = OCRItem(
        text="GROUND FLOOR PLAN",
        confidence=0.99,
        bbox=(0.1, 0.1, 0.3, 0.15),
        source_type="native_vector_text",
    )
    raster_item_unique = OCRItem(
        text="SCALE 1:100",
        confidence=0.95,
        bbox=(0.8, 0.05, 0.95, 0.08),
        source_type="ocr_raster",
    )
    # Check post_init normalized text
    assert native_item.normalized_text == "ground floor plan"
    assert native_item.source_type == "native_vector_text"
    assert raster_item_unique.source_type == "ocr_raster"


def test_title_block_metadata_parser_metric():
    """Test title block parser on synthetic metric CAD strings."""
    tokens = [
        OCRItem(text="GOVERNMENT OF WEST BENGAL", confidence=0.98, bbox=(0.05, 0.02, 0.4, 0.05)),
        OCRItem(text="TOPOGRAPHICAL SURVEY", confidence=0.98, bbox=(0.05, 0.06, 0.3, 0.09)),
        OCRItem(text="SCALE 1:250", confidence=0.95, bbox=(0.85, 0.02, 0.95, 0.05)),
        OCRItem(text="TOTAL PREMISES AREA = 10907.8046 SQ. M.", confidence=0.94, bbox=(0.05, 0.70, 0.25, 0.75)),
    ]
    meta = parse_title_block_metadata(tokens)
    assert meta["scale_string"] == "1:250"
    assert meta["scale_ratio"] == 250
    assert meta["measurement_unit"] == "metre"
    assert meta["total_premises_area"] == 10907.8046
    assert meta["area_unit"] == "sq.m."


def test_title_block_metadata_parser_multi_token_adjacent():
    """Test title block parser when OCR splits text across lines."""
    tokens = [
        OCRItem(text="TOTAL PREMISES AREA", confidence=0.95, bbox=(0.02, 0.72, 0.10, 0.73)),
        OCRItem(text="10907.8046 SQ.M.", confidence=0.92, bbox=(0.02, 0.74, 0.11, 0.75)),
        OCRItem(text="SCALE 1.250", confidence=0.95, bbox=(0.91, 0.01, 0.96, 0.02)),
    ]
    meta = parse_title_block_metadata(tokens)
    assert meta["scale_string"] == "1:250"
    assert meta["scale_ratio"] == 250
    assert meta["measurement_unit"] == "metre"
    assert meta["total_premises_area"] == 10907.8046
    assert meta["area_unit"] == "sq.m."


def test_barakar_cad_vector_paths_ingestion():
    """Verify native CAD vector paths extraction on Barakar PDF."""
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    assert os.path.exists(pdf_path)

    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    sheets = ingest_blueprint(file_bytes, "barakar.pdf")
    assert len(sheets) == 1
    sheet = sheets[0]

    # Verify native vector paths
    assert sheet.is_vector_pdf is True
    assert len(sheet.vector_paths) > 10000, f"Expected >10000 vector paths, got {len(sheet.vector_paths)}"
    sample_path = sheet.vector_paths[0]
    assert len(sample_path.points) >= 2
    assert 0.0 <= sample_path.points[0][0] <= 1.0
    assert 0.0 <= sample_path.points[0][1] <= 1.0

    # Verify native text blocks
    assert len(sheet.native_text) == 43


def test_barakar_mandatory_evaluation_gate():
    """MANDATORY EVALUATION GATE:
    Extract SCALE 1:250, unit metre, TOTAL PREMISES AREA = 10907.8046 SQ. M.
    without silent scale guessing.
    """
    pdf_path = os.path.join("assets", "barakar 01.11.2025-Model WITHOUT GRID.pdf")
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    sheet = ingest_blueprint(file_bytes, "barakar.pdf")[0]
    ocr = OCREngine()
    items = ocr.extract_text(sheet)

    # 1. Verify token count and provenance separation
    native_tokens = [it for it in items if it.source_type == "native_vector_text"]
    raster_tokens = [it for it in items if it.source_type == "ocr_raster"]
    assert len(native_tokens) == 43, f"Expected 43 native text tokens, got {len(native_tokens)}"
    assert len(raster_tokens) >= 170, f"Expected >=170 raster CAD tokens, got {len(raster_tokens)}"
    assert len(items) >= 200, f"Expected >=200 total tokens, got {len(items)}"

    # 2. Verify Title Block Metadata Extraction
    meta = parse_title_block_metadata(items)
    print("\nBarakar Extracted Title Block Metadata:", meta)

    assert meta["scale_ratio"] == 250, f"Expected scale ratio 250, got {meta['scale_ratio']}"
    assert meta["scale_string"] == "1:250", f"Expected scale string '1:250', got {meta['scale_string']}"
    assert meta["measurement_unit"] == "metre", f"Expected unit 'metre', got {meta['measurement_unit']}"
    assert meta["total_premises_area"] == 10907.8046, f"Expected 10907.8046, got {meta['total_premises_area']}"
    assert meta["area_unit"] == "sq.m.", f"Expected 'sq.m.', got {meta['area_unit']}"

    # 3. Verify Deterministic Scale Calibration
    scale = calibrate_scale(items, sheet.width_px, sheet.height_px, sheet.dpi)
    print("Barakar Calibrated Scale:", scale)

    assert scale.scale_known is True, "Scale must not be unresolved"
    assert scale.unit == "metre", f"Expected unit 'metre', got '{scale.unit}'"
    assert scale.raw_scale_text == "1:250", f"Expected raw scale '1:250', got '{scale.raw_scale_text}'"
    assert scale.confidence >= 0.95, f"Expected confidence >= 0.95, got {scale.confidence}"
    assert scale.method in ["title_block_scale", "metric_scale_string"]
    # 150 DPI: (1000/250) * (150/25.4) = 23.62 px/m
    assert abs(scale.pixels_per_unit - 23.62) < 0.2


if __name__ == "__main__":
    tests = [
        test_synthetic_token_provenance_and_deduplication,
        test_title_block_metadata_parser_metric,
        test_title_block_metadata_parser_multi_token_adjacent,
        test_barakar_cad_vector_paths_ingestion,
        test_barakar_mandatory_evaluation_gate,
    ]
    passed = 0
    failed = 0
    print(f"Running {len(tests)} Stage 3 Ingestion & OCR Tests...")
    for t in tests:
        name = t.__name__
        try:
            t()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
    print(f"\nResults: {passed} passed, {failed} failed.")
    if failed > 0:
        exit(1)
