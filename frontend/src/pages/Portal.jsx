import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Phone, Calendar, Plus, Search, Package, ArrowRight, Ship, Plane, Truck, Inbox, XCircle, AlertTriangle, CheckCircle2, RefreshCw, X, User, Building, Key, ShieldCheck, Trash2, FileText, IndianRupee, Check, ThumbsUp, ThumbsDown, ExternalLink, Clock, Tag } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { updateUserProfile, fetchQuotes, customerDecisionOnQuote, resolveEffectiveQuoteStatus, resolveEffectiveShipmentStatus, resolveEffectiveShipmentCost, sortQuotesByTime } from '../lib/api'

export default function Portal() {
  const { loggedIn, user, shipments = [], logout, cancelShipment, deleteShipment, updateProfile } = useApp()
  const navigate = useNavigate()
  const toast = useToast()

  const [portalTab, setPortalTab] = useState('shipments') // 'shipments' | 'quotes'
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quotes, setQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(true)
  const [quoteDecisionLoading, setQuoteDecisionLoading] = useState(null)

  const loadPortalQuotes = () => {
    if (user?.email) {
      setQuotesLoading(true)
      fetchQuotes(user.email)
        .then((res) => {
          const list = Array.isArray(res) ? res : []
          setQuotes(sortQuotesByTime(list.map(q => ({
            ...q,
            status: resolveEffectiveQuoteStatus(q)
          }))))
        })
        .catch(err => console.warn('Failed to load quotes for customer portal', err))
        .finally(() => setQuotesLoading(false))
    }
  }

  useEffect(() => {
    loadPortalQuotes()
  }, [user?.email])

  useEffect(() => {
    window.addEventListener('portline_quote_updated', loadPortalQuotes)
    window.addEventListener('portline_shipment_updated', loadPortalQuotes)
    window.addEventListener('storage', loadPortalQuotes)
    return () => {
      window.removeEventListener('portline_quote_updated', loadPortalQuotes)
      window.removeEventListener('portline_shipment_updated', loadPortalQuotes)
      window.removeEventListener('storage', loadPortalQuotes)
    }
  }, [user?.email])

  const handleCustomerQuickDecision = async (e, quoteId, decision, revisedPrice) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setQuoteDecisionLoading(quoteId)
    try {
      const isAccept = decision === 'accepted' || decision === 'accept_revision'
      const note = isAccept ? 'Accepted revised price offer via customer dashboard' : 'Declined revised price offer via customer dashboard'
      const apiDecision = isAccept ? 'accept_revision' : 'declined'
      const res = await customerDecisionOnQuote(quoteId, apiDecision, note, user)
      if (res && (res.ok || res.status)) {
        toast?.(isAccept ? `Quotation ${quoteId} revised offer accepted! Forwarded for agent final approval.` : `Quotation ${quoteId} revised offer declined.`)
        // Update local state
        setQuotes(prev => prev.map(q => {
          if (q.id === quoteId) {
            const newStatus = isAccept ? 'Revised Priced Accepted (Agent Approval Pending)' : 'Revised Price Declined'
            const revPrice = (isAccept && (revisedPrice || q.agent_price_edit?.revised_price)) ? Number(revisedPrice || q.agent_price_edit?.revised_price) : null
            return {
              ...q,
              status: newStatus,
              pipeline_status: isAccept ? 'REVISED_PRICED_ACCEPTED' : 'REVISED_PRICE_DECLINED',
              ...(revPrice ? {
                indicativeTotal: revPrice,
                original_indicative_total: q.original_indicative_total || q.indicativeTotal
              } : {}),
              customer_decision: {
                status: isAccept ? 'ACCEPTED' : 'DECLINED',
                decided_at: new Date().toISOString(),
                is_revised_price: true
              }
            }
          }
          return q
        }))
      } else {
        toast?.('Failed to record price decision')
      }
    } catch (err) {
      console.error(err)
      toast?.('Error recording decision: ' + (err.message || 'Unknown error'))
    } finally {
      setQuoteDecisionLoading(null)
    }
  }

  const revisedQuotesNeedingAction = useMemo(() => {
    return quotes.filter(q => {
      const hasEdit = q.agent_price_edit && Number(q.agent_price_edit.revised_price) > 0
      const decided = Boolean(q.customer_decision?.status) || Boolean(q.customer_decision_at)
      const st = q.status || ''
      const isPendingDecision = st === 'Price Revised (Awaiting Customer Decision)' || (hasEdit && !decided && !st.includes('Accepted') && !st.includes('Declined'))
      return isPendingDecision && !decided
    })
  }, [quotes])
  const [cancelModalShipment, setCancelModalShipment] = useState(null)
  const [cancelReason, setCancelReason] = useState('Customer schedule change')
  const [cancelNotes, setCancelNotes] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const handleOpenEditModal = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setEditError('')

    const trimmedName = (editForm.name || '').trim()
    const trimmedEmail = (editForm.email || '').trim()
    const trimmedCompany = (editForm.company || '').trim()
    const trimmedPhone = (editForm.phone || '').trim()

    if (!trimmedName) {
      setEditError('Please enter your full name.')
      return
    }
    if (!trimmedEmail) {
      setEditError('Please enter a valid email address.')
      return
    }

    if (editForm.newPassword) {
      if (!editForm.oldPassword) {
        setEditError('Please enter your current / old password to set a new password.')
        return
      }
      if (editForm.newPassword.length < 6) {
        setEditError('New password must be at least 6 characters long.')
        return
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        setEditError('New password and confirmation password do not match.')
        return
      }
    }

    setEditLoading(true)
    try {
      const updatedUser = await updateUserProfile({
        current_email: user?.email,
        email: trimmedEmail,
        name: trimmedName,
        company: trimmedCompany,
        phone: trimmedPhone,
        old_password: editForm.oldPassword,
        new_password: editForm.newPassword
      })

      updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        company: trimmedCompany,
        phone: trimmedPhone,
        ...(updatedUser || {})
      })

      toast('Profile updated successfully!')
      setShowEditModal(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update profile. Please verify your old password.')
    } finally {
      setEditLoading(false)
    }
  }

  const safeShipments = Array.isArray(shipments) ? shipments : []

  const activeCount = safeShipments.filter((s) => s?.status !== 'Delivered' && s?.status !== 'Cancelled').length
  const deliveredCount = safeShipments.filter((s) => s?.status === 'Delivered').length
  const cancelledCount = safeShipments.filter((s) => s?.status === 'Cancelled').length

  const filteredShipments = useMemo(() => {
    return safeShipments.filter((s) => {
      if (activeFilter === 'active' && (s?.status === 'Delivered' || s?.status === 'Cancelled')) return false
      if (activeFilter === 'delivered' && s?.status !== 'Delivered') return false
      if (activeFilter === 'cancelled' && s?.status !== 'Cancelled') return false

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const tn = (s?.tn || '').toLowerCase()
        const from = (s?.from || '').toLowerCase()
        const to = (s?.to || '').toLowerCase()
        const service = (s?.service || '').toLowerCase()
        return tn.includes(q) || from.includes(q) || to.includes(q) || service.includes(q)
      }
      return true
    })
  }, [safeShipments, activeFilter, searchQuery])

  const handleConfirmCancel = async () => {
    if (!cancelModalShipment) return
    setCancelling(true)
    const tn = cancelModalShipment.tn || cancelModalShipment.trackingNumber
    const finalReason = cancelReason === 'Other' && cancelNotes.trim() ? cancelNotes.trim() : cancelReason

    try {
      await cancelShipment(tn, finalReason)
      toast('Shipment ' + tn + ' cancelled successfully.')
      setCancelModalShipment(null)
      setCancelNotes('')
    } catch {
      toast('Failed to cancel shipment. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <PageBanner crumb="Customer Portal" title="Customer Portal" subtitle="Manage bookings, cancel active requests, and track your global shipments." icon={Package} />
      <section className="pt-14 pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
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
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[340px_1fr]">
              {/* PROFILE */}
              <div className="sticky top-[92px] rounded-lg2 border border-brand-line bg-white p-[30px] shadow-sm2">
                <div className="mb-[22px] border-b border-brand-line pb-6 text-center">
                  <div className="mx-auto mb-3.5 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-gradient-to-br from-brand-marine to-brand-navy font-display text-[26px] font-bold text-white">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-brand-navy">{user?.name || user?.email || 'User'}</h3>
                  <p className="text-[13px] font-medium text-brand-slate">{user?.company || 'Company'}</p>
                </div>

                <div className="mb-[22px] space-y-3">
                  <MetaRow icon={Mail} text={user?.email || '-'} />
                  <MetaRow icon={Phone} text={user?.phone || '+91 98765 43210'} />
                  <MetaRow icon={Calendar} text={'Member since ' + (user?.since || '2026')} />
                </div>

                <div className="mb-[22px] grid grid-cols-4 gap-1.5">
                  <StatBox n={safeShipments.length} label="Shipments" color="navy" />
                  <StatBox n={activeCount} label="Active" color="marine" />
                  <StatBox n={quotes.length} label="Quotes" color="navy" />
                  <StatBox n={revisedQuotesNeedingAction.length} label="Revisions" color={revisedQuotesNeedingAction.length > 0 ? "rose" : "slate"} />
                </div>

                <button onClick={handleOpenEditModal} className="mb-2.5 w-full rounded-lg border-[1.5px] border-brand-line bg-white py-2.5 text-[13.5px] font-semibold shadow-sm2 hover:bg-brand-cloud transition-colors flex items-center justify-center gap-1.5">
                  <User className="h-4 w-4 text-brand-marine" /> Edit profile
                </button>
                <button onClick={() => { logout(); navigate('/') }} className="w-full rounded-lg py-2.5 text-[13.5px] font-semibold text-brand-marine hover:bg-brand-marinePale transition-colors">
                  Log out
                </button>
              </div>

              {/* MAIN CONTENT AREA */}
              <div>
                {/* ─── ACTION REQUIRED: REVISED FREIGHT TARIFF OFFERS BANNER ─── */}
                {revisedQuotesNeedingAction.length > 0 && (
                  <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 sm:p-6 shadow-md animate-in fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-200">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500 p-2.5 text-white shadow-xs shrink-0 mt-0.5">
                          <IndianRupee className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-amber-950">Action Required: Revised Freight Quotations ({revisedQuotesNeedingAction.length})</h3>
                            <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-400 animate-pulse">
                              Awaiting Your Decision
                            </span>
                          </div>
                          <p className="text-xs text-amber-900 mt-1">
                            Your freight agent has reviewed your shipment requests and submitted revised commercial tariffs with custom price quotes. Review and accept below to secure your booking slots.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {revisedQuotesNeedingAction.map(q => {
                        const originalPrice = Number(q.indicativeTotal || 0)
                        const revisedPrice = Number(q.agent_price_edit?.revised_price || 0)
                        const diffPct = originalPrice > 0 ? Math.round(((revisedPrice - originalPrice) / originalPrice) * 100) : 0
                        const isDiscount = diffPct < 0

                        return (
                          <div key={q.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl bg-white border-2 border-amber-300 p-4 shadow-sm hover:border-amber-400 transition-colors">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs text-brand-navy bg-brand-cloud px-2 py-0.5 rounded border border-brand-line">{q.id}</span>
                                <span className="text-xs font-bold text-brand-navy">{q.laneName || `${q.origin || 'Origin'} → ${q.destination || 'Destination'}`}</span>
                                <span className="rounded-md bg-brand-marinePale px-2 py-0.5 text-[10px] font-bold text-brand-marine uppercase">{q.mode || 'Ocean FCL'}</span>
                                {diffPct !== 0 && (
                                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${isDiscount ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                                    {isDiscount ? `${diffPct}% Discount` : `+${diffPct}% Adjusted`}
                                  </span>
                                )}
                              </div>
                              {q.agent_price_edit?.reason && (
                                <p className="text-xs text-amber-950 bg-amber-50/60 p-2 rounded-lg border border-amber-200/70 italic">
                                  Agent Note: &ldquo;{q.agent_price_edit.reason}&rdquo; <span className="font-semibold text-brand-slate not-italic">— {q.agent_price_edit.agent_name || 'Freight Agent'}</span>
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 shrink-0 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 border-amber-200/60 pt-3 lg:pt-0">
                              <div className="text-left lg:text-right">
                                <div className="text-[10px] font-semibold text-brand-slate line-through">
                                  System: ₹ {originalPrice.toLocaleString('en-IN')}
                                </div>
                                <div className="font-mono text-lg font-bold text-emerald-700">
                                  ₹ {revisedPrice.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] font-semibold text-emerald-800">Revised Tariff Offer</div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={quoteDecisionLoading === q.id}
                                  onClick={(e) => handleCustomerQuickDecision(e, q.id, 'accepted', revisedPrice)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs hover:shadow transition-all disabled:opacity-50"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Accept ₹{revisedPrice.toLocaleString('en-IN')}
                                </button>
                                <button
                                  type="button"
                                  disabled={quoteDecisionLoading === q.id}
                                  onClick={(e) => handleCustomerQuickDecision(e, q.id, 'rejected', revisedPrice)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" /> Decline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/quotes/${q.id}`)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-brand-line bg-white px-3 py-2.5 text-xs font-semibold text-brand-navy hover:bg-brand-cloud transition-colors shadow-2xs"
                                >
                                  Details <ExternalLink className="h-3 w-3 text-brand-slate" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* DASHBOARD TABS: SHIPMENTS VS QUOTATIONS */}
                <div className="mb-5 flex items-center gap-2 border-b border-brand-line pb-2">
                  <button
                    type="button"
                    onClick={() => setPortalTab('shipments')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      portalTab === 'shipments'
                        ? 'bg-brand-navy text-white shadow-xs'
                        : 'text-brand-slate hover:text-brand-navy hover:bg-brand-cloud'
                    }`}
                  >
                    <Package className="h-4 w-4" /> Booked Shipments ({safeShipments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortalTab('quotes')}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      portalTab === 'quotes'
                        ? 'bg-brand-navy text-white shadow-xs'
                        : 'text-brand-slate hover:text-brand-navy hover:bg-brand-cloud'
                    }`}
                  >
                    <FileText className="h-4 w-4" /> My Quotations ({quotes.length})
                    {revisedQuotesNeedingAction.length > 0 && (
                      <span className="rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-[10px] font-extrabold animate-pulse">
                        {revisedQuotesNeedingAction.length} new
                      </span>
                    )}
                  </button>
                </div>

                {/* ─── QUOTATIONS TAB VIEW ─── */}
                {portalTab === 'quotes' && (
                  <div className="mb-[22px] rounded-lg2 border border-brand-line bg-white p-[30px] shadow-sm2 animate-in fade-in">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[20px] font-bold text-brand-navy">My Freight Quotations</h3>
                        <p className="text-xs text-brand-slate mt-0.5">Manage quotation requests, review agent revised tariffs, and book shipments</p>
                      </div>
                      <button onClick={() => navigate('/ship')} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-xs hover:opacity-95 transition-opacity">
                        <Plus className="h-4 w-4" /> Request new quote
                      </button>
                    </div>

                    {quotesLoading ? (
                      <div className="py-12 text-center text-xs text-brand-slate">Loading your quotations…</div>
                    ) : quotes.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-brand-line p-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cloud text-brand-slate">
                          <FileText className="h-6 w-6" />
                        </div>
                        <h4 className="mb-1 text-base font-semibold text-slate-800">No quotations generated yet</h4>
                        <p className="mb-5 text-xs text-brand-slate">You have not submitted any freight quote enquiries yet. Generate an instant rate calculation now.</p>
                        <button
                          onClick={() => navigate('/ship')}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-navy/90"
                        >
                          <Plus className="h-4 w-4" /> Get Instant Quote
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-brand-line/60">
                        {quotes.map((q) => {
                          const hasEdit = q.agent_price_edit && Number(q.agent_price_edit.revised_price) > 0
                          const decided = Boolean(q.customer_decision?.status) || Boolean(q.customer_decision_at)
                          const st = q.status || ''
                          const isAwaitingAction = (resolveEffectiveQuoteStatus(q) === 'Price Revised (Awaiting Customer Decision)' || (hasEdit && !decided && !st.includes('Accepted') && !st.includes('Declined'))) && !decided

                          return (
                            <div key={q.id} className="py-4 hover:bg-brand-cloud/40 transition-colors rounded-xl px-3 group">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-brand-navy">{q.id}</span>
                                    <span className="text-xs font-bold text-brand-navy">{q.laneName || `${q.origin || 'Origin'} → ${q.destination || 'Destination'}`}</span>
                                    <span className="rounded bg-brand-cloud px-2 py-0.5 text-[10px] font-bold text-brand-slate uppercase">{q.mode}</span>
                                    <StatusBadge status={resolveEffectiveQuoteStatus(q)} />
                                  </div>
                                  <div className="text-xs text-brand-slate">
                                    Customer: <span className="font-medium text-brand-navy">{q.customer || user?.name || user?.email}</span> · Created: {q.created || (q.created_at ? new Date(q.created_at).toLocaleDateString('en-IN') : 'Recently')}
                                  </div>
                                  {hasEdit && (
                                    <div className="text-[11px] text-amber-800 mt-1 bg-amber-50 p-2 rounded border border-amber-200">
                                      Revised by {q.agent_price_edit.agent_name || 'Agent'}: &ldquo;{q.agent_price_edit.reason || 'Tariff updated'}&rdquo;
                                    </div>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  {hasEdit ? (
                                    <div>
                                      <div className="font-mono text-sm font-bold text-emerald-700">
                                        ₹ {Number(q.agent_price_edit.revised_price).toLocaleString('en-IN')}
                                      </div>
                                      <div className="text-[10px] text-brand-slate line-through">
                                        System: ₹ {(q.indicativeTotal || 0).toLocaleString('en-IN')}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="font-mono text-sm font-bold text-brand-navy">
                                      ₹ {(q.indicativeTotal || 0).toLocaleString('en-IN')}
                                    </div>
                                  )}

                                  <div className="mt-2 flex items-center gap-2 justify-end">
                                    {isAwaitingAction && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={quoteDecisionLoading === q.id}
                                          onClick={(e) => handleCustomerQuickDecision(e, q.id, 'accept_revision', q.agent_price_edit.revised_price)}
                                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                                        >
                                          <Check className="h-3 w-3" /> Accept
                                        </button>
                                        <button
                                          type="button"
                                          disabled={quoteDecisionLoading === q.id}
                                          onClick={(e) => handleCustomerQuickDecision(e, q.id, 'rejected', q.agent_price_edit.revised_price)}
                                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                        >
                                          <X className="h-3 w-3" /> Decline
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/quotes/${q.id}`, { state: { from: '/portal', fromLabel: 'Back to Portal' } })}
                                      className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-cloud transition-colors shadow-2xs"
                                    >
                                      Open
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── SHIPMENTS TAB VIEW ─── */}
                {portalTab === 'shipments' && (
                <div className="mb-[22px] rounded-lg2 border border-brand-line bg-white p-[30px] shadow-sm2">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[20px] font-bold text-brand-navy">Manage Shipments</h3>
                      <p className="text-xs text-brand-slate mt-0.5">Track, review, or cancel your active booked shipments and dispatches</p>
                    </div>
                    <button onClick={() => navigate('/ship')} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-xs hover:opacity-95 transition-opacity">
                      <Plus className="h-4 w-4" /> New shipment
                    </button>
                  </div>

                  {/* FILTER TABS & SEARCH */}
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-4">
                    <div className="flex flex-wrap gap-1.5 bg-brand-cloud/70 p-1 rounded-xl border border-brand-line">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('all')}
                        className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (activeFilter === 'all' ? 'bg-white text-brand-navy shadow-2xs' : 'text-brand-slate hover:text-brand-navy')}
                      >
                        All ({safeShipments.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('active')}
                        className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (activeFilter === 'active' ? 'bg-white text-brand-navy shadow-2xs' : 'text-brand-slate hover:text-brand-navy')}
                      >
                        Active ({activeCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('delivered')}
                        className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (activeFilter === 'delivered' ? 'bg-white text-brand-navy shadow-2xs' : 'text-brand-slate hover:text-brand-navy')}
                      >
                        Delivered ({deliveredCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('cancelled')}
                        className={'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' + (activeFilter === 'cancelled' ? 'bg-white text-rose-700 shadow-2xs' : 'text-brand-slate hover:text-brand-navy')}
                      >
                        Cancelled ({cancelledCount})
                      </button>
                    </div>

                    <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-slateLight pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tracking, route..."
                        className="w-full rounded-lg border border-brand-line pl-8 pr-3 py-1.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none placeholder:text-brand-slateLight/70"
                      />
                    </div>
                  </div>
                  
                  {/* Empty states */}
                  {safeShipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-line p-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-cloud text-brand-slate">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <h4 className="mb-1 text-base font-semibold text-slate-800">No shipments booked yet</h4>
                      <p className="mb-5 text-xs text-brand-slate">You have not booked any shipments under this account. Create your first quote enquiry to get started.</p>
                      <button
                        onClick={() => navigate('/ship')}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-navy/90"
                      >
                        <Plus className="h-4 w-4" /> Book Your First Shipment
                      </button>
                    </div>
                  ) : filteredShipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-line p-8 text-center text-xs text-brand-slate">
                      No shipments matching the filter "<b>{activeFilter}</b>"{searchQuery ? ' and query "' + searchQuery + '"' : ''}.
                    </div>
                  ) : (
                    <div className="divide-y divide-brand-line/60">
                      {filteredShipments.map((s, idx) => {
                        const serviceStr = String(s?.service || '')
                        const effCost = resolveEffectiveShipmentCost(s, quotes)
                        const costVal = effCost || Number(s?.cost || 0)
                        const effStatus = resolveEffectiveShipmentStatus(s, quotes)
                        const tn = s?.tn || s?.trackingNumber || ('PORT-' + idx)
                        const isCancelled = effStatus === 'Cancelled' || s?.status === 'Cancelled'
                        const isDelivered = effStatus === 'Delivered' || s?.status === 'Delivered'
                        const canCancel = !isCancelled && !isDelivered

                        return (
                          <div
                            key={tn}
                            className="py-4 hover:bg-brand-cloud/40 transition-colors rounded-xl px-3 group"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              {/* Left: Icon & Route Info */}
                              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                <div className={'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ' + (isCancelled ? 'bg-rose-50 text-rose-600' : isDelivered ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-marinePale text-brand-marine')}>
                                  {serviceStr.includes('Ocean') ? <Ship className="h-5 w-5" /> : serviceStr.includes('Air') ? <Plane className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-[15px] font-bold text-brand-navy">
                                    <span className="truncate">{s?.from || 'Origin'}</span>
                                    <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-brand-slateLight" />
                                    <span className="truncate">{s?.to || 'Destination'}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-brand-slate">
                                    <span className="font-mono font-bold text-brand-navy bg-brand-cloud px-1.5 py-0.5 rounded text-[11px]">{tn}</span>
                                    <span>·</span>
                                    <span>{s?.service || 'Freight Service'}</span>
                                    <span>·</span>
                                    <span>{s?.date || 'Today'}</span>
                                    {s?.destinationPhone && (
                                      <>
                                        <span>·</span>
                                        <span className="flex items-center gap-1 font-mono text-[11px] text-brand-navy bg-brand-marinePale px-1.5 py-0.5 rounded">
                                          <Phone className="h-2.5 w-2.5 text-brand-marine" /> {s.destinationPhone}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Status & Cost */}
                              <div className="flex-shrink-0 text-right">
                                <StatusBadge status={effStatus} />
                                <div className="mt-1.5 font-mono text-[15px] font-bold text-brand-navy"> Rs. {costVal.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Cancellation Reason Banner if Cancelled */}
                            {isCancelled && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50/80 border border-rose-200/70 px-3 py-2 text-xs text-rose-700">
                                <XCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                                <span><b>Cancelled:</b> {s?.cancellationReason || 'Cancelled by customer'}</span>
                              </div>
                            )}

                            {/* Action Row */}
                            <div className="mt-3.5 flex items-center justify-between border-t border-brand-line/40 pt-2.5">
                              <div className="text-[11px] text-brand-slateLight">
                                {isCancelled ? 'Booking voided' : isDelivered ? 'Shipment completed' : 'Carrier dispatch active'}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigate('/tracking?tn=' + encodeURIComponent(tn), { state: { from: '/portal', fromLabel: 'Back to Shipper Portal' } })}
                                  className="inline-flex items-center gap-1 rounded-lg bg-brand-cloud px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-marinePale hover:text-brand-marine transition-colors"
                                >
                                  Track live <ArrowRight className="h-3 w-3" />
                                </button>
                                {canCancel && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelModalShipment(s)
                                      setCancelReason('Customer schedule change')
                                      setCancelNotes('')
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Cancel Shipment
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to remove shipment ${tn} from your account? This cannot be undone.`)) {
                                      await deleteShipment(tn)
                                      toast(`Shipment ${tn} removed.`)
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-brand-line bg-white p-1.5 text-xs text-brand-slateLight hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors shadow-2xs"
                                  title={`Remove shipment ${tn}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )}

                <div className="rounded-lg2 border border-brand-line bg-white p-[30px] shadow-sm2">
                  <h3 className="mb-[22px] text-[18.5px] font-bold text-brand-navy">Quick actions</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <QuickAction icon={Search} title="Track a shipment" desc="Check live status & checkpoints" onClick={() => navigate('/tracking')} />
                    <QuickAction icon={Mail} title="Contact support" desc="Talk to your cargo manager" onClick={() => navigate('/contact')} />
                    <QuickAction icon={Package} title="Download invoices" desc="Billing and formal receipts" onClick={() => toast('Invoices are generated upon delivery')} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CANCEL SHIPMENT MODAL */}
      {cancelModalShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-brand-line">
            <div className="flex items-center justify-between border-b border-brand-line pb-3 mb-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-brand-navy">Cancel Shipment</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalShipment(null)}
                className="text-brand-slateLight hover:text-brand-navy p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-brand-cloud p-3.5 text-xs text-brand-navy">
              <div className="font-mono font-bold text-brand-marine">{cancelModalShipment.tn || cancelModalShipment.trackingNumber}</div>
              <div className="font-semibold mt-1">{cancelModalShipment.from} → {cancelModalShipment.to}</div>
              <div className="text-brand-slate mt-0.5">{cancelModalShipment.service} - Value: Rs. {Number(cancelModalShipment.cost || 0).toLocaleString('en-IN')}</div>
            </div>

            <p className="text-xs text-brand-slate mb-3 leading-relaxed">
              Are you sure you want to cancel this shipment booking? This will halt dispatch and notify operations.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-brand-navy mb-1.5">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none bg-white"
              >
                <option value="Customer schedule change">Customer schedule / timeline change</option>
                <option value="Cargo not ready for dispatch">Cargo not ready for dispatch</option>
                <option value="Found alternative carrier">Found alternative carrier / rate</option>
                <option value="Consignee cancelled order">Consignee cancelled purchase order</option>
                <option value="Duplicate booking">Duplicate booking</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            {cancelReason === 'Other' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">Please specify</label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Provide additional details..."
                  rows={2}
                  className="w-full rounded-xl border border-brand-line p-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-brand-line pt-4">
              <button
                type="button"
                onClick={() => setCancelModalShipment(null)}
                className="rounded-xl border border-brand-line px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-brand-cloud"
              >
                Keep Shipment
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {cancelling ? 'Cancelling?' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-brand-line max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between border-b border-brand-line pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-marinePale text-brand-marine">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-navy">Edit Shipper Profile</h3>
                  <p className="text-xs text-brand-slate">Update account credentials and security settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-brand-slate hover:bg-brand-cloud hover:text-brand-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-brand-navy">
                  Full Name <span className="text-brand-danger">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-brand-line bg-brand-cloud/40 pl-9 pr-3.5 py-2.5 text-xs font-semibold text-brand-navy focus:border-brand-marine focus:bg-white focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-brand-navy">
                    Email Address <span className="text-brand-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="w-full rounded-xl border border-brand-line bg-brand-cloud/40 pl-9 pr-3.5 py-2.5 text-xs font-semibold text-brand-navy focus:border-brand-marine focus:bg-white focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-brand-navy">
                    Phone / Mobile
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-brand-line bg-brand-cloud/40 pl-9 pr-3.5 py-2.5 text-xs font-semibold text-brand-navy focus:border-brand-marine focus:bg-white focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-brand-navy">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Your Company Name"
                    className="w-full rounded-xl border border-brand-line bg-brand-cloud/40 pl-9 pr-3.5 py-2.5 text-xs font-semibold text-brand-navy focus:border-brand-marine focus:bg-white focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              {/* PASSWORD CHANGE SECTION */}
              <div className="rounded-xl border border-brand-line/80 bg-brand-cloud/30 p-4 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                  <Key className="h-4 w-4 text-brand-orange" />
                  <span>Change Password</span>
                  <span className="text-[11px] font-normal text-brand-slate">(Leave blank to keep current password)</span>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-brand-navy">
                    Current Password {editForm.newPassword ? <span className="text-brand-danger">*</span> : ''}
                  </label>
                  <input
                    type="password"
                    value={editForm.oldPassword}
                    onChange={(e) => setEditForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                    placeholder="Enter your current password"
                    className="w-full rounded-xl border border-brand-line bg-white px-3.5 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-brand-navy">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-brand-line bg-white px-3.5 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-brand-navy">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-brand-line bg-white px-3.5 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-brand-line pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-brand-line px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-brand-cloud transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-gradient-to-br from-brand-orange to-brand-orangeLight px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function StatBox({ n, label, color = 'navy' }) {
  const colorClass = color === 'rose' ? 'text-rose-600' : color === 'marine' ? 'text-brand-marine' : 'text-brand-navy'
  return (
    <div className="rounded-[10px] bg-brand-cloud p-3 text-center">
      <div className={'font-display text-lg font-bold ' + colorClass}>{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-brand-slate font-medium">{label}</div>
    </div>
  )
}

function QuickAction({ icon: Icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="rounded-md2 border border-brand-line bg-white p-6 text-left transition-all hover:-translate-y-1 hover:shadow-md2">
      <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-marinePale text-brand-marine">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-bold text-brand-navy">{title}</h3>
      <p className="text-[13px] text-brand-slate">{desc}</p>
    </button>
  )
}
