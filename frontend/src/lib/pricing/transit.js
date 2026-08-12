import { MODE_CONSTANTS } from './constants'

/**
 * Calculates estimated transit breakdown
 */
export function estimateTransit(routeDistance, mode = 'OCEAN', loadType = 'FCL', readyDateStr = '') {
  let pickupDays = 1.0
  let originDwell = 3.0
  let linehaulDays = 3.0
  let scheduleWait = 3.5
  let destDwell = 3.0
  let deliveryDays = 0.0

  if (mode === 'OCEAN') {
    const config = loadType === 'FCL' ? MODE_CONSTANTS.OCEAN_FCL : MODE_CONSTANTS.OCEAN_LCL
    originDwell = config.originDwellDays
    destDwell = config.destDwellDays
    linehaulDays = Math.max(1, Math.round((routeDistance / config.linehaulSpeedNmPerDay) * 10) / 10)
    scheduleWait = 3.5 // avg weekly sailing wait (7 / 2)
  } else if (mode === 'AIR' || mode === 'EXPRESS_AIR') {
    const config = mode === 'AIR' ? MODE_CONSTANTS.AIR : MODE_CONSTANTS.EXPRESS_AIR
    originDwell = config.originDwellDays
    destDwell = config.destDwellDays
    linehaulDays = Math.max(0.5, Math.round((routeDistance / (config.linehaulSpeedKmPerHour * 12)) * 10) / 10)
    scheduleWait = mode === 'EXPRESS_AIR' ? 0.5 : 1.5
  } else {
    // GROUND_RAIL
    originDwell = 0.5
    destDwell = 0.5
    linehaulDays = Math.max(1, Math.round((routeDistance / 450) * 10) / 10)
    scheduleWait = 1.0
  }

  const totalExact = pickupDays + originDwell + linehaulDays + scheduleWait + destDwell + deliveryDays
  const minDays = Math.max(1, Math.floor(totalExact * 0.6))
  const maxDays = Math.ceil(totalExact * 0.95)

  // Estimated arrival date
  const readyDate = readyDateStr ? new Date(readyDateStr) : new Date()
  const arrivalDate = addBusinessDays(readyDate, maxDays)
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const arrivalFormatted = `${arrivalDate.getDate()} ${monthNames[arrivalDate.getMonth()]}`

  return {
    pickupDays,
    originDwell,
    linehaulDays,
    scheduleWait,
    destDwell,
    deliveryDays,
    totalExact,
    transitRange: `${minDays}–${maxDays} d`,
    arrivalDateFormatted: arrivalFormatted
  }
}

/**
 * Adds business days (skipping weekends)
 */
export function addBusinessDays(startDate, daysToAdd) {
  let date = new Date(startDate.getTime())
  let added = 0
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1)
    // Sunday (0) and Saturday (6) check
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      added++
    }
  }
  return date
}
