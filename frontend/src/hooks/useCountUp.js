import { useEffect, useState } from 'react'

export function useCountUp(target, start, decimals = 0, duration = 1400) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start) return
    let frame
    const startTime = performance.now()

    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Number((target * eased).toFixed(decimals)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [start, target, decimals, duration])

  return value
}
