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
 * Builds ranked list of 3 route options for a shipment
 */
export function buildRouteOptions(originGw, destGw, mode = 'OCEAN', baseCost = 384500) {
  const ogCode = originGw?.code || 'INNSA'
  const dgCode = destGw?.code || 'AEJEA'

  if (mode === 'OCEAN') {
    return [
      {
        id: 'r1',
        carrier: 'Maersk',
        serviceName: 'MECL Service',
        type: 'Direct',
        sailingFrequency: 'weekly sailing',
        reliabilityPct: 94,
        recommended: true,
        cost: baseCost,
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Nhava Sheva', toCode: dgCode, toCity: destGw?.city || 'Jebel Ali', distanceNm: 1205, sailingDays: 3 }
        ],
        scores: { transit: 0.92, cost: 0.78, reliability: 0.94, congestion: 0.71, composite: 0.86 }
      },
      {
        id: 'r2',
        carrier: 'CMA CGM',
        serviceName: 'via Salalah',
        type: '1 transhipment',
        sailingFrequency: 'biweekly',
        reliabilityPct: 88,
        recommended: false,
        cost: Math.round(baseCost * 0.88),
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Nhava Sheva', toCode: 'OMSLL', toCity: 'Salalah', distanceNm: 890, sailingDays: 2 },
          { fromCode: 'OMSLL', fromCity: 'Salalah', toCode: dgCode, toCity: destGw?.city || 'Jebel Ali', distanceNm: 640, sailingDays: 2, dwellDays: 2 }
        ],
        scores: { transit: 0.64, cost: 0.95, reliability: 0.88, congestion: 0.66, composite: 0.77 }
      },
      {
        id: 'r3',
        carrier: 'Hapag-Lloyd',
        serviceName: 'IMEX Service',
        type: 'Direct',
        sailingFrequency: 'fortnightly',
        reliabilityPct: 91,
        recommended: false,
        cost: Math.round(baseCost * 1.05),
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Nhava Sheva', toCode: dgCode, toCity: destGw?.city || 'Jebel Ali', distanceNm: 1205, sailingDays: 4, scheduleWaitDays: 3.5 }
        ],
        scores: { transit: 0.58, cost: 0.70, reliability: 0.91, congestion: 0.71, composite: 0.71 }
      }
    ]
  } else if (mode === 'AIR' || mode === 'EXPRESS_AIR') {
    return [
      {
        id: 'r1',
        carrier: 'Emirates SkyCargo',
        serviceName: 'EK Direct Express',
        type: 'Direct Flight',
        sailingFrequency: 'Daily flights',
        reliabilityPct: 97,
        recommended: true,
        cost: baseCost,
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Mumbai', toCode: dgCode, toCity: destGw?.city || 'Dubai', distanceKm: 1930, flightHours: 3.5 }
        ],
        scores: { transit: 0.96, cost: 0.75, reliability: 0.97, congestion: 0.85, composite: 0.90 }
      },
      {
        id: 'r2',
        carrier: 'Qatar Airways Cargo',
        serviceName: 'via Doha (DOH)',
        type: '1 stop',
        sailingFrequency: '2x daily',
        reliabilityPct: 92,
        recommended: false,
        cost: Math.round(baseCost * 0.90),
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Mumbai', toCode: 'DOH', toCity: 'Doha', distanceKm: 2280, flightHours: 4.0 },
          { fromCode: 'DOH', fromCity: 'Doha', toCode: dgCode, toCity: destGw?.city || 'Dubai', distanceKm: 380, flightHours: 1.0, dwellDays: 0.5 }
        ],
        scores: { transit: 0.82, cost: 0.88, reliability: 0.92, congestion: 0.80, composite: 0.85 }
      }
    ]
  } else {
    // GROUND_RAIL
    return [
      {
        id: 'r1',
        carrier: 'GCC Express Logistics',
        serviceName: 'Overland Road Corridor',
        type: 'Direct Road',
        sailingFrequency: 'Daily departure',
        reliabilityPct: 90,
        recommended: true,
        cost: baseCost,
        indicative: true,
        legs: [
          { fromCode: ogCode, fromCity: originGw?.city || 'Origin', toCode: dgCode, toCity: destGw?.city || 'Destination', distanceKm: 1500, roadDays: 3 }
        ],
        scores: { transit: 0.85, cost: 0.80, reliability: 0.90, congestion: 0.75, composite: 0.83 }
      }
    ]
  }
}
