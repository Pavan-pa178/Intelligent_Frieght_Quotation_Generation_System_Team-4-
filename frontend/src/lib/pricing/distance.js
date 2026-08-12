import { DETOUR_FACTOR, SEA_DISTANCES, GATEWAYS } from './constants'

/**
 * Great-circle distance between two coordinates in km
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180
  const R = 6371 // Earth radius in km

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Road distance estimation with detour factor
 */
export function roadDistance(pointA, pointB, country = 'DEFAULT') {
  const straightKm = haversineDistance(pointA.lat, pointA.lon, pointB.lat, pointB.lon)
  const factor = DETOUR_FACTOR[country] || DETOUR_FACTOR.DEFAULT
  return Math.round(straightKm * factor)
}

/**
 * Sea distance lookup in nautical miles
 */
export function seaDistance(originCode, destCode) {
  const key = `${originCode}-${destCode}`
  if (SEA_DISTANCES[key]) return SEA_DISTANCES[key]
  
  // Fallback estimation using coordinates converted to nm * sea factor
  const og = GATEWAYS.find(g => g.code === originCode)
  const dg = GATEWAYS.find(g => g.code === destCode)
  if (og && dg) {
    const km = haversineDistance(og.lat, og.lon, dg.lat, dg.lon)
    return Math.round((km / 1.852) * 1.4) // approximate sea route curvature
  }
  return 1200 // default fallback
}

/**
 * Main leg distance based on mode
 */
export function mainLegDistance(originGw, destGw, mode = 'OCEAN') {
  if (!originGw || !destGw) return 0
  
  if (mode === 'OCEAN') {
    return seaDistance(originGw.code, destGw.code) // in nautical miles
  } else if (mode === 'AIR' || mode === 'EXPRESS_AIR') {
    const km = haversineDistance(originGw.lat, originGw.lon, destGw.lat, destGw.lon)
    return Math.round(km * 1.06) // 6% airway overhead in km
  } else {
    // GROUND_RAIL
    const km = haversineDistance(originGw.lat, originGw.lon, destGw.lat, destGw.lon)
    return Math.round(km * 1.30) // road detour in km
  }
}
