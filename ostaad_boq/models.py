"""Data models for Ostaad Blueprint-to-BOQ Engine.

Commercially clean-room schemas (MIT/Apache-2.0 compatible).
Defines structured takeoff lines, room measurements, scale calibrations,
drawing classifications, and reconciliation audit flags.
"""

from __future__ import annotations

from enum import Enum
import uuid
from typing import Any
from pydantic import BaseModel, Field


class DrawingType(str, Enum):
    ARCHITECTURAL_FLOOR_PLAN = "ARCHITECTURAL_FLOOR_PLAN"
    STRUCTURAL_DRAWING = "STRUCTURAL_DRAWING"
    ELECTRICAL_DRAWING = "ELECTRICAL_DRAWING"
    PLUMBING_DRAWING = "PLUMBING_DRAWING"
    HVAC_DRAWING = "HVAC_DRAWING"
    SITE_TOPOGRAPHICAL_SURVEY = "SITE_TOPOGRAPHICAL_SURVEY"
    ELEVATION = "ELEVATION"
    SECTION = "SECTION"
    SCHEDULE = "SCHEDULE"
    UNKNOWN = "UNKNOWN"


class ClassificationResult(BaseModel):
    """Drawing type classification details with supporting evidence."""
    drawing_type: DrawingType = DrawingType.UNKNOWN
    confidence: float = 0.0
    evidence: list[str] = Field(default_factory=list)
    source_page: int = 1
    classification_reasoning: str = ""


class NativeVectorPath(BaseModel):
    """Native CAD/PDF vector path geometry (lines, polylines, rects, curves)."""
    path_type: str = "line"                # 'line', 'rect', 'curve', 'polyline'
    points: list[tuple[float, float]] = Field(default_factory=list)  # (x, y) normalized 0..1
    stroke_color: tuple[float, float, float] | None = None
    stroke_width: float = 1.0
    is_closed: bool = False
    layer: str | None = None


class TextToken(BaseModel):
    """Text token with strict origin provenance for audited takeoff tracing."""
    text: str
    normalized_text: str = ""
    confidence: float = 1.0
    bbox: tuple[float, float, float, float]  # (x_min, y_min, x_max, y_max) normalized 0..1
    source_type: str = "native_vector_text"  # 'native_vector_text', 'ocr_raster'
    page_number: int = 1
    font_size: float = 0.0


class UnitType(str, Enum):
    EA = "EA"          # Each (discrete counts: doors, windows, fixtures)
    LF = "LF"          # Linear Feet (walls, conduit, pipes)
    SF = "SF"          # Square Feet (flooring, ceiling, drywall)
    SY = "SY"          # Square Yards (carpeting, turf)
    CY = "CY"          # Cubic Yards (concrete footings, slab)
    M = "M"            # Metres
    SQM = "SQM"        # Square Metres
    CUM = "CU.M."      # Cubic Metres (earthwork, concrete, masonry)
    GAL = "GAL"        # Gallons (liquid finishes, paint)
    L = "L"            # Litres (metric liquid finishes, paint)
    NORM = "norm"      # Normalized units when drawing scale is unresolved
    NORM_SQ = "norm²"  # Normalized area when drawing scale is unresolved



class CalculationMethod(str, Enum):
    COUNTED = "counted"                    # Discrete visual detection or schedule entry
    LINEAR_MEASURED = "linear_measured"    # Measured polyline scaled to real distance
    POLYGON_AREA = "polygon_area"          # Wall-bounded room polygon area
    SCHEDULE_PARSED = "schedule_parsed"    # Extracted from door/window/finish schedule table
    CALLOUT_STATED = "callout_stated"      # Explicitly stated text callout on plan (e.g. 137 sq ft)
    DERIVED_MATERIAL = "derived_material"  # Calculated rule-of-thumb (drywall = wall LF * height * 2)


class ItemCategory(str, Enum):
    OPENINGS_DOORS = "08 10 00 - Doors and Frames"
    OPENINGS_WINDOWS = "08 50 00 - Windows"
    PLUMBING_FIXTURES = "22 40 00 - Plumbing Fixtures"
    APPLIANCES = "11 31 00 - Residential Appliances"
    CASEWORK = "12 30 00 - Casework and Cabinets"
    FINISHES_FLOORING = "09 65 00 - Flooring Finishes"
    FINISHES_WALLS = "09 22 00 - Wall Framing and Drywall"
    ELECTRICAL_DEVICES = "26 27 00 - Wiring Devices"
    ROOM_SPACES = "01 11 00 - Spatial Allocation"
    GENERAL = "01 00 00 - General Requirements"
    SITE_CIVIL = "31 00 00 - Earthwork & Site Civil"


class ScaleCalibration(BaseModel):
    """Drawing scale calibration details. Never silently guesses unknown scales."""
    scale_known: bool = False
    pixels_per_unit: float = 0.0          # e.g., pixels per linear foot or meter
    unit: str = "ft"                       # 'ft', 'metre', 'm', or 'norm'
    raw_scale_text: str | None = None      # e.g., '1:250', '1/4" = 1\'-0"'
    method: str = "unresolved"             # 'title_block_scale', 'scale_string', 'dimension_ocr', 'multi_scale_conflict', 'unresolved'
    confidence: float = 0.0
    has_conflict: bool = False
    conflicting_scales: list[str] = Field(default_factory=list)
    needs_review: bool = False
    notes: str = ""


class ValidationStatus(str, Enum):
    VERIFIED = "VERIFIED"          # Independently corroborated by 2+ sources (e.g. Schedule + Vector)
    SUPPORTED = "SUPPORTED"        # Detected with high confidence by 1 strong source
    NEEDS_REVIEW = "NEEDS_REVIEW"  # Conflicting evidence or VLM-only uncorroborated detection
    REJECTED = "REJECTED"          # Failed anti-hallucination gate or invalid geometry


class QuantityType(str, Enum):
    MEASURED_QUANTITY = "MEASURED_QUANTITY"    # Direct geometric measurement (area, length)
    DERIVED_QUANTITY = "DERIVED_QUANTITY"      # Formula-based secondary material (e.g. mortar from masonry)
    ESTIMATED_QUANTITY = "ESTIMATED_QUANTITY"  # VLM or schedule count without vector verification


class EvidenceCandidate(BaseModel):
    """Normalized evidence candidate from AI, OCR, Vector, or Geometry subsystems."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_type: str
    category: str
    source: str                                # "GEMINI", "VECTOR", "OCR_SCHEDULE", "OPENCV"
    source_model: str | None = None            # "gemini-3.8-flash"
    model_version: str | None = None
    sheet_id: str = "sheet-1"
    page_number: int = 1
    bbox_normalized: list[float] = Field(default_factory=list)  # [ymin, xmin, ymax, xmax] in [0.0, 1.0]
    polygon_normalized: list[list[float]] | None = None
    raw_text: str | None = None
    normalized_text: str | None = None
    quantity: float = 1.0
    unit: str = "EA"
    scale_ratio: float | None = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    corroborating_evidence_ids: list[str] = Field(default_factory=list)
    calculation_method: str = "counted"
    assumptions: list[str] = Field(default_factory=list)
    validation_status: ValidationStatus = ValidationStatus.NEEDS_REVIEW
    quantity_type: QuantityType = QuantityType.ESTIMATED_QUANTITY


class TakeoffLine(BaseModel):
    """A single line item in the Bill of Quantities with standardized WBS classification."""
    id: str
    item_description: str
    category: str
    quantity: float
    unit: UnitType
    confidence: float = 1.0
    source_sheet: str = "Sheet 1"
    bounding_box: list[float] | None = None  # [x_min, y_min, x_max, y_max] in normalized 0-1 coords
    calculation_method: CalculationMethod
    assumptions: str = ""
    is_measured: bool = True               # True = directly measured; False = estimated/derived
    needs_review: bool = False
    review_reasons: list[str] = Field(default_factory=list)
    user_edited: bool = False

    # Stage 9: CSI MasterFormat & NRM Standardized WBS Classifications
    wbs_code: str = ""                     # e.g., '08 11 00', '09 29 00', '32 31 00'
    wbs_title: str = ""                    # e.g., 'Metal Doors and Frames', 'Gypsum Board'
    csi_division: str = ""                 # e.g., '08 - Openings', '09 - Finishes'
    nrm_code: str | None = None            # e.g., '17.1' (RICS NRM2)
    cpwd_code: str | None = None           # e.g., '9.1' (CPWD DSR)

    # Stage 11: Audit Trail, Provenance & Multi-Factor Confidence
    source_layer: str | None = None        # CAD vector layer or detector source (e.g. 'A-DOOR', '0')
    audit_trail: list[str] = Field(default_factory=list)  # Chronological audit history
    audit_confidence: dict[str, float] = Field(default_factory=dict)  # Detailed confidence breakdown
    validation_status: ValidationStatus = ValidationStatus.SUPPORTED
    quantity_type: QuantityType = QuantityType.MEASURED_QUANTITY
    corroborating_evidence_ids: list[str] = Field(default_factory=list)

    # Stage 12: Cost Estimation & Pricing Engine
    currency: str = "USD"
    unit_cost: float = 0.0
    material_cost: float = 0.0
    labor_cost: float = 0.0
    equipment_cost: float = 0.0
    total_cost: float = 0.0



class RoomTakeoff(BaseModel):
    """Measurement and reconciliation of a room or designated space."""
    id: str
    name: str
    stated_area_sqft: float | None = None     # Stated on drawing text (e.g. 137 sq ft)
    measured_area_sqft: float | None = None   # Computed from closed wall polygon
    perimeter_lf: float | None = None
    bounding_box: list[float] | None = None
    confidence: float = 0.95
    discrepancy_pct: float | None = None
    flooring_category: str = "09 65 00 - Flooring Finishes"
    needs_review: bool = False
    notes: str = ""
    source_layer: str | None = None
    audit_trail: list[str] = Field(default_factory=list)



class LinearRun(BaseModel):
    """Linear measurement for walls, partitions, or conduits."""
    id: str
    label: str
    length: float
    unit: UnitType
    count: int = 1
    calculation_method: CalculationMethod = CalculationMethod.LINEAR_MEASURED
    notes: str = ""


class GeometricFeature(BaseModel):
    """Deterministic geometric feature (boundary, road, wall, footprint, envelope)."""
    id: str
    feature_type: str                   # 'property_boundary', 'guard_wall', 'road', 'building_footprint', 'wall', 'room_envelope'
    geometry_type: str = "polygon"      # 'polygon', 'polyline', 'line'
    points: list[tuple[float, float]] = Field(default_factory=list)  # Normalized (0..1) coords
    measured_length: float | None = None
    length_unit: UnitType = UnitType.M
    measured_area: float | None = None
    area_unit: UnitType = UnitType.SQM
    formula: str = ""                   # e.g., "Shoelace polygon formula scaled at 23.62 px/m"
    confidence: float = 0.95
    source_layer: str | None = None
    notes: str = ""


class SymbolCandidate(BaseModel):
    """Visual symbol or opening detected on drawing with bounding box and provenance."""
    id: str
    symbol_type: str                   # 'door', 'window', 'column', 'plumbing_fixture', 'electrical_device'
    label: str                         # e.g., 'D1', 'W2', 'V', 'C1', 'WC'
    description: str = ""
    bbox: list[float]                  # [x_min, y_min, x_max, y_max] normalized 0..1
    detector_source: str = "symbol_tag_detector"  # 'symbol_tag_detector', 'gemini_vlm', 'legend_parser'
    model_version: str = "v1.0"
    confidence: float = 0.90
    attributes: dict[str, Any] = Field(default_factory=dict)


class EvidenceNodeType(str, Enum):
    VECTOR_PATH = "vector_path"
    OCR_TOKEN = "ocr_token"
    GEOMETRIC_FEATURE = "geometric_feature"
    SYMBOL_CANDIDATE = "symbol_candidate"
    TAKEOFF_ITEM = "takeoff_item"


class EvidenceEdgeType(str, Enum):
    SPATIALLY_CONTAINS = "spatially_contains"
    CO_LOCATED = "co_located"
    LABELLED_BY = "labelled_by"
    CORROBORATES = "corroborates"
    CONTRADICTS = "contradicts"


class EvidenceNode(BaseModel):
    """A multi-modal perception or measurement entity in the anti-hallucination graph."""
    node_id: str
    node_type: str
    label: str
    bbox: list[float] | None = None
    confidence: float = 1.0
    source: str = ""
    attributes: dict[str, Any] = Field(default_factory=dict)


class EvidenceEdge(BaseModel):
    """An association, corroboration, or contradiction between two evidence nodes."""
    source_id: str
    target_id: str
    edge_type: str
    confidence: float = 1.0
    description: str = ""


class EvidenceGraph(BaseModel):
    """Anti-hallucination corroboration graph uniting vectors, text, geometry, and symbols."""
    nodes: dict[str, EvidenceNode] = Field(default_factory=dict)
    edges: list[EvidenceEdge] = Field(default_factory=list)

    def add_node(self, node: EvidenceNode) -> None:
        self.nodes[node.node_id] = node

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        edge_type: str,
        confidence: float = 1.0,
        description: str = "",
    ) -> None:
        self.edges.append(
            EvidenceEdge(
                source_id=source_id,
                target_id=target_id,
                edge_type=edge_type,
                confidence=confidence,
                description=description,
            )
        )

    def get_corroborating_nodes(self, node_id: str) -> list[EvidenceNode]:
        corroborators: list[EvidenceNode] = []
        for e in self.edges:
            if e.edge_type in [
                EvidenceEdgeType.CORROBORATES.value,
                EvidenceEdgeType.LABELLED_BY.value,
                EvidenceEdgeType.CO_LOCATED.value,
                EvidenceEdgeType.SPATIALLY_CONTAINS.value,
            ]:
                other_id = e.target_id if e.source_id == node_id else (e.source_id if e.target_id == node_id else None)
                if other_id and other_id in self.nodes:
                    corroborators.append(self.nodes[other_id])
        return corroborators

    def find_contradictions(self) -> list[EvidenceEdge]:
        return [e for e in self.edges if e.edge_type == EvidenceEdgeType.CONTRADICTS.value]


class ReconciliationFlag(BaseModel):
    """Audit discrepancy or uncertainty flagged for human estimator review."""
    id: str
    severity: str = "warning"              # 'info', 'warning', 'discrepancy'
    category: str
    item_id: str | None = None
    subject: str
    details: str
    recommendation: str


class ScheduleItem(BaseModel):
    """An individual entry / row in a parsed schedule table."""
    tag: str                              # e.g., 'D1', 'W2', 'C1', 'TOTAL'
    description: str = ""                 # e.g., 'Single Flush Solid Core Door'
    width: str | None = None              # e.g., '3\'-0"', '900 mm'
    height: str | None = None             # e.g., '7\'-0"', '2100 mm'
    material: str | None = None           # e.g., 'Teak Wood', 'Aluminum', 'UPVC'
    quantity: float | None = None         # Stated count in table
    remarks: str = ""
    raw_data: dict[str, str] = Field(default_factory=dict)


class ScheduleTable(BaseModel):
    """A tabular schedule extracted from drawing (Door, Window, Finish, Area Summary)."""
    id: str
    schedule_type: str                    # 'door_schedule', 'window_schedule', 'finish_schedule', 'area_summary', 'notes_schedule'
    title: str
    headers: list[str] = Field(default_factory=list)
    items: list[ScheduleItem] = Field(default_factory=list)
    confidence: float = 0.90
    bbox: list[float] | None = None


class LegendItem(BaseModel):
    """A symbol or abbreviation mapping from drawing legend / notes."""
    symbol_tag: str                       # e.g., 'BM', 'TBM', 'EP', 'MH', 'D1'
    meaning: str                          # e.g., 'Temporary Benchmark', 'Electric Pole'
    category: str = "civil_notes"         # 'civil_notes', 'architectural', 'electrical', 'plumbing'
    confidence: float = 0.95


class ProjectCostSummary(BaseModel):
    """Overall financial roll-up including direct costs, overhead, profit, and contingency."""
    currency: str = "USD"                  # 'USD', 'INR', 'GBP'
    currency_symbol: str = "$"             # '$', '₹', '£'
    direct_cost_subtotal: float = 0.0
    material_cost_subtotal: float = 0.0
    labor_cost_subtotal: float = 0.0
    equipment_cost_subtotal: float = 0.0
    overhead_pct: float = 10.0
    overhead_amount: float = 0.0
    profit_pct: float = 10.0
    profit_amount: float = 0.0
    contingency_pct: float = 5.0
    contingency_amount: float = 0.0
    total_estimated_budget: float = 0.0


class BOQReport(BaseModel):
    """Complete structured Bill of Quantities package."""
    project_name: str = "Blueprint Takeoff"
    sheet_name: str = "Sheet 1"
    scale: ScaleCalibration
    classification: ClassificationResult = Field(default_factory=ClassificationResult)
    lines: list[TakeoffLine] = Field(default_factory=list)
    rooms: list[RoomTakeoff] = Field(default_factory=list)
    linear_runs: list[LinearRun] = Field(default_factory=list)
    geometric_features: list[GeometricFeature] = Field(default_factory=list)
    symbol_candidates: list[SymbolCandidate] = Field(default_factory=list)
    schedules: list[ScheduleTable] = Field(default_factory=list)
    legend_items: list[LegendItem] = Field(default_factory=list)
    reconciliation_flags: list[ReconciliationFlag] = Field(default_factory=list)
    evidence_graph: EvidenceGraph = Field(default_factory=EvidenceGraph)
    evidence_candidates: list[EvidenceCandidate] = Field(default_factory=list)
    cost_summary: ProjectCostSummary = Field(default_factory=ProjectCostSummary)
    metadata: dict[str, Any] = Field(default_factory=dict)




    @property
    def total_count(self) -> int:
        return len(self.lines)

    @property
    def total_needs_review(self) -> int:
        return sum(1 for line in self.lines if line.needs_review) + len(self.reconciliation_flags)
