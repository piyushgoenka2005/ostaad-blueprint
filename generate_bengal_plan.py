"""Generate an authentic West Bengal / Indian 2BHK residential municipal floor plan blueprint."""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

fig, ax = plt.subplots(figsize=(12, 10), dpi=150)
ax.set_facecolor('#ffffff')

# Outer building dimensions: 28'-0" (8.53m) width x 24'-0" (7.32m) depth
ext_wall = patches.Rectangle((2, 2), 28, 24, fill=False, edgecolor='#0f172a', linewidth=4.5)
ax.add_patch(ext_wall)

# Interior 5-inch partition walls
lines = [
    # Vertical main spine between Living & Bedrooms
    ((18, 2), (18, 26)),
    # Horizontal divider between Living and Kitchen/Entry
    ((2, 14), (18, 14)),
    # Kitchen enclosure
    ((10, 2), (10, 9)),
    ((2, 9), (10, 9)),
    # Common Toilet enclosure
    ((15, 2), (15, 7)),
    ((10, 7), (18, 7)),
    # Attached Toilet in Master Bed
    ((18, 10), (24, 10)),
    ((24, 10), (24, 14)),
    # Divider between Master Bed & Bed Room 2
    ((18, 14), (30, 14))
]
for p1, p2 in lines:
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#0f172a', linewidth=2.5)

# Room Labels & Dimensions (Municipal Sanction Format)
rooms = [
    ("LIVING / DINING\n16'-0\" X 12'-0\"\n192 SQ FT", 10, 20),
    ("MASTER BED ROOM\n12'-0\" X 12'-0\"\n144 SQ FT", 24, 20),
    ("BED ROOM 2\n12'-0\" X 12'-0\"\n144 SQ FT", 24, 7),
    ("KITCHEN\n8'-0\" X 7'-0\"\n56 SQ FT", 6, 5.5),
    ("COMMON TOILET\n5'-0\" X 5'-0\"\n25 SQ FT", 12.5, 4.5),
    ("ATTACHED TOILET\n6'-0\" X 4'-0\"\n24 SQ FT", 21, 12),
    ("BALCONY\n6'-0\" X 5'-0\"\n30 SQ FT", 5, 11.5),
    ("STAIRCASE & LOBBY\n8'-0\" X 7'-0\"\n56 SQ FT", 14, 10.5)
]
for text, x, y in rooms:
    ax.text(x, y, text, ha='center', va='center', fontsize=9.5, fontweight='bold', color='#0f172a',
            bbox=dict(boxstyle='round,pad=0.25', facecolor='#ffffff', edgecolor='#94a3b8', alpha=0.9))

# Door and window markers
doors_windows = [
    # Doors (D1 = Main entrance, D2 = Rooms, D3 = Toilet/Balcony)
    ('D1 (MAIN)', 2, 16.5), ('D2', 18, 22), ('D2', 18, 5), ('D3', 6, 9), 
    ('D3', 12.5, 7), ('D3', 21, 10), ('D2', 8, 11.5),
    # Windows & Ventilators
    ('W1', 10, 26), ('W1', 24, 26), ('W1', 30, 20), ('W1', 30, 8), 
    ('W2', 2, 5.5), ('V', 12.5, 2), ('V', 24, 12)
]
for label, x, y in doors_windows:
    ax.text(x, y, label, ha='center', va='center', fontsize=8, fontweight='bold', 
            color='#1e40af' if label.startswith('D') else '#047857',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='#f8fafc', edgecolor='#64748b'))

# Exterior dimension lines
ax.annotate('', xy=(2, 27), xytext=(30, 27), arrowprops=dict(arrowstyle='<->', color='#334155', lw=1.5))
ax.text(16, 27.6, "28'-0\" (OVERALL WIDTH)", ha='center', fontsize=10, fontweight='bold', color='#1e293b')

ax.annotate('', xy=(31, 2), xytext=(31, 26), arrowprops=dict(arrowstyle='<->', color='#334155', lw=1.5))
ax.text(31.8, 14, "24'-0\" (OVERALL DEPTH)", va='center', rotation=-90, fontsize=10, fontweight='bold', color='#1e293b')

# Title Block (West Bengal Municipal Plan Format)
title_text = (
    "PROPOSED 2BHK RESIDENTIAL BUILDING PLAN\n"
    "KOLKATA MUNICIPAL CORPORATION (KMC) / WB MUNICIPAL BUILDING RULES\n"
    "SCALE: 1/4\" = 1'-0\"  |  TOTAL CARPET AREA: 671 SQ FT  |  BUILT-UP AREA: 768 SQ FT"
)
ax.text(16, 0.4, title_text, ha='center', fontsize=9.5, fontweight='bold', color='#0f172a',
        bbox=dict(boxstyle='square,pad=0.4', facecolor='#f1f5f9', edgecolor='#475569'))

ax.set_xlim(-1, 33.5)
ax.set_ylim(-1, 29)
ax.axis('off')
plt.tight_layout()

Path('assets').mkdir(exist_ok=True)
out_path = 'assets/indian_bengal_floorplan.png'
plt.savefig(out_path, dpi=150, bbox_inches='tight')
print(f"Created {out_path} successfully!")
