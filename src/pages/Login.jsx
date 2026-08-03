import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff, User, Container, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

export default function Login() {
  const [tab, setTab] = useState('signin')
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
  const [suLoading, setSuLoading] = useState(false)

  const afterLogin = (user) => {
    toast(`Welcome back, ${user.name.split(' ')[0]}!`)
    navigate('/portal')
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
      const user = await login({ email: siEmail, password: siPassword })
      afterLogin(user)
    } catch (err) {
      setSiError(err.message || 'Could not log in — please try again.')
    } finally {
      setSiLoading(false)
    }
  }

  const handleDemo = async () => {
    const user = await loginDemo()
    afterLogin(user)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setSuLoading(true)
    try {
      const user = await signup({ name: suName, company: suCompany, email: suEmail, password: suPassword })
      afterLogin(user)
    } catch (err) {
      toast(err.message || 'Could not create account — please try again.')
    } finally {
      setSuLoading(false)
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT — brand panel (hidden on small screens so the form always fits without scrolling) */}
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

      {/* RIGHT — form panel (fills the locked viewport; scrolls internally only if a very short screen needs it) */}
      <div className="flex h-full items-center justify-center overflow-y-auto bg-white px-6 py-6 sm:px-8">
        <div className="w-full max-w-[380px] py-2">
          <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-brand-slate">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to site
          </Link>

          <div className="mb-5 flex gap-1.5 rounded-[11px] bg-brand-cloud p-1.5">
            <TabButton active={tab === 'signin'} onClick={() => setTab('signin')}>Log in</TabButton>
            <TabButton active={tab === 'signup'} onClick={() => setTab('signup')}>Create account</TabButton>
          </div>

          {tab === 'signin' ? (
            <>
              <h2 className="mb-1.5 text-[25px]">Welcome back</h2>
              <p className="mb-5 text-sm text-brand-slate">Log in to manage your shipments.</p>

              {siError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-dangerBg px-3.5 py-2.5 text-[13px] text-brand-danger">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {siError}
                </div>
              )}

              <form onSubmit={handleSignin}>
                <Field label="Email">
                  <input value={siEmail} onChange={(e) => setSiEmail(e.target.value)} type="email" placeholder="you@company.com" className={inputClass} />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <input value={siPassword} onChange={(e) => setSiPassword(e.target.value)} type={siShowPw ? 'text' : 'password'} placeholder="••••••••" className={inputClass} />
                    <button type="button" onClick={() => setSiShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slateLight">
                      {siShowPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </Field>
                <div className="mb-4 mt-1 flex items-center justify-between text-[13px]">
                  <label className="flex items-center gap-1.5 text-brand-slate">
                    <input type="checkbox" className="accent-brand-orange" /> Remember me
                  </label>
                  <a href="#" className="font-semibold text-brand-marine">Forgot password?</a>
                </div>
                <button type="submit" disabled={siLoading} className="w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 text-[14.5px] font-semibold text-white disabled:opacity-60">
                  {siLoading ? 'Logging in…' : 'Log in'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3.5 text-xs text-brand-slateLight">
                <span className="h-px flex-1 bg-brand-line" /> OR <span className="h-px flex-1 bg-brand-line" />
              </div>
              <button onClick={handleDemo} className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-brand-line bg-white py-3.5 text-[14.5px] font-semibold shadow-sm2">
                <User className="h-[18px] w-[18px]" /> Continue with demo account
              </button>
              <div className="mt-4 text-center text-[13.5px] text-brand-slate">
                New here? <button onClick={() => setTab('signup')} className="font-semibold text-brand-marine">Create an account</button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1.5 text-[25px]">Create your account</h2>
              <p className="mb-5 text-sm text-brand-slate">Get instant quotes and live tracking on every shipment.</p>
              <form onSubmit={handleSignup}>
                <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <Field label="Full name"><input value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Priya Sharma" className={inputClass} /></Field>
                  <Field label="Company"><input value={suCompany} onChange={(e) => setSuCompany(e.target.value)} placeholder="Company name" className={inputClass} /></Field>
                </div>
                <Field label="Email"><input value={suEmail} onChange={(e) => setSuEmail(e.target.value)} type="email" placeholder="you@company.com" className={inputClass} /></Field>
                <Field label="Password">
                  <div className="relative">
                    <input value={suPassword} onChange={(e) => setSuPassword(e.target.value)} type={suShowPw ? 'text' : 'password'} placeholder="Minimum 8 characters" className={inputClass} />
                    <button type="button" onClick={() => setSuShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slateLight">
                      {suShowPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </Field>
                <button type="submit" disabled={suLoading} className="mt-1.5 w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 text-[14.5px] font-semibold text-white disabled:opacity-60">
                  {suLoading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <div className="mt-4 text-center text-[13.5px] text-brand-slate">
                Already have an account? <button onClick={() => setTab('signin')} className="font-semibold text-brand-marine">Log in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full rounded-[9px] border-[1.5px] border-brand-line px-4 py-3.5 text-[14.5px] leading-normal transition-all focus:border-brand-marine focus:outline-none focus:ring-4 focus:ring-brand-marinePale'

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[13px] font-semibold text-brand-navy">{label}</label>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2.5 text-center text-[13.5px] font-semibold transition-colors ${
        active ? 'bg-white text-brand-navy shadow-sm2' : 'text-brand-slate'
      }`}
    >
      {children}
    </button>
  )
}
