// Master data ports and airports for Gateway resolution
export const GATEWAYS = [
  { code: 'INNSA', name: 'Nhava Sheva (JNPT), Mumbai', city: 'Mumbai', country: 'India', countryCode: 'IN', type: 'PORT', lat: 18.95, lon: 72.95, modes: ['OCEAN'] },
  { code: 'AEJEA', name: 'Jebel Ali, Dubai', city: 'Dubai', country: 'UAE', countryCode: 'AE', type: 'PORT', lat: 24.98, lon: 55.06, modes: ['OCEAN'] },
  { code: 'NLRTM', name: 'Port of Rotterdam', city: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', type: 'PORT', lat: 51.95, lon: 4.15, modes: ['OCEAN'] },
  { code: 'SGSIN', name: 'Port of Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', type: 'PORT', lat: 1.26, lon: 103.84, modes: ['OCEAN'] },
  { code: 'DEHAM', name: 'Port of Hamburg', city: 'Hamburg', country: 'Germany', countryCode: 'DE', type: 'PORT', lat: 53.53, lon: 9.96, modes: ['OCEAN'] },
  { code: 'PECLL', name: 'Port of Callao', city: 'Callao', country: 'Peru', countryCode: 'PE', type: 'PORT', lat: -12.05, lon: -77.15, modes: ['OCEAN'] },
  { code: 'OMSLL', name: 'Port of Salalah', city: 'Salalah', country: 'Oman', countryCode: 'OM', type: 'PORT', lat: 16.94, lon: 54.01, modes: ['OCEAN'] },
  { code: 'USNYC', name: 'Port of New York & New Jersey', city: 'New York', country: 'USA', countryCode: 'US', type: 'PORT', lat: 40.67, lon: -74.04, modes: ['OCEAN'] },
  { code: 'CNSHA', name: 'Port of Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', type: 'PORT', lat: 31.23, lon: 121.47, modes: ['OCEAN'] },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj Intl Airport (BOM)', city: 'Mumbai', country: 'India', countryCode: 'IN', type: 'AIRPORT', lat: 19.09, lon: 72.87, modes: ['AIR', 'EXPRESS_AIR'] },
  { code: 'DXB', name: 'Dubai International Airport (DXB)', city: 'Dubai', country: 'UAE', countryCode: 'AE', type: 'AIRPORT', lat: 25.25, lon: 55.36, modes: ['AIR', 'EXPRESS_AIR'] },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol (AMS)', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', type: 'AIRPORT', lat: 52.31, lon: 4.76, modes: ['AIR', 'EXPRESS_AIR'] },
  { code: 'SIN', name: 'Singapore Changi Airport (SIN)', city: 'Singapore', country: 'Singapore', countryCode: 'SG', type: 'AIRPORT', lat: 1.36, lon: 103.99, modes: ['AIR', 'EXPRESS_AIR'] },
  { code: 'FRA', name: 'Frankfurt Airport (FRA)', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', type: 'AIRPORT', lat: 50.03, lon: 8.57, modes: ['AIR', 'EXPRESS_AIR'] },
  { code: 'JFK', name: 'John F. Kennedy Intl Airport (JFK)', city: 'New York', country: 'USA', countryCode: 'US', type: 'AIRPORT', lat: 40.64, lon: -73.78, modes: ['AIR', 'EXPRESS_AIR'] }
]

// Volumetric divisors by mode
export const DIVISORS = {
  AIR: 6000,
  EXPRESS_AIR: 5000,
  GROUND_RAIL: 4500,
  OCEAN_LCL: 1000 // converts cm3 to CBM for revenue ton calc
}

// Road detour factors by country
export const DETOUR_FACTOR = {
  IN: 1.30,
  AE: 1.20,
  EU: 1.25,
  US: 1.22,
  DEFAULT: 1.30
}

// Sea distance lookup table (nautical miles)
export const SEA_DISTANCES = {
  'INNSA-AEJEA': 1205,
  'AEJEA-INNSA': 1205,
  'INNSA-NLRTM': 6400, // via Suez ~6400nm (straight/pub approx)
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

// Linehaul speeds and dwell constants
export const MODE_CONSTANTS = {
  OCEAN_FCL: { linehaulSpeedNmPerDay: 400, originDwellDays: 3, destDwellDays: 3, bufferDays: 4 },
  OCEAN_LCL: { linehaulSpeedNmPerDay: 400, originDwellDays: 5, destDwellDays: 5, bufferDays: 5 },
  AIR: { linehaulSpeedKmPerHour: 800, handlingDays: 1, originDwellDays: 2, destDwellDays: 1.5, bufferDays: 2 },
  EXPRESS_AIR: { linehaulSpeedKmPerHour: 800, priority: true, originDwellDays: 0.5, destDwellDays: 0.5, bufferDays: 1 },
  GROUND_RAIL: { roadKmPerDay: 450, railKmPerDay: 600, originDwellDays: 0.5, destDwellDays: 0.5, bufferDays: 2 }
}

export const ContainerPayloadLimits = {
  '20GP': 21800,
  '40GP': 26600,
  '40HC': 28800,
  '20RF': 21000,
  '40RF': 27000,
  '20OT': 21500,
  '40FR': 31000
}
