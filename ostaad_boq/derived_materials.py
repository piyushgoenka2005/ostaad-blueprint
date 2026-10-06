"""Stage 10: Derived Materials & Secondary Formulas Engine.

Calculates secondary and derived material estimates from primary measured geometries:
- Architectural: Drywall assemblies, wall paint, baseboard trims, framing studs, flooring with waste.
- Civil: Boundary wall brick masonry volumes, plastering, and coping surfaces.

Enforces strict transparency:
- Every derived item has is_measured=False, CalculationMethod.DERIVED_MATERIAL.
- Full mathematical formula with variables and waste factor documented in assumptions.
- Civil drawings NEVER derive interior residential drywall or paint.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from .models import (
    TakeoffLine,
    LinearRun,
    RoomTakeoff,
    GeometricFeature,
    ScaleCalibration,
    UnitType,
    CalculationMethod,
    ItemCategory,
)
from .classification_engine import classify_takeoff_line


class DerivedMaterialConfig(BaseModel):
    """Configurable estimation parameters for secondary derived formulas."""
    ceiling_height_ft: float = 9.0
    ceiling_height_m: float = 2.75
    wall_sides: int = 2
    drywall_waste_pct: float = 10.0
    paint_waste_pct: float = 10.0
    paint_coats: int = 2
    paint_coverage_sf_per_gal: float = 350.0
    paint_coverage_sqm_per_liter: float = 8.5
    flooring_waste_pct: float = 10.0
    baseboard_waste_pct: float = 8.0
    stud_spacing_inches: float = 16.0  # 16" on-center
    boundary_wall_height_m: float = 1.80
    boundary_wall_thickness_m: float = 0.25
    mortar_waste_pct: float = 5.0


def calculate_architectural_derived_materials(
    linear_runs: list[LinearRun],
    rooms: list[RoomTakeoff],
    door_count: int = 0,
    window_count: int = 0,
    scale: ScaleCalibration | None = None,
    sheet_name: str = "Sheet 1",
    config: DerivedMaterialConfig | None = None,
) -> list[TakeoffLine]:
    """Derive architectural material takeoffs from measured walls and rooms with explicit formulas."""
    cfg = config or DerivedMaterialConfig()
    derived: list[TakeoffLine] = []

    is_metric = scale and scale.unit in ["m", "metre", "meter"]
    total_wall_len = sum(lr.length for lr in linear_runs)

    if total_wall_len <= 0 or not (scale and scale.scale_known):
        return derived

    # 1. Drywall / Wallboard Assemblies (Division 09 29 00)
    if is_metric:
        h = cfg.ceiling_height_m
        gross_area = total_wall_len * h * cfg.wall_sides
        # Average metric door 0.9m x 2.1m = 1.89m2; window 1.2m x 1.2m = 1.44m2
        opening_deduction = (door_count * 1.89) + (window_count * 1.44)
        net_area = max(gross_area * 0.7, gross_area - opening_deduction)
        drywall_qty = round(net_area * (1.0 + cfg.drywall_waste_pct / 100.0), 1)
        drywall_unit = UnitType.SQM
        formula = (
            f"Gross: {total_wall_len:.1f} M * {h:.2f} M * {cfg.wall_sides} sides = {gross_area:.1f} SQM. "
            f"Deduct openings: ({door_count} doors, {window_count} windows) = {opening_deduction:.1f} SQM. "
            f"Net: {net_area:.1f} SQM + {cfg.drywall_waste_pct}% waste = {drywall_qty} SQM"
        )
    else:
        h = cfg.ceiling_height_ft
        gross_area = total_wall_len * h * cfg.wall_sides
        # Average imperial door 3'x7'=21 SF; window 4'x4'=16 SF
        opening_deduction = (door_count * 21.0) + (window_count * 16.0)
        net_area = max(gross_area * 0.7, gross_area - opening_deduction)
        drywall_qty = round(net_area * (1.0 + cfg.drywall_waste_pct / 100.0), 0)
        drywall_unit = UnitType.SF
        formula = (
            f"Gross: {total_wall_len:.1f} LF * {h:.1f} FT * {cfg.wall_sides} sides = {gross_area:.0f} SF. "
            f"Deduct openings: ({door_count} doors, {window_count} windows) = {opening_deduction:.0f} SF. "
            f"Net: {net_area:.0f} SF + {cfg.drywall_waste_pct}% waste = {drywall_qty:.0f} SF"
        )

    wbs_dw = classify_takeoff_line("1/2\" Gypsum Wallboard Assemblies")
    derived.append(
        TakeoffLine(
            id="mat-drywall",
            item_description="1/2\" Gypsum Wallboard Assemblies (Partitions, 2 sides)",
            category=ItemCategory.FINISHES_WALLS.value,
            quantity=drywall_qty,
            unit=drywall_unit,
            confidence=0.90,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=formula,
            is_measured=False,
            wbs_code=wbs_dw.wbs_code,
            wbs_title=wbs_dw.wbs_title,
            csi_division=wbs_dw.csi_division,
            nrm_code=wbs_dw.nrm_code,
            cpwd_code=wbs_dw.cpwd_code,
        )
    )

    # 2. Interior Wall Paint (Division 09 91 00)
    if is_metric:
        total_painted_area = net_area * cfg.paint_coats * (1.0 + cfg.paint_waste_pct / 100.0)
        liters = round(total_painted_area / cfg.paint_coverage_sqm_per_liter, 1)
        paint_qty = liters
        paint_unit = UnitType.L
        paint_formula = (
            f"Net wall surface: {net_area:.1f} SQM * {cfg.paint_coats} coats = {net_area * cfg.paint_coats:.1f} SQM. "
            f"Coverage: {cfg.paint_coverage_sqm_per_liter} SQM/L + {cfg.paint_waste_pct}% waste = {paint_qty} Litres"
        )
    else:
        total_painted_area = net_area * cfg.paint_coats * (1.0 + cfg.paint_waste_pct / 100.0)
        gallons = round(total_painted_area / cfg.paint_coverage_sf_per_gal, 1)
        paint_qty = gallons
        paint_unit = UnitType.GAL
        paint_formula = (
            f"Net wall surface: {net_area:.0f} SF * {cfg.paint_coats} coats = {net_area * cfg.paint_coats:.0f} SF. "
            f"Coverage: {cfg.paint_coverage_sf_per_gal:.0f} SF/Gal + {cfg.paint_waste_pct}% waste = {paint_qty} Gallons"
        )

    wbs_paint = classify_takeoff_line("Interior Acrylic Latex Wall Paint")
    derived.append(
        TakeoffLine(
            id="mat-paint",
            item_description=f"Interior Latex Paint ({cfg.paint_coats} coats, Prime & Finish)",
            category="09 91 00 - Painting",
            quantity=paint_qty,
            unit=paint_unit,
            confidence=0.88,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=paint_formula,
            is_measured=False,
            wbs_code=wbs_paint.wbs_code,
            wbs_title=wbs_paint.wbs_title,
            csi_division=wbs_paint.csi_division,
            nrm_code=wbs_paint.nrm_code,
            cpwd_code=wbs_paint.cpwd_code,
        )
    )

    # 3. Baseboard Trim Moulding (Division 06 20 00 / 09 65 00)
    door_deduction_len = door_count * (0.9 if is_metric else 3.0)
    baseboard_net = max(total_wall_len * 0.5, total_wall_len - door_deduction_len)
    baseboard_qty = round(baseboard_net * (1.0 + cfg.baseboard_waste_pct / 100.0), 1)
    base_unit = UnitType.M if is_metric else UnitType.LF
    base_formula = (
        f"Wall length: {total_wall_len:.1f} {base_unit.value} - door widths ({door_deduction_len:.1f}) = "
        f"{baseboard_net:.1f} + {cfg.baseboard_waste_pct}% waste = {baseboard_qty} {base_unit.value}"
    )

    wbs_base = classify_takeoff_line("Wood Baseboard Trim Moulding")
    derived.append(
        TakeoffLine(
            id="mat-baseboard",
            item_description="Baseboard Trim Moulding (Perimeter Floor Trim)",
            category="06 20 00 - Finish Carpentry",
            quantity=baseboard_qty,
            unit=base_unit,
            confidence=0.88,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=base_formula,
            is_measured=False,
            wbs_code=wbs_base.wbs_code,
            wbs_title=wbs_base.wbs_title,
            csi_division=wbs_base.csi_division,
            nrm_code=wbs_base.nrm_code,
            cpwd_code=wbs_base.cpwd_code,
        )
    )

    # 4. Light-Gauge Metal / Wood Studs (Division 09 22 16)
    stud_spacing_ft = cfg.stud_spacing_inches / 12.0
    spacing_val = (stud_spacing_ft * 0.3048) if is_metric else stud_spacing_ft
    # Wall length / spacing + top/bottom track allowance + corner framing
    stud_count = int((total_wall_len / spacing_val) * 1.15)  # 15% allowance for tracks and intersections
    stud_formula = (
        f"Wall length: {total_wall_len:.1f} / spacing ({spacing_val:.2f}) + 15% track/corner allowance = "
        f"{stud_count} studs"
    )

    wbs_studs = classify_takeoff_line("Non-Structural Metal Framing Studs")
    derived.append(
        TakeoffLine(
            id="mat-studs",
            item_description=f"Wall Framing Studs ({int(cfg.stud_spacing_inches)}\" O.C., Tracks & Bridging)",
            category="09 22 00 - Wall Framing and Drywall",
            quantity=float(stud_count),
            unit=UnitType.EA,
            confidence=0.85,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=stud_formula,
            is_measured=False,
            wbs_code=wbs_studs.wbs_code,
            wbs_title=wbs_studs.wbs_title,
            csi_division=wbs_studs.csi_division,
            nrm_code=wbs_studs.nrm_code,
            cpwd_code=wbs_studs.cpwd_code,
        )
    )

    # 5. Finished Flooring with Waste Factor
    total_room_area = sum(r.stated_area_sqft or r.measured_area_sqft or 0.0 for r in rooms)
    if total_room_area > 0:
        flooring_with_waste = round(total_room_area * (1.0 + cfg.flooring_waste_pct / 100.0), 1)
        fl_unit = UnitType.SQM if is_metric else UnitType.SF
        fl_formula = (
            f"Net room conditioned area: {total_room_area:.1f} {fl_unit.value} + "
            f"{cfg.flooring_waste_pct}% cutting waste = {flooring_with_waste} {fl_unit.value}"
        )
        wbs_fl = classify_takeoff_line("Finished Flooring Surface")
        derived.append(
            TakeoffLine(
                id="mat-flooring-waste",
                item_description=f"Finished Flooring Material (Includes {cfg.flooring_waste_pct}% Cutting Waste)",
                category=ItemCategory.FINISHES_FLOORING.value,
                quantity=flooring_with_waste,
                unit=fl_unit,
                confidence=0.95,
                source_sheet=sheet_name,
                calculation_method=CalculationMethod.DERIVED_MATERIAL,
                assumptions=fl_formula,
                is_measured=False,
                wbs_code=wbs_fl.wbs_code,
                wbs_title=wbs_fl.wbs_title,
                csi_division=wbs_fl.csi_division,
                nrm_code=wbs_fl.nrm_code,
                cpwd_code=wbs_fl.cpwd_code,
            )
        )

    return derived


def calculate_civil_derived_materials(
    linear_runs: list[LinearRun],
    geometric_features: list[GeometricFeature],
    scale: ScaleCalibration | None = None,
    sheet_name: str = "Sheet 1",
    config: DerivedMaterialConfig | None = None,
) -> list[TakeoffLine]:
    """Derive civil site materials (brick masonry volume, plastering, coping) with explicit formulas."""
    cfg = config or DerivedMaterialConfig()
    derived: list[TakeoffLine] = []

    # Find boundary wall linear run
    boundary_runs = [r for r in linear_runs if "boundary" in r.label.lower() or "guard" in r.label.lower()]
    if not boundary_runs:
        return derived

    b_len = sum(r.length for r in boundary_runs)
    h = cfg.boundary_wall_height_m
    t = cfg.boundary_wall_thickness_m

    # 1. Brick Masonry Volume (CU.M.) (Division 04 20 00 / CPWD 6.1)
    net_vol = b_len * h * t
    gross_vol = round(net_vol * (1.0 + cfg.mortar_waste_pct / 100.0), 2)
    vol_formula = (
        f"Length ({b_len:.2f} M) * Height ({h:.2f} M) * Thickness ({t:.2f} M) = "
        f"{net_vol:.2f} CU.M. + {cfg.mortar_waste_pct}% mortar waste = {gross_vol} CU.M."
    )
    wbs_masonry = classify_takeoff_line("Brick Masonry in Cement Mortar")
    derived.append(
        TakeoffLine(
            id="mat-civil-brickwork",
            item_description=f"Brick Masonry Wall in Cement Mortar ({t*1000:.0f}mm thick, 1:6 mix)",
            category="04 20 00 - Unit Masonry",
            quantity=gross_vol,
            unit=UnitType.CUM,
            confidence=0.92,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=vol_formula,
            is_measured=False,
            wbs_code=wbs_masonry.wbs_code,
            wbs_title=wbs_masonry.wbs_title,
            csi_division=wbs_masonry.csi_division,
            nrm_code=wbs_masonry.nrm_code,
            cpwd_code=wbs_masonry.cpwd_code,
        )
    )

    # 2. Cement Plastering (SQM) (Division 09 24 00 / CPWD 12.1)
    plaster_area = round(b_len * h * 2.0 * 1.05, 2)  # 2 sides + 5% coping allowance
    plaster_formula = (
        f"Perimeter ({b_len:.2f} M) * Height ({h:.2f} M) * 2 sides + 5% top coping allowance = "
        f"{plaster_area} SQM"
    )
    wbs_plaster = classify_takeoff_line("Portland Cement Plastering")
    derived.append(
        TakeoffLine(
            id="mat-civil-plaster",
            item_description="15mm Cement Plastering (1:6) to Boundary Wall (Both Sides & Coping)",
            category="09 24 00 - Portland Cement Plastering",
            quantity=plaster_area,
            unit=UnitType.SQM,
            confidence=0.92,
            source_sheet=sheet_name,
            calculation_method=CalculationMethod.DERIVED_MATERIAL,
            assumptions=plaster_formula,
            is_measured=False,
            wbs_code=wbs_plaster.wbs_code,
            wbs_title=wbs_plaster.wbs_title,
            csi_division=wbs_plaster.csi_division,
            nrm_code=wbs_plaster.nrm_code,
            cpwd_code=wbs_plaster.cpwd_code,
        )
    )

    return derived
