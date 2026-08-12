import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Phone, Calendar, Plus, Search, Package, ArrowRight, Ship, Plane, Truck, Inbox } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

export default function Portal() {
  const { loggedIn, user, shipments = [], loginDemo, logout } = useApp()
  const navigate = useNavigate()
  const toast = useToast()

  const safeShipments = Array.isArray(shipments) ? shipments : []

  return (
    <>
      <PageBanner crumb="Customer Portal" title="Customer Portal" subtitle="Your profile, shipment history and account tools in one place." icon={Package} />
      <section className="pt-14 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          {!loggedIn || !user ? (
            <div className="mx-auto max-w-[460px] rounded-lg2 border border-brand-line bg-white px-9 py-11 text-center shadow-sm2">
              <div className="mx-auto mb-5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-brand-marinePale text-brand-marine">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="mb-2.5 text-[21px]">Sign in to view your portal</h3>
              <p className="mb-[26px] text-[14.5px] text-brand-slate">Log in to see your profile, active shipments and shipping history.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => navigate('/login')} className="rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-6 py-3.5 text-[14.5px] font-semibold text-white">
                  Log in
                </button>
                <button onClick={() => loginDemo()} className="rounded-[10px] border-[1.5px] border-brand-line bg-white px-6 py-3.5 text-[14.5px] font-semibold shadow-sm2">
                  Try demo account
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[340px_1fr]">
              {/* PROFILE */}
              <div className="sticky top-[92px] rounded-lg2 border border-brand-line bg-white p-[30px]">
                <div className="mb-[22px] border-b border-brand-line pb-6 text-center">
                  <div className="mx-auto mb-3.5 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-brand-marine to-brand-navy font-display text-[26px] font-bold text-white">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <h3 className="mb-1 text-lg">{user?.name || user?.email || 'User'}</h3>
                  <p className="text-[13px] text-brand-slate">{user?.company || 'Company'}</p>
                </div>
                <div className="mb-[22px] space-y-3">
                  <MetaRow icon={Mail} text={user?.email || '—'} />
                  <MetaRow icon={Phone} text={user?.phone || '+91 98765 43210'} />
                  <MetaRow icon={Calendar} text={`Member since ${user?.since || '2026'}`} />
                </div>
                <div className="mb-[22px] grid grid-cols-2 gap-2.5">
                  <StatBox n={safeShipments.length} label="Shipments" />
                  <StatBox n={safeShipments.filter((s) => s?.status !== 'Delivered').length} label="Active" />
                </div>
                <button onClick={() => toast('Profile details saved')} className="mb-2.5 w-full rounded-lg border-[1.5px] border-brand-line bg-white py-2.5 text-[13.5px] font-semibold shadow-sm2">Edit profile</button>
                <button onClick={() => { logout(); navigate('/') }} className="w-full rounded-lg py-2.5 text-[13.5px] font-semibold text-brand-marine hover:bg-brand-marinePale">Log out</button>
              </div>

              {/* SHIPMENTS + QUICK ACTIONS */}
              <div>
                <div className="mb-[22px] rounded-lg2 border border-brand-line bg-white p-[30px]">
                  <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[18.5px]">Recent shipments</h3>
                    <button onClick={() => navigate('/ship')} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2.5 text-[13.5px] font-semibold text-white">
                      <Plus className="h-4 w-4" /> New shipment
                    </button>
                  </div>
                  
                  {/* Empty state for new users */}
                  {safeShipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-line p-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cloud text-brand-slate">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <h4 className="mb-1 text-base font-semibold text-slate-800">No shipments booked yet</h4>
                      <p className="mb-5 text-xs text-brand-slate">You haven't booked any shipments under this account. Create your first quote enquiry to get started.</p>
                      <button
                        onClick={() => navigate('/ship')}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-navy/90"
                      >
                        <Plus className="h-4 w-4" /> Book Your First Shipment
                      </button>
                    </div>
                  ) : (
                    <div>
                      {safeShipments.map((s, idx) => {
                        const serviceStr = String(s?.service || '')
                        const costVal = Number(s?.cost || 0)
                        return (
                          <button
                            key={s?.tn || idx}
                            onClick={() => navigate(`/tracking?tn=${s?.tn || ''}`)}
                            className="flex w-full flex-wrap items-center gap-4 border-b border-brand-line py-4 text-left last:border-0 hover:bg-brand-cloud"
                          >
                            <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[10px] bg-brand-marinePale text-brand-marine">
                              {serviceStr.includes('Ocean') ? <Ship className="h-5 w-5" /> : serviceStr.includes('Air') ? <Plane className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-[14.5px] font-semibold">
                                {s?.from || 'Origin'} <ArrowRight className="h-3.5 w-3.5 text-brand-slateLight" /> {s?.to || 'Destination'}
                              </div>
                              <div className="mt-1 font-mono text-xs text-brand-slateLight">{s?.tn || '—'} · {s?.date || 'Today'}</div>
                            </div>
                            <div className="ml-14 flex-shrink-0 text-right sm:ml-0">
                              <StatusBadge status={s?.status || 'Booked'} />
                              <div className="mt-1 font-mono text-[14.5px] font-semibold">₹{costVal.toLocaleString('en-IN')}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-lg2 border border-brand-line bg-white p-[30px]">
                  <h3 className="mb-[22px] text-[18.5px]">Quick actions</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <QuickAction icon={Search} title="Track a shipment" desc="Check live status" onClick={() => navigate('/tracking')} />
                    <QuickAction icon={Mail} title="Contact support" desc="Talk to your manager" onClick={() => navigate('/contact')} />
                    <QuickAction icon={Package} title="Download invoices" desc="Billing history" onClick={() => toast('Invoices are generated after delivery')} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function MetaRow({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px]">
      <Icon className="h-4 w-4 flex-shrink-0 text-brand-marineLight" /> {text}
    </div>
  )
}

function StatBox({ n, label }) {
  return (
    <div className="rounded-[10px] bg-brand-cloud p-3.5 text-center">
      <div className="font-display text-xl font-bold">{n}</div>
      <div className="mt-0.5 text-[10.5px] uppercase tracking-wide text-brand-slate">{label}</div>
    </div>
  )
}

function QuickAction({ icon: Icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="rounded-md2 border border-brand-line bg-white p-6 text-left transition-all hover:-translate-y-1 hover:shadow-md2">
      <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-marinePale text-brand-marine">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-[15px]">{title}</h3>
      <p className="text-[13px] text-brand-slate">{desc}</p>
    </button>
  )
}
