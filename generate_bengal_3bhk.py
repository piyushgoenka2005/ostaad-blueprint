"""Generate an authentic 3BHK West Bengal / Indian Municipal Residential Floor Plan.

Standard 3BHK layout following KMC / WBMBL conventions:
- Living / Dining: 20'-0" X 14'-0" (280 SQ FT)
- Master Bed Room: 14'-0" X 12'-0" (168 SQ FT)
- Bed Room 2: 12'-0" X 12'-0" (144 SQ FT)
- Bed Room 3: 11'-0" X 11'-0" (121 SQ FT)
- Kitchen: 10'-0" X 8'-0" (80 SQ FT)
- Attached Toilet 1: 7'-0" X 5'-0" (35 SQ FT)
- Attached Toilet 2: 6'-0" X 5'-0" (30 SQ FT)
- Common Toilet: 6'-0" X 5'-0" (30 SQ FT)
- Balcony: 12'-0" X 4'-0" (48 SQ FT)
- Pooja / Study Room: 6'-0" X 6'-0" (36 SQ FT)
- Entrance Lobby: 8'-0" X 6'-0" (48 SQ FT)
Total Carpet Area: 1020 SQ FT | Built-up Area: 1180 SQ FT
"""

from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(13, 10), dpi=150)
fig.patch.set_facecolor('#ffffff')
ax.set_facecolor('#fafafa')

# Overall dimensions: 38' wide x 34' deep
# Exterior boundary walls (10" brick masonry)
outer_rect = patches.Rectangle((2, 3), 36, 32, fill=False, edgecolor='#0f172a', linewidth=4.5)
ax.add_patch(outer_rect)

# Rooms layout coordinates: (x, y, w, h)
room_boxes = [
    # Lobby & Entrance
    (2, 27, 8, 8, "ENTRANCE LOBBY\n8'-0\" X 6'-0\"\n48 SQ FT"),
    # Living / Dining
    (10, 21, 20, 14, "LIVING / DINING\n20'-0\" X 14'-0\"\n280 SQ FT"),
    # Pooja / Mandir
    (30, 27, 8, 8, "POOJA ROOM\n6'-0\" X 6'-0\"\n36 SQ FT"),
    # Balcony off Living
    (10, 17, 12, 4, "BALCONY\n12'-0\" X 4'-0\"\n48 SQ FT"),
    # Master Bed Room
    (24, 7, 14, 14, "MASTER BED ROOM\n14'-0\" X 12'-0\"\n168 SQ FT"),
    # Attached Toilet 1
    (30, 3, 8, 4, "ATT. TOILET 1\n7'-0\" X 5'-0\"\n35 SQ FT"),
    # Bed Room 2
    (2, 15, 12, 12, "BED ROOM 2\n12'-0\" X 12'-0\"\n144 SQ FT"),
    # Attached Toilet 2
    (2, 11, 6, 4, "ATT. TOILET 2\n6'-0\" X 5'-0\"\n30 SQ FT"),
    # Bed Room 3
    (2, 3, 11, 8, "BED ROOM 3\n11'-0\" X 11'-0\"\n121 SQ FT"),
    # Kitchen
    (13, 3, 10, 8, "KITCHEN\n10'-0\" X 8'-0\"\n80 SQ FT"),
    # Common Toilet
    (23, 3, 7, 4, "COMMON TOILET\n6'-0\" X 5'-0\"\n30 SQ FT"),
]

for x, y, w, h, label in room_boxes:
    rect = patches.Rectangle((x, y), w, h, fill=True, facecolor='#ffffff', edgecolor='#334155', linewidth=2.0)
    ax.add_patch(rect)
    cx, cy = x + w / 2, y + h / 2
    ax.text(cx, cy, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#0f172a',
            bbox=dict(boxstyle='round,pad=0.2', facecolor='#f8fafc', edgecolor='#cbd5e1', alpha=0.9))

# Door & Window Schedule Tags
tags = [
    ('D1 (MAIN)', 2, 31),
    ('D2', 10, 24), ('D2', 24, 18), ('D2', 10, 16),
    ('D3', 30, 5.5), ('D3', 5, 11), ('D3', 23, 5.5), ('D3', 10, 18),
    ('W1', 18, 35), ('W1', 38, 14), ('W1', 2, 21), ('W1', 2, 7),
    ('W2', 17, 3), ('V', 34, 3), ('V', 5, 11), ('V', 26.5, 3)
]
for tag, tx, ty in tags:
    is_d = tag.startswith('D')
    ax.text(tx, ty, tag, ha='center', va='center', fontsize=7.5, fontweight='bold',
            color='#1e40af' if is_d else '#047857',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='#ffffff', edgecolor='#64748b'))

# Title Block
title_block = (
    "PROPOSED 3BHK RESIDENTIAL FLOOR PLAN\n"
    "KOLKATA MUNICIPAL CORPORATION (KMC) / WB MUNICIPAL BUILDING RULES\n"
    "SCALE: 1/4\" = 1'-0\"  |  TOTAL CARPET AREA: 1020 SQ FT  |  BUILT-UP AREA: 1180 SQ FT"
)
ax.text(20, 1.0, title_block, ha='center', fontsize=9.5, fontweight='bold', color='#0f172a',
        bbox=dict(boxstyle='square,pad=0.35', facecolor='#f1f5f9', edgecolor='#334155'))

ax.set_xlim(-1, 41)
ax.set_ylim(-0.5, 37)
ax.axis('off')
plt.tight_layout()

Path('assets').mkdir(exist_ok=True)
out_path = 'assets/indian_bengal_3bhk_plan.png'
plt.savefig(out_path, dpi=150, bbox_inches='tight')
print(f"Generated {out_path} successfully!")
