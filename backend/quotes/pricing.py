"""
Freight pricing engine.

Currently a deterministic port of the formula in Ship.jsx. This is the single
seam the ML/pricing team should replace: keep `calculate_quote()`'s signature
and return shape, swap the internals for a model, and neither the API layer
nor the frontend needs to change.
"""

VOLUMETRIC_DIVISOR = 5000   # cm^3 per kg, standard air-freight convention
INSURANCE_MULTIPLIER = 1.10
HAZMAT_SURCHARGE = 75


def _item_weights(item):
    """Return (actual_kg, volumetric_kg) for a single cargo line."""
    qty = float(item.get('qty') or 0)
    weight = float(item.get('weight') or 0)
    length = float(item.get('length') or 0)
    width = float(item.get('width') or 0)
    height = float(item.get('height') or 0)

    actual = weight * qty
    volumetric = ((length * width * height) / VOLUMETRIC_DIVISOR) * qty
    return actual, volumetric


def calculate_quote(cargo, rate, insurance=False, hazmat=False):
    """
    cargo     -- list of dicts: {qty, weight, length, width, height}
    rate      -- a RateConfiguration document
    returns   -- dict with the weight breakdown and final cost

    Carriers bill on chargeable weight: whichever is greater of the actual
    weight and the volumetric (dimensional) weight. A pallet of pillows costs
    the same to move as a pallet of bricks in terms of space consumed.
    """
    total_weight = 0.0
    total_volumetric = 0.0
    for item in cargo:
        actual, volumetric = _item_weights(item)
        total_weight += actual
        total_volumetric += volumetric

    chargeable = max(total_weight, total_volumetric)

    cost = 0.0
    if chargeable > 0:
        cost = rate.base + chargeable * rate.per_kg
        if insurance:
            cost *= INSURANCE_MULTIPLIER
        if hazmat:
            cost += HAZMAT_SURCHARGE

    return {
        'totalWeight': round(total_weight, 2),
        'volumetricWeight': round(total_volumetric, 2),
        'chargeableWeight': round(chargeable, 2),
        'baseFee': rate.base,
        'perKg': rate.per_kg,
        'insuranceApplied': bool(insurance and chargeable > 0),
        'hazmatApplied': bool(hazmat and chargeable > 0),
        'transit': rate.transit,
        'cost': int(round(cost)),
    }
