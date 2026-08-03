import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, Container } from 'lucide-react'
import { useApp } from '../context/AppContext'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/portal', label: 'Customer Portal' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { loggedIn, user, logout } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', mobileOpen)
  }, [mobileOpen])

  const linkClass = ({ isActive }) =>
    `relative rounded-lg px-4 py-2.5 text-[14.5px] font-medium transition-colors ${
      isActive ? 'text-white after:absolute after:bottom-1 after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-brand-orangeLight' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-[900] h-[72px] border-b border-white/5 bg-brand-navy/95 backdrop-blur-md transition-shadow ${
          scrolled ? 'shadow-[0_12px_30px_-14px_rgba(0,0,0,.5)]' : ''
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1220px] items-center justify-between gap-6 px-8 sm:px-5">
          <Link to="/" className="flex items-center gap-2.5 font-display text-[19px] font-bold tracking-wide text-white">
            <Container className="h-[34px] w-[34px] text-brand-orangeLight" strokeWidth={1.6} />
            <span>
              PORTLINE
              <small className="mt-0.5 block font-mono text-[9px] font-normal tracking-[.18em] text-slate-400">
                GLOBAL FREIGHT FORWARDING
              </small>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={linkClass} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            {loggedIn ? (
              <button
                onClick={() => navigate('/portal')}
                className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3.5 text-white transition-colors hover:bg-white/10 sm:flex"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeLight font-display text-xs font-bold">
                  {user?.name?.charAt(0) || 'A'}
                </span>
                <span className="text-[13.5px] font-semibold">{user?.name?.split(' ')[0] || 'Account'}</span>
              </button>
            ) : (
              <div className="hidden items-center gap-2.5 sm:flex">
                <Link to="/login" className="rounded-lg px-3.5 py-2.5 text-[14.5px] font-semibold text-slate-300 transition-colors hover:bg-brand-marinePale/10 hover:text-white">
                  Log in
                </Link>
                <Link
                  to="/ship"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5"
                >
                  Get a Quote
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

      {}
      <div
        className={`fixed inset-0 z-[950] flex flex-col bg-brand-navy px-6 pb-10 pt-6 transition-transform duration-300 ease-brand md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <span className="font-display text-[17px] font-bold text-white">Freight Quote Generator</span>
          <button onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center text-white" aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className="border-b border-white/10 py-3.5 font-display text-2xl text-white"
          >
            {item.label}
          </Link>
        ))}
        {loggedIn ? (
          <button
            onClick={() => { logout(); setMobileOpen(false); navigate('/') }}
            className="mt-6 rounded-[10px] border border-white/30 py-3.5 text-center font-semibold text-white"
          >
            Log out
          </button>
        ) : (
          <>
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
