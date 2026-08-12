import math
from typing import List, Dict, Any

DIVISOR = {
    'AIR': 6000,
    'EXPRESS_AIR': 5000,
    'GROUND_RAIL': 4500,
    'OCEAN_LCL': 1000  # cm3 to CBM for revenue tons
}

CONTAINER_PAYLOAD_LIMITS = {
    '20GP': 21800,
    '40GP': 26600,
    '40HC': 28800,
    '20RF': 21000,
    '40RF': 27000,
    '20OT': 21500,
    '40FR': 31000
}

def actual_weight(items: List[Dict[str, Any]]) -> float:
    """Calculates total physical actual weight in kg."""
    tot = 0.0
    for item in items or []:
        if item.get('package_type') == 'CONTAINER':
            tot += float(item.get('gross_weight_kg', 0))
        else:
            qty = float(item.get('quantity', item.get('qty', 1)))
            w = float(item.get('weight_per_unit_kg', item.get('weight', 0)))
            tot += qty * w
    return round(tot, 2)

def volumetric_weight(items: List[Dict[str, Any]], mode: str = 'AIR') -> float:
    """Calculates total dimensional weight in kg."""
    mode_upper = mode.upper()
    div = DIVISOR.get(mode_upper, DIVISOR['AIR'])
    tot = 0.0
    for item in items or []:
        if item.get('package_type') == 'CONTAINER':
            continue
        qty = float(item.get('quantity', item.get('qty', 1)))
        l = float(item.get('length_cm', item.get('length', 0)))
        w = float(item.get('width_cm', item.get('width', 0)))
        h = float(item.get('height_cm', item.get('height', 0)))
        if l > 0 and w > 0 and h > 0:
            tot += (l * w * h * qty) / div
    return round(tot, 2)

def chargeable_weight(items: List[Dict[str, Any]], mode: str = 'OCEAN', load_type: str = 'FCL') -> Dict[str, Any]:
    """
    Computes Chargeable Weight & Basis across 3 branches:
    1. PER_CONTAINER (FCL)
    2. REVENUE_TON (LCL)
    3. CHARGEABLE_KG (Air, Express, Ground)
    """
    safe_items = items or []
    is_container = load_type.upper() == 'FCL' or any(i.get('package_type') == 'CONTAINER' for i in safe_items)

    if is_container:
        count = sum(int(i.get('container_count', 1)) for i in safe_items) or 1
        container_types = list(set(i.get('container_type', '40HC') for i in safe_items))
        types_str = ", ".join(container_types) if container_types else "40HC"
        return {
            'basis': 'PER_CONTAINER',
            'unitsLabel': f"{count} × {types_str}",
            'units': count,
            'chargeableVal': count
        }
    elif mode.upper() == 'OCEAN' and load_type.upper() == 'LCL':
        act_kg = actual_weight(safe_items)
        tonnes = act_kg / 1000.0
        cbm = sum((float(i.get('length_cm', 0)) * float(i.get('width_cm', 0)) * float(i.get('height_cm', 0)) * float(i.get('quantity', 1))) / 1000000.0 for i in safe_items)
        revenue_tons = max(cbm, tonnes, 1.0)
        return {
            'basis': 'REVENUE_TON',
            'unitsLabel': f"{revenue_tons:.1f} R/T",
            'units': round(revenue_tons, 2),
            'chargeableVal': round(revenue_tons, 2)
        }
    else:
        act_kg = actual_weight(safe_items)
        vol_kg = volumetric_weight(safe_items, mode)
        chg_kg = max(act_kg, vol_kg, 1.0)
        return {
            'basis': 'CHARGEABLE_KG',
            'unitsLabel': f"{math.ceil(chg_kg)} kg ch.",
            'units': math.ceil(chg_kg),
            'chargeableVal': math.ceil(chg_kg)
        }
