"""Data models for Ostaad Blueprint-to-BOQ Engine.

Commercially clean-room schemas (MIT/Apache-2.0 compatible).
Defines structured takeoff lines, room measurements, scale calibrations,
and reconciliation audit flags.
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class UnitType(str, Enum):
    EA = "EA"          # Each (discrete counts: doors, windows, fixtures)
    LF = "LF"          # Linear Feet (walls, conduit, pipes)
    SF = "SF"          # Square Feet (flooring, ceiling, drywall)
    SY = "SY"          # Square Yards (carpeting, turf)
    CY = "CY"          # Cubic Yards (concrete footings, slab)
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


class ScaleCalibration(BaseModel):
    """Drawing scale calibration details. Never silently guesses unknown scales."""
    scale_known: bool = False
    pixels_per_unit: float = 0.0          # e.g., pixels per linear foot
    unit: str = "ft"                       # 'ft' or 'm'
    raw_scale_text: str | None = None      # e.g., '1/4" = 1\'-0"' or '17\'1" = 340px'
    method: str = "unresolved"             # 'dimension_ocr', 'scale_string', 'manual', 'unresolved'
    confidence: float = 0.0
    notes: str = ""


class TakeoffLine(BaseModel):
    """A single line item in the Bill of Quantities."""
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


class LinearRun(BaseModel):
    """Linear measurement for walls, partitions, or conduits."""
    id: str
    label: str
    length: float
    unit: UnitType
    count: int = 1
    calculation_method: CalculationMethod = CalculationMethod.LINEAR_MEASURED
    notes: str = ""


class ReconciliationFlag(BaseModel):
    """Audit discrepancy or uncertainty flagged for human estimator review."""
    id: str
    severity: str = "warning"              # 'info', 'warning', 'discrepancy'
    category: str
    item_id: str | None = None
    subject: str
    details: str
    recommendation: str


class BOQReport(BaseModel):
    """Complete structured Bill of Quantities package."""
    project_name: str = "Blueprint Takeoff"
    sheet_name: str = "Sheet 1"
    scale: ScaleCalibration
    lines: list[TakeoffLine] = Field(default_factory=list)
    rooms: list[RoomTakeoff] = Field(default_factory=list)
    linear_runs: list[LinearRun] = Field(default_factory=list)
    reconciliation_flags: list[ReconciliationFlag] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @property
    def total_count(self) -> int:
        return len(self.lines)

    @property
    def total_needs_review(self) -> int:
        return sum(1 for line in self.lines if line.needs_review) + len(self.reconciliation_flags)
