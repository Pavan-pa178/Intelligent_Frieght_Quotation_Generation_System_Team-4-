import math
from typing import Dict, Any

def extract_transit_features(quote_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Feature Engineering Protocol (Section 7.2)
    Extracts features for ML transit time regression model.
    """
    origin = quote_state.get('origin_code', 'INNSA')
    dest = quote_state.get('dest_code', 'AEJEA')
    month = quote_state.get('month', 8)

    # Cyclical sin/cos encoding for month
    month_rad = (2 * math.pi * month) / 12.0
    sin_month = math.sin(month_rad)
    cos_month = math.cos(month_rad)

    return {
        'lane_key': f"{origin}_{dest}",
        'distance_nm': float(quote_state.get('main_distance_nm', 1205)),
        'mode': quote_state.get('mode', 'OCEAN'),
        'carrier_id': quote_state.get('carrier_id', 'MAERSK'),
        'transhipment_count': int(quote_state.get('transhipment_count', 0)),
        'sin_month': round(sin_month, 4),
        'cos_month': round(cos_month, 4),
        'origin_congestion_index': 0.71,
        'dest_congestion_index': 0.65,
        'container_type': quote_state.get('container_type', '40HC'),
        'lane_historical_variance': 1.2
    }
