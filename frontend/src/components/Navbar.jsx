import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Container, LogOut, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

const CUSTOMER_NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/quotes', label: 'Quotations' },
  { to: '/routes', label: 'Routes' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/contact', label: 'Contact' },
]

const AGENT_NAV_ITEMS = [
  { to: '/agent', label: 'Agent Workspace' },
]

const CUSTOMS_NAV_ITEMS = [
  { to: '/customs', label: 'Customs Workspace' },
]

const AGENT_OP_NAV_ITEMS = [
  { to: '/agents', label: 'AI Agent Operations' },
  { to: '/quotes', label: 'Quotations' },
  { to: '/routes', label: 'Routes' },
]

const MANAGER_NAV_ITEMS = [
  { to: '/analytics', label: 'Executive Analytics' },
  { to: '/quotes', label: 'Quotations' },
  { to: '/routes', label: 'Routes' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { loggedIn, user, logout } = useApp()
  const navigate = useNavigate()
  const toast = useToast()

  const role = user?.role || 'customer'
  const isAdmin = loggedIn && role === 'admin'
  const isCustoms = loggedIn && role === 'customs_officer'
  const isAgentOp = loggedIn && role === 'agent_operator'
  const isManager = loggedIn && role === 'manager'
  const isAgent = loggedIn && (role === 'agent' || role === 'broker')
  
  const navItems = isCustoms ? CUSTOMS_NAV_ITEMS : (isAgentOp ? AGENT_OP_NAV_ITEMS : (isManager ? MANAGER_NAV_ITEMS : (isAgent ? AGENT_NAV_ITEMS : CUSTOMER_NAV_ITEMS)))

  const getWorkspacePath = () => {
    if (isAdmin) return '/admin'
    if (isCustoms) return '/customs'
    if (isAgentOp) return '/agents'
    if (isManager) return '/analytics'
    if (isAgent) return '/agent'
    return '/portal'
  }

  const getRoleLabel = () => {
    if (isAdmin) return 'Admin'
    if (isCustoms) return 'Customs Officer'
    if (isAgentOp) return 'AI Ops'
    if (isManager) return 'Analytics Mgr'
    if (isAgent) return 'Agent'
    return 'Shipper'
  }

  const getBrandHomeLink = () => {
    if (isAdmin) return '/admin'
    if (isCustoms) return '/customs'
    if (isAgentOp) return '/agents'
    if (isManager) return '/analytics'
    if (isAgent) return '/agent'
    return '/'
  }

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-amber-500 text-white'
    if (isCustoms) return 'bg-orange-600 text-white'
    if (isAgentOp) return 'bg-indigo-600 text-white'
    if (isManager) return 'bg-emerald-600 text-white'
    if (isAgent) return 'bg-purple-600 text-white'
    return 'bg-brand-orange text-white'
  }

  const handleLogout = () => {
    logout()
    toast('Logged out successfully')
    navigate('/login')
  }

  const handleNavClick = () => {
    document.documentElement.style.scrollBehavior = 'auto'
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch {
      window.scrollTo(0, 0)
    }
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.documentElement.style.scrollBehavior = ''
    setMobileOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', mobileOpen)
  }, [mobileOpen])

  const linkClass = ({ isActive }) =>
    `relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
      isActive ? 'text-white after:absolute after:bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-brand-orangeLight' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-[900] h-[72px] border-b border-white/5 bg-brand-navy/95 backdrop-blur-md transition-shadow ${
          scrolled ? 'shadow-[0_12px_30px_-14px_rgba(0,0,0,.5)]' : ''
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link to={getBrandHomeLink()} onClick={handleNavClick} className="flex items-center gap-3 shrink-0 group py-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange to-brand-orangeLight/80 p-2 text-white shadow-md shadow-brand-orange/20 transition-transform group-hover:scale-105">
              <Container className="h-6 w-6 text-white" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col max-w-[220px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[500px]">
              <span className="font-display text-[13px] sm:text-[14.5px] lg:text-[15.5px] font-bold tracking-tight text-white leading-tight group-hover:text-brand-orangeLight transition-colors line-clamp-1 sm:line-clamp-none">
                Agentic AI for Maritime Freight Pricing and Route Optimization
              </span>
              <small className="mt-0.5 block font-mono text-[9px] font-bold uppercase tracking-[.2em] text-brand-orangeLight">
                {isAdmin ? 'PORTLINE · ADMIN CONSOLE' : isCustoms ? 'PORTLINE · CUSTOMS DESK' : isAgentOp ? 'PORTLINE · AI OPERATIONS' : isManager ? 'PORTLINE · REVENUE & ANALYTICS' : isAgent ? 'PORTLINE · BROKER PORTAL' : 'PORTLINE'}
              </small>
            </div>
          </Link>

          {/* Center Links ? Hidden for Admin to avoid duplicating Admin Panel tabs */}
          {!isAdmin && (
            <ul className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} onClick={handleNavClick} className={linkClass} end={item.to === '/'}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            {loggedIn ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate(user?.role === 'customer' ? '/portal' : '/profile')}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3.5 text-white transition-colors hover:bg-white/10"
                  title={user?.role === 'customer' ? 'My Customer Portal' : 'View Profile'}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold shadow-xs ${getRoleBadgeColor()}`}>
                    {user?.name?.charAt(0) || 'P'}
                  </span>
                  <div className="text-left hidden sm:block">
                    <span className="text-[13px] font-semibold text-white block leading-tight">{user?.name?.split(' ')[0] || 'User'}</span>
                    <span className="text-[10px] text-slate-400 font-mono block leading-none">{getRoleLabel()}</span>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 hover:text-red-200 transition-colors shadow-xs"
                  title="Log out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/ship"
                  onClick={handleNavClick}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5"
                >
                  New Enquiry
                </Link>

                <Link to="/login" onClick={handleNavClick} className="rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                  Log in
                </Link>
              </div>
            )}

            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-[950] flex flex-col bg-brand-navy p-8 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange to-brand-orangeLight p-1.5 text-white">
              <Container className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <span className="font-display text-sm font-bold text-white block leading-tight">
                Agentic AI for Maritime Freight Pricing and Route Optimization
              </span>
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[.18em] text-brand-orangeLight block mt-0.5">
                PORTLINE
              </span>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center text-white shrink-0" aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>

        {loggedIn ? (
          <div className="space-y-4">
            <button
              onClick={() => { navigate(user?.role === 'customer' ? '/portal' : '/profile'); setMobileOpen(false) }}
              className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="text-xs text-brand-orange font-mono">Logged in as {getRoleLabel()}</div>
                <div className="font-bold text-sm mt-1">{user?.name}</div>
                <div className="text-xs text-slate-400">{user?.email}</div>
              </div>
              <span className="text-xs text-brand-orangeLight font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                {user?.role === 'customer' ? 'My Portal' : 'View Profile'} &rarr;
              </span>
            </button>

            <Link
              to={user?.role === 'customer' ? '/portal' : '/profile'}
              onClick={handleNavClick}
              className="flex items-center gap-2.5 border-b border-white/10 py-3 font-display text-lg text-white hover:text-brand-orangeLight transition-colors"
            >
              <User className="h-5 w-5 text-brand-orangeLight" />
              <span>{user?.role === 'customer' ? 'My Portal & Profile' : 'My Profile & Settings'}</span>
            </Link>

            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className="block border-b border-white/10 py-3 font-display text-xl text-white"
              >
                {item.label}
              </Link>
            ))}

            <button
              onClick={() => { handleLogout(); setMobileOpen(false) }}
              className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-center font-semibold text-white shadow-xs"
            >
              <LogOut className="h-5 w-5" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="border-b border-white/10 py-3.5 font-display text-2xl text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-6 rounded-[10px] border border-white/30 py-3.5 text-center font-semibold text-white">
              Log in
            </Link>
            <Link to="/ship" onClick={() => setMobileOpen(false)} className="mt-3 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 text-center font-semibold text-white">
              Get a Quote
            </Link>
          </>
        )}
      </div>
    </>
  )
}
