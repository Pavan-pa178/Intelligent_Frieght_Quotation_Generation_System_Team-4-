import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, Route, FileText, Package, ChevronRight, CheckCircle2,
  XCircle, Clock, AlertTriangle, DollarSign, Ship, Plane, Truck, RefreshCw,
  Eye, Database, Users, UserPlus, ShieldCheck, UserCheck, Building, Building2, Key,
  Trash2, Edit3, Filter, Check, X, Lock, Plus, Search, Shield, LogOut, Award, ExternalLink, Sparkles, UserX
} from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import AdminMasterData from '../components/AdminMasterData'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import {
  fetchAllQuotes, fetchShipments, clearAllShipments, deleteShipmentRequest, fetchAllUsers,
  adminCreateUser, adminUpdateUser, adminDeleteUser,
  agentActionOnQuote, clearAllQuotes, deleteQuote,
  fetchCompanies, verifyCompany, createCompany, addCompanyAgent, removeCompanyAgent,
  resolveEffectiveQuoteStatus, resolveEffectiveShipmentStatus, resolveEffectiveShipmentCost
} from '../lib/api'
import { routeAnalytics, resolveAssignedAgent } from '../lib/mockData'

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'companies', label: 'Companies & Agents', icon: Building2 },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'masterdata', label: 'Master Database', icon: Database },
  { key: 'routes', label: 'Route Management', icon: Route },
  { key: 'quotes', label: 'Quotes', icon: FileText },
  { key: 'shipments', label: 'Shipments', icon: Package },
]


function getAgentDisplayName(agent) {
  if (!agent || agent === 'Unassigned' || agent === 'unassigned') return 'Unassigned'
  if (agent.includes('@')) {
    const prefix = agent.split('@')[0].toLowerCase()
    if (prefix === 'agent') return 'Arjun Agent'
    if (prefix === 'agentop') return 'Suresh Varma'
    if (prefix === 'customs') return 'Inspector Rajesh Kumar'
    if (prefix === 'admin') return 'Priya Admin'
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }
  return agent
}
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

function RoleBadge({ role }) {
  const r = (role || 'customer').toLowerCase()
  if (r === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
        <Shield className="h-3 w-3 text-amber-600" /> Admin / Manager
      </span>
    )
  }
  if (r === 'agent' || r === 'broker') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800 border border-purple-200">
        <UserCheck className="h-3 w-3 text-purple-600" /> Broker / Agent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 border border-blue-200">
      <Building className="h-3 w-3 text-blue-600" /> Shipper / User
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
  const { user, loggedIn, logout } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const toast = useToast()
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'overview')
  const [quotes, setQuotes] = useState([])
  const [shipments, setShipments] = useState([])
  const [usersList, setUsersList] = useState([])
  const [routes, setRoutes] = useState(MOCK_ROUTES)
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)

  // Sync active tab if URL parameter changes
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    setSearchParams(newTab === 'overview' ? {} : { tab: newTab })
  }

  // Search & Filter states
  const [quoteSearch, setQuoteSearch] = useState('')
  const [inspectQuote, setInspectQuote] = useState(null)

  const handleApproveQuote = async (quoteId) => {
    try {
      await agentActionOnQuote(quoteId, 'approved', 'Approved by Operations Admin', user)
      setQuotes(prev => prev.map(q => q.id === quoteId ? {
        ...q,
        status: 'Ready',
        agent_review: {
          status: 'approved',
          comment: 'Approved by Operations Admin',
          reviewed_at: new Date().toISOString()
        }
      } : q))
      if (inspectQuote && inspectQuote.id === quoteId) {
        setInspectQuote(prev => ({
          ...prev,
          status: 'Ready',
          agent_review: {
            status: 'approved',
            comment: 'Approved by Operations Admin',
            reviewed_at: new Date().toISOString()
          }
        }))
      }
      toast(`Quote ${quoteId} APPROVED successfully! Status set to Ready.`)
    } catch (err) {
      toast('Failed to approve quote')
    }
  }

  const handleRejectQuote = async (quoteId) => {
    try {
      await agentActionOnQuote(quoteId, 'rejected', 'Rejected by Operations Admin', user)
      setQuotes(prev => prev.map(q => q.id === quoteId ? {
        ...q,
        status: 'Rejected',
        agent_review: {
          status: 'rejected',
          comment: 'Rejected by Operations Admin',
          reviewed_at: new Date().toISOString()
        }
      } : q))
      if (inspectQuote && inspectQuote.id === quoteId) {
        setInspectQuote(prev => ({
          ...prev,
          status: 'Rejected',
          agent_review: {
            status: 'rejected',
            comment: 'Rejected by Operations Admin',
            reviewed_at: new Date().toISOString()
          }
        }))
      }
      toast(`Quote ${quoteId} REJECTED. Status set to Blocked/Rejected.`)
    } catch (err) {
      toast('Failed to reject quote')
    }
  }
  const [shipSearch, setShipSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('ALL')

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
    role: 'customer',
    phone: '',
  })
  const [creatingUser, setCreatingUser] = useState(false)

  // Companies & Company Agents state
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [companyStatusFilter, setCompanyStatusFilter] = useState('ALL')
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('OCEAN')
  const [selectedCompForAgent, setSelectedCompForAgent] = useState(null)
  const [newAgentForm, setNewAgentForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [addingAgent, setAddingAgent] = useState(false)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    carrier_key: '',
    service_category: 'OCEAN',
    contract_tier: 'Tier 1 Strategic Carrier',
    sla_hours: '2h SLA',
    manager_email: '',
    modes: 'Ocean FCL, Ocean LCL'
  })
  const [creatingCompany, setCreatingCompany] = useState(false)

  const getCompanyCategory = (c) => {
    if (c.service_category) return c.service_category
    const modes = (Array.isArray(c.modes) ? c.modes.join(' ') : String(c.modes || '')).toLowerCase() + ' ' + (c.name || '').toLowerCase()
    if (modes.includes('air') || modes.includes('express') || modes.includes('sky') || modes.includes('dart')) return 'AIR'
    if (modes.includes('rail') || modes.includes('ground') || modes.includes('road') || modes.includes('truck') || modes.includes('concor')) return 'GROUND_RAIL'
    return 'OCEAN'
  }

  const oceanCount = useMemo(() => companies.filter(c => getCompanyCategory(c) === 'OCEAN').length, [companies])
  const airCount = useMemo(() => companies.filter(c => getCompanyCategory(c) === 'AIR').length, [companies])
  const groundCount = useMemo(() => companies.filter(c => getCompanyCategory(c) === 'GROUND_RAIL').length, [companies])

  const activeCategoryCompanies = useMemo(() => {
    return companies.filter(c => getCompanyCategory(c) === selectedServiceCategory)
  }, [companies, selectedServiceCategory])

  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [q, s, u, c] = await Promise.all([
        fetchAllQuotes(),
        fetchShipments(''),
        fetchAllUsers(),
        fetchCompanies(),
      ])
      setQuotes(Array.isArray(q) ? q : [])
      setShipments(Array.isArray(s) ? s : [])
      setUsersList(Array.isArray(u) ? u : [])
      setCompanies(Array.isArray(c) ? c : [])
    } catch {
      // Graceful fallback to seeded dashboard
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const u = await fetchAllUsers()
      setUsersList(Array.isArray(u) ? u : [])
    } catch (err) {
      console.warn('Failed to reload users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Live synchronization across platform components and tabs
  useEffect(() => {
    const handleSync = () => { loadData() }
    window.addEventListener('portline_quote_updated', handleSync)
    window.addEventListener('portline_shipment_updated', handleSync)
    window.addEventListener('portline_companies_updated', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('portline_quote_updated', handleSync)
      window.removeEventListener('portline_shipment_updated', handleSync)
      window.removeEventListener('portline_companies_updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [loadData])


  const handleToggleVerifyCompany = async (company) => {
    const nextEligible = !company.is_eligible
    const nextStatus = nextEligible ? 'APPROVED' : 'SUSPENDED'
    try {
      await verifyCompany(company.company_id, { status: nextStatus, is_eligible: nextEligible })
      toast(nextEligible 
        ? `${company.name} verified & marked ELIGIBLE for customer recommendations!` 
        : `${company.name} suspended from customer recommendations.`
      )
      loadData()
    } catch (err) {
      toast('Failed to update company verification')
    }
  }

  const handleAddAgentToCompany = async (e) => {
    e.preventDefault()
    if (!selectedCompForAgent) return
    if (!newAgentForm.email.trim() || !newAgentForm.password.trim()) {
      toast('Agent email and password are required.')
      return
    }
    setAddingAgent(true)
    try {
      await addCompanyAgent(selectedCompForAgent.company_id, {
        name: newAgentForm.name.trim() || newAgentForm.email.split('@')[0],
        email: newAgentForm.email.trim().toLowerCase(),
        password: newAgentForm.password.trim(),
        phone: newAgentForm.phone.trim() || '+91 98200 00000'
      })
      toast(`Agent ${newAgentForm.email} onboarded for ${selectedCompForAgent.name}!`)
      setNewAgentForm({ name: '', email: '', password: '', phone: '' })
      setSelectedCompForAgent(null)
      loadData()
    } catch (err) {
      toast(err.message || 'Failed to onboard agent')
    } finally {
      setAddingAgent(false)
    }
  }

  const handleRemoveAgent = async (companyId, agentEmail) => {
    if (!window.confirm(`Are you sure you want to remove agent ${agentEmail} from this company?`)) return
    try {
      await removeCompanyAgent(companyId, agentEmail)
      toast(`Agent ${agentEmail} removed from company.`)
      loadData()
    } catch (err) {
      toast('Failed to remove agent')
    }
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    if (!newCompanyForm.name.trim()) {
      toast('Company name is required.')
      return
    }
    setCreatingCompany(true)
    try {
      const carrierKey = newCompanyForm.carrier_key.trim() || newCompanyForm.name.trim()
      const modesList = newCompanyForm.modes.split(',').map(m => m.trim()).filter(Boolean)
      await createCompany({
        name: newCompanyForm.name.trim(),
        carrier_key: carrierKey,
        service_category: newCompanyForm.service_category || selectedServiceCategory || 'OCEAN',
        contract_tier: newCompanyForm.contract_tier.trim(),
        sla_hours: newCompanyForm.sla_hours.trim(),
        manager_email: newCompanyForm.manager_email.trim().toLowerCase(),
        modes: modesList,
        status: 'APPROVED',
        is_eligible: true
      })
      toast(`Freight company ${newCompanyForm.name} created & verified!`)
      setShowAddCompanyModal(false)
      setNewCompanyForm({
        name: '',
        carrier_key: '',
        service_category: selectedServiceCategory,
        contract_tier: selectedServiceCategory === 'AIR' ? 'Scheduled Cargo Airline Tier 1' : selectedServiceCategory === 'GROUND_RAIL' ? 'National Railhead & Road Hub' : 'Tier 1 Strategic Ocean Carrier',
        sla_hours: selectedServiceCategory === 'AIR' ? '1h Priority SLA' : selectedServiceCategory === 'GROUND_RAIL' ? '2h Standard SLA' : '2h SLA',
        manager_email: '',
        modes: selectedServiceCategory === 'AIR' ? 'Air Standard, Express Air Cargo' : selectedServiceCategory === 'GROUND_RAIL' ? 'Rail Intermodal ICD, Full Truckload (FTL)' : 'Ocean FCL, Ocean LCL'
      })
      loadData()
    } catch (err) {
      toast(err.message || 'Failed to create company')
    } finally {
      setCreatingCompany(false)
    }
  }

  // Handlers for User Management
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      toast('Please fill all required fields (Name, Email, Password).')
      return
    }
    setCreatingUser(true)
    try {
      await adminCreateUser(newUserForm)
      toast(`User "${newUserForm.name}" created successfully as ${newUserForm.role.toUpperCase()}!`)
      setShowCreateModal(false)
      setNewUserForm({
        name: '',
        company: '',
        email: '',
        password: '',
        role: 'customer',
        phone: '',
      })
      await reloadUsers()
    } catch (err) {
      toast(err.message || 'Failed to create user')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleRoleChange = async (email, newRole) => {
    try {
      await adminUpdateUser(email, { role: newRole })
      setUsersList(prev => prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, role: newRole } : u))
      toast(`Role for ${email} updated to ${newRole.toUpperCase()}`)
    } catch (err) {
      toast('Failed to update role')
    }
  }

  const handleToggleStatus = async (email, currentActive) => {
    try {
      await adminUpdateUser(email, { active: !currentActive })
      setUsersList(prev => prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, active: !currentActive } : u))
      toast(`Account ${email} is now ${!currentActive ? 'Active' : 'Inactive'}`)
    } catch (err) {
      toast('Failed to toggle status')
    }
  }

  const handleDeleteUser = async (email, name) => {
    if (email === 'admin@portline.in' || email === 'admin.demo@portline.in') {
      toast('The primary Administrator account cannot be removed.')
      return
    }
    if (!window.confirm(`Are you sure you want to remove user "${name || email}"?`)) return

    try {
      await adminDeleteUser(email)
      setUsersList(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()))
      toast(`User ${email} removed`)
    } catch (err) {
      toast('Failed to delete user')
    }
  }

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
              <p className="mb-2 text-sm text-brand-slate">This area is restricted to Agentic AI for Maritime Freight Pricing and Route Optimization administrators.</p>
              <p className="mb-6 text-sm text-brand-slate">Contact your system administrator for access credentials.</p>
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
    const effStatus = resolveEffectiveShipmentStatus(s, quotes).toLowerCase()
    return (s.tn || '').toLowerCase().includes(q) || 
           (s.from || '').toLowerCase().includes(q) || 
           (s.to || '').toLowerCase().includes(q) ||
           (s.userName || '').toLowerCase().includes(q) ||
           (s.userCompany || '').toLowerCase().includes(q) ||
           (s.user_email || '').toLowerCase().includes(q) ||
           (s.destinationContactName || '').toLowerCase().includes(q) ||
           (s.destinationCompany || '').toLowerCase().includes(q) ||
           effStatus.includes(q)
  })

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !userSearch || (
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone || '').includes(userSearch)
    )
    const matchesRole = userRoleFilter === 'ALL' || (
      userRoleFilter === 'CUSTOMER' && (u.role === 'customer' || !u.role)
    ) || (
      userRoleFilter === 'AGENT' && (u.role === 'agent' || u.role === 'broker')
    ) || (
      userRoleFilter === 'ADMIN' && u.role === 'admin'
    )
    return matchesSearch && matchesRole
  })

  const customerCount = usersList.filter(u => u.role === 'customer' || !u.role).length
  const agentCount = usersList.filter(u => u.role === 'agent' || u.role === 'broker').length
  const adminRoleCount = usersList.filter(u => u.role === 'admin').length

  return (
    <>
      <PageBanner
        crumb="Admin Panel"
        title="Operations & Management Console"
        subtitle="Manage users, master data, trade routes, quotes, shipments and approval rules."
        icon={LayoutDashboard}
      />

      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">

          {/* ADMIN SESSION & LOGOUT BAR */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-line bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-display text-sm font-bold shadow-xs">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-brand-navy">{user?.name || 'Administrator'}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200">
                    <Shield className="h-3 w-3 text-amber-600" /> Platform Admin
                  </span>
                </div>
                <div className="text-[11px] text-brand-slate font-mono">{user?.email || 'admin@portline.in'} · {user?.company || 'PORTLINE Operations'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-cloud/50 px-3.5 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud hover:text-brand-navy transition-colors"
                title="Refresh All Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => {
                  logout()
                  toast('Logged out successfully')
                  navigate('/login')
                }}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors shadow-xs"
                title="Log out of Admin Console"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* TOP KPI STRIP */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard icon={DollarSign} label="Pipeline Revenue" value={`Rs.${(totalRevenue / 100000).toFixed(1)}L`} colorClass="bg-emerald-50 text-emerald-600" />
            <KpiCard icon={Clock} label="Pending Review" value={pendingCount} colorClass="bg-amber-50 text-amber-600" />
            <KpiCard icon={Users} label="Total Users" value={usersList.length} colorClass="bg-blue-50 text-blue-600" />
            <KpiCard icon={Route} label="Active Routes" value={routes.filter(r => r.active).length} colorClass="bg-purple-50 text-purple-600" />
          </div>

          {/* TAB NAV */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-brand-line pb-3">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              let badge = null
              if (tab.key === 'quotes' && pendingCount > 0) badge = pendingCount
              if (tab.key === 'users') badge = usersList.length
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-brand-navy text-white shadow-xs'
                      : 'border border-brand-line bg-white text-brand-slate hover:bg-brand-cloud hover:text-brand-navy'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {badge !== null && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-brand-cloud text-brand-slate'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <button
                  onClick={() => handleTabChange('users')}
                  className="flex items-center gap-4 rounded-xl border border-brand-line bg-white p-5 text-left transition-all hover:border-brand-marine hover:shadow-sm group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-navy">User Management</div>
                    <div className="text-xs text-brand-slate">{usersList.length} users registered (Shippers, Agents, Admins)</div>
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('masterdata')}
                  className="flex items-center gap-4 rounded-xl border border-brand-line bg-white p-5 text-left transition-all hover:border-brand-marine hover:shadow-sm group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-navy">Master Database Explorer</div>
                    <div className="text-xs text-brand-slate">534 live records across 20 MongoDB collections</div>
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('quotes')}
                  className="flex items-center gap-4 rounded-xl border border-brand-line bg-white p-5 text-left transition-all hover:border-brand-marine hover:shadow-sm group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-navy">Quotes & Approvals</div>
                    <div className="text-xs text-brand-slate">{pendingCount} quotes pending agent/manager review</div>
                  </div>
                </button>
              </div>

              {/* Performance Analytics Strip */}
              <div className="rounded-xl border border-brand-line bg-white p-6">
                <div className="flex items-center justify-between border-b border-brand-line pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-brand-navy">Lane Performance & Transit Scoreboard</h3>
                    <p className="text-xs text-brand-slate">Real-time statistics across active freight corridors</p>
                  </div>
                  <button onClick={loadData} className="flex items-center gap-1 text-xs text-brand-marine hover:underline">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-brand-cloud/40 p-4 border border-brand-line/50">
                    <div className="text-xs text-brand-slate">Overall On-Time Delivery</div>
                    <div className="font-display text-2xl font-bold text-brand-navy mt-1">94.8%</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">↑ +1.2% this month</div>
                  </div>
                  <div className="rounded-lg bg-brand-cloud/40 p-4 border border-brand-line/50">
                    <div className="text-xs text-brand-slate">Average Ocean Transit</div>
                    <div className="font-display text-2xl font-bold text-brand-navy mt-1">16.4 Days</div>
                    <div className="text-[11px] text-brand-slateLight mt-0.5">Top 50 global trade lanes</div>
                  </div>
                  <div className="rounded-lg bg-brand-cloud/40 p-4 border border-brand-line/50">
                    <div className="text-xs text-brand-slate">Quote Conversion Rate</div>
                    <div className="font-display text-2xl font-bold text-brand-navy mt-1">68.2%</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">From enquiry to booking</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* COMPANIES & AGENTS MANAGEMENT TAB */}
          {activeTab === 'companies' && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-brand-line bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-orange" />
                    <h3 className="text-base font-bold text-brand-navy">Freight Carrier Companies & Desk Agents</h3>
                  </div>
                  <p className="text-xs text-brand-slate mt-0.5">
                    Verify partner carriers, manage SLA tiers, control customer recommendation eligibility, and onboard company agents.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewCompanyForm({
                      name: '',
                      carrier_key: '',
                      service_category: selectedServiceCategory,
                      contract_tier: selectedServiceCategory === 'AIR' ? 'Scheduled Cargo Airline Tier 1' : selectedServiceCategory === 'GROUND_RAIL' ? 'National Railhead & Road Hub' : 'Tier 1 Strategic Ocean Carrier',
                      sla_hours: selectedServiceCategory === 'AIR' ? '1h Priority SLA' : selectedServiceCategory === 'GROUND_RAIL' ? '2h Standard SLA' : '2h SLA',
                      manager_email: '',
                      modes: selectedServiceCategory === 'AIR' ? 'Air Standard, Express Air Cargo' : selectedServiceCategory === 'GROUND_RAIL' ? 'Rail Intermodal ICD, Full Truckload (FTL)' : 'Ocean FCL, Ocean LCL'
                    })
                    setShowAddCompanyModal(true)
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-orange to-brand-orangeLight px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 transition-all self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Freight Company</span>
                </button>
              </div>

              {/* Service Category Switcher: Ocean / Air & Express Air / Ground & Rail */}
              <div className="flex flex-wrap items-center gap-3 p-1.5 bg-brand-cloud/40 rounded-2xl border border-brand-line/60">
                <button
                  type="button"
                  onClick={() => setSelectedServiceCategory('OCEAN')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    selectedServiceCategory === 'OCEAN'
                      ? 'bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/20'
                      : 'bg-white text-brand-slate border border-brand-line hover:border-brand-navy/30 hover:text-brand-navy hover:bg-brand-cloud/40'
                  }`}
                >
                  <Ship className={`h-4 w-4 ${selectedServiceCategory === 'OCEAN' ? 'text-cyan-300' : 'text-cyan-600'}`} />
                  <span>Ocean Freight</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedServiceCategory === 'OCEAN' ? 'bg-white/20 text-white' : 'bg-brand-cloud text-brand-slate'
                  }`}>
                    {oceanCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedServiceCategory('AIR')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    selectedServiceCategory === 'AIR'
                      ? 'bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/20'
                      : 'bg-white text-brand-slate border border-brand-line hover:border-brand-navy/30 hover:text-brand-navy hover:bg-brand-cloud/40'
                  }`}
                >
                  <Plane className={`h-4 w-4 ${selectedServiceCategory === 'AIR' ? 'text-amber-300' : 'text-amber-600'}`} />
                  <span>Air & Express Air</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedServiceCategory === 'AIR' ? 'bg-white/20 text-white' : 'bg-brand-cloud text-brand-slate'
                  }`}>
                    {airCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedServiceCategory('GROUND_RAIL')}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    selectedServiceCategory === 'GROUND_RAIL'
                      ? 'bg-brand-navy text-white shadow-md ring-2 ring-brand-navy/20'
                      : 'bg-white text-brand-slate border border-brand-line hover:border-brand-navy/30 hover:text-brand-navy hover:bg-brand-cloud/40'
                  }`}
                >
                  <Truck className={`h-4 w-4 ${selectedServiceCategory === 'GROUND_RAIL' ? 'text-emerald-300' : 'text-emerald-600'}`} />
                  <span>Ground & Rail</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedServiceCategory === 'GROUND_RAIL' ? 'bg-white/20 text-white' : 'bg-brand-cloud text-brand-slate'
                  }`}>
                    {groundCount}
                  </span>
                </button>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-brand-slate uppercase tracking-wider">
                    {selectedServiceCategory === 'OCEAN' ? 'Ocean Carriers' : selectedServiceCategory === 'AIR' ? 'Air Cargo Carriers' : 'Ground / Rail Carriers'}
                  </span>
                  <div className="mt-1 font-display text-2xl font-bold text-brand-navy">{activeCategoryCompanies.length}</div>
                  <span className="text-[10px] text-brand-slateLight">
                    {selectedServiceCategory === 'OCEAN' ? 'Liner & Vessel Operators' : selectedServiceCategory === 'AIR' ? 'Airlines & Express Couriers' : 'Surface & ICD Railheads'}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Verified & Eligible</span>
                  <div className="mt-1 font-display text-2xl font-bold text-emerald-700">
                    {activeCategoryCompanies.filter(c => c.is_eligible).length}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Active in Customer Recommendations</span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Pending / Suspended</span>
                  <div className="mt-1 font-display text-2xl font-bold text-amber-700">
                    {activeCategoryCompanies.filter(c => !c.is_eligible).length}
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">Hidden from Customer Recommendations</span>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">Operational Agents</span>
                  <div className="mt-1 font-display text-2xl font-bold text-purple-700">
                    {activeCategoryCompanies.reduce((sum, c) => sum + (c.agents?.length || 0), 0)}
                  </div>
                  <span className="text-[10px] text-purple-600 font-medium">Assigned to Carrier Desks</span>
                </div>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-brand-line bg-white p-3 shadow-xs">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Search company, ID, carrier key, or agent..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-brand-line focus:border-brand-marine focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {[
                    { id: 'ALL', label: 'All Companies' },
                    { id: 'ELIGIBLE', label: 'Eligible & Approved' },
                    { id: 'PENDING', label: 'Pending Verification' },
                    { id: 'SUSPENDED', label: 'Suspended' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setCompanyStatusFilter(f.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        companyStatusFilter === f.id
                          ? 'bg-brand-navy text-white shadow-xs'
                          : 'bg-brand-cloud/70 text-brand-slate hover:bg-brand-cloud hover:text-brand-navy'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeCategoryCompanies
                  .filter(c => {
                    if (companyStatusFilter === 'ELIGIBLE' && !c.is_eligible) return false
                    if (companyStatusFilter === 'PENDING' && c.status !== 'PENDING') return false
                    if (companyStatusFilter === 'SUSPENDED' && c.status !== 'SUSPENDED') return false
                    if (!companySearch) return true
                    const s = companySearch.toLowerCase()
                    return (
                      (c.name || '').toLowerCase().includes(s) ||
                      (c.company_id || '').toLowerCase().includes(s) ||
                      (c.carrier_key || '').toLowerCase().includes(s) ||
                      (c.agents || []).some(a => (a.name || '').toLowerCase().includes(s) || (a.email || '').toLowerCase().includes(s))
                    )
                  })
                  .map(comp => (
                    <div
                      key={comp.company_id}
                      className={`rounded-2xl border transition-all bg-white p-5 shadow-xs flex flex-col justify-between ${
                        comp.is_eligible ? 'border-brand-line hover:border-brand-marine/50' : 'border-amber-300 bg-amber-50/20'
                      }`}
                    >
                      <div>
                        {/* Company Card Header */}
                        <div className="flex items-start justify-between gap-3 mb-3 border-b border-brand-line pb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm"
                              style={{ backgroundColor: comp.logo_color || '#0A2540' }}
                            >
                              {(comp.carrier_key || comp.name || 'CO').slice(0, 3).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-display font-bold text-brand-navy text-sm">{comp.name}</h4>
                                <span className="font-mono text-[10px] font-bold text-brand-slateLight px-1.5 py-0.5 rounded bg-brand-cloud border border-brand-line">
                                  {comp.company_id}
                                </span>
                              </div>
                              <div className="text-[11px] text-brand-slate font-medium mt-0.5">
                                {comp.contract_tier || 'Partner Ocean Carrier'} · <span className="text-brand-orange font-semibold">{comp.sla_hours || '2h SLA'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Eligibility Badge */}
                          {comp.is_eligible ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Eligible (Recommended)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-300">
                              <Clock className="h-3 w-3" /> {comp.status === 'SUSPENDED' ? 'Suspended' : 'Pending Verification'}
                            </span>
                          )}
                        </div>

                        {/* Live Activity & Performance Counters */}
                        <div className="grid grid-cols-3 gap-2 bg-brand-cloud/60 rounded-xl p-2.5 mb-3 border border-brand-line text-center">
                          <div>
                            <span className="text-[10px] text-brand-slate uppercase font-semibold">Total Requests</span>
                            <div className="text-sm font-bold text-brand-navy font-mono">
                              {comp.stats?.total_requests || 0}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-brand-slate uppercase font-semibold">Pending Reviews</span>
                            <div className="text-sm font-bold text-amber-700 font-mono">
                              {comp.stats?.pending_verifications || 0}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-brand-slate uppercase font-semibold">Bookings Secured</span>
                            <div className="text-sm font-bold text-emerald-700 font-mono">
                              {comp.stats?.booked_shipments || 0}
                            </div>
                          </div>
                        </div>

                        {/* Operating Modes */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(comp.modes || []).map((m, idx) => (
                            <span key={idx} className="rounded-md bg-white border border-brand-line px-2 py-0.5 text-[10px] font-semibold text-brand-slate">
                              {m}
                            </span>
                          ))}
                        </div>

                        {/* Mapped Company Agents */}
                        <div className="border-t border-brand-line pt-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-brand-marine" />
                              Assigned Agents ({comp.agents?.length || 0})
                            </span>
                            <button
                              onClick={() => {
                                setSelectedCompForAgent(comp)
                                setNewAgentForm({ name: '', email: '', password: '', phone: '' })
                              }}
                              className="text-[11px] font-bold text-brand-orange hover:text-brand-orangeLight flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add Agent
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {(comp.agents || []).map((agt, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-white rounded-lg border border-brand-line px-2.5 py-1.5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-brand-cloud flex items-center justify-center text-[10px] font-bold text-brand-navy">
                                    {(agt.name || agt.email).slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-brand-navy text-[11px] leading-tight">{agt.name || 'Agent'}</div>
                                    <div className="text-[10px] text-brand-slate font-mono">{agt.email}</div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAgent(comp.company_id, agt.email)}
                                  className="text-brand-slateLight hover:text-red-600 p-1 transition-colors"
                                  title="Remove agent from company"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {(!comp.agents || comp.agents.length === 0) && (
                              <div className="text-[11px] text-brand-slateLight italic py-1">
                                No agents mapped yet. Click "+ Add Agent" to onboard an agent with email & password.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="flex items-center justify-between gap-2 border-t border-brand-line pt-3 mt-2">
                        <button
                          onClick={() => handleToggleVerifyCompany(comp)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            comp.is_eligible
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                          }`}
                        >
                          {comp.is_eligible ? (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Suspend Eligibility</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Verify & Approve (Make Eligible)</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => navigate(`/agent?desk=${encodeURIComponent(comp.carrier_key || comp.name)}`)}
                          className="flex items-center gap-1 text-xs font-bold text-brand-navy hover:text-brand-marine px-2 py-1 rounded hover:bg-brand-cloud transition-colors"
                        >
                          <span>Open Carrier Desk</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                {activeCategoryCompanies.filter(c => {
                  if (companyStatusFilter === 'ELIGIBLE' && !c.is_eligible) return false
                  if (companyStatusFilter === 'PENDING' && c.status !== 'PENDING') return false
                  if (companyStatusFilter === 'SUSPENDED' && c.status !== 'SUSPENDED') return false
                  if (!companySearch) return true
                  const s = companySearch.toLowerCase()
                  return (
                    (c.name || '').toLowerCase().includes(s) ||
                    (c.company_id || '').toLowerCase().includes(s) ||
                    (c.carrier_key || '').toLowerCase().includes(s) ||
                    (c.agents || []).some(a => (a.name || '').toLowerCase().includes(s) || (a.email || '').toLowerCase().includes(s))
                  )
                }).length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-brand-line bg-white p-12 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-brand-slateLight mb-3 opacity-60" />
                    <h4 className="font-display text-sm font-bold text-brand-navy">
                      No {selectedServiceCategory === 'OCEAN' ? 'Ocean Freight' : selectedServiceCategory === 'AIR' ? 'Air & Express' : 'Ground & Rail'} carriers found
                    </h4>
                    <p className="text-xs text-brand-slate mt-1 max-w-sm mx-auto">
                      {companySearch || companyStatusFilter !== 'ALL'
                        ? 'No carriers match your active search and status filters. Try resetting the search or filter.'
                        : 'No carriers currently registered in this category. Click "Register Freight Company" above to add one.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {/* Top User Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-slate">Total Registered Users</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold text-brand-navy">{usersList.length}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">All customer, broker & admin accounts</div>
                </div>

                <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-slate">Shippers / Customers</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 font-bold">
                      <Building className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold text-brand-navy">{customerCount}</div>
                  <div className="text-[11px] text-brand-slateLight mt-0.5">External shipper portal access</div>
                </div>

                <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-slate">Brokers / Agents</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 font-bold">
                      <UserCheck className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold text-brand-navy">{agentCount}</div>
                  <div className="text-[11px] text-purple-600 mt-0.5">Quotation evaluation workbench</div>
                </div>

                <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-slate">Pricing Admins</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 font-bold">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold text-brand-navy">{adminRoleCount}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">Full governance & approval access</div>
                </div>
              </div>

              {/* Filter, Search & Create User Strip */}
              <div className="rounded-xl border border-brand-line bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-brand-slateLight" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search user name, email, company, role, or phone..."
                    className="w-full rounded-xl border border-brand-line pl-9 pr-8 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                  {userSearch && (
                    <button onClick={() => setUserSearch('')} className="absolute right-2.5 top-2.5 text-xs text-brand-slate hover:text-brand-navy">×</button>
                  )}
                </div>

                {/* Filter Pills & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-lg border border-brand-line bg-brand-cloud/40 p-1 text-xs">
                    <button
                      onClick={() => setUserRoleFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${userRoleFilter === 'ALL' ? 'bg-brand-navy text-white' : 'text-brand-slate hover:text-brand-navy'}`}
                    >
                      All ({usersList.length})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('CUSTOMER')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${userRoleFilter === 'CUSTOMER' ? 'bg-blue-600 text-white' : 'text-brand-slate hover:text-brand-navy'}`}
                    >
                      Customers ({customerCount})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('AGENT')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${userRoleFilter === 'AGENT' ? 'bg-purple-600 text-white' : 'text-brand-slate hover:text-brand-navy'}`}
                    >
                      Agents ({agentCount})
                    </button>
                    <button
                      onClick={() => setUserRoleFilter('ADMIN')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${userRoleFilter === 'ADMIN' ? 'bg-amber-600 text-white' : 'text-brand-slate hover:text-brand-navy'}`}
                    >
                      Admins ({adminRoleCount})
                    </button>
                  </div>

                  <button
                    onClick={reloadUsers}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud"
                    title="Reload users"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2 text-xs font-semibold text-white shadow-xs hover:shadow-sm transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Create New User</span>
                  </button>
                </div>

              </div>

              {/* Users Data Table */}
              <div className="rounded-xl border border-brand-line bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-brand-line bg-brand-cloud/50 text-[11px] font-semibold text-brand-slate uppercase tracking-wider">
                        <th className="px-5 py-3.5">User Profile</th>
                        <th className="px-5 py-3.5">Company / Shipper</th>
                        <th className="px-5 py-3.5">Role & Access</th>
                        <th className="px-5 py-3.5">Contact Phone</th>
                        <th className="px-5 py-3.5">Account Status</th>
                        <th className="px-5 py-3.5">Registered / Joined</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line/50">
                      {filteredUsers.map((u, i) => {
                        const initials = (u.name || u.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        const roleLower = (u.role || 'customer').toLowerCase()
                        const avatarBg = roleLower === 'admin' ? 'bg-amber-500 text-white' : roleLower === 'agent' ? 'bg-purple-600 text-white' : 'bg-brand-navy text-white'

                        return (
                          <tr key={u.email || i} className="hover:bg-brand-cloud/30 transition-colors">
                            {/* User details */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-display text-xs font-bold shadow-xs ${avatarBg}`}>
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-brand-navy text-xs flex items-center gap-2">
                                    <span>{u.name || 'User'}</span>
                                    {u.created === 'Recent' && (
                                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-brand-slate font-mono">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Company */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs text-brand-navy font-medium">
                                <Building className="h-3.5 w-3.5 text-brand-slateLight flex-shrink-0" />
                                <span>{u.company || 'Enterprise Shipper'}</span>
                              </div>
                            </td>

                            {/* Role with selector */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <RoleBadge role={u.role} />
                                <select
                                  value={roleLower}
                                  onChange={(e) => handleRoleChange(u.email, e.target.value)}
                                  className="rounded-lg border border-brand-line bg-white px-2 py-1 text-[11px] text-brand-navy font-medium focus:border-brand-marine focus:outline-none"
                                  title="Change role"
                                >
                                  <option value="customer">Shipper (User)</option>
                                  <option value="agent">Broker (Agent)</option>
                                  <option value="admin">Pricing Admin</option>
                                </select>
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="px-5 py-3.5 text-xs text-brand-slate font-mono">
                              {u.phone || <span className="italic text-brand-slateLight">N/A</span>}
                            </td>

                            {/* Status Toggle */}
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => handleToggleStatus(u.email, u.active !== false)}
                                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold transition-colors border ${
                                  u.active !== false
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {u.active !== false ? '● Active' : '○ Inactive'}
                              </button>
                            </td>

                            {/* Registered */}
                            <td className="px-5 py-3.5 text-xs text-brand-slate">
                              {u.created || u.since || 'Active'}
                            </td>

                            {/* Delete/Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => handleDeleteUser(u.email, u.name)}
                                className="rounded-lg p-1 text-brand-slateLight hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}

                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-xs text-brand-slate">
                            <Users className="mx-auto mb-2 h-8 w-8 text-brand-slateLight opacity-40" />
                            <p className="font-semibold text-brand-navy">No users found matching your search</p>
                            <p className="text-brand-slateLight mt-0.5">Try searching by email or clearing the role filter.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* MASTER DATABASE TAB */}
          {activeTab === 'masterdata' && (
            <AdminMasterData />
          )}

          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="rounded-xl border border-brand-line bg-white">
              <div className="flex items-center justify-between border-b border-brand-line px-6 py-4">
                <h3 className="text-lg font-bold text-brand-navy">Configured Shipping Lanes</h3>
                <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-slate">{routes.length} lanes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50">
                      {['Route ID', 'Lane', 'Mode', 'Carriers', 'Transit', 'On-time', 'Volume', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map(route => (
                      <tr key={route.id} className="border-b border-brand-line/50 hover:bg-brand-cloud/30">
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-brand-marine">{route.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-brand-navy text-[13px]">{route.lane}</div>
                          <div className="font-mono text-xs text-brand-slate">{route.origin} to {route.dest}</div>
                        </td>
                        <td className="px-5 py-4 text-xs text-brand-slate">{route.mode}</td>
                        <td className="px-5 py-4 text-xs font-semibold text-brand-navy">{route.carriers} lines</td>
                        <td className="px-5 py-4 font-mono text-xs">{route.transit}</td>
                        <td className="px-5 py-4">
                          {route.onTime ? (
                            <span className="font-mono text-xs font-semibold text-emerald-600">{route.onTime}%</span>
                          ) : (
                            <span className="font-mono text-xs text-brand-slateLight">N/A</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-brand-navy">{route.vol} TEU/mo</td>
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
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all registered quotes across all accounts? This cannot be undone.')) {
                      await clearAllQuotes()
                      setQuotes([])
                      toast('All registered quotations cleared successfully.')
                    }
                  }}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  Clear All Quotes
                </button>
                <input
                  value={quoteSearch}
                  onChange={e => setQuoteSearch(e.target.value)}
                  placeholder="Search ID, customer, lane..."
                  className="ml-auto rounded-lg border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50 text-[11px] font-semibold text-brand-slate uppercase tracking-wider">
                      <th className="px-4 py-3">Quote ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Lane</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned Agent</th>
                      <th className="px-4 py-3">Agent Decision</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line/50">
                    {filteredQuotes.map(q => {
                      // Resolve agent from carrier-based routing map
                      const assignedAgent = resolveAssignedAgent(q)
                      const agentDisplayName = q.agent_review?.agent_name || assignedAgent.name
                      return (
                        <tr key={q.id} className="hover:bg-brand-cloud/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-marine whitespace-nowrap">{q.id}</td>
                          <td className="px-4 py-3 text-[13px] font-medium text-brand-navy max-w-[130px] truncate" title={q.customer}>{q.customer || 'N/A'}</td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-mono text-xs text-brand-navy font-semibold">{q.laneCode || 'N/A'}</div>
                            <div className="text-[11px] text-brand-slate max-w-[140px] truncate" title={q.laneName}>{q.laneName || ''}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-slate whitespace-nowrap">{q.mode || 'N/A'}</td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy whitespace-nowrap">
                            {q.agent_price_edit && q.agent_price_edit.revised_price > 0 ? (
                              <div>
                                <span className="text-emerald-700 font-bold">Rs.{Number(q.agent_price_edit.revised_price).toLocaleString('en-IN')}</span>
                                <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 font-sans">Rev</span>
                                <div className="text-[10px] text-brand-slate line-through font-normal">Rs.{Number(q.indicativeTotal || 0).toLocaleString('en-IN')}</div>
                              </div>
                            ) : q.indicativeTotal ? (
                              `Rs.${Number(q.indicativeTotal).toLocaleString('en-IN')}`
                            ) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={resolveEffectiveQuoteStatus(q)} />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-medium text-brand-navy leading-snug">{agentDisplayName}</div>
                            {assignedAgent.short && (
                              <div className="text-[10px] text-brand-slateLight">{assignedAgent.short}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <AgentReviewBadge review={q.agent_review} />
                              {q.agent_review?.reviewed_at && (
                                <div className="mt-0.5 text-[10px] text-brand-slateLight">
                                  {new Date(q.agent_review.reviewed_at).toLocaleDateString('en-GB')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => setInspectQuote(q)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-marine hover:underline"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete quotation ${q.id}? This cannot be undone.`)) {
                                    await deleteQuote(q.id)
                                    setQuotes(prev => prev.filter(item => item.id !== q.id))
                                    toast(`Quotation ${q.id} deleted successfully.`)
                                  }
                                }}
                                title={`Delete quotation ${q.id}`}
                                className="p-1 rounded text-brand-slateLight hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to wipe all shipments across all accounts? This cannot be undone.')) {
                      await clearAllShipments()
                      setShipments([])
                      toast('All shipments wiped successfully across all accounts.')
                    }
                  }}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  Clear All Shipments
                </button>
                <input
                  value={shipSearch}
                  onChange={e => setShipSearch(e.target.value)}
                  placeholder="Search tracking #, user, origin, destination..."
                  className="ml-auto rounded-lg border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-line bg-brand-cloud/50">
                      {['Tracking #', 'Booked By', 'Route', 'Service', 'Weight', 'Cost', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-4 py-3 font-semibold text-brand-slate text-xs uppercase tracking-wide whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map((s, i) => {
                      const shipmentTn = s.tn || s.shipment_id || s.id || ''
                      return (
                        <tr key={shipmentTn || i} className="border-b border-brand-line/50 hover:bg-brand-cloud/30">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-marine">{s.tn || 'N/A'}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-brand-navy text-[13px]">
                              {s.userName || s.destinationContactName || s.customer || (s.user_email ? s.user_email.split('@')[0] : 'Customer')}
                            </div>
                            <div className="text-[11px] text-brand-slate">
                              {s.userCompany || s.destinationCompany || s.user_email || '—'}
                            </div>
                            {s.user_email && (s.userCompany || s.destinationCompany) && (
                              <div className="text-[10px] text-brand-slateLight font-mono">{s.user_email}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-medium text-brand-navy">{s.from} to {s.to}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-slate">{s.service || 'N/A'}</td>
                          <td className="px-4 py-3 font-mono text-xs">{s.weight ? `${Number(s.weight).toLocaleString()} kg` : 'N/A'}</td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">
                            {(() => {
                              const effCost = resolveEffectiveShipmentCost(s, quotes)
                              return effCost ? `Rs.${Number(effCost).toLocaleString('en-IN')}` : (s.cost ? `Rs.${Number(s.cost).toLocaleString('en-IN')}` : 'N/A')
                            })()}
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-slate">{s.date || 'N/A'}</td>
                          <td className="px-4 py-3"><StatusBadge status={resolveEffectiveShipmentStatus(s, quotes)} /></td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete shipment ${shipmentTn}? This cannot be undone.`)) {
                                  await deleteShipmentRequest(shipmentTn)
                                  setShipments(prev => prev.filter(item => (item.tn || item.shipment_id || item.id) !== shipmentTn))
                                  toast(`Shipment ${shipmentTn} deleted successfully.`)
                                }
                              }}
                              title={`Delete shipment ${shipmentTn}`}
                              className="p-1 rounded text-brand-slateLight hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredShipments.length === 0 && (
                      <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-brand-slateLight">No shipments found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-brand-line bg-white shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-brand-line bg-brand-cloud/40 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-brand-navy">Create New Platform User</h3>
                  <p className="text-xs text-brand-slate">Assign role, access permissions, and organization details</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-cloud hover:text-brand-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Full Name <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.name}
                    onChange={e => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Vikram Mehta"
                    className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Email Address <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. vikram@mehtatrade.com"
                    className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Company / Organization <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.company}
                    onChange={e => setNewUserForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g. Mehta Global Exim"
                    className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={e => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98200 12345"
                    className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Platform Role <span className="text-brand-danger">*</span>
                </label>
                <select
                  value={newUserForm.role}
                  onChange={e => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy font-semibold focus:border-brand-marine focus:outline-none bg-white"
                >
                  <option value="customer">Shipper / User (Customer Portal Access)</option>
                  <option value="agent">Broker / Agent (Human Evaluation & Review Queue)</option>
                  <option value="admin">Pricing Manager / Admin (Full Governance & Master Data)</option>
                </select>

                {/* Role Description Helper */}
                <div className="mt-2 rounded-lg bg-brand-cloud/60 p-3 border border-brand-line/60 text-[11px] text-brand-slate">
                  {newUserForm.role === 'customer' && (
                    <span><strong>Customer Role:</strong> Accesses Customer Portal (`/portal`), creates enquiries, views quotes at sell-rate only, and accepts/declines bookings.</span>
                  )}
                  {newUserForm.role === 'agent' && (
                    <span><strong>Broker / Agent Role:</strong> Accesses Review Queue (`/agent`), inspects automated agent findings, modifies routes/surcharges, and evaluates quotations.</span>
                  )}
                  {newUserForm.role === 'admin' && (
                    <span><strong>Admin Role:</strong> Full system governance across all 20 Master Database collections, margin floor policies, approval threshold rules, and user management.</span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1.5">
                  Initial Password <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min 6 characters (e.g. user123)"
                  className="w-full rounded-xl border border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none font-mono"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-brand-line flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-brand-line bg-brand-cloud px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-brand-marinePale hover:text-brand-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-xl bg-brand-navy px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-marine shadow-xs disabled:opacity-50"
                >
                  {creatingUser ? 'Creating Account...' : 'Create Platform User'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
            {/* Quote Inspector Modal */}
        {inspectQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-brand-line bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-brand-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-brand-navy">{inspectQuote.id}</span>
                    <StatusBadge status={resolveEffectiveQuoteStatus(inspectQuote)} />
                    <AgentReviewBadge review={inspectQuote.agent_review} />
                  </div>
                  <p className="text-xs text-brand-slate mt-0.5">{inspectQuote.laneName} · {inspectQuote.mode}</p>
                </div>
                <button onClick={() => setInspectQuote(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-slate hover:bg-brand-cloud hover:text-brand-navy font-bold text-sm" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-brand-cloud/40 p-3 rounded-xl border border-brand-line">
                  <div><span className="text-brand-slate">Customer:</span> <strong className="text-brand-navy block text-[13px]">{inspectQuote.customer}</strong></div>
                  <div><span className="text-brand-slate">Indicative Total:</span> <strong className="text-brand-orange block text-base font-display font-bold">Rs. {Number(inspectQuote.indicativeTotal || 0).toLocaleString('en-IN')}</strong></div>
                  <div><span className="text-brand-slate">Transit Estimate:</span> <strong className="text-brand-navy block">{inspectQuote.transit || '14-18 days'}</strong></div>
                  <div><span className="text-brand-slate">Corridor:</span> <strong className="font-mono text-brand-marine block">{inspectQuote.laneCode}</strong></div>
                </div>

                {inspectQuote.details && (
                  <div>
                    <h5 className="font-semibold text-brand-navy mb-1.5 uppercase text-[11px]">5-Layer Cost Build-Up</h5>
                    <div className="space-y-1 rounded-xl bg-brand-cloud/20 p-3 border border-brand-line">
                      <div className="flex justify-between py-1 border-b border-brand-line/40">
                        <span className="text-brand-slate">1. Ocean Base Freight Rate</span>
                        <span className="font-mono font-semibold text-brand-navy">Included</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand-line/40">
                        <span className="text-brand-slate">2. Mandatory Surcharges (BAF, THC, Doc)</span>
                        <span className="font-mono font-semibold text-brand-navy">Included</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand-line/40">
                        <span className="text-brand-slate">3. Origin & Destination Handling</span>
                        <span className="font-mono font-semibold text-brand-navy">Included</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand-line/40">
                        <span className="text-brand-slate">4. Value Added Services / Insurance</span>
                        <span className="font-mono font-semibold text-brand-navy">Included</span>
                      </div>
                      <div className="flex justify-between py-1 pt-1.5">
                        <span className="font-bold text-brand-navy">5. Total Commercial Selling Price</span>
                        <span className="font-mono font-bold text-brand-orange text-sm">Rs. {Number(inspectQuote.indicativeTotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-line pt-4">
                <button
                  onClick={() => { setInspectQuote(null); navigate(`/quotes/${inspectQuote.id}`) }}
                  className="text-xs font-semibold text-brand-marine hover:underline flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Open Dedicated Page View</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectQuote(inspectQuote.id)}
                    className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-colors"
                  >
                    Reject Quote
                  </button>
                  <button
                    onClick={() => handleApproveQuote(inspectQuote.id)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-xs"
                  >
                    Approve Quotation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* MODAL: ADD AGENT TO COMPANY */}
      {selectedCompForAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-brand-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-brand-line pb-3 mb-4">
              <div>
                <h3 className="font-display font-bold text-brand-navy text-base">Onboard Company Agent</h3>
                <p className="text-xs text-brand-slate">Assign operational agent to {selectedCompForAgent.name} ({selectedCompForAgent.company_id})</p>
              </div>
              <button onClick={() => setSelectedCompForAgent(null)} className="text-brand-slate hover:text-brand-navy p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAgentToCompany} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Agent Full Name</label>
                <input
                  type="text"
                  value={newAgentForm.name}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Agent Email (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={newAgentForm.email}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                  placeholder={`e.g. agent.${selectedCompForAgent.carrier_key.toLowerCase().replace(/[^a-z0-9]/g, '')}@portline.in`}
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newAgentForm.password}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, password: e.target.value })}
                  placeholder="Create secure password for agent"
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={newAgentForm.phone}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, phone: e.target.value })}
                  placeholder="+91 98200 00000"
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-line">
                <button
                  type="button"
                  onClick={() => setSelectedCompForAgent(null)}
                  className="px-4 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAgent}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-orange hover:bg-brand-orangeLight rounded-xl disabled:opacity-50 shadow-xs"
                >
                  {addingAgent ? 'Creating Agent...' : 'Onboard Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW FREIGHT COMPANY */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-brand-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-brand-line pb-3 mb-4">
              <div>
                <h3 className="font-display font-bold text-brand-navy text-base">Register New Freight Carrier Company</h3>
                <p className="text-xs text-brand-slate">Add a new freight provider, set SLA commitments, and enable customer recommendations.</p>
              </div>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-brand-slate hover:text-brand-navy p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Service Category *</label>
                <select
                  value={newCompanyForm.service_category || 'OCEAN'}
                  onChange={(e) => {
                    const cat = e.target.value
                    let defaultModes = 'Ocean FCL, Ocean LCL'
                    let defaultTier = 'Tier 1 Strategic Ocean Carrier'
                    let defaultSla = '2h Standard SLA'
                    if (cat === 'AIR') {
                      defaultModes = 'Air Standard, Express Air Cargo'
                      defaultTier = 'Scheduled Cargo Airline Tier 1'
                      defaultSla = '1h Priority SLA'
                    } else if (cat === 'GROUND_RAIL') {
                      defaultModes = 'Rail Intermodal ICD, Full Truckload (FTL)'
                      defaultTier = 'National Railhead & Road Hub'
                      defaultSla = '2h Standard SLA'
                    }
                    setNewCompanyForm(prev => ({
                      ...prev,
                      service_category: cat,
                      modes: defaultModes,
                      contract_tier: defaultTier,
                      sla_hours: defaultSla
                    }))
                  }}
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy bg-brand-cloud/20 focus:border-brand-marine focus:outline-none"
                >
                  <option value="OCEAN">🌊 Ocean Freight (FCL / LCL)</option>
                  <option value="AIR">✈️ Air & Express Air</option>
                  <option value="GROUND_RAIL">🚆 Ground & Rail (ICD / Intermodal / Road)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Company Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCompanyForm.name}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                    placeholder="e.g. ZIM Integrated Shipping"
                    className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Carrier Short Key</label>
                  <input
                    type="text"
                    value={newCompanyForm.carrier_key}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, carrier_key: e.target.value })}
                    placeholder="e.g. ZIM"
                    className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">Contract / Partnership Tier</label>
                  <input
                    type="text"
                    value={newCompanyForm.contract_tier}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, contract_tier: e.target.value })}
                    placeholder="e.g. Tier 1 Ocean Carrier"
                    className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">SLA Review Time Window</label>
                  <input
                    type="text"
                    value={newCompanyForm.sla_hours}
                    onChange={(e) => setNewCompanyForm({ ...newCompanyForm, sla_hours: e.target.value })}
                    placeholder="e.g. 2h Standard SLA"
                    className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Company Manager Email</label>
                <input
                  type="email"
                  value={newCompanyForm.manager_email}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, manager_email: e.target.value })}
                  placeholder="manager.zim@portline.in"
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">Operational Freight Modes (comma-separated)</label>
                <input
                  type="text"
                  value={newCompanyForm.modes}
                  onChange={(e) => setNewCompanyForm({ ...newCompanyForm, modes: e.target.value })}
                  placeholder="Ocean FCL, Ocean LCL, Rail Intermodal"
                  className="w-full rounded-xl border border-brand-line px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-line">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCompany}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-navy hover:bg-brand-marine rounded-xl disabled:opacity-50 shadow-xs"
                >
                  {creatingCompany ? 'Registering...' : 'Register & Verify Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
