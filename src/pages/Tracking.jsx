import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Search, AlertTriangle, Check, Clock } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'

export default function Tracking() {
  const { findShipment } = useApp()
  const [params] = useSearchParams()
  const [input, setInput] = useState('')
  const [result, setResult] = useState(undefined) 
  const [loading, setLoading] = useState(false)

  const runSearch = async (tn) => {
    if (!tn?.trim()) return
    setLoading(true)
    const found = await findShipment(tn)
    setResult(found || null)
    setLoading(false)
  }

  useEffect(() => {
    const prefill = params.get('tn')
    if (prefill) {
      setInput(prefill)
      runSearch(prefill)
    }
    
  }, [])

  return (
    <>
      <PageBanner crumb="Tracking" title="Track your shipment" subtitle="Enter your tracking number for live status, checkpoint history and estimated arrival." extraPadding icon={Search} />

      <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
        <div className="relative z-10 -mt-[70px] mx-auto max-w-[680px] rounded-lg2 bg-white p-8 shadow-md2">
          <form
            onSubmit={(e) => { e.preventDefault(); runSearch(input) }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-slateLight" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="text"
                placeholder="e.g. PORT-58213-IN"
                autoComplete="off"
                className="w-full rounded-[10px] border-[1.5px] border-brand-line py-3.5 pl-[46px] pr-4 font-mono text-[15px] transition-colors focus:border-brand-marine focus:outline-none"
              />
            </div>
            <button type="submit" className="rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-6 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)]">
              Track
            </button>
          </form>
          <div className="mt-3.5 text-[12.5px] text-brand-slate">
            New here? Try{' '}
            <button onClick={() => { setInput('PORT-58213-IN'); runSearch('PORT-58213-IN') }} className="font-mono font-semibold text-brand-marine underline underline-offset-2">
              PORT-58213-IN
            </button>{' '}
            or{' '}
            <button onClick={() => { setInput('PORT-91177-IN'); runSearch('PORT-91177-IN') }} className="font-mono font-semibold text-brand-marine underline underline-offset-2">
              PORT-91177-IN
            </button>
          </div>
        </div>

        {loading && <p className="mt-10 text-center text-brand-slate">Searching…</p>}

        {!loading && result && <TrackResult shipment={result} />}

        {!loading && result === null && (
          <div className="mx-auto my-14 max-w-[480px] text-center text-brand-slate">
            <AlertTriangle className="mx-auto mb-[18px] h-11 w-11 text-brand-slateLight" />
            <h3 className="mb-2 text-[17px] font-semibold text-brand-navy">No shipment found</h3>
            <p>Double-check the tracking number and try again — it should look like PORT-XXXXX-XX.</p>
          </div>
        )}
        <div className="h-20" />
      </div>
    </>
  )
}

function TrackResult({ shipment }) {
  const doneCount = shipment.steps.filter((s) => s.done).length
  const pct = Math.round(((doneCount - 0.5) / shipment.steps.length) * 100)

  return (
    <div className="mx-auto mt-12 max-w-[820px]">
      <div className="mb-9 flex flex-wrap justify-between gap-5 rounded-md2 border border-brand-line bg-white p-7">
        <Info label="Tracking number" value={shipment.tn} mono />
        <Info label="Route" value={`${shipment.from} → ${shipment.to}`} />
        <Info label="Service" value={shipment.service} />
        <Info label="Weight" value={`${shipment.weight} kg`} />
        <div className="min-w-[130px]">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-slateLight">Status</div>
          <StatusBadge status={shipment.status} />
        </div>
      </div>

      <div className="relative pl-2">
        <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-brand-line">
          <div className="w-full rounded-full bg-brand-orange transition-[height] duration-1000" style={{ height: `${pct}%` }} />
        </div>
        {shipment.steps.map((step, i) => (
          <div key={i} className="relative flex gap-5 pb-[34px] last:pb-0">
            <div
              className={`z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                step.current
                  ? 'border-brand-orange bg-brand-orange text-white ring-[6px] ring-brand-orangePale'
                  : step.done
                  ? 'border-brand-orange bg-brand-orangePale text-brand-orange'
                  : 'border-brand-line bg-white text-brand-slateLight'
              }`}
            >
              {step.done ? <Check className="h-[18px] w-[18px]" /> : <Clock className="h-[18px] w-[18px]" />}
            </div>
            <div className="pt-1.5">
              <h4 className="mb-0.5 text-[15px] font-semibold">{step.label}</h4>
              <p className="text-[13px] text-brand-slate">{step.loc}</p>
              <div className="mt-1 font-mono text-[11.5px] text-brand-slateLight">{step.ts}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Info({ label, value, mono }) {
  return (
    <div className="min-w-[130px]">
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-slateLight">{label}</div>
      <div className={`text-[15.5px] font-semibold ${mono ? 'font-mono' : 'font-display'}`}>{value}</div>
    </div>
  )
}
