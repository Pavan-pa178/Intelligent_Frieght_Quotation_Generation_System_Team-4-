
/**
 * routeScore.js
 * 
 * Computes multi-criteria route ranking scores and synthesizes dynamic,
 * mode-appropriate carrier route options across Ocean, Air, Express Air,
 * and Ground & Rail.
 */

/**
 * Retrieves verified & eligible registered companies for a specific service mode.
 */
function getEligibleCompaniesForMode(mode) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('portline_companies')
      if (raw) {
        const companies = JSON.parse(raw)
        if (Array.isArray(companies) && companies.length > 0) {
          return companies.filter(c => {
            if (c.status === 'SUSPENDED' || c.is_eligible === false) return false
            const cat = (c.service_category || '').toUpperCase()
            const modes = (c.modes || []).map(m => String(m).toUpperCase())
            if (mode === 'OCEAN') {
              return cat === 'OCEAN' || modes.some(m => m.includes('OCEAN') || m.includes('FCL') || m.includes('LCL') || m.includes('LINER'))
            } else if (mode === 'AIR' || mode === 'EXPRESS_AIR') {
              return cat === 'AIR' || modes.some(m => m.includes('AIR') || m.includes('EXPRESS') || m.includes('COURIER') || m.includes('CHARTER'))
            } else if (mode === 'GROUND_RAIL') {
              return cat === 'GROUND_RAIL' || modes.some(m => m.includes('GROUND') || m.includes('RAIL') || m.includes('ROAD') || m.includes('FTL') || m.includes('LTL') || m.includes('INTERMODAL'))
            }
            return true
          })
        }
      }
    }
  } catch (err) {
    console.warn('Error reading registered companies for mode:', err)
  }
  return []
}

/**
 * Filters route options against Admin Verification & Eligibility status
 */
function filterEligibleRoutes(routes) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('portline_companies')
      if (raw) {
        const companies = JSON.parse(raw)
        if (Array.isArray(companies) && companies.length > 0) {
          const eligible = routes.filter(r => {
            const rCarrier = (r.carrier || '').toLowerCase().trim()
            const comp = companies.find(c => {
              const cKey = (c.carrier_key || '').toLowerCase().trim()
              const cName = (c.name || '').toLowerCase().trim()
              return (cKey && rCarrier.includes(cKey)) || (cName && rCarrier.includes(cName)) || (cKey && cKey.includes(rCarrier))
            })
            // If the company is tracked and explicitly suspended/unapproved, exclude it
            if (comp) {
              return comp.is_eligible !== false && comp.status !== 'SUSPENDED'
            }
            return true
          })
          if (eligible.length > 0) {
            if (!eligible.some(r => r.recommended)) {
              eligible[0].recommended = true
            }
            return eligible
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error filtering eligible routes:', err)
  }
  return routes
}

/**
 * Computes composite ranking score for a route option (0 to 1)
 */
export function scoreRoute(transitScore, costScore, reliabilityScore, congestionScore, missesDeliveryDate = false) {
  let score = (0.35 * transitScore) + (0.30 * costScore) + (0.20 * reliabilityScore) + (0.15 * congestionScore)
  if (missesDeliveryDate) {
    score = score * 0.4 // heavy penalty
  }
  return Number(score.toFixed(2))
}

/**
 * Resolves the operational trade corridor based on origin and destination gateways.
 */
export function resolveTradeCorridor(originGw, destGw, mode = 'OCEAN') {
  const ogCountry = (originGw?.countryCode || originGw?.country || '').toUpperCase()
  const dgCountry = (destGw?.countryCode || destGw?.country || '').toUpperCase()
  const ogCode = (originGw?.code || '').toUpperCase()
  const dgCode = (destGw?.code || '').toUpperCase()

  const GULF_COUNTRIES = ['AE', 'SA', 'OM', 'QA', 'KW', 'BH']
  const EUROPE_COUNTRIES = ['DE', 'NL', 'BE', 'GB', 'FR', 'ES', 'IT', 'SE', 'DK', 'PL', 'GR', 'TR', 'CH', 'AT', 'IE', 'NO', 'FI', 'PT']
  const PACIFIC_COUNTRIES = ['SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'CN', 'HK', 'KR', 'JP', 'TW', 'AU', 'NZ', 'US', 'CA']
  const SAARC_COUNTRIES = ['IN', 'LK', 'BD', 'NP', 'PK']

  if (mode === 'OCEAN') {
    if (GULF_COUNTRIES.includes(ogCountry) || GULF_COUNTRIES.includes(dgCountry) || ogCode.startsWith('AE') || dgCode.startsWith('AE') || ogCode.startsWith('OM') || dgCode.startsWith('OM') || ogCode.startsWith('SA') || dgCode.startsWith('SA')) {
      return { id: 'GULF_MIDDLE_EAST', name: 'India – Arabian Gulf & Middle East Corridor' }
    }
    if (EUROPE_COUNTRIES.includes(ogCountry) || EUROPE_COUNTRIES.includes(dgCountry) || dgCode.startsWith('NL') || dgCode.startsWith('DE') || dgCode.startsWith('GB') || dgCode.startsWith('BE') || dgCode.startsWith('FR')) {
      return { id: 'NORTH_EUROPE_MED', name: 'Asia – North Europe & Mediterranean Corridor' }
    }
    if (PACIFIC_COUNTRIES.includes(ogCountry) || PACIFIC_COUNTRIES.includes(dgCountry) || dgCode.startsWith('SG') || dgCode.startsWith('CN') || dgCode.startsWith('JP') || dgCode.startsWith('US')) {
      return { id: 'ASIA_PACIFIC', name: 'Intra-Asia & Transpacific Ocean Corridor' }
    }
    return { id: 'GLOBAL_OCEAN', name: 'Global Multimodal Ocean Corridor' }
  }

  if (mode === 'AIR' || mode === 'EXPRESS_AIR') {
    if (GULF_COUNTRIES.includes(ogCountry) || GULF_COUNTRIES.includes(dgCountry) || dgCode.startsWith('DXB') || dgCode.startsWith('DOH') || dgCode.startsWith('AUH')) {
      return { id: 'GULF_MIDDLE_EAST_AIR', name: 'Gulf & Middle East Priority Air Corridor' }
    }
    if (EUROPE_COUNTRIES.includes(ogCountry) || EUROPE_COUNTRIES.includes(dgCountry) || ['US', 'CA'].includes(dgCountry) || dgCode.startsWith('FRA') || dgCode.startsWith('LHR') || dgCode.startsWith('CDG')) {
      return { id: 'EUROPE_TRANSATLANTIC_AIR', name: 'Europe & Intercontinental Air Corridor' }
    }
    if (SAARC_COUNTRIES.includes(ogCountry) && SAARC_COUNTRIES.includes(dgCountry)) {
      return { id: 'DOMESTIC_REGIONAL_AIR', name: 'National & Regional Express Air Corridor' }
    }
    return { id: 'GLOBAL_AIR', name: 'Global Priority Air Corridor' }
  }

  // GROUND_RAIL
  const isPortRail = ['INNSA', 'INMUN', 'INPAV', 'INVIS', 'INCOK', 'INHAL', 'INMAA', 'INKTP'].includes(ogCode) ||
                     ['INDEL', 'INAMD', 'INLUD', 'INJAI', 'INNAG', 'INBLR', 'INHYD'].includes(dgCode) ||
                     ['INNSA', 'INMUN'].includes(dgCode)
  if (isPortRail) {
    return { id: 'PORT_ICD_RAIL', name: 'Western DFC Port-to-Inland Rail Corridor' }
  }
  return { id: 'NATIONAL_HIGHWAY', name: 'National Express Surface Highway Corridor' }
}

/**
 * Builds corridor-specialized candidate pool across carriers.
 */
function getCorridorCandidates(corridor, mode, registeredEligible) {
  // Built-in specialist master definitions by trade corridor
  const SPECIALISTS = {
    // ─── OCEAN CORRIDORS ───
    'GULF_MIDDLE_EAST': [
      { name: 'MSC', service: 'MSC Falcon & Gulf Feeder Shuttle', type: 'Direct Feeder', freq: 'Every 3 days', rel: 91, factor: 0.88, days: 5, trScore: 0.88, reason: 'Most competitive spot tariff on Gulf & Red Sea loops' },
      { name: 'CMA CGM', service: 'EPIC Direct Gulf Rotation', type: 'Direct Linehaul', freq: 'Twice weekly (Wed/Sat)', rel: 94, factor: 0.92, days: 5, trScore: 0.90, reason: 'Dedicated Gulf & Middle East gateway direct feeder' },
      { name: 'Maersk', service: 'MECL Arabian Gulf Express', type: 'Direct Express', freq: 'Weekly sailing (Mon)', rel: 96, factor: 1.00, days: 4, trScore: 0.95, reason: 'Fastest direct linehaul with guaranteed berthing slot' },
      { name: 'COSCO', service: 'COSCO Middle East Oasis Line', type: 'Direct Liner', freq: 'Weekly departure', rel: 90, factor: 0.94, days: 6, trScore: 0.85, reason: 'Reliable capacity allocation with balanced rate' }
    ],
    'NORTH_EUROPE_MED': [
      { name: 'MSC', service: 'MSC North Europe Direct Loop', type: '1 transhipment', freq: 'Weekly sailing', rel: 90, factor: 0.89, days: 25, trScore: 0.80, reason: 'Lowest freight rate per TEU for North Europe & UK ports' },
      { name: 'Evergreen', service: 'Ocean Alliance North Europe Loop', type: 'Direct Linehaul', freq: 'Weekly departure', rel: 92, factor: 0.93, days: 23, trScore: 0.86, reason: 'Ocean Alliance guaranteed equipment and space' },
      { name: 'Hapag-Lloyd', service: 'IMEX Direct Europe Shuttle', type: 'Direct Express', freq: 'Weekly sailing (Fri)', rel: 94, factor: 1.02, days: 20, trScore: 0.94, reason: 'Fastest direct shuttle to Hamburg & Rotterdam hubs' },
      { name: 'Maersk', service: 'AE1 Asia-Europe Direct Mainline', type: 'Direct Express', freq: 'Weekly sailing', rel: 96, factor: 1.05, days: 21, trScore: 0.92, reason: 'Premier Tier-1 scheduled service with top reliability' }
    ],
    'ASIA_PACIFIC': [
      { name: 'COSCO', service: 'COSCO Asia-Pacific Direct Mainline', type: 'Direct Mainline', freq: 'Weekly sailing', rel: 91, factor: 0.88, days: 12, trScore: 0.86, reason: 'Premier low tariff on East Asia & China corridors' },
      { name: 'Evergreen', service: 'Evergreen Far East Direct Rotation', type: 'Direct Express', freq: 'Weekly departure', rel: 93, factor: 0.92, days: 11, trScore: 0.90, reason: 'Direct Southeast Asia connection with rapid turnaround' },
      { name: 'ONE', service: 'ONE Intra-Asia Express Loop', type: 'Direct Express', freq: 'Twice weekly', rel: 95, factor: 0.96, days: 9, trScore: 0.96, reason: 'Fastest direct sailing to Singapore & Tokyo ports' },
      { name: 'Maersk', service: 'TP2 Transpacific & Far East Line', type: 'Direct Linehaul', freq: 'Weekly sailing', rel: 96, factor: 1.03, days: 10, trScore: 0.93, reason: 'Tier-1 carrier with integrated cold-chain & intermodal' }
    ],
    'GLOBAL_OCEAN': [
      { name: 'MSC', service: 'MSC Global Feeder & Mainline Loop', type: 'Direct Feeder', freq: 'Every 4 days', rel: 91, factor: 0.88, days: 18, trScore: 0.72, reason: 'Best value global container feeder network' },
      { name: 'CMA CGM', service: 'CMA CGM Global Service Rotation', type: '1 transhipment', freq: 'Biweekly departure', rel: 90, factor: 0.92, days: 17, trScore: 0.78, reason: 'Extensive transhipment hub connectivity' },
      { name: 'Maersk', service: 'Maersk Integrated Global Service', type: 'Direct Express', freq: 'Weekly sailing', rel: 95, factor: 1.00, days: 14, trScore: 0.92, reason: 'Integrated end-to-end direct express transit' },
      { name: 'Hapag-Lloyd', service: 'Hapag-Lloyd Express Cargo Link', type: 'Direct Linehaul', freq: 'Weekly sailing', rel: 93, factor: 1.04, days: 15, trScore: 0.85, reason: 'Quality verified carrier with guaranteed SLA' },
      { name: 'Evergreen', service: 'Evergreen Round-The-World Service', type: 'Direct Liner', freq: 'Weekly sailing', rel: 91, factor: 0.95, days: 16, trScore: 0.81, reason: 'Ocean Alliance global container slot partner' }
    ],

    // ─── AIR CORRIDORS ───
    'GULF_MIDDLE_EAST_AIR': [
      { name: 'Delta Cargo Movers', service: 'Delta Middle East Air Link', type: 'Commercial Freight', freq: 'Daily departures', rel: 90, factor: 0.88, days: 3, trScore: 0.80, reason: 'Cost-effective commercial air freight allocation' },
      { name: 'Air India Cargo', service: 'AI Direct Gulf Freighter', type: 'Direct Flight', freq: 'Daily flights', rel: 94, factor: 0.91, days: 2, trScore: 0.90, reason: 'National flag carrier direct capacity at best rate' },
      { name: 'DTDC Express', service: 'DTDC Gulf Gateway Express', type: 'Express Air', freq: 'Daily departures', rel: 92, factor: 0.93, days: 2, trScore: 0.85, reason: 'Integrated door-to-airport customs express dispatch' },
      { name: 'Emirates SkyCargo', service: 'EK Priority Cargo (DXB Hub)', type: 'Direct Flight', freq: '3x daily flights', rel: 98, factor: 1.06, days: 1, trScore: 0.99, reason: 'Direct Dubai mega-hub connection with fastest transit' }
    ],
    'EUROPE_TRANSATLANTIC_AIR': [
      { name: 'Air India Cargo', service: 'AI Scheduled European Freighter', type: 'Direct Flight', freq: 'Daily flights', rel: 93, factor: 0.92, days: 2, trScore: 0.89, reason: 'Competitive direct European belly cargo allocation' },
      { name: 'Emirates SkyCargo', service: 'EK Intercontinental SkyCargo', type: '1-stop Hub Connection', freq: 'Daily departures', rel: 96, factor: 1.02, days: 2, trScore: 0.93, reason: 'Global reach with temperature-controlled pharma protocol' },
      { name: 'Lufthansa Cargo', service: 'LH European Hub (via FRA)', type: 'Direct Flight', freq: 'Daily flights', rel: 97, factor: 1.08, days: 1, trScore: 0.98, reason: 'Fastest direct European hub transit with CEIV Pharma SLA' }
    ],
    'DOMESTIC_REGIONAL_AIR': [
      { name: 'Cocanada Xpress', service: 'Cocanada Regional Air Link', type: 'Regional Air Feeder', freq: 'Daily flights', rel: 91, factor: 0.86, days: 2, trScore: 0.88, reason: 'Best budget regional air freight for tier-2/3 sectors' },
      { name: 'DTDC Express', service: 'DTDC National Air Express Feeder', type: 'Scheduled Air Feeder', freq: 'Daily departures', rel: 93, factor: 0.89, days: 2, trScore: 0.91, reason: 'Dense national multimodal air express coverage' },
      { name: 'Delta Cargo Movers', service: 'Delta Dedicated Freight Carrier', type: 'Priority Air', freq: 'Daily departures', rel: 90, factor: 0.88, days: 2, trScore: 0.88, reason: 'Commercial bulk air freight allocation' },
      { name: 'VRL Air Cargo', service: 'VRL Priority Air Movement', type: 'Direct Charter', freq: 'Daily departures', rel: 92, factor: 0.90, days: 2, trScore: 0.89, reason: 'Regional feeder connected to VRL surface network' },
      { name: 'Air India Cargo', service: 'AI Priority Domestic Air Cargo', type: 'Direct Flight', freq: 'Daily flights', rel: 95, factor: 0.94, days: 1, trScore: 0.96, reason: 'National flag carrier daily belly space guarantee' },
      { name: 'Blue Dart Aviation', service: 'Blue Dart Scheduled Domestic Cargo Jet', type: 'Dedicated Cargo Jet', freq: 'Overnight flights', rel: 98, factor: 1.05, days: 1, trScore: 0.99, reason: 'Dedicated overnight Boeing 737/757 freighter charter' }
    ],
    'GLOBAL_AIR': [
      { name: 'DTDC Express', service: 'DTDC Global Priority Logistics', type: 'Scheduled Air Feeder', freq: 'Daily departures', rel: 92, factor: 0.91, days: 3, trScore: 0.82, reason: 'Cost-effective international courier consolidation' },
      { name: 'Air India Cargo', service: 'AI Scheduled Freighter Service', type: 'Direct Flight', freq: 'Daily flights', rel: 95, factor: 1.00, days: 2, trScore: 0.94, reason: 'Reliable national carrier standard air tariff' },
      { name: 'Blue Dart Aviation', service: 'Blue Dart Priority Overnight Air', type: 'Direct Cargo Jet', freq: 'Daily flights', rel: 97, factor: 1.06, days: 1, trScore: 0.98, reason: 'Premier overnight priority space guarantee' },
      { name: 'Emirates SkyCargo', service: 'EK Global Priority Cargo', type: 'Direct Flight', freq: 'Daily flights', rel: 97, factor: 1.08, days: 1, trScore: 0.98, reason: 'Global alliance airline with guaranteed capacity' }
    ],

    // ─── GROUND & RAIL CORRIDORS ───
    'PORT_ICD_RAIL': [
      { name: 'Allcargo Logistics', service: 'Allcargo CFS-to-ICD Multimodal Rail', type: 'Rail Intermodal Shuttle', freq: 'Every 2 days', rel: 91, factor: 0.86, days: 3, trScore: 0.88, reason: 'Most cost-effective CFS-to-ICD container rail shuttle' },
      { name: 'TCI Freight', service: 'TCI Multimodal Rail-Road Link', type: 'Intermodal Truck + Rail', freq: 'Daily dispatch', rel: 92, factor: 0.90, days: 3, trScore: 0.90, reason: 'Seamless first-mile/last-mile intermodal coordination' },
      { name: 'CONCOR', service: 'CONCOR Western DFC Electric Rail Rake', type: 'Direct Rail Intermodal', freq: 'Daily scheduled rail rake', rel: 96, factor: 0.94, days: 2, trScore: 0.97, reason: 'Fastest electrified Western Dedicated Freight Corridor transit' }
    ],
    'NATIONAL_HIGHWAY': [
      { name: 'VRL Logistics', service: 'VRL National Highway Express Network', type: 'Direct Highway Linehaul', freq: 'Daily departures', rel: 93, factor: 0.88, days: 3, trScore: 0.90, reason: 'Largest interstate linehaul fleet at lowest tariff floor' },
      { name: 'TCI Freight', service: 'TCI Dedicated Highway Linehaul', type: 'Direct Road FTL', freq: 'Daily dispatch', rel: 92, factor: 0.90, days: 3, trScore: 0.89, reason: 'National integrated FTL/LTL freight network' },
      { name: 'GATI-KWE', service: 'GATI Surface Express Road Corridor', type: 'Direct Road Express', freq: 'Daily departures', rel: 93, factor: 0.92, days: 3, trScore: 0.91, reason: 'Reliable express surface linehaul for commercial freight' },
      { name: 'Delhivery Freight', service: 'Delhivery Smart Automated Road Linehaul', type: 'Smart Road Freight', freq: 'Continuous dispatch', rel: 95, factor: 0.96, days: 2, trScore: 0.96, reason: 'Automated hub-and-spoke tracking with fastest road transit' }
    ]
  }

  const baseList = SPECIALISTS[corridor.id] || SPECIALISTS['GLOBAL_OCEAN']
  const candidateMap = new Map()

  // 1. Seed with built-in corridor specialist profiles
  baseList.forEach(c => {
    candidateMap.set(c.name.toLowerCase().trim(), { ...c })
  })

  const CORRIDOR_DEFAULT_DAYS = {
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

  const KNOWN_CARRIERS = new Set([
    'msc', 'cma cgm', 'maersk', 'hapag-lloyd', 'evergreen', 'cosco', 'one',
    'air india cargo', 'emirates skycargo', 'lufthansa cargo', 'blue dart aviation',
    'dtdc express', 'delta cargo movers', 'cocanada xpress', 'vrl air cargo',
    'concor', 'vrl logistics', 'tci freight', 'delhivery freight', 'gati-kwe', 'allcargo logistics'
  ])

  // 2. Overlay & dynamically integrate active registered companies from localStorage/database
  if (Array.isArray(registeredEligible) && registeredEligible.length > 0) {
    registeredEligible.forEach((rc, i) => {
      if (rc.status === 'SUSPENDED' || rc.is_eligible === false) return

      const cName = rc.name || rc.carrier_key
      const key = (rc.carrier_key || cName || '').toLowerCase().trim()
      const existing = candidateMap.get(key) || candidateMap.get(cName.toLowerCase().trim())

      if (existing) {
        // Upgrade with registered company metadata if available
        if (rc.contract_tier) existing.contractTier = rc.contract_tier
        if (rc.sla_hours) existing.slaHours = rc.sla_hours
      } else {
        const isCustom = !KNOWN_CARRIERS.has(key)
        if (isCustom || candidateMap.size < 3) {
          // Newly added carrier by Admin: dynamically assign performance parameters
          const tier = (rc.contract_tier || '').toLowerCase()
          const isPremier = tier.includes('premier') || tier.includes('strategic') || tier.includes('tier 1')
          const defaultDays = CORRIDOR_DEFAULT_DAYS[corridor.id] || (mode === 'AIR' || mode === 'EXPRESS_AIR' ? 2 : mode === 'GROUND_RAIL' ? 3 : 14)
          candidateMap.set(key, {
            name: cName,
            service: `${cName} Scheduled Operations Link`,
            type: isPremier ? 'Direct Express Linehaul' : 'Direct Commercial Freight',
            freq: 'Daily scheduled departure',
            rel: isPremier ? 96 : 91 + (i % 5),
            factor: 0.89 + ((i % 4) * 0.03),
            days: defaultDays,
            trScore: 0.90,
            reason: `${rc.contract_tier || 'Verified Carrier Partner'} with active SLA verification`
          })
        }
      }
    })
  }

  return Array.from(candidateMap.values())
}

/**
 * Assigns exactly 3 distinct strategic customer personas (Best Value, Fastest Transit, Premier SLA).
 */
function assignThreeStrategicPersonas(candidates, baseCost, corridorInfo, ogCode, ogCity, dgCode, dgCity, mode) {
  if (!candidates || candidates.length === 0) return []

  // Ensure minimum 3 candidates by duplicating/varying if pool is small
  const pool = [...candidates]
  while (pool.length < 3) {
    const clone = { ...pool[0], name: `${pool[0].name} Alt`, factor: pool[0].factor * 1.05 }
    pool.push(clone)
  }

  // 1. Slot 1 (Best Value): Lowest cost factor (most economical commercial rate)
  const sortedByCost = [...pool].sort((a, b) => a.factor - b.factor || a.days - b.days)
  const bestValueWinner = sortedByCost[0]

  // 2. Slot 2 (Fastest Transit): Shortest transit days (excluding Best Value winner)
  const remainingForSpeed = pool.filter(c => c.name !== bestValueWinner.name)
  const sortedBySpeed = [...remainingForSpeed].sort((a, b) => a.days - b.days || b.rel - a.rel)
  const fastestWinner = sortedBySpeed[0] || pool[1]

  // 3. Slot 3 (Premier Reliability): Highest on-time reliability & SLA (excluding winners 1 and 2)
  const remainingForSLA = pool.filter(c => c.name !== bestValueWinner.name && c.name !== fastestWinner.name)
  const sortedBySLA = [...remainingForSLA].sort((a, b) => b.rel - a.rel || a.factor - b.factor)
  const premierSLAWinner = sortedBySLA[0] || pool[2]

  const winningPersonas = [
    {
      ...bestValueWinner,
      persona: 'BEST_VALUE',
      personaBadge: '🏆 BEST VALUE',
      recommended: true
    },
    {
      ...fastestWinner,
      persona: 'FASTEST_TRANSIT',
      personaBadge: '⚡ FASTEST TRANSIT',
      recommended: false
    },
    {
      ...premierSLAWinner,
      persona: 'PREMIER_SLA',
      personaBadge: '🛡️ PREMIER SLA',
      recommended: false
    }
  ]

  return winningPersonas.map((item, idx) => {
    const isAir = mode === 'AIR' || mode === 'EXPRESS_AIR'
    const isGround = mode === 'GROUND_RAIL'
    const trScore = item.trScore || Math.min(1.0, Math.max(0.65, 1.0 - (item.days / (isAir ? 5 : isGround ? 10 : 30))))

    return {
      id: `r-${mode.toLowerCase()}-${idx + 1}`,
      carrier: item.name,
      serviceCategory: mode,
      serviceName: item.service,
      type: item.type,
      sailingFrequency: item.freq,
      reliabilityPct: item.rel,
      recommended: item.recommended,
      cost: Math.round(baseCost * item.factor),
      transitDays: item.days,
      indicative: true,
      persona: item.persona,
      personaBadge: item.personaBadge,
      selectionReason: item.reason,
      corridorName: corridorInfo.name,
      legs: [
        {
          fromCode: ogCode,
          fromCity: ogCity,
          toCode: dgCode,
          toCity: dgCity,
          distanceNm: isAir ? 2400 : isGround ? 1650 : 1850,
          sailingDays: isAir ? undefined : item.days,
          flightHours: isAir ? item.days * 8 : undefined,
          roadDays: isGround ? item.days : undefined
        }
      ],
      scores: {
        transit: Number(trScore.toFixed(2)),
        cost: Number((1.0 - (item.factor - 0.85) * 0.8).toFixed(2)),
        reliability: Number((item.rel / 100).toFixed(2)),
        congestion: isAir ? 0.85 : isGround ? 0.82 : 0.80,
        composite: Number((0.35 * trScore + 0.30 * (1.0 - (item.factor - 0.85) * 0.8) + 0.20 * (item.rel / 100) + 0.15 * (isAir ? 0.85 : isGround ? 0.82 : 0.80)).toFixed(2))
      }
    }
  })
}

/**
 * Builds ranked list of route options for a shipment depending on mode, corridor, and 3 strategic personas.
 */
export function buildRouteOptions(originGw, destGw, mode = 'OCEAN', baseCost = 384500) {
  const ogCode = originGw?.code || 'INNSA'
  const dgCode = destGw?.code || 'AEJEA'
  const ogCity = originGw?.city || 'Origin Port'
  const dgCity = destGw?.city || 'Destination Port'

  // 1. Identify trade corridor
  const corridorInfo = resolveTradeCorridor(originGw, destGw, mode)

  // 2. Retrieve verified & eligible registered companies (strictly filters out SUSPENDED carriers)
  const registeredEligible = getEligibleCompaniesForMode(mode)

  // 3. Obtain candidate pool for this corridor
  const candidates = getCorridorCandidates(corridorInfo, mode, registeredEligible)

  // 4. Assign the 3 distinct strategic personas (Best Value, Fastest Transit, Premier SLA)
  const routes = assignThreeStrategicPersonas(candidates, baseCost, corridorInfo, ogCode, ogCity, dgCode, dgCity, mode)

  // 5. Final safety verification against Admin status
  return filterEligibleRoutes(routes)
}

