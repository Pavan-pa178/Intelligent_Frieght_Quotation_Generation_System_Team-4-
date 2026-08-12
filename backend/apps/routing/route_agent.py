"""
Route Agent Module (Milestone 1)
FQ-AMB-001 / Section 3.6 & 6.2

Responsibilities:
1. Resolve origin and destination gateways.
2. Query carrier services covering gateway pair (direct & transhipment).
3. Capability filtering (reefer if temp controlled, hazmat acceptance, container availability).
4. Score and rank routes using composite score (Transit, Cost, Reliability, Congestion).
5. Return top 3 ranked options with recommended flag.
"""

CARRIER_SERVICES = [
    {
        'id': 'r1',
        'carrier': 'Maersk',
        'serviceName': 'MECL Direct Service',
        'type': 'Direct',
        'sailingFrequency': 'Weekly sailing (Mon)',
        'reliabilityPct': 94,
        'baseReliability': 0.94,
        'baseCongestion': 0.71,
        'transitMultiplier': 1.0,
        'costMultiplier': 1.0,
        'acceptsHazmat': True,
        'acceptsReefer': True
    },
    {
        'id': 'r2',
        'carrier': 'CMA CGM',
        'serviceName': 'EPIC 1 Transhipment',
        'type': '1 Transhipment (Salalah)',
        'sailingFrequency': 'Twice weekly (Wed/Sat)',
        'reliabilityPct': 89,
        'baseReliability': 0.89,
        'baseCongestion': 0.82,
        'transitMultiplier': 1.25,
        'costMultiplier': 0.88,
        'acceptsHazmat': True,
        'acceptsReefer': True
    },
    {
        'id': 'r3',
        'carrier': 'Hapag-Lloyd',
        'serviceName': 'AGX Direct Express',
        'type': 'Direct Express',
        'sailingFrequency': 'Weekly sailing (Fri)',
        'reliabilityPct': 92,
        'baseReliability': 0.92,
        'baseCongestion': 0.65,
        'transitMultiplier': 0.92,
        'costMultiplier': 1.12,
        'acceptsHazmat': False,
        'acceptsReefer': True
    }
]

def score_route(transit_score, cost_score, reliability_score, congestion_score, misses_delivery_date=False):
    """
    Computes composite route score (0.0 to 1.0)
    Formula: 0.35 * transit + 0.30 * cost + 0.20 * reliability + 0.15 * congestion
    """
    raw_score = (0.35 * transit_score) + (0.30 * cost_score) + (0.20 * reliability_score) + (0.15 * congestion_score)
    if misses_delivery_date:
        raw_score *= 0.4  # Heavy penalty for unachievable delivery date
    return round(raw_score, 2)

def build_route_options(origin_code, dest_code, mode='OCEAN', indicative_total=384500, is_hazardous=False, is_temp=False):
    """
    Route Agent: Builds, filters, and ranks viable route options for a shipment.
    """
    routes = []
    
    for s in CARRIER_SERVICES:
        # Capability filtering
        if is_hazardous and not s.get('acceptsHazmat'):
            continue
        if is_temp and not s.get('acceptsReefer'):
            continue

        cost = round(indicative_total * s['costMultiplier'])
        
        # Calculate sub-scores (0.0 to 1.0)
        transit_score = round(min(1.0, max(0.5, 1.1 - (s['transitMultiplier'] - 1.0))), 2)
        cost_score = round(min(1.0, max(0.5, 1.1 - (s['costMultiplier'] - 1.0))), 2)
        reliability_score = s['baseReliability']
        congestion_score = s['baseCongestion']

        composite = score_route(transit_score, cost_score, reliability_score, congestion_score)

        routes.append({
            'id': s['id'],
            'carrier': s['carrier'],
            'serviceName': s['serviceName'],
            'type': s['type'],
            'sailingFrequency': s['sailingFrequency'],
            'reliabilityPct': s['reliabilityPct'],
            'recommended': False,
            'cost': cost,
            'indicative': True,
            'scores': {
                'transit': transit_score,
                'cost': cost_score,
                'reliability': reliability_score,
                'congestion': congestion_score,
                'composite': composite
            }
        })

    # Sort routes by composite score descending
    routes.sort(key=lambda r: r['scores']['composite'], reverse=True)

    # Flag top scorer as recommended
    if routes:
        routes[0]['recommended'] = True

    return routes[:3]
