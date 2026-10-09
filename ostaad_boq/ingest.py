"""Ingestion module for Ostaad Blueprint-to-BOQ Engine.

Handles PDF (preserving vector geometry & native text) and image blueprints (PNG/JPG).
Normalizes drawing scale and renders high-fidelity image representations for perception.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from pathlib import Path
from PIL import Image

from .models import NativeVectorPath


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
    vector_paths: list[NativeVectorPath] = field(default_factory=list)
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
    """Extract native vector text, CAD geometry paths, and render high-resolution raster sheets."""
    sheets: list[IngestedSheet] = []

    try:
        import fitz  # PyMuPDF
        from .grid_filter import suppress_pdf_grid_layers

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        suppress_pdf_grid_layers(doc)
        for page_idx, page in enumerate(doc):
            pw = float(page.rect.width) if page.rect.width > 0 else 1.0
            ph = float(page.rect.height) if page.rect.height > 0 else 1.0

            # 1. Extract native text blocks
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

            # 2. Extract native CAD vector drawing paths
            vector_paths: list[NativeVectorPath] = []
            for d in page.get_drawings():
                pts: list[tuple[float, float]] = []
                p_type = d.get("type", "path")
                for item in d.get("items", []):
                    cmd = item[0]
                    if cmd == "l":  # line
                        p1, p2 = item[1], item[2]
                        pts.extend([
                            (max(0.0, min(1.0, float(p1.x) / pw)), max(0.0, min(1.0, float(p1.y) / ph))),
                            (max(0.0, min(1.0, float(p2.x) / pw)), max(0.0, min(1.0, float(p2.y) / ph))),
                        ])
                    elif cmd == "re":  # rectangle
                        r = item[1]
                        pts.extend([
                            (max(0.0, min(1.0, float(r.x0) / pw)), max(0.0, min(1.0, float(r.y0) / ph))),
                            (max(0.0, min(1.0, float(r.x1) / pw)), max(0.0, min(1.0, float(r.y1) / ph))),
                        ])
                    elif cmd == "c":  # bezier curve
                        p1, p4 = item[1], item[4]
                        pts.extend([
                            (max(0.0, min(1.0, float(p1.x) / pw)), max(0.0, min(1.0, float(p1.y) / ph))),
                            (max(0.0, min(1.0, float(p4.x) / pw)), max(0.0, min(1.0, float(p4.y) / ph))),
                        ])

                if pts:
                    stroke_c = d.get("color")
                    stroke_tuple = tuple(float(c) for c in stroke_c) if stroke_c else None
                    raw_w = d.get("width")
                    stroke_w = float(raw_w) if raw_w is not None else 1.0
                    vector_paths.append(
                        NativeVectorPath(
                            path_type=str(p_type),
                            points=pts,
                            stroke_color=stroke_tuple,
                            stroke_width=stroke_w,
                            is_closed=bool(d.get("closePath", False)),
                            layer=d.get("layer"),
                        )
                    )

            # 3. High-resolution rasterization (guarantee minimum canvas dimension for blueprint OCR)
            effective_dpi = target_dpi
            min_pt = min(pw, ph)
            if min_pt < 1000:
                effective_dpi = max(target_dpi, int(target_dpi * (1120.0 / max(min_pt, 400.0))))

            zoom = effective_dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

            sheets.append(
                IngestedSheet(
                    sheet_name=f"{Path(filename).stem} - Page {page_idx + 1}",
                    image=img,
                    width_px=img.width,
                    height_px=img.height,
                    dpi=effective_dpi,
                    native_text=text_blocks,
                    vector_paths=vector_paths,
                    is_vector_pdf=True,
                    metadata={
                        "page_number": page_idx + 1,
                        "page_count": len(doc),
                        "vector_path_count": len(vector_paths),
                    },
                )
            )
        doc.close()
    except Exception as e:
        # If PyMuPDF encounters issues, try pypdfium2 / pdf2image, or raise clean informative error
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(pdf_bytes)
            for page_idx, page in enumerate(pdf):
                rendered = page.render(scale=target_dpi / 72.0)
                img = rendered.to_pil()
                sheets.append(
                    IngestedSheet(
                        sheet_name=f"{Path(filename).stem} - Page {page_idx + 1}",
                        image=img,
                        width_px=img.width,
                        height_px=img.height,
                        dpi=target_dpi,
                        metadata={"warning": f"PDF rendered via pdfium fallback: {e}"},
                    )
                )
        except Exception:
            raise ValueError(f"Failed to ingest blueprint PDF '{filename}': {e}") from e

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
