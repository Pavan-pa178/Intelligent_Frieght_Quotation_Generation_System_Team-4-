import { DIVISORS, ContainerPayloadLimits } from './constants'

/**
 * Calculates total physical gross weight in kg
 */
export function actualWeight(items = []) {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => {
    if (!item) return sum
    if (item.package_type === 'CONTAINER') {
      const weight = parseFloat(item.gross_weight_kg) || 0
      return sum + weight
    } else {
      const qty = parseFloat(item.quantity || item.qty) || 1
      const wPerUnit = parseFloat(item.weight_per_unit_kg || item.weight) || 0
      const gross = parseFloat(item.gross_weight_kg) || 0
      const unitWeight = wPerUnit > 0 ? wPerUnit : (gross > 0 ? gross / qty : 10)
      return sum + (qty * unitWeight)
    }
  }, 0)
}

/**
 * Calculates total volumetric weight in kg
 */
export function volumetricWeight(items = [], mode = 'AIR') {
  if (!Array.isArray(items)) return 0
  const divisor = DIVISORS[mode] || DIVISORS.AIR
  return items.reduce((sum, item) => {
    if (!item || item.package_type === 'CONTAINER') return sum
    
    const qty = parseFloat(item.quantity || item.qty) || 1
    const l = parseFloat(item.length_cm || item.length) || 0
    const w = parseFloat(item.width_cm || item.width) || 0
    const h = parseFloat(item.height_cm || item.height) || 0
    
    if (l <= 0 || w <= 0 || h <= 0) return sum
    const volCm3 = l * w * h * qty
    return sum + (volCm3 / divisor)
  }, 0)
}

/**
 * Computes Chargeable Weight & Basis
 * @returns {Object} { basis: string, isContainer: boolean, unitsLabel: string, units: number, chargeableVal: number }
 */
export function chargeableWeight(items = [], mode = 'OCEAN', loadType = 'FCL') {
  const safeItems = Array.isArray(items) ? items : []
  
  // Package is container ONLY if package_type is explicitly CONTAINER or (in Ocean mode with loadType FCL and non-specific package type)
  const hasContainerPackage = safeItems.some(i => i?.package_type === 'CONTAINER')
  const hasNonContainerPackage = safeItems.some(i => i?.package_type && i.package_type !== 'CONTAINER')
  
  const isContainer = mode === 'OCEAN' && (hasContainerPackage || (loadType === 'FCL' && !hasNonContainerPackage))

  if (isContainer) {
    let containerCount = safeItems.reduce((sum, i) => {
      const count = parseInt(i?.container_count) || 0
      if (count > 0) return sum + count
      const gross = parseFloat(i?.gross_weight_kg) || 0
      const limit = ContainerPayloadLimits[i?.container_type || '40HC'] || 28800
      return sum + Math.max(1, Math.ceil(gross / limit))
    }, 0)

    if (containerCount < 1) containerCount = 1

    const containerTypes = Array.from(new Set(safeItems.map(i => i?.container_type || '40HC'))).join(', ')
    return {
      basis: 'PER_CONTAINER',
      isContainer: true,
      unitsLabel: `${containerCount} × ${containerTypes || '40HC'}`,
      units: containerCount,
      chargeableVal: containerCount
    }
  } else if (mode === 'OCEAN' && (loadType === 'LCL' || hasNonContainerPackage)) {
    // Ocean LCL: charged on Revenue Tons: max(CBM, Metric Tonnes)
    const totActualKg = actualWeight(safeItems)
    const tonnes = totActualKg / 1000
    
    const cbm = safeItems.reduce((sum, i) => {
      const qty = parseFloat(i?.quantity || i?.qty) || 1
      const l = parseFloat(i?.length_cm || i?.length) || 0
      const w = parseFloat(i?.width_cm || i?.width) || 0
      const h = parseFloat(i?.height_cm || i?.height) || 0
      if (l <= 0 || w <= 0 || h <= 0) {
        // Fallback default CBM estimation based on package type if dimension not specified
        const defCbm = i?.package_type === 'PALLET' ? 1.2 : 0.2
        return sum + (defCbm * qty)
      }
      return sum + ((l * w * h * qty) / 1000000)
    }, 0)

    const revenueTons = Math.max(cbm, tonnes, 0.5)
    return {
      basis: 'REVENUE_TON',
      isContainer: false,
      unitsLabel: `${revenueTons.toFixed(1)} R/T`,
      units: Number(revenueTons.toFixed(2)),
      chargeableVal: Number(revenueTons.toFixed(2))
    }
  } else {
    // Air, Express Air, Ground & Rail: CHARGEABLE_KG = max(actual_weight, volumetric_weight)
    const actKg = actualWeight(safeItems)
    const volKg = volumetricWeight(safeItems, mode)
    const chgKg = Math.max(actKg, volKg, 1.0)

    return {
      basis: 'CHARGEABLE_KG',
      isContainer: false,
      unitsLabel: `${Math.ceil(chgKg)} kg ch.`,
      units: Math.ceil(chgKg),
      chargeableVal: Math.ceil(chgKg)
    }
  }
}
