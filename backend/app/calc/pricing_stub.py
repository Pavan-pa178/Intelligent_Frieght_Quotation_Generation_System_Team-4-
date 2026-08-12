"""
Pricing Stub Module (Milestone 1)
FQ-AMB-001 / Section 3.7 & 6.2

TEMPORARY STUB: This module is a deliberately temporary placeholder for Milestone 1.
Full pricing engine with real rate cards, surcharge rules (BAF, CAF, THC), and margin floor policies
will replace this in Milestone 2.
"""

FLAT_UPLIFT = 0.35  # 35% flat uplift placeholder for M1

def indicative_total(origin_region: str, dest_region: str, mode: str = 'OCEAN', load_type: str = 'FCL', weight_obj: dict = None, distance: float = 1200) -> dict:
    """
    Calculates M1 indicative total based on flat lane rates + 35% uplift.
    Always returns is_indicative: True.
    """
    weight_obj = weight_obj or {}
    mode_upper = mode.upper()
    dist_val = distance if distance > 0 else 1200

    if mode_upper == 'OCEAN':
        if weight_obj.get('basis') == 'PER_CONTAINER' or load_type.upper() == 'FCL':
            per_container = 95000 + (dist_val * 45)
            count = weight_obj.get('units', 1)
            base = per_container * count
        else:
            per_rt = 12500 + (dist_val * 8)
            units = weight_obj.get('units', 1)
            base = max(25000, per_rt * units)
    elif mode_upper == 'AIR':
        per_kg = 180 + (dist_val * 0.05)
        kg = weight_obj.get('units', weight_obj.get('chargeableVal', 100))
        base = max(30000, (per_kg * kg) + (dist_val * 15))
    elif mode_upper == 'EXPRESS_AIR':
        per_kg = 280 + (dist_val * 0.08)
        kg = weight_obj.get('units', weight_obj.get('chargeableVal', 100))
        base = max(45000, (per_kg * kg) + (dist_val * 25))
    else:
        per_kg = 45 + (dist_val * 0.02)
        kg = weight_obj.get('units', weight_obj.get('chargeableVal', 100))
        base = max(15000, (per_kg * kg) + (dist_val * 20))

    subtotal = base * 1.08  # BAF / FSC fuel surcharge
    amount = round(subtotal * (1 + FLAT_UPLIFT))

    return {
        'amount': amount,
        'currency': 'INR',
        'is_indicative': True,
        'basis': weight_obj.get('basis', 'PER_CONTAINER')
    }
