"""
Hierarchical WBS Tree and BOQ Structure
Adapted from OpenConstructionERP boq/models.py and service.py
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from .units import CivilUnit, standardize_unit

@dataclass
class BOQPosition:
    item_id: str
    wbs_code: str          # e.g. "1.01", "1.01.01"
    description: str
    unit: CivilUnit
    quantity: float
    unit_rate: float = 0.0
    is_verified: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def total_amount(self) -> float:
        return round(self.quantity * self.unit_rate, 2)

@dataclass
class BOQSection:
    section_id: str
    wbs_code: str          # e.g. "1.00", "2.00"
    title: str
    positions: List[BOQPosition] = field(default_factory=list)

    @property
    def subtotal(self) -> float:
        return round(sum(p.total_amount for p in self.positions), 2)

    def add_position(self, pos: BOQPosition) -> None:
        self.positions.append(pos)

@dataclass
class HierarchicalBOQ:
    project_id: str
    project_name: str
    sections: List[BOQSection] = field(default_factory=list)

    @property
    def grand_total(self) -> float:
        return round(sum(s.subtotal for s in self.sections), 2)

    def add_section(self, section: BOQSection) -> None:
        self.sections.append(section)

    def find_position(self, wbs_code: str) -> Optional[BOQPosition]:
        for s in self.sections:
            for p in s.positions:
                if p.wbs_code == wbs_code:
                    return p
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "grand_total": self.grand_total,
            "sections": [
                {
                    "section_id": s.section_id,
                    "wbs_code": s.wbs_code,
                    "title": s.title,
                    "subtotal": s.subtotal,
                    "positions": [
                        {
                            "item_id": p.item_id,
                            "wbs_code": p.wbs_code,
                            "description": p.description,
                            "unit": p.unit.value,
                            "quantity": p.quantity,
                            "unit_rate": p.unit_rate,
                            "total_amount": p.total_amount,
                            "is_verified": p.is_verified,
                        }
                        for p in s.positions
                    ],
                }
                for s in self.sections
            ],
        }
