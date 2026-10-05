"""CLI entry point for Ostaad Blueprint-to-BOQ Engine."""

import argparse
import sys
from pathlib import Path
from .engine import OstaadBOQEngine
from .exporter import export_to_csv, export_to_xlsx


def main():
    parser = argparse.ArgumentParser(description="Ostaad Blueprint-to-BOQ Takeoff Engine")
    parser.add_argument("blueprint", help="Path to blueprint PDF, PNG, or JPG")
    parser.add_argument("--format", choices=["summary", "csv", "xlsx"], default="summary", help="Output format")
    parser.add_argument("--out", help="Output file path for csv/xlsx export")
    args = parser.parse_args()

    path = Path(args.blueprint)
    if not path.exists():
        print(f"Error: File not found: {path}", file=sys.stderr)
        return 1

    file_bytes = path.read_bytes()
    engine = OstaadBOQEngine()
    print(f"Processing {path.name}...")
    report = engine.process(file_bytes, path.name)

    if args.format == "csv":
        csv_text = export_to_csv(report)
        if args.out:
            Path(args.out).write_text(csv_text, encoding="utf-8")
            print(f"CSV saved to {args.out}")
        else:
            print(csv_text)
    elif args.format == "xlsx":
        xlsx_bytes = export_to_xlsx(report)
        out_path = args.out or f"{path.stem}_takeoff.xlsx"
        Path(out_path).write_bytes(xlsx_bytes)
        print(f"Excel workbook saved to {out_path}")
    else:
        print("\n" + "=" * 60)
        print(f"OSTAAD BOQ TAKEOFF SUMMARY: {report.sheet_name}")
        print("=" * 60)
        scale_info = report.scale.raw_scale_text or (f"{report.scale.pixels_per_unit} px/{report.scale.unit}" if report.scale.scale_known else "Unresolved")
        print(f"Scale: {scale_info} (Method: {report.scale.method}, Confidence: {int(report.scale.confidence * 100)}%)")
        print(f"Total Components Extracted: {len(report.lines)}")
        print(f"Total Spaces Extracted: {len(report.rooms)}")
        print(f"Audit Flags: {len(report.reconciliation_flags)}")
        print("\n--- Key Takeoff Lines ---")
        for line in report.lines:
            measured_tag = "[Measured]" if line.is_measured else "[Estimated]"
            print(f" • {line.item_description:<48} : {line.quantity:>7.1f} {line.unit.value:<3} {measured_tag}")
        if report.linear_runs:
            print("\n--- Linear Wall Runs ---")
            for run in report.linear_runs:
                print(f" • {run.label:<48} : {run.length:>7.1f} {run.unit.value}")
        if report.rooms:
            print("\n--- Room Schedule (Stated vs Measured Area) ---")
            for room in report.rooms:
                stated = f"{room.stated_area_sqft} SF" if room.stated_area_sqft is not None else "—"
                print(f" • {room.name:<25} : Stated: {stated}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
