import { Link } from 'react-router-dom'
import { ArrowRight, Search, CheckCircle2, Ship, Plane, Truck, Warehouse } from 'lucide-react'
import Reveal from '../components/Reveal'
import RouteHero from '../components/RouteHero'
import { useReveal } from '../hooks/useReveal'
import { useCountUp } from '../hooks/useCountUp'

const SERVICES = [
  { icon: Ship, title: 'Ocean Freight', desc: 'FCL & LCL container shipping across 200+ trade lanes.' },
  { icon: Plane, title: 'Air Freight', desc: 'Express and standard air cargo for time-critical loads.' },
  { icon: Truck, title: 'Ground & Rail', desc: 'Door-to-door trucking and intermodal rail across regions.' },
  { icon: Warehouse, title: 'Warehousing', desc: 'Bonded storage, fulfillment and customs brokerage on-site.' },
]

const STEPS = [
  { n: 1, title: 'Book online', desc: 'Fill in your shipment details and get an instant estimate.' },
  { n: 2, title: 'Pack & label', desc: 'We send pickup-ready labels and packing guidance.' },
  { n: 3, title: 'We collect', desc: 'A carrier picks up from your door on the scheduled date.' },
  { n: 4, title: 'In transit', desc: 'Track every checkpoint live from pickup to customs.' },
  { n: 5, title: 'Delivered', desc: 'Proof of delivery and invoice land in your portal.' },
]

const STATS = [
  { target: 48, suffix: '', label: 'Countries served' },
  { target: 12400, suffix: '+', label: 'Shipments delivered' },
  { target: 99.2, suffix: '%', label: 'On-time delivery rate', decimals: 1 },
  { target: 24, suffix: '/7', label: 'Live tracking support' },
]

export default function Home() {
  return (
    <>
      {/* HERO */}
      <div className="chart-grid relative overflow-hidden bg-brand-navy text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_900px_500px_at_78%_15%,rgba(46,109,168,.35),transparent_60%)]" />
        <div className="relative z-10 mx-auto grid max-w-[1220px] grid-cols-1 items-center gap-10 px-8 py-16 sm:px-5 md:grid-cols-[1.05fr_0.95fr] md:py-24">
          <div className="reveal in">
            <div className="mb-4 flex items-center gap-2 font-mono text-[11.5px] font-semibold uppercase tracking-[.16em] text-brand-orangeLight">
              <span className="h-px w-[22px] bg-brand-orangeLight" />
              Global Freight Forwarding
            </div>
            <h1 className="text-[34px] leading-[1.06] tracking-tight text-white sm:text-[46px] md:text-[58px]">
              Freight, routed<br /><em className="not-italic text-brand-orangeLight">precisely.</em>
            </h1>
            <p className="my-5 max-w-[480px] text-[17.5px] text-slate-300">
              Ocean, air and ground freight for teams who can't afford surprises. Instant quotes, live tracking down to the checkpoint, and a support team that answers.
            </p>
            <div className="mb-10 flex flex-wrap gap-3.5">
              <Link to="/ship" className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-6 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5">
                <ArrowRight className="h-[18px] w-[18px]" /> Get an instant quote
              </Link>
              <Link to="/tracking" className="inline-flex items-center gap-2 rounded-[10px] border border-white/30 px-6 py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/10">
                <Search className="h-[18px] w-[18px]" /> Track a shipment
              </Link>
            </div>
            <div className="flex flex-wrap gap-7 text-[13px] text-slate-400">
              {['48 countries served', '99.2% on-time delivery', '24/7 live support'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-orangeLight" /> {t}
                </div>
              ))}
            </div>
          </div>
          <Reveal>
            <RouteHero />
          </Reveal>
        </div>
      </div>

      {/* STATS */}
      <div className="bg-brand-navy2 text-white">
        <div className="mx-auto grid max-w-[1220px] grid-cols-2 gap-6 px-8 py-11 sm:px-5 md:grid-cols-4">
          {STATS.map((s, i) => (
            <StatBlock key={s.label} stat={s} first={i === 0} />
          ))}
        </div>
      </div>

      {/* SERVICES PREVIEW */}
      <section className="py-16 md:py-[88px]">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <Reveal className="mb-[52px] max-w-[640px]">
            <Eyebrow>What we move</Eyebrow>
            <h2 className="mb-3.5 text-[28px] md:text-[40px]">One partner, every mode of transport</h2>
            <p className="text-[16.5px] text-brand-slate">Pick the service that matches your timeline and budget — or let our team combine them for the fastest reliable route.</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <Reveal key={s.title}>
                <Link to="/services" className="group block rounded-md2 border border-brand-line bg-white p-7 transition-all hover:-translate-y-1.5 hover:border-transparent hover:shadow-md2">
                  <div className="mb-[18px] flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-brand-marinePale text-brand-marine transition-colors group-hover:bg-brand-orange group-hover:text-white">
                    <s.icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                  </div>
                  <h3 className="mb-2 text-lg">{s.title}</h3>
                  <p className="mb-4 text-[14.5px] text-brand-slate">{s.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-marine">
                    Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <Reveal className="mx-auto mb-[52px] max-w-[640px] text-center">
            <Eyebrow center>How it works</Eyebrow>
            <h2 className="text-[28px] md:text-[40px]">From quote to delivery in five steps</h2>
          </Reveal>
          <div className="relative grid grid-cols-1 gap-7 md:grid-cols-5 md:gap-0">
            <div className="pointer-events-none absolute left-[9%] right-[9%] top-[23px] hidden border-t-2 border-dashed border-brand-line md:block" />
            {STEPS.map((step) => (
              <Reveal key={step.n} className="relative z-10 flex items-center gap-4 px-2.5 text-left md:block md:text-center">
                <div className="mx-auto mb-4 flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full bg-brand-navy font-display font-bold text-white ring-[6px] ring-brand-cloud">
                  {step.n}
                </div>
                <div>
                  <h4 className="mb-1.5 text-[15px]">{step.title}</h4>
                  <p className="text-[13px] text-brand-slate">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-[88px]">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <Reveal className="chart-grid relative flex flex-col items-center gap-6 overflow-hidden rounded-lg2 bg-gradient-to-br from-brand-navy to-brand-marine px-6 py-10 text-center text-white sm:flex-row sm:justify-between sm:text-left md:px-12 md:py-14">
            <div className="relative z-10">
              <h3 className="max-w-[420px] text-[22px] md:text-[30px]">Ready to move your cargo?</h3>
              <p className="mt-2 text-slate-300">Get a rate in under two minutes — no account required.</p>
            </div>
            <Link to="/ship" className="relative z-10 inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-6 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5">
              Get an instant quote
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}

function StatBlock({ stat, first }) {
  const [ref, inView] = useReveal()
  const value = useCountUp(stat.target, inView, stat.decimals || 0)
  const display = stat.target >= 1000 ? Math.floor(value).toLocaleString() : value

  return (
    <div ref={ref} className={`text-center ${!first ? 'border-l border-white/10' : ''} px-3`}>
      <div className="font-display text-[28px] font-bold text-brand-orangeLight md:text-[38px]">
        {display}{stat.suffix}
      </div>
      <div className="mt-1.5 text-[12.5px] text-slate-400">{stat.label}</div>
    </div>
  )
}

function Eyebrow({ children, center }) {
  return (
    <div className={`mb-4 flex items-center gap-2 font-mono text-[11.5px] font-semibold uppercase tracking-[.16em] text-brand-orange ${center ? 'justify-center' : ''}`}>
      <span className="h-px w-[22px] bg-brand-orange" /> {children}
    </div>
  )
}
