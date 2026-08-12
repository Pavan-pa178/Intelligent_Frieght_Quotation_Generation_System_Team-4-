from typing import List, Dict, Any

def find_carrier_paths(origin_code: str, dest_code: str, mode: str = 'OCEAN') -> List[Dict[str, Any]]:
    """
    Optimization Module: Graph search over carrier services for direct and one-hop path finding.
    """
    # Graph edges / Carrier rotation paths
    paths = [
        {
            'path_type': 'DIRECT',
            'hops': 0,
            'leg_codes': [origin_code, dest_code],
            'transhipment_hub': None,
            'transit_overhead_days': 0.0
        },
        {
            'path_type': 'ONE_HOP',
            'hops': 1,
            'leg_codes': [origin_code, 'OMSLL', dest_code],
            'transhipment_hub': 'Salalah (OMSLL)',
            'transit_overhead_days': 2.5
        },
        {
            'path_type': 'DIRECT_EXPRESS',
            'hops': 0,
            'leg_codes': [origin_code, dest_code],
            'transhipment_hub': None,
            'transit_overhead_days': -0.5
        }
    ]
    return paths
