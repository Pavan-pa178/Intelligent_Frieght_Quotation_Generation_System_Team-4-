import { useEffect, useState } from 'react'
import { Ship } from 'lucide-react'

function formatClock(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

const START_SECONDS = 14 * 3600 + 22 * 60 + 8

export default function RouteHero() {
  const [seconds, setSeconds] = useState(START_SECONDS)

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 0 ? START_SECONDS : s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative h-[360px] md:h-[440px]">
      <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        <path
          d="M40,300 C140,120 260,340 400,140 C470,50 520,90 560,60"
          fill="none"
          stroke="rgba(255,255,255,.34)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <path
          className="route-path-solid animate-drawPath"
          d="M40,300 C140,120 260,340 400,140 C470,50 520,90 560,60"
          fill="none"
          stroke="#F0692A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="40" cy="300" r="6" fill="#fff" />
        <circle cx="40" cy="300" r="6" fill="none" stroke="#F0692A" strokeWidth="2" className="origin-center animate-pulseRing" />
        <circle cx="560" cy="60" r="6" fill="#fff" />
        <circle cx="560" cy="60" r="6" fill="none" stroke="#F0692A" strokeWidth="2" className="origin-center animate-pulseRing" />
      </svg>

      <div className="route-mover absolute left-0 top-0 h-[26px] w-[26px] animate-moveAlong text-brand-orangeLight drop-shadow-lg">
        <Ship className="h-full w-full" strokeWidth={1.6} />
      </div>

      <div className="absolute bottom-3.5 left-1.5 w-[230px] animate-floatY rounded-[14px] border border-white/15 bg-brand-navy2/85 p-[18px] shadow-lg2 backdrop-blur-md">
        <Row k="ORIGIN" v="MUMBAI, IN" />
        <Row k="DESTINATION" v="DUBAI, AE" />
        <Row k="ETA" v={formatClock(seconds)} />
        <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide text-[#8CE0B4]">
          <span className="h-1.5 w-1.5 animate-shimmerDot rounded-full bg-[#3FD887]" />
          IN TRANSIT · PORT-58213-IN
        </div>
      </div>

      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="#F0692A"
        strokeWidth="1.4"
        className="absolute right-0.5 top-[18px] hidden h-[88px] w-[88px] rotate-[9deg] animate-floatYSlow opacity-90 sm:block"
      >
        <circle cx="50" cy="50" r="42" strokeDasharray="3 3" />
        <circle cx="50" cy="50" r="34" />
        <text x="50" y="46" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="7" fill="#F0692A" stroke="none">VERIFIED</text>
        <text x="50" y="58" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="7" fill="#F0692A" stroke="none">CARRIER</text>
      </svg>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="mb-1.5 flex justify-between font-mono text-[11px] text-slate-400">
      <span>{k}</span>
      <b className="font-semibold text-white">{v}</b>
    </div>
  )
}
