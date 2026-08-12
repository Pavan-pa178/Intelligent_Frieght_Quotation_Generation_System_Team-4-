import { resolveGateway, getGatewayByCode } from './gateway'
import { mainLegDistance } from './distance'
import { actualWeight, volumetricWeight, chargeableWeight } from './weight'
import { estimateTransit } from './transit'
import { buildRouteOptions } from './routeScore'
import { indicativeTotal } from './pricingStub'

/**
 * Main orchestrator to compute live estimate panel state from form inputs
 */
export function computeLiveEstimate(formState = {}) {
  const {
    originGateway,
    destGateway,
    mode = 'OCEAN',
    loadType = 'FCL',
    cargoItems = [],
    readyDate = ''
  } = formState

  // 1. Resolve gateways
  const og = typeof originGateway === 'object' ? originGateway : getGatewayByCode(originGateway) || resolveGateway(originGateway, mode)[0]
  const dg = typeof destGateway === 'object' ? destGateway : getGatewayByCode(destGateway) || resolveGateway(destGateway, mode)[0]

  // Check minimal completeness
  const hasItems = cargoItems && cargoItems.length > 0 && cargoItems.some(i =>
    i.package_type === 'CONTAINER' ||
    (parseFloat(i.gross_weight_kg) > 0) ||
    (parseFloat(i.weight_per_unit_kg || i.weight) > 0) ||
    (parseFloat(i.quantity || i.qty) > 0)
  )
  const isMinimallyComplete = Boolean(og && dg && hasItems)

  if (!isMinimallyComplete) {
    return {
      isComplete: false,
      chargeBasis: loadType === 'FCL' ? 'Per container — FCL' : 'Chargeable weight',
      unitsLabel: '—',
      grossWeightKg: actualWeight(cargoItems) || 0,
      mainDistanceNm: og && dg ? mainLegDistance(og, dg, mode) : 0,
      distanceLabel: mode === 'OCEAN' ? 'Sea distance' : 'Flight distance',
      transitRange: '—',
      arrivalDateFormatted: '—',
      routeOptionsCount: 0,
      totalFormatted: '—',
      totalAmount: 0,
      isIndicative: true
    }
  }

  // 2. Compute weights & chargeable basis
  const actWeightKg = actualWeight(cargoItems)
  const volWeightKg = volumetricWeight(cargoItems, mode)
  const chgResult = chargeableWeight(cargoItems, mode, loadType)

  // 3. Compute distance & transit
  const mainDist = mainLegDistance(og, dg, mode)
  const transitResult = estimateTransit(mainDist, mode, loadType, readyDate)

  // 4. Compute dynamic indicative pricing based on distance & weight
  const priceResult = indicativeTotal(og, dg, mode, loadType, chgResult, mainDist)

  // 5. Build ranked route options
  const routes = buildRouteOptions(og, dg, mode, priceResult.amount)

  return {
    isComplete: true,
    originGateway: og,
    destGateway: dg,
    chargeBasis: priceResult.basisLabel,
    unitsLabel: chgResult.unitsLabel,
    grossWeightKg: actWeightKg,
    volumetricWeightKg: Math.round(volWeightKg),
    mainDistanceNm: mainDist,
    distanceLabel: mode === 'OCEAN' ? 'Sea distance' : 'Flight distance',
    transitRange: transitResult.transitRange,
    arrivalDateFormatted: transitResult.arrivalDateFormatted,
    transitBreakdown: transitResult,
    routeOptionsCount: routes.length,
    routes,
    totalFormatted: `₹ ${priceResult.amount.toLocaleString('en-IN')}`,
    totalAmount: priceResult.amount,
    currency: priceResult.currency,
    isIndicative: true
  }
}
