import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, User, Container, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  const redirectTo = searchParams.get('redirect') || '/portal'
  const [tab, setTab] = useState(initialTab)
  const navigate = useNavigate()
  const { login, loginDemo, signup } = useApp()
  const toast = useToast()

  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPw, setSiShowPw] = useState(false)
  const [siError, setSiError] = useState('')
  const [siLoading, setSiLoading] = useState(false)

  const [suName, setSuName] = useState('')
  const [suCompany, setSuCompany] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suShowPw, setSuShowPw] = useState(false)
  const [suError, setSuError] = useState('')
  const [suLoading, setSuLoading] = useState(false)

  const afterLogin = (userObj) => {
    const nameStr = userObj?.name || userObj?.email || 'User'
    const firstName = nameStr.split(' ')[0] || 'User'
    toast(`Welcome back, ${firstName}!`)
    navigate(redirectTo)
  }

  const handleSignin = async (e) => {
    e.preventDefault()
    if (!siEmail.trim() || !siPassword.trim()) {
      setSiError('Enter an email and password to continue.')
      return
    }
    setSiError('')
    setSiLoading(true)
    try {
      const userObj = await login({ email: siEmail.trim(), password: siPassword.trim() })
      afterLogin(userObj)
    } catch (err) {
      setSiError(err.message || 'Could not log in — please try again.')
    } finally {
      setSiLoading(false)
    }
  }

  const handleDemo = async () => {
    const userObj = await loginDemo()
    afterLogin(userObj)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!suEmail.trim() || !suPassword.trim()) {
      setSuError('Enter an email and password to continue.')
      return
    }
    setSuError('')
    setSuLoading(true)
    try {
      const userObj = await signup({
        name: suName.trim(),
        company: suCompany.trim(),
        email: suEmail.trim(),
        password: suPassword.trim()
      })
      afterLogin(userObj)
    } catch (err) {
      setSuError(err.message || 'Could not create account — please try again.')
    } finally {
      setSuLoading(false)
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT — brand panel */}
      <div className="chart-grid relative hidden h-full flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white md:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_700px_400px_at_20%_90%,rgba(217,80,10,.25),transparent_60%)]" />
        <Link to="/" className="relative z-10 flex items-center gap-2.5 font-display text-lg font-bold">
          <Container className="h-[34px] w-[34px] text-brand-orangeLight" strokeWidth={1.6} />
          Freight Quote Generator
        </Link>
        <div className="relative z-10 max-w-[400px]">
          <p className="font-display text-[22px] leading-snug">
            "We moved our entire supply chain onto this platform. Live tracking alone paid for itself in the first quarter."
          </p>
          <div className="mt-4 font-mono text-[13px] text-slate-400">— Head of Logistics, Mehta Exports Pvt. Ltd.</div>
        </div>
        <div className="relative z-10 font-mono text-[11px] tracking-wide text-slate-500">© 2026 FREIGHT QUOTE GENERATOR</div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex h-full items-center justify-center overflow-y-auto bg-white px-6 py-6 sm:px-8">
        <div className="w-full max-w-[380px] py-2">
          <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-brand-slate">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to site
          </Link>

          <div className="mb-5 flex gap-1.5 rounded-[11px] bg-brand-cloud p-1.5">
            <TabButton active={tab === 'signin'} onClick={() => { setTab('signin'); setSiError(''); setSuError('') }}>Log in</TabButton>
            <TabButton active={tab === 'signup'} onClick={() => { setTab('signup'); setSiError(''); setSuError('') }}>Create account</TabButton>
          </div>

          {tab === 'signin' ? (
            <>
              <h2 className="mb-1.5 text-[25px]">Welcome back</h2>
              <p className="mb-5 text-sm text-brand-slate">Log in to manage your shipments.</p>

              {siError && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[10px] bg-brand-dangerBg p-3 text-xs font-semibold text-brand-danger">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {siError}
                </div>
              )}

              <form onSubmit={handleSignin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold">Email address</label>
                  <input
                    type="email"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold">Password</label>
                  <div className="relative">
                    <input
                      type={siShowPw ? 'text' : 'password'}
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-[10px] border-[1.5px] border-brand-line pl-3.5 pr-10 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPw(!siShowPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slateLight"
                    >
                      {siShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={siLoading}
                  className="w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                >
                  {siLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-brand-slateLight">
                <div className="h-px flex-1 bg-brand-line" /> or quick demo <div className="h-px flex-1 bg-brand-line" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDemo}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-brand-line py-2.5 text-xs font-semibold text-brand-navy hover:bg-brand-cloud transition-colors"
                >
                  <User className="h-4 w-4 text-brand-marine" /> Customer Demo (Ravi)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setSiEmail('admin@portline.in')
                      setSiPassword('admin123')
                      setSiError('')
                      setSiLoading(true)
                      try {
                        const userObj = await login({ email: 'admin@portline.in', password: 'admin123' })
                        afterLogin(userObj)
                      } catch (err) {
                        setSiError(err.message)
                      } finally {
                        setSiLoading(false)
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-[10px] border border-blue-200 bg-blue-50/70 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    🛡️ Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSiEmail('agent@portline.in')
                      setSiPassword('agent123')
                      setSiError('')
                      setSiLoading(true)
                      try {
                        const userObj = await login({ email: 'agent@portline.in', password: 'agent123' })
                        afterLogin(userObj)
                      } catch (err) {
                        setSiError(err.message)
                      } finally {
                        setSiLoading(false)
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-[10px] border border-amber-200 bg-amber-50/70 py-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    👤 Agent Demo
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1.5 text-[25px]">Create an account</h2>
              <p className="mb-5 text-sm text-brand-slate">Get instant access to live freight estimates.</p>

              {suError && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[10px] bg-brand-dangerBg p-3 text-xs font-semibold text-brand-danger">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {suError}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Full name</label>
                  <input
                    type="text"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    required
                    className="w-full rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Company name</label>
                  <input
                    type="text"
                    value={suCompany}
                    onChange={(e) => setSuCompany(e.target.value)}
                    placeholder="e.g. Sharma Textiles"
                    required
                    className="w-full rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Email address</label>
                  <input
                    type="email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full rounded-[10px] border-[1.5px] border-brand-line px-3.5 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Password</label>
                  <div className="relative">
                    <input
                      type={suShowPw ? 'text' : 'password'}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-[10px] border-[1.5px] border-brand-line pl-3.5 pr-10 py-2.5 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPw(!suShowPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slateLight"
                    >
                      {suShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={suLoading}
                  className="w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                >
                  {suLoading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-[8px] py-2 text-xs font-semibold transition-all ${
        active ? 'bg-white text-brand-navy shadow-xs' : 'text-brand-slate hover:text-brand-navy'
      }`}
    >
      {children}
    </button>
  )
}
