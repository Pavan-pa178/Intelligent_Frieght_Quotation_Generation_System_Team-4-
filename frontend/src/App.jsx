import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import Services from './pages/Services'
import Tracking from './pages/Tracking'
import Ship from './pages/Ship'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import RoutesPage from './pages/Routes'
import Portal from './pages/Portal'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Agent from './pages/Agent'
import CustomsWorkspace from './pages/CustomsWorkspace'
import AgentOperations from './pages/AgentOperations'
import AnalyticsManagement from './pages/AnalyticsManagement'
import Profile from './pages/Profile'

import { useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext'

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    const resetScroll = () => {
      document.documentElement.style.scrollBehavior = 'auto'
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      } catch {
        window.scrollTo(0, 0)
      }
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      document.documentElement.style.scrollBehavior = ''
    }

    resetScroll()

    const rafId = requestAnimationFrame(resetScroll)
    return () => cancelAnimationFrame(rafId)
  }, [location.pathname, location.search, location.key])

  return null
}

function RoleRouteGuard({ children }) {
  const { loggedIn, user } = useApp()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Role-based guards - allow inspecting quotes, details, and personal profile
    if (loggedIn) {
      if (user?.role === 'customer' && pathname === '/profile') {
        navigate('/portal', { replace: true })
        return
      }

      const isQuoteRoute = pathname === '/quotes' || pathname.startsWith('/quotes/')
      const isProfileRoute = pathname === '/profile'
      if (isProfileRoute || isQuoteRoute) return

      if (user?.role === 'admin' && pathname !== '/admin') {
        navigate('/admin', { replace: true })
      } else if (user?.role === 'customs_officer' && !pathname.startsWith('/customs')) {
        navigate('/customs', { replace: true })
      } else if (user?.role === 'agent_operator' && !pathname.startsWith('/agents')) {
        navigate('/agents', { replace: true })
      } else if (user?.role === 'manager' && !pathname.startsWith('/analytics')) {
        navigate('/analytics', { replace: true })
      } else if ((user?.role === 'agent' || user?.role === 'broker') && !pathname.startsWith('/agent')) {
        navigate('/agent', { replace: true })
      }
    }
  }, [loggedIn, user, pathname, navigate])

  return children
}

function LayoutChrome({ children }) {
  const { pathname } = useLocation()
  const { loggedIn, user } = useApp()
  const isAuthPage = pathname === '/login'
  const isWorkspace = ['admin', 'customs_officer', 'agent_operator', 'manager'].includes(user?.role)
  const isWorkspacePage = pathname.startsWith('/admin') || pathname.startsWith('/customs') || pathname.startsWith('/agents') || pathname.startsWith('/analytics')

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isAuthPage)
    return () => document.body.classList.remove('overflow-hidden')
  }, [isAuthPage])

  return (
    <>
      {!isAuthPage && <Navbar />}
      <main className={isAuthPage ? '' : 'pt-[72px]'}>
        <RoleRouteGuard>
          {children}
        </RoleRouteGuard>
      </main>
      {!isAuthPage && !isWorkspacePage && !isWorkspace && <Footer />}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <ScrollToTop />
          <LayoutChrome>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/tracking" element={<Tracking />} />
                <Route path="/ship" element={<Ship />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/quotes/:id" element={<QuoteDetail />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/portal" element={<Portal />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/agent" element={<Agent />} />
                <Route path="/customs" element={<CustomsWorkspace />} />
                <Route path="/agents" element={<AgentOperations />} />
                <Route path="/analytics" element={<AnalyticsManagement />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </ErrorBoundary>
          </LayoutChrome>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}
