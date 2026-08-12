export const FLAT_UPLIFT = 0.35 // 35% indicative uplift placeholder for M1

/**
 * Calculates dynamic indicative total based on distance, mode, and chargeable weight/units
 */
export function indicativeTotal(originGw, destGw, mode = 'OCEAN', loadType = 'FCL', weightObj = {}, distance = 1200) {
  let baseRate = 0
  const currency = 'INR'

  const distVal = distance > 0 ? distance : 1200

  if (mode === 'OCEAN') {
    if (weightObj.isContainer || (weightObj.basis === 'PER_CONTAINER' && loadType === 'FCL')) {
      // Ocean FCL rate: distance component + per container base
      const perContainerBase = 85000 + (distVal * 40)
      const count = weightObj.units || 1
      baseRate = perContainerBase * count
    } else {
      // Ocean LCL rate: per Revenue Ton (CBM vs Metric Tonnes)
      const perRtRate = 11000 + (distVal * 7)
      const units = weightObj.chargeableVal || weightObj.units || 0.5
      baseRate = Math.max(18000, perRtRate * units)
    }
  } else if (mode === 'AIR') {
    // Air Freight: per chargeable kg + distance factor
    const perKgRate = 160 + (distVal * 0.04)
    const kg = weightObj.chargeableVal || weightObj.units || 10
    baseRate = Math.max(12000, (perKgRate * kg) + (distVal * 8))
  } else if (mode === 'EXPRESS_AIR') {
    // Express Air: priority handling + per chargeable kg
    const perKgRate = 240 + (distVal * 0.06)
    const kg = weightObj.chargeableVal || weightObj.units || 10
    baseRate = Math.max(18000, (perKgRate * kg) + (distVal * 12))
  } else {
    // Ground & Rail: distance component + weight component
    const perKgRate = 25 + (distVal * 0.015)
    const kg = weightObj.chargeableVal || weightObj.units || 10
    baseRate = Math.max(6000, (perKgRate * kg) + (distVal * 5))
  }

  // BAF (Bunker Adjustment Factor) / FSC (Fuel Surcharge)
  const fuelSurcharge = Math.round(baseRate * 0.08)
  const subtotal = baseRate + fuelSurcharge

  // Apply 35% indicative uplift
  const amount = Math.round(subtotal * (1 + FLAT_UPLIFT))

  return {
    amount,
    baseRate: Math.round(baseRate),
    fuelSurcharge,
    currency,
    is_indicative: true,
    basisLabel: weightObj.isContainer ? 'Per container — FCL' :
                mode === 'OCEAN' ? 'Revenue tons — LCL' :
                'Chargeable weight'
  }
}
