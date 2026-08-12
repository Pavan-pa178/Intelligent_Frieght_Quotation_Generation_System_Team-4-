import { useEffect, useState } from 'react'
import { Compass, Ship, CheckCircle2, AlertCircle } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { fetchRouteAnalytics } from '../lib/api'

export default function Routes() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRouteAnalytics().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  const kpis = data?.kpis || {}
  const lanes = data?.lanePerformance || []

  return (
    <>
      <PageBanner
        crumb="Intelligence"
        title="Route Intelligence Dashboard"
        subtitle="Global trade lane connectivity, transit time metrics, and carrier performance analytics."
        icon={Compass}
      />

      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            <KpiCard label="Routes Analysed" value={kpis.routesAnalysed || '12,450'} delta="Global coverage" />
            <KpiCard label="Lane Coverage" value={kpis.laneCoveragePct || '98.5%'} delta="Target >= 95%" deltaType="up" />
            <KpiCard label="Transit MAE" value={kpis.transitMaeDays || '1.7 d'} delta="Mean Absolute Error" deltaType="up" />
            <KpiCard label="Options Per Lane" value={kpis.avgOptionsPerLane || '3.2'} delta="Multi-carrier routing" />
          </div>

          {/* Global Trade Lane Map Card */}
          <div className="mb-8 rounded-lg2 border border-brand-line bg-brand-navy p-6 shadow-md2 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="font-display text-base font-bold">Global Trade Network Map</h3>
                <p className="text-xs text-slate-400">Primary maritime and air cargo corridors</p>
              </div>
              <span className="rounded-full bg-brand-orangePale px-3 py-1 font-mono text-xs font-bold text-brand-orange">
                LIVE NETWORK
              </span>
            </div>

            {/* SVG Trade Map Visual */}
            <div className="relative my-2 h-64 w-full rounded-md2 bg-brand-navy2 p-4 border border-white/10 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 800 300">
                <path d="M 150 160 Q 300 80 480 140" fill="none" stroke="#F0692A" strokeWidth="2.5" strokeDasharray="6 4" />
                <path d="M 480 140 Q 600 200 700 120" fill="none" stroke="#2E6DA8" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M 150 160 Q 350 240 600 200" fill="none" stroke="#1B8A56" strokeWidth="2" />
                
                {/* Node Circles */}
                <circle cx="150" cy="160" r="7" fill="#F0692A" />
                <text x="150" y="185" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">INNSA (Mumbai)</text>

                <circle cx="480" cy="140" r="7" fill="#F0692A" />
                <text x="480" y="125" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">AEJEA (Dubai)</text>

                <circle cx="600" cy="200" r="7" fill="#1B8A56" />
                <text x="600" y="225" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">SGSIN (Singapore)</text>

                <circle cx="700" cy="120" r="7" fill="#2E6DA8" />
                <text x="700" y="105" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">NLRTM (Rotterdam)</text>
              </svg>
            </div>
          </div>

          {/* Lane Performance Table */}
          <div className="rounded-lg2 border border-brand-line bg-white shadow-sm2 overflow-hidden">
            <div className="p-6 border-b border-brand-line">
              <h3 className="font-display text-base font-bold text-brand-navy">Lane Performance Metrics</h3>
              <p className="text-xs text-brand-slate">Real-time transit reliability and volume distribution per trade corridor</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-cloud text-brand-slate font-display text-[11px] uppercase tracking-wider border-b border-brand-line">
                    <th className="py-3.5 px-5">Trade Lane</th>
                    <th className="py-3.5 px-5">Region</th>
                    <th className="py-3.5 px-5">Transit Window</th>
                    <th className="py-3.5 px-5">On-Time Performance</th>
                    <th className="py-3.5 px-5">Quarterly Volume</th>
                    <th className="py-3.5 px-5">Network Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/60 font-medium text-brand-navy">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-brand-slate">Loading lane performance…</td>
                    </tr>
                  ) : (
                    lanes.map((l, idx) => (
                      <tr key={idx} className="hover:bg-brand-cloud/70 transition-colors">
                        <td className="py-4 px-5 font-mono font-bold text-brand-marine">{l.lane}</td>
                        <td className="py-4 px-5 text-brand-slate">{l.sub}</td>
                        <td className="py-4 px-5 font-mono">{l.transit}</td>
                        <td className="py-4 px-5">
                          {l.onTimePct != null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-brand-navy">{l.onTimePct}%</span>
                              <div className="h-1.5 w-20 rounded-full bg-brand-cloud overflow-hidden">
                                <div className="h-full bg-brand-success" style={{ width: `${l.onTimePct}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-brand-slateLight">—</span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-mono font-semibold">{l.vol} TEU</td>
                        <td className="py-4 px-5">
                          {l.status === 'ok' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-successBg px-2.5 py-0.5 text-[11px] font-bold text-brand-success">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                            </span>
                          )}
                          {l.status === 'warn' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-warningBg px-2.5 py-0.5 text-[11px] font-bold text-brand-warning">
                              <AlertCircle className="h-3.5 w-3.5" /> High Congestion
                            </span>
                          )}
                          {l.status === 'no_data' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-cloud px-2.5 py-0.5 text-[11px] font-bold text-brand-slate">
                              No Data
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}

function KpiCard({ label, value, delta, deltaType }) {
  return (
    <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
      <div className="text-[11px] font-semibold text-brand-slate uppercase tracking-wide">{label}</div>
      <div className="font-display text-[26px] font-bold text-brand-navy my-1">{value}</div>
      <div className={`text-xs font-semibold ${
        deltaType === 'up' ? 'text-brand-success' : deltaType === 'down' ? 'text-brand-danger' : 'text-brand-slate'
      }`}>
        {delta}
      </div>
    </div>
  )
}
