import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
import Services from './pages/Services'
import Tracking from './pages/Tracking'
import Ship from './pages/Ship'
import Portal from './pages/Portal'
import Contact from './pages/Contact'
import Login from './pages/Login'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function LayoutChrome({ children }) {
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login'

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isAuthPage)
    return () => document.body.classList.remove('overflow-hidden')
  }, [isAuthPage])

  return (
    <>
      {!isAuthPage && <Navbar />}
      <main className={isAuthPage ? '' : 'pt-[72px]'}>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <ScrollToTop />
        <LayoutChrome>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/ship" element={<Ship />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </LayoutChrome>
      </ToastProvider>
    </AppProvider>
  )
}
