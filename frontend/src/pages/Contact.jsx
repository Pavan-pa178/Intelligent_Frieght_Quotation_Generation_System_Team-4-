import { useState } from 'react'
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import Reveal from '../components/Reveal'
import { useToast } from '../context/ToastContext'
import { sendContactMessage } from '../lib/api'

const OFFICES = [
  { name: 'Mumbai, Maharashtra', coord: '19.0760°N, 72.8777°E', tag: 'HQ' },
  { name: 'New Delhi, Delhi', coord: '28.6139°N, 77.2090°E', tag: 'NORTH HUB' },
  { name: 'Chennai, Tamil Nadu', coord: '13.0827°N, 80.2707°E', tag: 'SOUTH HUB' },
  { name: 'Kolkata, West Bengal', coord: '22.5726°N, 88.3639°E', tag: 'EAST HUB' },
]

export default function Contact() {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', subject: 'Get a rate', message: '' })
  const [sending, setSending] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await sendContactMessage(form)
      toast('Message sent — we will reply within a few hours')
      setForm({ name: '', email: '', subject: 'Get a rate', message: '' })
    } catch (err) {
      toast(err.message || 'Could not send message — please try again')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageBanner crumb="Contact" title="Talk to our freight team" subtitle="Questions about a rate, a route, or an existing shipment — we usually reply within a few hours." icon={Mail} />
      <section className="py-16">
        <div className="mx-auto grid max-w-[1220px] grid-cols-1 gap-10 px-8 sm:px-5 md:grid-cols-2">
          <Reveal>
            <InfoRow icon={Phone} title="Call us" text="+91 22 4890 1200 · Mon–Sat, 9:30am–7pm IST" />
            <InfoRow icon={Mail} title="Email us" text="hello@portline.in" />
            <InfoRow icon={MapPin} title="Headquarters" text="18th Floor, One BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051" />
            <div className="mt-[26px] flex flex-col gap-3.5">
              {OFFICES.map((o) => (
                <div key={o.name} className="flex items-center justify-between rounded-xl border border-brand-line bg-white px-[18px] py-4 transition-colors hover:border-brand-marine">
                  <div>
                    <div className="flex items-center gap-2 text-[14.5px] font-semibold"><MapPin className="h-3.5 w-3.5 text-brand-orange" /> {o.name}</div>
                    <div className="mt-1 font-mono text-[11.5px] text-brand-slateLight">{o.coord}</div>
                  </div>
                  <span className="rounded-full bg-brand-marinePale px-2.5 py-1 font-mono text-[10.5px] font-semibold text-brand-marine">{o.tag}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <form onSubmit={handleSubmit} className="rounded-lg2 border border-brand-line bg-white p-[30px] shadow-sm2">
              <Field label="Full name">
                <input value={form.name} onChange={set('name')} required placeholder="Your name" className={inputClass} />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={set('email')} type="email" required placeholder="you@company.com" className={inputClass} />
              </Field>
              <Field label="Subject">
                <select value={form.subject} onChange={set('subject')} className={inputClass}>
                  {['Get a rate', 'Track a shipment', 'Billing question', 'Partnership', 'Other'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Message">
                <textarea value={form.message} onChange={set('message')} required placeholder="How can we help?" rows={4} className={`${inputClass} resize-y`} />
              </Field>
              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] disabled:opacity-60"
              >
                <ArrowRight className="h-[18px] w-[18px]" /> {sending ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </>
  )
}

const inputClass = 'w-full rounded-[9px] border-[1.5px] border-brand-line px-4 py-3.5 text-[14.5px] leading-normal transition-all focus:border-brand-marine focus:outline-none focus:ring-4 focus:ring-brand-marinePale'

function Field({ label, children }) {
  return (
    <div className="mb-[18px]">
      <label className="mb-1.5 block text-[13px] font-semibold text-brand-navy">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ icon: Icon, title, text }) {
  return (
    <div className="mb-5 flex items-start gap-3.5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-brand-orangePale text-brand-orange">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h5 className="mb-0.5 text-[14.5px] font-semibold">{title}</h5>
        <p className="text-[13.5px] text-brand-slate">{text}</p>
      </div>
    </div>
  )
}
