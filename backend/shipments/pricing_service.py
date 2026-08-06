"""
Pure calculation functions for Milestone 1.

No DB access, no HTTP, no Django imports — these are plain functions so they
are trivial to unit test, and so the exact same formulas can be reasoned
about against ShipmentEnquiryForm.jsx on the frontend. If the two drift,
the Live Estimate panel and the server-confirmed price will disagree.

Milestone 1 scope: a flat-formula "indicative" total, not a real pricing
engine. Label it as indicative everywhere it is shown.
"""

import math
from decimal import Decimal, ROUND_HALF_UP

# Same reference gateways as the frontend datalist. Replace with a real
# ports/cities lookup table in Milestone 2.
GATEWAYS = {
    "mumbai": {"name": "Mumbai, IN", "lat": 19.0760, "lon": 72.8777},
    "delhi": {"name": "Delhi, IN", "lat": 28.7041, "lon": 77.1025},
    "bengaluru": {"name": "Bengaluru, IN", "lat": 12.9716, "lon": 77.5946},
    "chennai": {"name": "Chennai, IN", "lat": 13.0827, "lon": 80.2707},
    "kolkata": {"name": "Kolkata, IN", "lat": 22.5726, "lon": 88.3639},
    "dubai": {"name": "Dubai, AE", "lat": 25.2048, "lon": 55.2708},
    "singapore": {"name": "Singapore, SG", "lat": 1.3521, "lon": 103.8198},
    "rotterdam": {"name": "Rotterdam, NL", "lat": 51.9244, "lon": 4.4777},
    "shanghai": {"name": "Shanghai, CN", "lat": 31.2304, "lon": 121.4737},
    "new york": {"name": "New York, US", "lat": 40.7128, "lon": -74.0060},
}

MODE_CONFIG = {
    "road": {"label": "Road", "speed_km_day": 500, "dwell_days": 0.5, "base_rate_per_km": 3.2},
    "rail": {"label": "Rail", "speed_km_day": 650, "dwell_days": 1.0, "base_rate_per_km": 2.1},
    "air": {"label": "Air", "speed_km_day": 7500, "dwell_days": 1.5, "base_rate_per_km": 9.5},
    "sea": {"label": "Sea", "speed_km_day": 650, "dwell_days": 4.0, "base_rate_per_km": 1.1},
}

CARGO_MULTIPLIER = {
    "standard": 1.0,
    "fragile": 1.15,
    "hazardous": 1.4,
    "perishable": 1.25,
}

FUEL_SURCHARGE_PCT = Decimal("0.12")

VOLUMETRIC_FACTOR = 250  # kg per m3, simple stand-in for M1


class UnresolvedGatewayError(Exception):
    """Raised when origin or destination can't be resolved to a known gateway."""


def resolve_gateway(name: str) -> dict:
    key = (name or "").strip().lower()
    gateway = GATEWAYS.get(key)
    if not gateway:
        raise UnresolvedGatewayError(f"'{name}' is not a recognised gateway")
    return gateway


def haversine_km(a: dict, b: dict) -> float:
    r = 6371.0
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lon"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lon"])
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def estimate_transit_days(distance_km: float, mode: str) -> float:
    cfg = MODE_CONFIG[mode]
    days = distance_km / cfg["speed_km_day"] + cfg["dwell_days"]
    return round(max(1.0, days), 1)


def chargeable_weight(weight_kg: float, volume_m3: float) -> float:
    volumetric_kg = (volume_m3 or 0) * VOLUMETRIC_FACTOR
    return round(max(weight_kg or 0, volumetric_kg))


def indicative_total(distance_km: float, chargeable_kg: float, cargo_type: str, mode: str) -> Decimal:
    cfg = MODE_CONFIG[mode]
    cargo_mult = Decimal(str(CARGO_MULTIPLIER.get(cargo_type, 1.0)))
    base = (
        Decimal(str(distance_km))
        * Decimal(str(cfg["base_rate_per_km"]))
        * (Decimal(str(chargeable_kg)) / Decimal("1000"))
        * cargo_mult
    )
    total = base * (Decimal("1") + FUEL_SURCHARGE_PCT)
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_estimate(origin: str, destination: str, weight_kg: float, volume_m3: float,
                      cargo_type: str, mode: str) -> dict:
    """
    The one function the view calls. Raises UnresolvedGatewayError or KeyError
    (unknown mode/cargo_type) — let the view translate those into 400s.
    """
    origin_gw = resolve_gateway(origin)
    dest_gw = resolve_gateway(destination)
    distance_km = haversine_km(origin_gw, dest_gw)
    transit_days = estimate_transit_days(distance_km, mode)
    chargeable_kg = chargeable_weight(weight_kg, volume_m3)
    total = indicative_total(distance_km, chargeable_kg, cargo_type, mode)

    return {
        "origin_label": origin_gw["name"],
        "destination_label": dest_gw["name"],
        "distance_km": round(distance_km),
        "transit_days": transit_days,
        "chargeable_kg": chargeable_kg,
        "indicative_total": total,
        "is_indicative": True,
    }
