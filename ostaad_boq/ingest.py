"""Ingestion module for Ostaad Blueprint-to-BOQ Engine.

Handles PDF (preserving vector geometry & native text) and image blueprints (PNG/JPG).
Normalizes drawing scale and renders high-fidelity image representations for perception.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from pathlib import Path
from PIL import Image


@dataclass
class NativeTextBlock:
    """Vector text extracted natively from a CAD or PDF blueprint."""
    text: str
    bbox: tuple[float, float, float, float]  # (x0, y0, x1, y1) in sheet points
    font_size: float = 0.0


@dataclass
class IngestedSheet:
    """Normalized ingested blueprint sheet ready for downstream perception & geometry."""
    sheet_name: str
    image: Image.Image
    width_px: int
    height_px: int
    dpi: int = 150
    native_text: list[NativeTextBlock] = field(default_factory=list)
    is_vector_pdf: bool = False
    metadata: dict = field(default_factory=dict)

    def to_png_bytes(self) -> bytes:
        buf = io.BytesIO()
        self.image.save(buf, format="PNG")
        return buf.getvalue()


def ingest_blueprint(file_bytes: bytes, filename: str, target_dpi: int = 150) -> list[IngestedSheet]:
    """Ingest a blueprint file (PDF, PNG, JPG) into one or more normalized IngestedSheet objects."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return _ingest_pdf(file_bytes, filename, target_dpi)
    else:
        return [_ingest_image(file_bytes, filename)]


def _ingest_pdf(pdf_bytes: bytes, filename: str, target_dpi: int) -> list[IngestedSheet]:
    """Extract native vector text and render high-resolution raster sheets from PDF."""
    sheets: list[IngestedSheet] = []

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_idx, page in enumerate(doc):
            # Extract native text
            text_blocks: list[NativeTextBlock] = []
            for block in page.get_text("blocks"):
                text = block[4].strip()
                if text:
                    text_blocks.append(
                        NativeTextBlock(
                            text=text,
                            bbox=(block[0], block[1], block[2], block[3]),
                        )
                    )

            # High-resolution rasterization
            zoom = target_dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

            sheets.append(
                IngestedSheet(
                    sheet_name=f"{Path(filename).stem} - Page {page_idx + 1}",
                    image=img,
                    width_px=img.width,
                    height_px=img.height,
                    dpi=target_dpi,
                    native_text=text_blocks,
                    is_vector_pdf=True,
                    metadata={"page_number": page_idx + 1, "page_count": len(doc)},
                )
            )
        doc.close()
    except Exception as e:
        # Fallback to raster open if fitz encounters issues
        img = Image.open(io.BytesIO(pdf_bytes)).convert("RGB")
        sheets.append(
            IngestedSheet(
                sheet_name=filename,
                image=img,
                width_px=img.width,
                height_px=img.height,
                metadata={"warning": f"PDF rasterized via fallback: {e}"},
            )
        )

    return sheets


def _ingest_image(image_bytes: bytes, filename: str) -> IngestedSheet:
    """Ingest a standard raster blueprint image (PNG, JPG, TIFF) with resolution normalization."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Upscale low-res thumbnails so OCR and line detection have sufficient resolution
    if max(img.width, img.height) < 1200:
        factor = 1200.0 / float(max(img.width, img.height))
        new_w = int(img.width * factor)
        new_h = int(img.height * factor)
        img = img.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)

    return IngestedSheet(
        sheet_name=filename,
        image=img,
        width_px=img.width,
        height_px=img.height,
        is_vector_pdf=False,
    )
