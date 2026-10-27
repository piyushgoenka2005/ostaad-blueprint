"""
Goods Receipt Note (GRN) and Site Godown Inventory Service
"""
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class GoodsReceiptNote:
    grn_id: str
    po_id: str
    challan_number: str
    truck_number: str
    received_quantity: float
    challan_photo_url: str
    storekeeper_id: str
    received_date: str

class SiteGodownStock:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.stock: Dict[str, float] = {}

    def receive_material(self, material_name: str, quantity: float) -> float:
        if quantity <= 0:
            raise ValueError("Received quantity must be positive.")
        self.stock[material_name] = round(self.stock.get(material_name, 0.0) + quantity, 3)
        return self.stock[material_name]

    def issue_material(self, material_name: str, quantity: float) -> float:
        current = self.stock.get(material_name, 0.0)
        if quantity > current:
            raise ValueError(f"Insufficient stock for {material_name}. Available: {current}, Requested: {quantity}")
        self.stock[material_name] = round(current - quantity, 3)
        return self.stock[material_name]

    def get_balance(self, material_name: str) -> float:
        return self.stock.get(material_name, 0.0)
