import math

DETOUR_FACTOR = {
    'IN': 1.30,
    'AE': 1.20,
    'EU': 1.25,
    'US': 1.22,
    'DEFAULT': 1.30
}

SEA_DISTANCES = {
    'INNSA-AEJEA': 1205,
    'AEJEA-INNSA': 1205,
    'INNSA-NLRTM': 6400,
    'NLRTM-INNSA': 6400,
    'INNSA-SGSIN': 2450,
    'SGSIN-INNSA': 2450,
    'INNSA-DEHAM': 6650,
    'DEHAM-INNSA': 6650,
    'INNSA-OMSLL': 890,
    'OMSLL-AEJEA': 640,
    'INNSA-CNSHA': 4150,
    'INNSA-USNYC': 8200
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two coordinates in km."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)

def road_distance(lat1: float, lon1: float, lat2: float, lon2: float, country: str = 'DEFAULT') -> float:
    """Estimated road distance using country detour factor."""
    straight_km = haversine_distance(lat1, lon1, lat2, lon2)
    factor = DETOUR_FACTOR.get(country, DETOUR_FACTOR['DEFAULT'])
    return round(straight_km * factor, 2)

def sea_distance(origin_code: str, dest_code: str) -> float:
    """Nautical miles from port distance lookup table. Returns 0 if unserviced."""
    key = f"{origin_code.upper()}-{dest_code.upper()}"
    return float(SEA_DISTANCES.get(key, 0))

def main_leg_distance(origin_code: str, dest_code: str, mode: str = 'OCEAN', og_lat: float = 0, og_lon: float = 0, dg_lat: float = 0, dg_lon: float = 0) -> float:
    """Distance dispatcher for chosen transport mode."""
    mode_upper = mode.upper()
    if mode_upper == 'OCEAN':
        return sea_distance(origin_code, dest_code)
    elif mode_upper in ('AIR', 'EXPRESS_AIR'):
        km = haversine_distance(og_lat, og_lon, dg_lat, dg_lon) if og_lat and dg_lat else 1800
        return round(km * 1.06, 2)  # 6% airway overhead
    else:
        km = haversine_distance(og_lat, og_lon, dg_lat, dg_lon) if og_lat and dg_lat else 1400
        return round(km * 1.30, 2)  # road/rail detour factor
