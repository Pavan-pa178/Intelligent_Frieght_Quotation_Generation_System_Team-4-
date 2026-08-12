from datetime import datetime, timedelta
from typing import Dict, Any

MODE_SPEEDS_AND_DWELLS = {
    'OCEAN_FCL': {'speed_nm_day': 400, 'origin_dwell': 3.0, 'dest_dwell': 3.0, 'buffer': 4},
    'OCEAN_LCL': {'speed_nm_day': 400, 'origin_dwell': 5.0, 'dest_dwell': 5.0, 'buffer': 5},
    'AIR': {'speed_km_h': 800, 'handling_days': 1.0, 'origin_dwell': 2.0, 'dest_dwell': 1.5, 'buffer': 2},
    'EXPRESS_AIR': {'speed_km_h': 800, 'priority': True, 'origin_dwell': 0.5, 'dest_dwell': 0.5, 'buffer': 1},
    'GROUND_RAIL': {'road_km_day': 450, 'origin_dwell': 0.5, 'dest_dwell': 0.5, 'buffer': 2}
}

def add_business_days(start_date: datetime, days_to_add: int) -> datetime:
    """Adds business days skipping weekends (Saturday=5, Sunday=6)."""
    curr = start_date
    added = 0
    while added < days_to_add:
        curr += timedelta(days=1)
        if curr.weekday() not in (5, 6):
            added += 1
    return curr

def estimate_transit(route_distance: float, mode: str = 'OCEAN', load_type: str = 'FCL', ready_date_str: str = '') -> Dict[str, Any]:
    """Calculates estimated transit day range with a component breakdown."""
    mode_upper = mode.upper()
    load_upper = load_type.upper()

    pickup_days = 1.0
    delivery_days = 0.0

    if mode_upper == 'OCEAN':
        cfg = MODE_SPEEDS_AND_DWELLS['OCEAN_FCL'] if load_upper == 'FCL' else MODE_SPEEDS_AND_DWELLS['OCEAN_LCL']
        origin_dwell = cfg['origin_dwell']
        dest_dwell = cfg['dest_dwell']
        linehaul_days = max(1.0, round((route_distance / cfg['speed_nm_day']) * 10) / 10.0)
        schedule_wait = 3.5  # average weekly sailing wait
        buffer_days = cfg['buffer']
    elif mode_upper in ('AIR', 'EXPRESS_AIR'):
        cfg = MODE_SPEEDS_AND_DWELLS['AIR'] if mode_upper == 'AIR' else MODE_SPEEDS_AND_DWELLS['EXPRESS_AIR']
        origin_dwell = cfg['origin_dwell']
        dest_dwell = cfg['dest_dwell']
        linehaul_days = max(0.5, round((route_distance / (cfg['speed_km_h'] * 12)) * 10) / 10.0)
        schedule_wait = 0.5 if mode_upper == 'EXPRESS_AIR' else 1.5
        buffer_days = cfg['buffer']
    else:
        cfg = MODE_SPEEDS_AND_DWELLS['GROUND_RAIL']
        origin_dwell = cfg['origin_dwell']
        dest_dwell = cfg['dest_dwell']
        linehaul_days = max(1.0, round((route_distance / cfg['road_km_day']) * 10) / 10.0)
        schedule_wait = 1.0
        buffer_days = cfg['buffer']

    total_exact = pickup_days + origin_dwell + linehaul_days + schedule_wait + dest_dwell + delivery_days
    min_days = max(1, int(total_exact * 0.6))
    max_days = int(total_exact * 0.95) + buffer_days

    ready_date = datetime.strptime(ready_date_str, '%Y-%m-%d') if ready_date_str else datetime.now()
    arrival_date = add_business_days(ready_date, max_days)
    arrival_formatted = arrival_date.strftime('%d %b')

    return {
        'pickupDays': pickupDays,
        'originDwell': origin_dwell,
        'linehaulDays': linehaul_days,
        'scheduleWait': schedule_wait,
        'destDwell': dest_dwell,
        'deliveryDays': delivery_days,
        'totalExact': round(total_exact, 1),
        'minDays': min_days,
        'maxDays': max_days,
        'transitRange': f"{min_days}–{max_days} d",
        'arrivalDateFormatted': arrival_formatted
    }
