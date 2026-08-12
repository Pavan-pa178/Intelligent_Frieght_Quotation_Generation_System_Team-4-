import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, CheckCircle2, XCircle, Clock, MessageSquare, AlertTriangle, Send, Eye, RefreshCw, Inbox } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { fetchAllQuotes, agentActionOnQuote, getAgentActions } from '../lib/api'
import { seedQuotes } from '../lib/mockData'

const TABS = [
  { key: 'queue', label: 'Review Queue', icon: Inbox },
  { key: 'activity', label: 'My Activity', icon: CheckCircle2 },
  { key: 'messages', label: 'Customer Messages', icon: MessageSquare },
]

// Merge seed agent_review data with localStorage agent actions
function mergeAgentData(quotes, agentActions) {
  return quotes.map(q => {
    const localAction = agentActions[q.id]
    if (localAction) return { ...q, agent_review: localAction }
    return q
  })
}

const MSGS_KEY = 'portline_agent_messages'
function loadMessages() {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY) || '{}') } catch { return {} }
}
function saveMessages(msgs) {
  try { localStorage.setItem(MSGS_KEY, JSON.stringify(msgs)) } catch {}
}

export default function Agent() {
  const { user, loggedIn } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('queue')
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionStates, setActionStates] = useState({}) // { quoteId: { loading, comment, showComment } }
  const [messages, setMessages] = useState(loadMessages())
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [newMsg, setNewMsg] = useState('')

  const isAgent = user?.role === 'agent'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const all = await fetchAllQuotes()
      const agentActions = getAgentActions()
      setQuotes(mergeAgentData(Array.isArray(all) ? all : seedQuotes, agentActions))
    } catch {
      setQuotes(mergeAgentData(seedQuotes, getAgentActions()))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pending = quotes.filter(q => !q.agent_review || q.agent_review.status === 'pending')
  const reviewed = quotes.filter(q => q.agent_review && q.agent_review.status !== 'pending')

  const getState = (id) => actionStates[id] || { loading: false, comment: '', showComment: false }
  const setState = (id, patch) => setActionStates(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }))

  const handleAction = async (quoteId, action) => {
    const st = getState(quoteId)
    setState(quoteId, { loading: true })
    try {
      await agentActionOnQuote(quoteId, action, st.comment, user)
      toast(action === 'approved' ? 'Quote approved successfully' : 'Quote rejected with comment')
      await loadData()
      setState(quoteId, { loading: false, comment: '', showComment: false })
    } catch {
      toast('Action failed, please try again')
      setState(quoteId, { loading: false })
    }
  }

  const handleSendMessage = (quoteId) => {
    if (!newMsg.trim()) return
    const msgs = loadMessages()
    if (!msgs[quoteId]) msgs[quoteId] = []
    msgs[quoteId].push({
      from: user?.name || 'Agent',
      role: 'agent',
      text: newMsg.trim(),
      ts: new Date().toISOString()
    })
    saveMessages(msgs)
    setMessages({ ...msgs })
    setNewMsg('')
    toast('Message sent')
  }

  if (!loggedIn || !isAgent) {
    return (
      <>
        <PageBanner crumb="Agent" title="Agent Panel" subtitle="Review quotes, approve or reject, and communicate with customers." icon={UserCheck} />
        <section className="pt-14 pb-20">
          <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
            <div className="mx-auto max-w-[460px] rounded-2xl border border-brand-line bg-white px-9 py-11 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-brand-navy">Agent Access Required</h3>
              <p className="mb-2 text-sm text-brand-slate">This area is restricted to PORTLINE agents.</p>
              <p className="mb-6 font-mono text-xs text-brand-slateLight">Login: agent@portline.in / agent123</p>
              <button onClick={() => navigate('/login')} className="rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white hover:bg-brand-marine">
                Log in as Agent
              </button>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageBanner crumb="Agent" title="Agent Panel" subtitle={`Welcome, ${user?.name?.split(' ')[0]}. Review and action pending freight quotations.`} icon={UserCheck} />

      <section className="pt-8 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">

          {/* Tab Bar */}
          <div className="mb-8 flex flex-wrap gap-2 rounded-xl border border-brand-line bg-white p-1.5 shadow-sm">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              const badge = tab.key === 'queue' ? pending.length : tab.key === 'activity' ? reviewed.length : null
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${active ? 'bg-brand-navy text-white shadow-sm' : 'text-brand-slate hover:text-brand-navy hover:bg-brand-cloud'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {badge !== null && badge > 0 && (
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-brand-navy text-white'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
            <div className="ml-auto flex items-center">
              <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud hover:text-brand-navy">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* REVIEW QUEUE TAB */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {pending.length === 0 && (
                <div className="rounded-xl border border-dashed border-brand-line bg-white p-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                  <h4 className="mb-1 text-base font-semibold text-brand-navy">All caught up!</h4>
                  <p className="text-sm text-brand-slate">No quotes pending your review.</p>
                </div>
              )}
              {pending.map(q => {
                const st = getState(q.id)
                return (
                  <div key={q.id} className="rounded-xl border border-brand-line bg-white shadow-sm overflow-hidden">
                    {/* Quote header */}
                    <div className="flex flex-wrap items-start gap-4 border-b border-brand-line px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-brand-marine">{q.id}</span>
                          <StatusBadge status={q.status || 'Draft'} />
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" /> Awaiting review
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-[15px] font-bold text-brand-navy">{q.customer} — {q.laneName}</h4>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-slate">
                          <span>{q.mode}</span>
                          <span>{q.basis}</span>
                          <span>Transit: {q.transit}</span>
                          {q.indicativeTotal && <span className="font-mono font-semibold text-brand-navy">Rs.{Number(q.indicativeTotal).toLocaleString('en-IN')}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        className="flex items-center gap-1.5 rounded-lg border border-brand-line bg-brand-cloud px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-marinePale hover:text-brand-marine transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </button>
                    </div>

                    {/* Comment box (shown when requested) */}
                    {st.showComment && (
                      <div className="bg-brand-cloud/50 px-6 py-4 border-b border-brand-line">
                        <label className="mb-1.5 block text-xs font-semibold text-brand-navy">Comment / Reason</label>
                        <textarea
                          rows={2}
                          value={st.comment}
                          onChange={e => setState(q.id, { comment: e.target.value })}
                          placeholder="Add a note for the customer or admin..."
                          className="w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none resize-none"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4">
                      <button
                        disabled={st.loading}
                        onClick={() => handleAction(q.id, 'approved')}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                      <button
                        disabled={st.loading}
                        onClick={() => handleAction(q.id, 'rejected')}
                        className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                      <button
                        onClick={() => setState(q.id, { showComment: !st.showComment })}
                        className={`flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors ${st.showComment ? 'border-brand-marine bg-brand-marinePale text-brand-marine' : 'border-brand-line text-brand-slate hover:border-brand-marine hover:text-brand-marine'}`}
                      >
                        <MessageSquare className="h-4 w-4" /> {st.showComment ? 'Hide comment' : 'Add comment'}
                      </button>
                      {st.loading && <span className="text-xs text-brand-slateLight animate-pulse">Processing...</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              {reviewed.length === 0 && (
                <div className="rounded-xl border border-dashed border-brand-line bg-white p-12 text-center">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-brand-slateLight" />
                  <h4 className="mb-1 text-base font-semibold text-brand-navy">No activity yet</h4>
                  <p className="text-sm text-brand-slate">Quotes you approve or reject will appear here.</p>
                </div>
              )}
              {reviewed.map(q => {
                const rev = q.agent_review
                const isApproved = rev?.status === 'approved'
                return (
                  <div key={q.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-brand-line bg-white px-6 py-4 shadow-sm">
                    <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {isApproved ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-brand-marine">{q.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {isApproved ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-brand-navy">{q.customer} — {q.laneName}</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-brand-slate">
                        <span>{q.mode} · {q.basis}</span>
                        {q.indicativeTotal && <span className="font-mono font-semibold text-brand-navy">Rs.{Number(q.indicativeTotal).toLocaleString('en-IN')}</span>}
                      </div>
                      {rev?.comment && (
                        <div className="mt-2 rounded-lg bg-brand-cloud px-3 py-2 text-xs text-brand-slate italic">"{rev.comment}"</div>
                      )}
                      {rev?.reviewed_at && (
                        <div className="mt-1.5 text-[10px] text-brand-slateLight">
                          Reviewed on {new Date(rev.reviewed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/quotes/${q.id}`)}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-marine hover:underline mt-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === 'messages' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
              {/* Quote list sidebar */}
              <div className="rounded-xl border border-brand-line bg-white overflow-hidden">
                <div className="border-b border-brand-line px-4 py-3">
                  <h4 className="text-sm font-bold text-brand-navy">Quotes</h4>
                </div>
                <div className="divide-y divide-brand-line max-h-[500px] overflow-y-auto">
                  {quotes.map(q => {
                    const qMsgs = messages[q.id] || []
                    const isSelected = selectedQuote?.id === q.id
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuote(q)}
                        className={`w-full px-4 py-3 text-left transition-colors ${isSelected ? 'bg-brand-marinePale' : 'hover:bg-brand-cloud'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] font-semibold text-brand-marine">{q.id}</div>
                            <div className="mt-0.5 truncate text-xs font-medium text-brand-navy">{q.customer}</div>
                            <div className="mt-0.5 truncate text-[11px] text-brand-slateLight">{q.laneName}</div>
                          </div>
                          {qMsgs.length > 0 && (
                            <span className="flex-shrink-0 rounded-full bg-brand-marine px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {qMsgs.length}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chat panel */}
              {selectedQuote ? (
                <div className="flex flex-col rounded-xl border border-brand-line bg-white overflow-hidden" style={{ minHeight: 400 }}>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 border-b border-brand-line px-5 py-3">
                    <div>
                      <div className="font-mono text-xs font-semibold text-brand-marine">{selectedQuote.id}</div>
                      <div className="text-sm font-bold text-brand-navy">{selectedQuote.customer} — {selectedQuote.laneName}</div>
                    </div>
                    <StatusBadge status={selectedQuote.status || 'Draft'} />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ maxHeight: 340 }}>
                    {(messages[selectedQuote.id] || []).length === 0 && (
                      <div className="py-8 text-center text-xs text-brand-slateLight">No messages yet. Start the conversation below.</div>
                    )}
                    {(messages[selectedQuote.id] || []).map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'agent' ? 'bg-brand-navy text-white rounded-br-sm' : 'bg-brand-cloud text-brand-navy rounded-bl-sm'}`}>
                          <div className="text-[10px] font-semibold mb-1 opacity-70">{m.from}</div>
                          {m.text}
                          <div className="mt-1 text-[9px] opacity-50">{new Date(m.ts).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message input */}
                  <div className="border-t border-brand-line p-4">
                    <div className="flex gap-2">
                      <input
                        value={newMsg}
                        onChange={e => setNewMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage(selectedQuote.id)}
                        placeholder="Type a message to the customer..."
                        className="flex-1 rounded-lg border border-brand-line px-3 py-2 text-sm text-brand-navy focus:border-brand-marine focus:outline-none"
                      />
                      <button
                        onClick={() => handleSendMessage(selectedQuote.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-marine transition-colors"
                      >
                        <Send className="h-4 w-4" /> Send
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-brand-line bg-white p-12 text-center">
                  <div>
                    <MessageSquare className="mx-auto mb-3 h-10 w-10 text-brand-slateLight" />
                    <p className="text-sm text-brand-slate">Select a quote to view or start a conversation</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </>
  )
}
