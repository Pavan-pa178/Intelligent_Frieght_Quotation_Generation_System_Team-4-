import { GATEWAYS } from './constants'

/**
 * Resolves a city name or search string to candidate ports / airports
 * @param {string} query 
 * @param {string} mode - OCEAN | AIR | GROUND_RAIL | EXPRESS_AIR
 * @returns {Array} List of matching gateway records
 */
export function resolveGateway(query, mode = 'OCEAN') {
  if (!query || typeof query !== 'string') return GATEWAYS.filter(g => g.modes.includes(mode))
  
  const q = query.toLowerCase().trim()
  const modeKey = mode === 'EXPRESS_AIR' ? 'AIR' : mode
  
  return GATEWAYS.filter(g => {
    const matchesMode = g.modes.includes(mode) || (modeKey === 'AIR' && g.type === 'AIRPORT') || (mode === 'OCEAN' && g.type === 'PORT')
    const matchesText = g.code.toLowerCase().includes(q) ||
                        g.name.toLowerCase().includes(q) ||
                        g.city.toLowerCase().includes(q) ||
                        g.country.toLowerCase().includes(q)
    return matchesMode && matchesText
  })
}

export function getGatewayByCode(code) {
  return GATEWAYS.find(g => g.code.toUpperCase() === (code || '').toUpperCase())
}
