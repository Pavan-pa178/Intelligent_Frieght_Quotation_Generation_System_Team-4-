import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, ArrowRight } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { fetchQuotes } from '../lib/api'

export default function Quotes() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [laneFilter, setLaneFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    fetchQuotes().then((res) => {
      setQuotes(res || [])
      setLoading(false)
    })
  }, [])

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch =
        !search ||
        q.id.toLowerCase().includes(search.toLowerCase()) ||
        q.customer.toLowerCase().includes(search.toLowerCase()) ||
        q.laneName.toLowerCase().includes(search.toLowerCase()) ||
        q.laneCode.toLowerCase().includes(search.toLowerCase())

      const matchLane = laneFilter === 'All' || q.region === laneFilter
      const matchMode = modeFilter === 'All' || q.mode.toLowerCase().includes(modeFilter.toLowerCase())
      const matchStatus = statusFilter === 'All' || q.status.toLowerCase() === statusFilter.toLowerCase()

      return matchSearch && matchLane && matchMode && matchStatus
    })
  }, [quotes, search, laneFilter, modeFilter, statusFilter])

  return (
    <>
      <PageBanner
        crumb="Quotations"
        title="Quotations Workbench"
        subtitle="Manage, filter and review calculated freight quotations across global trade lanes."
        icon={FileText}
      />
      
      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 mb-7 md:grid-cols-4">
            <KpiCard label="Quotes loaded" value={quotes.length.toString()} delta="Active in system" deltaType="up" />
            <KpiCard label="Ocean FCL quotes" value={quotes.filter(q => q.mode?.toLowerCase().includes('ocean')).length.toString()} delta="Ocean transport" deltaType="up" />
            <KpiCard label="Air Freight quotes" value={quotes.filter(q => q.mode?.toLowerCase().includes('air')).length.toString()} delta="Air express transport" />
            <KpiCard label="Calculated routes" value={(quotes.length * 3).toString()} delta="3 options per quote" deltaType="up" />
          </div>

          {/* Table Container */}
          <div className="rounded-lg2 border border-brand-line bg-white shadow-sm2 overflow-hidden">
            
            {/* Filters bar */}
            <div className="p-6 border-b border-brand-line bg-white">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Quote no, customer, lane…"
                    className="w-full rounded-[10px] border-[1.5px] border-brand-line pl-10 pr-4 py-2.5 text-xs font-medium text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <select
                  value={laneFilter}
                  onChange={(e) => setLaneFilter(e.target.value)}
                  className="rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs font-medium bg-white text-brand-navy focus:border-brand-marine"
                >
                  <option value="All">All lanes</option>
                  <option value="Asia–Europe">Asia–Europe</option>
                  <option value="Middle East">Middle East</option>
                  <option value="Intra-Asia">Intra-Asia</option>
                </select>

                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs font-medium bg-white text-brand-navy focus:border-brand-marine"
                >
                  <option value="All">All modes</option>
                  <option value="ocean">Ocean FCL</option>
                  <option value="air">Air Freight</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs font-medium bg-white text-brand-navy focus:border-brand-marine"
                >
                  <option value="All">All statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="No routing">No routing</option>
                </select>

                <button
                  type="button"
                  onClick={() => { setSearch(''); setLaneFilter('All'); setModeFilter('All'); setStatusFilter('All') }}
                  className="rounded-[10px] border-[1.5px] border-brand-line px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-brand-cloud"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ship')}
                  className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2.5 text-xs font-semibold text-white shadow-xs"
                >
                  <Plus className="h-4 w-4" /> New enquiry
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-cloud text-brand-slate font-display text-[11px] uppercase tracking-wider border-b border-brand-line">
                    <th className="py-3.5 px-5">Quote no</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Lane</th>
                    <th className="py-3.5 px-5">Mode</th>
                    <th className="py-3.5 px-5">Basis</th>
                    <th className="py-3.5 px-5">Transit</th>
                    <th className="py-3.5 px-5">Indicative total</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Created</th>
                    <th className="py-3.5 px-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line/60 font-medium text-brand-navy">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-brand-slate">Loading quotations…</td>
                    </tr>
                  ) : filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-brand-slate">No quotes found matching criteria.</td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => (
                      <tr key={q.id} className="hover:bg-brand-cloud/70 transition-colors">
                        <td className="py-4 px-5 font-mono font-bold text-brand-marine">{q.id}</td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-brand-navy">{q.customer}</div>
                          <div className="text-[11px] text-brand-slateLight">{q.city}</div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-mono font-semibold text-brand-navy">{q.laneCode}</div>
                          <div className="text-[11px] text-brand-slateLight">{q.laneName}</div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                            q.modeKey === 'air' ? 'bg-brand-orangePale text-brand-orange' : 'bg-brand-marinePale text-brand-marine'
                          }`}>
                            {q.mode}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono">{q.basis}</td>
                        <td className="py-4 px-5">{q.transit}</td>
                        <td className="py-4 px-5 font-mono font-bold text-brand-navy">
                          {q.indicativeTotal ? `₹ ${q.indicativeTotal.toLocaleString('en-IN')}` : 'Not serviced'}
                        </td>
                        <td className="py-4 px-5">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="py-4 px-5 text-brand-slateLight">{q.created}</td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => navigate(`/quotes/${q.id}`)}
                            className="rounded-lg border-[1.5px] border-brand-line bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-navy hover:border-brand-marine shadow-xs"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between p-5 border-t border-brand-line text-xs text-brand-slate">
              <span>Showing 1–{filteredQuotes.length} of {quotes.length}</span>
              <div className="flex gap-2">
                <button className="rounded-lg border border-brand-line px-3.5 py-1.5 hover:bg-brand-cloud disabled:opacity-40" disabled>← Prev</button>
                <button className="rounded-lg border border-brand-line px-3.5 py-1.5 hover:bg-brand-cloud disabled:opacity-40" disabled>Next →</button>
              </div>
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
