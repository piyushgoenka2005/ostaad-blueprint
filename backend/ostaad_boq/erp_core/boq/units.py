"""
Standard Civil Engineering Units and Conversions
Adapted from OpenConstructionERP and Indian IS Measurement Standards
"""
from enum import Enum
from typing import Dict

class CivilUnit(str, Enum):
    CUM = "CUM"          # Cubic Meter (m^3)
    SQM = "SQM"          # Square Meter (m^2)
    RMT = "RMT"          # Running Meter (m)
    BAG = "BAG"          # Cement Bag (50 kg)
    MT = "MT"            # Metric Ton (1000 kg)
    KG = "KG"            # Kilogram
    BRASS = "BRASS"      # Indian Brass (100 cu ft = 2.8317 m^3)
    CFT = "CFT"          # Cubic Feet
    NOS = "NOS"          # Numbers / Pieces

CONVERSIONS: Dict[str, float] = {
    "CFT_TO_CUM": 0.0283168,
    "CUM_TO_CFT": 35.3147,
    "CUM_TO_BRASS": 0.353147,
    "BRASS_TO_CUM": 2.83168,
    "KG_TO_MT": 0.001,
    "MT_TO_KG": 1000.0,
    "CEMENT_BAG_KG": 50.0,
}

def standardize_unit(raw_unit: str) -> CivilUnit:
    u = raw_unit.strip().upper()
    mapping = {
        "M3": CivilUnit.CUM,
        "CUM": CivilUnit.CUM,
        "M2": CivilUnit.SQM,
        "SQM": CivilUnit.SQM,
        "M": CivilUnit.RMT,
        "RMT": CivilUnit.RMT,
        "BAG": CivilUnit.BAG,
        "BAGS": CivilUnit.BAG,
        "TON": CivilUnit.MT,
        "MT": CivilUnit.MT,
        "KG": CivilUnit.KG,
        "BRASS": CivilUnit.BRASS,
        "CFT": CivilUnit.CFT,
        "NOS": CivilUnit.NOS,
        "PCS": CivilUnit.NOS,
    }
    return mapping.get(u, CivilUnit.NOS)
