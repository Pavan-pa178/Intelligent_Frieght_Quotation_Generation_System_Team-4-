"""
Route Agent Module (Milestone 1 & Milestone 3)
FQ-AMB-001 / Section 3.6 & 6.2

Responsibilities:
1. Resolve origin and destination gateways to trade corridor.
2. Query corridor-specialized carrier services across Ocean, Air, and Ground/Rail.
3. Enforce Admin verification & suspension checks (excludes SUSPENDED carriers).
4. Capability filtering (reefer if temp controlled, hazmat acceptance).
5. Return exactly 3 distinct strategic customer persona recommendations:
   - 🏆 Best Value (Lowest Freight Tariff)
   - ⚡ Fastest Transit (Direct Express Linehaul)
   - 🛡️ Premier SLA (Highest Schedule Reliability & Guaranteed Slot)
"""

from core import storage

def resolve_trade_corridor(origin_code, dest_code, mode='OCEAN'):
    og = str(origin_code or '').upper().strip()
    dg = str(dest_code or '').upper().strip()
    m = str(mode or 'OCEAN').upper().strip()

    gulf_prefixes = ('AE', 'SA', 'OM', 'QA', 'KW', 'BH')
    europe_prefixes = ('DE', 'NL', 'BE', 'GB', 'FR', 'ES', 'IT', 'SE', 'DK', 'PL', 'GR', 'TR', 'CH', 'AT')
    pacific_prefixes = ('SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'CN', 'HK', 'KR', 'JP', 'TW', 'AU', 'US')

    if m == 'OCEAN':
        if any(og.startswith(p) or dg.startswith(p) for p in gulf_prefixes):
            return {'id': 'GULF_MIDDLE_EAST', 'name': 'India – Arabian Gulf & Middle East Corridor'}
        if any(og.startswith(p) or dg.startswith(p) for p in europe_prefixes):
            return {'id': 'NORTH_EUROPE_MED', 'name': 'Asia – North Europe & Mediterranean Corridor'}
        if any(og.startswith(p) or dg.startswith(p) for p in pacific_prefixes):
            return {'id': 'ASIA_PACIFIC', 'name': 'Intra-Asia & Transpacific Ocean Corridor'}
        return {'id': 'GLOBAL_OCEAN', 'name': 'Global Multimodal Ocean Corridor'}

    if m in ('AIR', 'EXPRESS_AIR'):
        if any(og.startswith(p) or dg.startswith(p) for p in gulf_prefixes):
            return {'id': 'GULF_MIDDLE_EAST_AIR', 'name': 'Gulf & Middle East Priority Air Corridor'}
        if any(og.startswith(p) or dg.startswith(p) for p in europe_prefixes) or dg.startswith('US'):
            return {'id': 'EUROPE_TRANSATLANTIC_AIR', 'name': 'Europe & Intercontinental Air Corridor'}
        if og.startswith('IN') and dg.startswith('IN'):
            return {'id': 'DOMESTIC_REGIONAL_AIR', 'name': 'National & Regional Express Air Corridor'}
        return {'id': 'GLOBAL_AIR', 'name': 'Global Priority Air Corridor'}

    # GROUND_RAIL
    is_port_rail = any(og.startswith(p) for p in ('INNSA', 'INMUN', 'INPAV', 'INVIS', 'INCOK', 'INHAL', 'INMAA')) or \
                   any(dg.startswith(p) for p in ('INDEL', 'INAMD', 'INLUD', 'INJAI', 'INNAG', 'INBLR', 'INHYD'))
    if is_port_rail:
        return {'id': 'PORT_ICD_RAIL', 'name': 'Western DFC Port-to-Inland Rail Corridor'}
    return {'id': 'NATIONAL_HIGHWAY', 'name': 'National Express Surface Highway Corridor'}


def score_route(transit_score, cost_score, reliability_score, congestion_score, misses_delivery_date=False):
    """
    Computes composite route score (0.0 to 1.0)
    Formula: 0.35 * transit + 0.30 * cost + 0.20 * reliability + 0.15 * congestion
    """
    raw_score = (0.35 * transit_score) + (0.30 * cost_score) + (0.20 * reliability_score) + (0.15 * congestion_score)
    if misses_delivery_date:
        raw_score *= 0.4
    return round(raw_score, 2)


def get_corridor_candidates(corridor, mode, is_hazardous=False, is_temp=False):
    # Built-in corridor specialist profiles
    SPECIALISTS = {
        'GULF_MIDDLE_EAST': [
            {'carrier': 'MSC', 'serviceName': 'MSC Falcon & Gulf Feeder Shuttle', 'type': 'Direct Feeder', 'sailingFrequency': 'Every 3 days', 'reliabilityPct': 91, 'costMultiplier': 0.88, 'transitMultiplier': 1.10, 'transitDays': 5, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Most competitive spot tariff on Gulf & Red Sea loops'},
            {'carrier': 'CMA CGM', 'serviceName': 'EPIC Direct Gulf Rotation', 'type': 'Direct Linehaul', 'sailingFrequency': 'Twice weekly (Wed/Sat)', 'reliabilityPct': 94, 'costMultiplier': 0.92, 'transitMultiplier': 1.05, 'transitDays': 5, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Dedicated Gulf & Middle East gateway direct feeder'},
            {'carrier': 'Maersk', 'serviceName': 'MECL Arabian Gulf Express', 'type': 'Direct Express', 'sailingFrequency': 'Weekly sailing (Mon)', 'reliabilityPct': 96, 'costMultiplier': 1.00, 'transitMultiplier': 0.90, 'transitDays': 4, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Fastest direct linehaul with guaranteed berthing slot'},
            {'carrier': 'COSCO', 'serviceName': 'COSCO Middle East Oasis Line', 'type': 'Direct Liner', 'sailingFrequency': 'Weekly departure', 'reliabilityPct': 90, 'costMultiplier': 0.94, 'transitMultiplier': 1.15, 'transitDays': 6, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Reliable capacity allocation with balanced rate'}
        ],
        'NORTH_EUROPE_MED': [
            {'carrier': 'MSC', 'serviceName': 'MSC North Europe Direct Loop', 'type': '1 transhipment', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 90, 'costMultiplier': 0.89, 'transitMultiplier': 1.15, 'transitDays': 25, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Lowest freight rate per TEU for North Europe & UK ports'},
            {'carrier': 'Evergreen', 'serviceName': 'Ocean Alliance North Europe Loop', 'type': 'Direct Linehaul', 'sailingFrequency': 'Weekly departure', 'reliabilityPct': 92, 'costMultiplier': 0.93, 'transitMultiplier': 1.05, 'transitDays': 23, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Ocean Alliance guaranteed equipment and space'},
            {'carrier': 'Hapag-Lloyd', 'serviceName': 'IMEX Direct Europe Shuttle', 'type': 'Direct Express', 'sailingFrequency': 'Weekly sailing (Fri)', 'reliabilityPct': 94, 'costMultiplier': 1.02, 'transitMultiplier': 0.92, 'transitDays': 20, 'acceptsHazmat': False, 'acceptsReefer': True, 'reason': 'Fastest direct shuttle to Hamburg & Rotterdam hubs'},
            {'carrier': 'Maersk', 'serviceName': 'AE1 Asia-Europe Direct Mainline', 'type': 'Direct Express', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 96, 'costMultiplier': 1.05, 'transitMultiplier': 0.95, 'transitDays': 21, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Premier Tier-1 scheduled service with top reliability'}
        ],
        'ASIA_PACIFIC': [
            {'carrier': 'COSCO', 'serviceName': 'COSCO Asia-Pacific Direct Mainline', 'type': 'Direct Mainline', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 91, 'costMultiplier': 0.88, 'transitMultiplier': 1.10, 'transitDays': 12, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Premier low tariff on East Asia & China corridors'},
            {'carrier': 'Evergreen', 'serviceName': 'Evergreen Far East Direct Rotation', 'type': 'Direct Express', 'sailingFrequency': 'Weekly departure', 'reliabilityPct': 93, 'costMultiplier': 0.92, 'transitMultiplier': 1.00, 'transitDays': 11, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Direct Southeast Asia connection with rapid turnaround'},
            {'carrier': 'ONE', 'serviceName': 'ONE Intra-Asia Express Loop', 'type': 'Direct Express', 'sailingFrequency': 'Twice weekly', 'reliabilityPct': 95, 'costMultiplier': 0.96, 'transitMultiplier': 0.85, 'transitDays': 9, 'acceptsHazmat': False, 'acceptsReefer': True, 'reason': 'Fastest direct sailing to Singapore & Tokyo ports'},
            {'carrier': 'Maersk', 'serviceName': 'TP2 Transpacific & Far East Line', 'type': 'Direct Linehaul', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 96, 'costMultiplier': 1.03, 'transitMultiplier': 0.92, 'transitDays': 10, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Tier-1 carrier with integrated cold-chain & intermodal'}
        ],
        'GLOBAL_OCEAN': [
            {'carrier': 'MSC', 'serviceName': 'MSC Global Feeder & Mainline Loop', 'type': 'Direct Feeder', 'sailingFrequency': 'Every 4 days', 'reliabilityPct': 91, 'costMultiplier': 0.88, 'transitMultiplier': 1.15, 'transitDays': 18, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Best value global container feeder network'},
            {'carrier': 'CMA CGM', 'serviceName': 'CMA CGM Global Service Rotation', 'type': '1 transhipment', 'sailingFrequency': 'Biweekly departure', 'reliabilityPct': 90, 'costMultiplier': 0.92, 'transitMultiplier': 1.10, 'transitDays': 17, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Extensive transhipment hub connectivity'},
            {'carrier': 'Maersk', 'serviceName': 'Maersk Integrated Global Service', 'type': 'Direct Express', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 95, 'costMultiplier': 1.00, 'transitMultiplier': 0.95, 'transitDays': 14, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Integrated end-to-end direct express transit'},
            {'carrier': 'Hapag-Lloyd', 'serviceName': 'Hapag-Lloyd Express Cargo Link', 'type': 'Direct Linehaul', 'sailingFrequency': 'Weekly sailing', 'reliabilityPct': 93, 'costMultiplier': 1.04, 'transitMultiplier': 1.00, 'transitDays': 15, 'acceptsHazmat': False, 'acceptsReefer': True, 'reason': 'Quality verified carrier with guaranteed SLA'}
        ],

        # ─── AIR CORRIDORS ───
        'GULF_MIDDLE_EAST_AIR': [
            {'carrier': 'Delta Cargo Movers', 'serviceName': 'Delta Middle East Air Link', 'type': 'Commercial Freight', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 90, 'costMultiplier': 0.88, 'transitMultiplier': 1.15, 'transitDays': 3, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Cost-effective commercial air freight allocation'},
            {'carrier': 'Air India Cargo', 'serviceName': 'AI Direct Gulf Freighter', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 94, 'costMultiplier': 0.91, 'transitMultiplier': 1.00, 'transitDays': 2, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'National flag carrier direct capacity at best rate'},
            {'carrier': 'DTDC Express', 'serviceName': 'DTDC Gulf Gateway Express', 'type': 'Express Air', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 92, 'costMultiplier': 0.93, 'transitMultiplier': 1.00, 'transitDays': 2, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Integrated door-to-airport customs express dispatch'},
            {'carrier': 'Emirates SkyCargo', 'serviceName': 'EK Priority Cargo (DXB Hub)', 'type': 'Direct Flight', 'sailingFrequency': '3x daily flights', 'reliabilityPct': 98, 'costMultiplier': 1.06, 'transitMultiplier': 0.80, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Direct Dubai mega-hub connection with fastest transit'}
        ],
        'EUROPE_TRANSATLANTIC_AIR': [
            {'carrier': 'Air India Cargo', 'serviceName': 'AI Scheduled European Freighter', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 93, 'costMultiplier': 0.92, 'transitMultiplier': 1.05, 'transitDays': 2, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Competitive direct European belly cargo allocation'},
            {'carrier': 'Emirates SkyCargo', 'serviceName': 'EK Intercontinental SkyCargo', 'type': '1-stop Hub Connection', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 96, 'costMultiplier': 1.02, 'transitMultiplier': 1.00, 'transitDays': 2, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Global reach with temperature-controlled pharma protocol'},
            {'carrier': 'Lufthansa Cargo', 'serviceName': 'LH European Hub (via FRA)', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 97, 'costMultiplier': 1.08, 'transitMultiplier': 0.80, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Fastest direct European hub transit with CEIV Pharma SLA'}
        ],
        'DOMESTIC_REGIONAL_AIR': [
            {'carrier': 'Cocanada Xpress', 'serviceName': 'Cocanada Regional Air Link', 'type': 'Regional Air Feeder', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 91, 'costMultiplier': 0.86, 'transitMultiplier': 1.10, 'transitDays': 2, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Best budget regional air freight for tier-2/3 sectors'},
            {'carrier': 'DTDC Express', 'serviceName': 'DTDC National Air Express Feeder', 'type': 'Scheduled Air Feeder', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 93, 'costMultiplier': 0.89, 'transitMultiplier': 1.05, 'transitDays': 2, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Dense national multimodal air express coverage'},
            {'carrier': 'Air India Cargo', 'serviceName': 'AI Priority Domestic Air Cargo', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 95, 'costMultiplier': 0.94, 'transitMultiplier': 0.90, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'National flag carrier daily belly space guarantee'},
            {'carrier': 'Blue Dart Aviation', 'serviceName': 'Blue Dart Scheduled Domestic Cargo Jet', 'type': 'Dedicated Cargo Jet', 'sailingFrequency': 'Overnight flights', 'reliabilityPct': 98, 'costMultiplier': 1.05, 'transitMultiplier': 0.80, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Dedicated overnight Boeing 737/757 freighter charter'}
        ],
        'GLOBAL_AIR': [
            {'carrier': 'DTDC Express', 'serviceName': 'DTDC Global Priority Logistics', 'type': 'Scheduled Air Feeder', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 92, 'costMultiplier': 0.91, 'transitMultiplier': 1.10, 'transitDays': 3, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Cost-effective international courier consolidation'},
            {'carrier': 'Air India Cargo', 'serviceName': 'AI Scheduled Freighter Service', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 95, 'costMultiplier': 1.00, 'transitMultiplier': 1.00, 'transitDays': 2, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Reliable national carrier standard air tariff'},
            {'carrier': 'Blue Dart Aviation', 'serviceName': 'Blue Dart Priority Overnight Air', 'type': 'Direct Cargo Jet', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 97, 'costMultiplier': 1.06, 'transitMultiplier': 0.85, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Premier overnight priority space guarantee'},
            {'carrier': 'Emirates SkyCargo', 'serviceName': 'EK Global Priority Cargo', 'type': 'Direct Flight', 'sailingFrequency': 'Daily flights', 'reliabilityPct': 97, 'costMultiplier': 1.08, 'transitMultiplier': 0.85, 'transitDays': 1, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Global alliance airline with guaranteed capacity'}
        ],

        # ─── GROUND & RAIL CORRIDORS ───
        'PORT_ICD_RAIL': [
            {'carrier': 'Allcargo Logistics', 'serviceName': 'Allcargo CFS-to-ICD Multimodal Rail', 'type': 'Rail Intermodal Shuttle', 'sailingFrequency': 'Every 2 days', 'reliabilityPct': 91, 'costMultiplier': 0.86, 'transitMultiplier': 1.10, 'transitDays': 3, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Most cost-effective CFS-to-ICD container rail shuttle'},
            {'carrier': 'TCI Freight', 'serviceName': 'TCI Multimodal Rail-Road Link', 'type': 'Intermodal Truck + Rail', 'sailingFrequency': 'Daily dispatch', 'reliabilityPct': 92, 'costMultiplier': 0.90, 'transitMultiplier': 1.00, 'transitDays': 3, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Seamless first-mile/last-mile intermodal coordination'},
            {'carrier': 'CONCOR', 'serviceName': 'CONCOR Western DFC Electric Rail Rake', 'type': 'Direct Rail Intermodal', 'sailingFrequency': 'Daily scheduled rail rake', 'reliabilityPct': 96, 'costMultiplier': 0.94, 'transitMultiplier': 0.80, 'transitDays': 2, 'acceptsHazmat': True, 'acceptsReefer': True, 'reason': 'Fastest electrified Western Dedicated Freight Corridor transit'}
        ],
        'NATIONAL_HIGHWAY': [
            {'carrier': 'VRL Logistics', 'serviceName': 'VRL National Highway Express Network', 'type': 'Direct Highway Linehaul', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 93, 'costMultiplier': 0.88, 'transitMultiplier': 1.05, 'transitDays': 3, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'Largest interstate linehaul fleet at lowest tariff floor'},
            {'carrier': 'TCI Freight', 'serviceName': 'TCI Dedicated Highway Linehaul', 'type': 'Direct Road FTL', 'sailingFrequency': 'Daily dispatch', 'reliabilityPct': 92, 'costMultiplier': 0.90, 'transitMultiplier': 1.00, 'transitDays': 3, 'acceptsHazmat': True, 'acceptsReefer': False, 'reason': 'National integrated FTL/LTL freight network'},
            {'carrier': 'GATI-KWE', 'serviceName': 'GATI Surface Express Road Corridor', 'type': 'Direct Road Express', 'sailingFrequency': 'Daily departures', 'reliabilityPct': 93, 'costMultiplier': 0.92, 'transitMultiplier': 1.00, 'transitDays': 3, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Reliable express surface linehaul for commercial freight'},
            {'carrier': 'Delhivery Freight', 'serviceName': 'Delhivery Smart Automated Road Linehaul', 'type': 'Smart Road Freight', 'sailingFrequency': 'Continuous dispatch', 'reliabilityPct': 95, 'costMultiplier': 0.96, 'transitMultiplier': 0.85, 'transitDays': 2, 'acceptsHazmat': False, 'acceptsReefer': False, 'reason': 'Automated hub-and-spoke tracking with fastest road transit'}
        ]
    }

    corridor_key = corridor.get('id', 'GLOBAL_OCEAN')
    base_candidates = SPECIALISTS.get(corridor_key, SPECIALISTS['GLOBAL_OCEAN'])

    CORRIDOR_DEFAULT_DAYS = {
        'GULF_MIDDLE_EAST': 5,
        'NORTH_EUROPE_MED': 22,
        'ASIA_PACIFIC': 11,
        'GLOBAL_OCEAN': 16,
        'GULF_MIDDLE_EAST_AIR': 2,
        'EUROPE_TRANSATLANTIC_AIR': 2,
        'DOMESTIC_REGIONAL_AIR': 1,
        'GLOBAL_AIR': 2,
        'PORT_ICD_RAIL': 2,
        'NATIONAL_HIGHWAY': 3
    }

    KNOWN_CARRIERS = {
        'msc', 'cma cgm', 'maersk', 'hapag-lloyd', 'evergreen', 'cosco', 'one',
        'air india cargo', 'emirates skycargo', 'lufthansa cargo', 'blue dart aviation',
        'dtdc express', 'delta cargo movers', 'cocanada xpress', 'vrl air cargo',
        'concor', 'vrl logistics', 'tci freight', 'delhivery freight', 'gati-kwe', 'allcargo logistics'
    }

    # Filter against Admin status from storage
    try:
        companies = storage.load_companies()
    except Exception:
        companies = []

    active_map = {}
    for c in companies:
        c_key = str(c.get('carrier_key') or c.get('name') or '').strip().lower()
        active_map[c_key] = c

    # Filter out any candidate explicitly suspended in storage
    filtered = []
    for item in base_candidates:
        c_key = item['carrier'].lower().strip()
        comp = active_map.get(c_key)
        if comp:
            if comp.get('status') == 'SUSPENDED' or comp.get('is_eligible') is False:
                continue
        # Capability filtering
        if is_hazardous and not item.get('acceptsHazmat'):
            continue
        if is_temp and not item.get('acceptsReefer'):
            continue
        filtered.append(dict(item))

    # Also dynamically include any new custom active companies registered by Admin, or backfill if under 3
    for c_key, comp in active_map.items():
        if comp.get('status') == 'SUSPENDED' or comp.get('is_eligible') is False:
            continue
        c_name = comp.get('name') or comp.get('carrier_key')
        is_custom = c_key not in KNOWN_CARRIERS
        if (is_custom or len(filtered) < 3) and not any(f['carrier'].lower() == c_name.lower() for f in filtered):
            comp_cat = str(comp.get('service_category', '')).upper()
            if comp_cat == mode or (mode in ('AIR', 'EXPRESS_AIR') and comp_cat == 'AIR'):
                default_days = CORRIDOR_DEFAULT_DAYS.get(corridor_key, 14)
                filtered.append({
                    'carrier': c_name,
                    'serviceName': f"{c_name} Operations Link",
                    'type': 'Direct Linehaul',
                    'sailingFrequency': 'Daily departure',
                    'reliabilityPct': 93,
                    'costMultiplier': 0.91,
                    'transitMultiplier': 1.00,
                    'transitDays': default_days,
                    'acceptsHazmat': True,
                    'acceptsReefer': True,
                    'reason': f"{comp.get('contract_tier', 'Verified Partner')} active SLA"
                })

    return filtered


def build_route_options(origin_code, dest_code, mode='OCEAN', indicative_total=384500, is_hazardous=False, is_temp=False):
    """
    Route Agent: Builds, filters, and ranks viable route options for a shipment
    using trade corridor specialization and 3 strategic customer personas.
    """
    corridor = resolve_trade_corridor(origin_code, dest_code, mode)
    candidates = get_corridor_candidates(corridor, mode, is_hazardous, is_temp)

    if not candidates:
        return []

    # Ensure at least 3 candidates exist
    while len(candidates) < 3:
        clone = dict(candidates[0])
        clone['carrier'] = f"{clone['carrier']} Alt"
        clone['costMultiplier'] = round(clone['costMultiplier'] * 1.05, 2)
        candidates.append(clone)

    # 1. Best Value Winner (Lowest Cost Multiplier)
    sorted_cost = sorted(candidates, key=lambda c: (c['costMultiplier'], c['transitDays']))
    best_value = sorted_cost[0]

    # 2. Fastest Transit Winner (Shortest Transit Days, excluding Best Value winner)
    rem_speed = [c for c in candidates if c['carrier'] != best_value['carrier']]
    sorted_speed = sorted(rem_speed, key=lambda c: (c['transitDays'], -c['reliabilityPct']))
    fastest = sorted_speed[0] if sorted_speed else candidates[1]

    # 3. Premier SLA Winner (Highest Reliability, excluding winners 1 & 2)
    rem_sla = [c for c in candidates if c['carrier'] not in (best_value['carrier'], fastest['carrier'])]
    sorted_sla = sorted(rem_sla, key=lambda c: (-c['reliabilityPct'], c['costMultiplier']))
    premier_sla = sorted_sla[0] if sorted_sla else candidates[2]

    winning_personas = [
        {**best_value, 'persona': 'BEST_VALUE', 'personaBadge': '🏆 BEST VALUE', 'recommended': True},
        {**fastest, 'persona': 'FASTEST_TRANSIT', 'personaBadge': '⚡ FASTEST TRANSIT', 'recommended': False},
        {**premier_sla, 'persona': 'PREMIER_SLA', 'personaBadge': '🛡️ PREMIER SLA', 'recommended': False}
    ]

    routes = []
    for idx, s in enumerate(winning_personas):
        cost = round(indicative_total * s['costMultiplier'])
        transit_score = round(min(1.0, max(0.5, 1.1 - (s['transitMultiplier'] - 1.0))), 2)
        cost_score = round(min(1.0, max(0.5, 1.1 - (s['costMultiplier'] - 1.0))), 2)
        reliability_score = round(s['reliabilityPct'] / 100.0, 2)
        congestion_score = 0.82 if mode == 'GROUND_RAIL' else 0.85 if mode in ('AIR', 'EXPRESS_AIR') else 0.80

        composite = score_route(transit_score, cost_score, reliability_score, congestion_score)

        routes.append({
            'id': f"r-{mode.lower()}-{idx + 1}",
            'carrier': s['carrier'],
            'serviceCategory': mode,
            'serviceName': s['serviceName'],
            'type': s['type'],
            'sailingFrequency': s['sailingFrequency'],
            'reliabilityPct': s['reliabilityPct'],
            'recommended': s['recommended'],
            'cost': cost,
            'transitDays': s['transitDays'],
            'indicative': True,
            'persona': s['persona'],
            'personaBadge': s['personaBadge'],
            'selectionReason': s.get('reason', ''),
            'corridorName': corridor['name'],
            'scores': {
                'transit': transit_score,
                'cost': cost_score,
                'reliability': reliability_score,
                'congestion': congestion_score,
                'composite': composite
            }
        })

    return routes[:3]

