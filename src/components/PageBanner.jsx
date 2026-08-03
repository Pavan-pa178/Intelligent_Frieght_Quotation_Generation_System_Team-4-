import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function PageBanner({ crumb, title, subtitle, extraPadding = false, icon: Icon }) {
  return (
    <div className={`chart-grid relative overflow-hidden bg-brand-navy text-white ${extraPadding ? 'pb-28' : 'pb-14'} pt-16`}>
      {/* layered gradient glow — replaces the flat navy fill with depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_760px_420px_at_85%_-10%,rgba(240,105,42,.30),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_640px_380px_at_-5%_115%,rgba(46,109,168,.32),transparent_60%)]" />

      {/* decorative dashed route line, echoes the hero animation */}
      <svg
        viewBox="0 0 520 220"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute -right-6 -top-4 hidden h-[220px] w-[420px] opacity-40 sm:block md:h-[260px] md:w-[520px]"
      >
        <path
          d="M0,190 C110,70 200,200 300,80 C360,10 420,45 500,15"
          fill="none"
          stroke="#F0692A"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
        <circle cx="0" cy="190" r="4.5" fill="#F0692A" />
        <circle cx="500" cy="15" r="4.5" fill="#fff" />
      </svg>

      {/* faint watermark icon, unique per page */}
      {Icon && (
        <Icon
          className="pointer-events-none absolute -right-10 -top-10 hidden h-[240px] w-[240px] text-white/[0.06] lg:block"
          strokeWidth={1}
        />
      )}

      <div className="relative z-10 mx-auto max-w-[1220px] px-8 sm:px-5">
        <div className="mb-[18px] flex items-center gap-2 font-mono text-xs text-slate-400">
          <Link to="/" className="hover:text-white">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span>{crumb}</span>
        </div>
        <h1 className="text-[28px] sm:text-[36px] md:text-[42px]">{title}</h1>
        {subtitle && <p className="mt-3 max-w-[540px] text-[15.5px] text-slate-300">{subtitle}</p>}
      </div>
    </div>
  )
}
