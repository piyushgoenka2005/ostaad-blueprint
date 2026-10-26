"""
Safe Mathematical Formula Evaluator for Quantity Measurements
Adapted from OpenConstructionERP quantity_formula.py
"""
import ast
import operator
from typing import Union

_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.USub: operator.neg,
}

def evaluate_formula(expr: str) -> float:
    """
    Safely evaluate simple arithmetic expressions like '12.5 * 3.2 * 0.15' or '(4.5 + 3.2) * 2'.
    Prevents arbitrary code execution.
    """
    expr = str(expr).strip()
    if not expr:
        return 0.0
    try:
        node = ast.parse(expr, mode="eval").body
        def _eval(node):
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return float(node.value)
            elif isinstance(node, ast.BinOp):
                op_type = type(node.op)
                if op_type in _ALLOWED_OPERATORS:
                    left = _eval(node.left)
                    right = _eval(node.right)
                    return _ALLOWED_OPERATORS[op_type](left, right)
            elif isinstance(node, ast.UnaryOp):
                op_type = type(node.op)
                if op_type in _ALLOWED_OPERATORS:
                    return _ALLOWED_OPERATORS[op_type](_eval(node.operand))
            raise ValueError(f"Unsupported expression component in formula: {expr}")
        return round(_eval(node), 4)
    except Exception as exc:
        raise ValueError(f"Invalid quantity formula: {expr}") from exc
