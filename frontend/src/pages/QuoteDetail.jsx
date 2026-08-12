import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FileText, ArrowLeft, Ship, Check, ShieldCheck } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { fetchQuoteById } from '../lib/api'

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuoteById(id).then((res) => {
      setQuote(res)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="py-20 text-center text-brand-slate">
        <p>Loading quotation details…</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-xl font-bold text-brand-navy">Quote not found</h3>
        <button onClick={() => navigate('/quotes')} className="mt-4 rounded-lg bg-brand-navy px-5 py-2 text-white">Back to quotes</button>
      </div>
    )
  }

  const d = quote.details || {}
  const routes = d.routes || []

  return (
    <>
      <PageBanner
        crumb={`Quotations / ${quote.id}`}
        title={`${quote.customer} · ${quote.laneName}`}
        subtitle={`Quotation ${quote.id} · ${quote.mode} (${quote.basis})`}
        icon={FileText}
      />

      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <button onClick={() => navigate('/quotes')} className="inline-flex items-center gap-2 text-xs font-semibold text-brand-slate hover:text-brand-navy">
              <ArrowLeft className="h-4 w-4" /> Back to Quotations
            </button>
            <div className="flex items-center gap-3">
              <StatusBadge status={quote.status} />
              <span className="font-mono text-xs text-brand-slateLight">Generated {quote.created}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">

            {/* LEFT DETAILS */}
            <div className="space-y-8">

              {/* Route Map Card */}
              <div className="rounded-lg2 border border-brand-line bg-brand-navy p-6 shadow-md2 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-brand-orangeLight" />
                    <span className="font-mono text-sm font-bold">{quote.laneCode}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-300">{quote.transit}</span>
                </div>

                {/* SVG Route Map Visual */}
                <div className="relative my-4 h-48 w-full rounded-md2 bg-brand-navy2 p-4 border border-white/10 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 600 180">
                    <path d="M 80 90 Q 300 20 520 90" fill="none" stroke="#2E6DA8" strokeWidth="2.5" strokeDasharray="6 4" />
                    <path d="M 80 90 Q 300 150 520 90" fill="none" stroke="#F0692A" strokeWidth="3" />
                    <circle cx="80" cy="90" r="8" fill="#F0692A" />
                    <circle cx="520" cy="90" r="8" fill="#1B8A56" />
                    <text x="80" y="130" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{d.originGw?.city || 'Origin'}</text>
                    <text x="520" y="130" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{d.destGw?.city || 'Destination'}</text>
                  </svg>
                </div>
              </div>

              {/* Ranked Route Options */}
              <div>
                <h3 className="mb-4 text-lg font-bold text-brand-navy">Recommended Route Options ({routes.length})</h3>
                <div className="space-y-4">
                  {routes.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className={`rounded-lg2 border-[1.5px] p-6 bg-white shadow-sm2 transition-all ${
                        r.recommended ? 'border-brand-orange shadow-md2 ring-2 ring-brand-orange/20' : 'border-brand-line'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-bold text-brand-navy">{r.carrier}</span>
                            {r.recommended && (
                              <span className="rounded-full bg-brand-orangePale px-2.5 py-0.5 font-mono text-[10px] font-bold text-brand-orange">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-brand-slate mt-0.5">{r.serviceName} · {r.sailingFrequency}</div>
                        </div>

                        <div className="text-right">
                          <div className="font-display text-xl font-bold text-brand-navy">₹ {r.cost.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] font-bold text-brand-orangeLight font-mono">◆ INDICATIVE</div>
                        </div>
                      </div>

                      {/* Score breakdown bars */}
                      {r.scores && (
                        <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                          <ScoreBar label="Transit score" val={r.scores.transit} />
                          <ScoreBar label="Cost score" val={r.scores.cost} />
                          <ScoreBar label="Reliability" val={r.scores.reliability} />
                          <ScoreBar label="Congestion" val={r.scores.congestion} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Transit Breakdown */}
              {d.transitBreakdown && (
                <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                  <h3 className="mb-4 text-base font-bold text-brand-navy">Transit Breakdown & Dwell Times</h3>
                  <div className="divide-y divide-brand-line/60">
                    {d.transitBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-3 text-xs font-medium text-brand-navy">
                        <span className="text-brand-slate">{item.label}</span>
                        <span className="font-mono font-semibold">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-6">
              
              {/* Quote Summary Box */}
              <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                <h3 className="mb-4 text-base font-bold text-brand-navy">Quotation Details</h3>
                
                <div className="space-y-3 text-xs">
                  <DetailRow label="Customer" val={quote.customer} />
                  <DetailRow label="Commodity" val={d.commodity || 'General Cargo'} />
                  {d.hsCode && <DetailRow label="HS Code" val={d.hsCode} mono />}
                  <DetailRow label="Gross weight" val={`${(d.grossWeightKg || quote.indicativeTotal).toLocaleString()} kg`} />
                  <DetailRow label="Mode" val={quote.mode} />
                  <DetailRow label="Basis" val={quote.basis} />
                </div>

                <div className="mt-6 border-t border-brand-line pt-4">
                  <div className="text-[11px] font-semibold text-brand-slate uppercase">Indicative Total</div>
                  <div className="font-display text-2xl font-bold text-brand-navy mt-1">
                    ₹ {quote.indicativeTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                <h4 className="mb-3 text-xs font-bold text-brand-navy uppercase tracking-wider">Data Verification</h4>
                <div className="space-y-2.5 text-xs text-brand-slate">
                  <CheckItem text="Gateway masterdata verified" />
                  <CheckItem text="Distance model calculated" />
                  <CheckItem text="Volume divisor applied" />
                  <CheckItem text="Route intelligence score generated" />
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>
    </>
  )
}

function ScoreBar({ label, val }) {
  const pct = Math.round((val || 0) * 100)
  return (
    <div>
      <div className="flex justify-between text-[11px] text-brand-slate mb-1">
        <span>{label}</span>
        <span className="font-mono font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-brand-cloud overflow-hidden">
        <div className="h-full bg-gradient-to-r from-brand-marine to-brand-orange" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DetailRow({ label, val, mono }) {
  return (
    <div className="flex justify-between border-b border-brand-line/60 pb-2">
      <span className="text-brand-slate">{label}</span>
      <span className={`font-semibold text-brand-navy ${mono ? 'font-mono' : ''}`}>{val}</span>
    </div>
  )
}

function CheckItem({ text }) {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-brand-success flex-shrink-0" />
      <span>{text}</span>
    </div>
  )
}
