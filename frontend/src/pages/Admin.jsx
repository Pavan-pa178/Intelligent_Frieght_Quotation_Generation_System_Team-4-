import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Route, FileText, Package, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle, DollarSign, Ship, Plane, Truck, RefreshCw, Eye } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { fetchAllQuotes, fetchShipments } from '../lib/api'
import { routeAnalytics } from '../lib/mockData'

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'routes', label: 'Route Management', icon: Route },
  { key: 'quotes', label: 'Quotes', icon: FileText },
  { key: 'shipments', label: 'Shipments', icon: Package },
]

function AgentReviewBadge({ review }) {
  if (!review || review.status === 'pending' || !review.status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> Pending
      </span>
    )
  }
  if (review.status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 border border-red-200">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  )
}

const MOCK_ROUTES = [
  { id: 'R001', origin: 'INNSA', dest: 'AEJEA', lane: 'Mumbai -> Dubai', mode: 'Ocean FCL', carriers: 4, transit: '6-10 d', vol: 412, onTime: 96, active: true },
  { id: 'R002', origin: 'INNSA', dest: 'NLRTM', lane: 'Mumbai -> Rotterdam', mode: 'Ocean FCL', carriers: 3, transit: '24-28 d', vol: 318, onTime: 93, active: true },
  { id: 'R003', origin: 'BOM', dest: 'DXB', lane: 'Mumbai -> Dubai', mode: 'Air Freight', carriers: 5, transit: '5-7 d', vol: 142, onTime: 97, active: true },
  { id: 'R004', origin: 'INNSA', dest: 'SGSIN', lane: 'Mumbai -> Singapore', mode: 'Ocean LCL', carriers: 3, transit: '11-16 d', vol: 276, onTime: 98, active: true },
  { id: 'R005', origin: 'MAA', dest: 'DEHAM', lane: 'Chennai -> Hamburg', mode: 'Ocean FCL', carriers: 2, transit: '26-31 d', vol: 184, onTime: 91, active: false },
  { id: 'R006', origin: 'INNSA', dest: 'PECLL', lane: 'Mumbai -> Callao', mode: 'Ocean FCL', carriers: 1, transit: 'TBD', vol: 6, onTime: null, active: false },
]

export default function Admin() {
  const { user, loggedIn } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [quotes, setQuotes] = useState([])
  const [shipments, setShipments] = useState([])
  const [routes, setRoutes] = useState(MOCK_ROUTES)
  const [loading, setLoading] = useState(true)
  const [quoteSearch, setQuoteSearch] = useState('')
  const [shipSearch, setShipSearch] = useState('')

  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [q, s] = await Promise.all([
        fetchAllQuotes(),
        fetchShipments(''),
      ])
      setQuotes(Array.isArray(q) ? q : [])
      setShipments(Array.isArray(s) ? s : [])
    } catch {
      toast('Could not load data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  if (!loggedIn || !isAdmin) {
    return (
      <>
        <PageBanner crumb="Admin" title="Admin Panel" subtitle="System management and operations dashboard." icon={LayoutDashboard} />
        <section className="pt-14 pb-20">
          <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
            <div className="mx-auto max-w-[460px] rounded-2xl border border-brand-line bg-white px-9 py-11 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-brand-navy">Admin Access Required</h3>
              <p className="mb-2 text-sm text-brand-slate">This area is restricted to PORTLINE administrators.</p>
              <p className="mb-6 font-mono text-xs text-brand-slateLight">Login: admin@portline.in / admin123</p>
              <button onClick={() => navigate('/login')} className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:bg-brand-marine">
                Log in as Admin
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  const totalRevenue = quotes.reduce((s, q) => s + (Number(q.indicativeTotal) || 0), 0)
  const pendingCount = quotes.filter(q => !q.agent_review || q.agent_review.status === 'pending').length

  const filteredQuotes = quotes.filter(q => {
    if (!quoteSearch) return true
    const s = quoteSearch.toLowerCase()
    return (q.id || '').toLowerCase().includes(s) || (q.customer || '').toLowerCase().includes(s) || (q.laneName || '').toLowerCase().includes(s)
  })

  const filteredShipments = shipments.filter(s => {
    if (!shipSearch) return true
    const q = shipSearch.toLowerCase()
    return (s.tn || '').toLowerCase().includes(q) || (s.from || '').toLowerCase().includes(q) || (s.to || '').toLowerCase().includes(q)
  })

  return (
    <>
      <PageBanner crumb="Admin" title="Admin Panel" subtitle="System management, route operations, and agent activity dashboard." icon={LayoutDashboard} />

      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">

          {/* Tab Bar */}
          <div className="mb-8 flex flex-wrap gap-2 rounded-xl border border-brand-line bg-white p-1.5 shadow-sm">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-brand-navy text-white shadow-sm' : 'text-brand-slate hover:text-brand-navy hover:bg-brand-cloud'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
            <div className="ml-auto flex items-center">
              <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud hover:text-brand-navy">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard icon={FileText} label="Total Quotes" value={quotes.length} colorClass="bg-blue-50 text-blue-600" />
                <KpiCard icon={Package} label="Total Shipments" value={shipments.length} colorClass="bg-emerald-50 text-emerald-600" />
                <KpiCard icon={Clock} label="Pending Agent Review" value={pendingCount} colorClass="bg-amber-50 text-amber-600" />
                <KpiCard icon={DollarSign} label="Total Pipeline" value={`Rs.${(totalRevenue / 100000).toFixed(1)}L`} colorClass="bg-violet-50 text-violet-600" />
              </div>

              <div className="rounded-xl border border-brand-line bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-brand-navy">Route Performance</h3>
                  <button onClick={() => setActiveTab('routes')} className="flex items-center gap-1 text-xs font-semibold text-brand-marine hover:underline">
                    Manage routes <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-line">
                        {['Lane', 'Category', 'Transit', 'On-time %', 'Volume'].map(h => (
                          <th key={h} className="pb-3 pr-6 font-semibold text-brand-slate text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {routeAnalytics.lanePerformance.map((r, i) => (
                        <tr key={i} className="border-b border-brand-line/50 hover:bg-brand-cloud/40">
                          <td className="py-3 pr-6">
                            <div className="font-mono text-xs font-semibold text-brand-marine">{r.lane}</div>
                          </td>
                          <td className="py-3 pr-6 text-xs text-brand-slate">{r.sub}</td>
                          <td className="py-3 pr-6 font-mono text-xs">{r.transit}</td>
                          <td className="py-3 pr-6">
                            {r.onTimePct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-brand-line overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.onTimePct}%` }} />
                                </div>
                                <span className="font-mono text-xs font-semibold">{r.onTimePct}%</span>
                              </div>
                            ) : <span className="text-xs text-brand-slateLight">No data</span>}
                          </td>
                          <td className="py-3 font-mono text-xs">{r.vol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="rounded-xl border border-brand-line bg-white">
              <div className="flex items-center justify-between border-b border-brand-line px-6 py-4">
                <h3 className="text-lg font-bold text-brand-navy">Route Management</h3>
                <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-slate">{routes.length} routes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50">
                      {['Route ID', 'Lane', 'Mode', 'Carriers', 'Transit', 'On-time', 'Volume', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(route => (
                      <tr key={route.id} className="border-b border-brand-line/50 hover:bg-brand-cloud/30">
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-brand-marine">{route.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-brand-navy text-[13px]">{route.lane}</div>
                          <div className="font-mono text-[11px] text-brand-slateLight">{route.origin} to {route.dest}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-slate">
                            {route.mode.includes('Air') ? <Plane className="h-3.5 w-3.5" /> : route.mode.includes('Ground') ? <Truck className="h-3.5 w-3.5" /> : <Ship className="h-3.5 w-3.5" />}
                            {route.mode}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">{route.carriers}</td>
                        <td className="px-5 py-4 font-mono text-xs">{route.transit}</td>
                        <td className="px-5 py-4">
                          {route.onTime ? (
                            <span className={`font-mono text-xs font-semibold ${route.onTime >= 95 ? 'text-emerald-600' : route.onTime >= 90 ? 'text-amber-600' : 'text-red-500'}`}>
                              {route.onTime}%
                            </span>
                          ) : <span className="text-xs text-brand-slateLight">N/A</span>}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">{route.vol}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => {
                              setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, active: !r.active } : r))
                              toast(`Route ${route.id} ${route.active ? 'deactivated' : 'activated'}`)
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors border ${route.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'}`}
                          >
                            {route.active ? '● Active' : '○ Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUOTES TAB */}
          {activeTab === 'quotes' && (
            <div className="rounded-xl border border-brand-line bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b border-brand-line px-6 py-4">
                <h3 className="text-lg font-bold text-brand-navy">All Quotations</h3>
                <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-slate">{filteredQuotes.length}</span>
                <input
                  value={quoteSearch}
                  onChange={e => setQuoteSearch(e.target.value)}
                  placeholder="Search ID, customer, lane..."
                  className="ml-auto rounded-lg border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50">
                      {['Quote ID', 'Customer', 'Lane', 'Mode', 'Amount', 'Status', 'Assigned Agent', 'Agent Decision'].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map(q => (
                      <tr key={q.id} className="border-b border-brand-line/50 hover:bg-brand-cloud/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-marine whitespace-nowrap">{q.id}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-brand-navy">{q.customer || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-brand-slate">{q.laneCode || 'N/A'}</div>
                          <div className="text-[11px] text-brand-slateLight">{q.laneName || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-brand-slate whitespace-nowrap">{q.mode || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy whitespace-nowrap">
                          {q.indicativeTotal ? `Rs.${Number(q.indicativeTotal).toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={q.status || 'Draft'} />
                        </td>
                        <td className="px-4 py-3 text-[11px] text-brand-slate">
                          {q.assigned_agent ? <span className="font-mono">{q.assigned_agent}</span> : <span className="text-brand-slateLight italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <AgentReviewBadge review={q.agent_review} />
                            {q.agent_review?.comment && (
                              <div className="mt-1 max-w-[200px] truncate text-[10px] text-brand-slateLight italic">"{q.agent_review.comment}"</div>
                            )}
                            {q.agent_review?.reviewed_at && (
                              <div className="mt-0.5 text-[10px] text-brand-slateLight">{new Date(q.agent_review.reviewed_at).toLocaleDateString()}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/quotes/${q.id}`)} className="flex items-center gap-1 text-xs font-semibold text-brand-marine hover:underline">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredQuotes.length === 0 && (
                      <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-brand-slateLight">No quotes found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SHIPMENTS TAB */}
          {activeTab === 'shipments' && (
            <div className="rounded-xl border border-brand-line bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b border-brand-line px-6 py-4">
                <h3 className="text-lg font-bold text-brand-navy">All Shipments</h3>
                <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-slate">{filteredShipments.length}</span>
                <input
                  value={shipSearch}
                  onChange={e => setShipSearch(e.target.value)}
                  placeholder="Search tracking #, origin, destination..."
                  className="ml-auto rounded-lg border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50">
                      {['Tracking #', 'Route', 'Service', 'Weight', 'Cost', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map((s, i) => (
                      <tr key={s.tn || i} className="border-b border-brand-line/50 hover:bg-brand-cloud/30">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-marine">{s.tn || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-brand-navy">{s.from} to {s.to}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-brand-slate">{s.service || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.weight ? `${Number(s.weight).toLocaleString()} kg` : 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">
                          {s.cost ? `Rs.${Number(s.cost).toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-xs text-brand-slate">{s.date || 'N/A'}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status || 'Booked'} /></td>
                      </tr>
                    ))}
                    {filteredShipments.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-brand-slateLight">No shipments found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </section>
    </>
  )
}

function KpiCard({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="rounded-xl border border-brand-line bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-2xl font-bold text-brand-navy">{value}</div>
      <div className="mt-1 text-xs font-medium text-brand-slate">{label}</div>
    </div>
  )
}
