"""
Dynamic Vendor RFQ & Comparative Statement Engine
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any
import uuid

@dataclass
class VendorBid:
    bid_id: str
    vendor_id: str
    vendor_name: str
    base_unit_rate: float
    freight_unit_rate: float
    gst_percentage: float   # 5, 12, 18, 28

    @property
    def landed_cost_per_unit(self) -> float:
        net = self.base_unit_rate + self.freight_unit_rate
        return round(net * (1.0 + (self.gst_percentage / 100.0)), 2)

@dataclass
class RFQPackage:
    rfq_id: str
    project_id: str
    material_name: str
    required_quantity: float
    uom: str
    bids: List[VendorBid] = field(default_factory=list)

    def add_bid(self, bid: VendorBid) -> None:
        self.bids.append(bid)

    def get_comparative_statement(self) -> List[Dict[str, Any]]:
        """
        Sorts bids in ascending order of landed cost (L1, L2, L3).
        """
        sorted_bids = sorted(self.bids, key=lambda b: b.landed_cost_per_unit)
        result = []
        for rank, b in enumerate(sorted_bids, start=1):
            total_order_value = round(b.landed_cost_per_unit * self.required_quantity, 2)
            result.append({
                "rank": f"L{rank}",
                "vendor_id": b.vendor_id,
                "vendor_name": b.vendor_name,
                "base_rate": b.base_unit_rate,
                "freight": b.freight_unit_rate,
                "gst_pct": b.gst_percentage,
                "landed_rate": b.landed_cost_per_unit,
                "total_order_value": total_order_value,
            })
        return result
