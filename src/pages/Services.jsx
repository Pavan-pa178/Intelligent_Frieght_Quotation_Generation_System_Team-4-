import { Link } from 'react-router-dom'
import { Ship, Plane, Truck, Warehouse, ShieldCheck, Package, Check } from 'lucide-react'
import Reveal from '../components/Reveal'
import PageBanner from '../components/PageBanner'

const SERVICES = [
  { icon: Ship, title: 'Ocean Freight', desc: 'Full and less-than-container-load shipping across every major trade lane.', features: ['FCL & LCL options', '200+ port pairs', 'Reefer & hazmat capable'], key: 'ocean' },
  { icon: Plane, title: 'Air Freight', desc: 'Express and standard air cargo when timeline matters more than cost.', features: ['Next-flight-out express', 'Consolidated & charter', 'Temperature-controlled'], key: 'air' },
  { icon: Truck, title: 'Ground & Rail', desc: 'Door-to-door trucking and intermodal rail for regional and cross-border loads.', features: ['FTL & LTL trucking', 'Intermodal rail', 'Cross-border customs handled'], key: 'ground' },
  { icon: Warehouse, title: 'Warehousing & Fulfillment', desc: 'Bonded and general storage with pick, pack and ship on demand.', features: ['Bonded & general storage', 'Pick, pack, ship', 'Inventory dashboard'] },
  { icon: ShieldCheck, title: 'Customs Brokerage', desc: 'Licensed brokers handle documentation and duties across every lane we serve.', features: ['Import & export filing', 'Duty & tax calculation', 'Compliance audits'] },
  { icon: Package, title: 'Project Cargo', desc: 'Oversized, heavy-lift and time-critical cargo with dedicated route planning.', features: ['Heavy-lift & breakbulk', 'Route engineering', 'On-site project managers'] },
]

const COMPARE = [
  ['Ocean Freight', '18–26 days', 'Large, non-urgent volumes', '₹'],
  ['Ground & Rail', '5–9 days', 'Regional & cross-border', '₹₹'],
  ['Air Freight', '3–5 days', 'Time-sensitive cargo', '₹₹₹'],
  ['Express Air', '1–2 days', 'Urgent, high-value goods', '₹₹₹₹'],
]

export default function Services() {
  return (
    <>
      <PageBanner
        crumb="Services"
        title="Freight services built for reliability"
        subtitle="Every shipment is tracked, insured on request, and backed by a named account manager — whichever mode you choose."
        icon={Ship}
      />
      <section className="py-16">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <div className="mb-[60px] grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Reveal key={s.title} className="flex flex-col rounded-md2 border border-brand-line bg-white p-7">
                <div className="mb-[18px] flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orangePale text-brand-orange">
                  <s.icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="mb-2 text-[18.5px]">{s.title}</h3>
                <p className="mb-4 text-sm text-brand-slate">{s.desc}</p>
                <ul className="mb-5 flex-1 space-y-2.5">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px]">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={s.key ? `/ship?service=${s.key}` : '/ship'}
                  className="block rounded-lg border border-brand-line bg-white py-2.5 text-center text-[13.5px] font-semibold shadow-sm2 transition-colors hover:border-brand-marine hover:text-brand-marine"
                >
                  Get a quote
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal className="mb-[52px] max-w-[640px]">
            <div className="mb-4 flex items-center gap-2 font-mono text-[11.5px] font-semibold uppercase tracking-[.16em] text-brand-orange">
              <span className="h-px w-[22px] bg-brand-orange" /> Compare
            </div>
            <h2 className="text-[28px] md:text-[40px]">Which mode fits your shipment?</h2>
          </Reveal>
          <Reveal className="overflow-x-auto rounded-md2 shadow-sm2">
            <table className="w-full border-collapse bg-white text-left text-sm">
              <thead>
                <tr>
                  {['Mode', 'Typical transit', 'Best for', 'Relative cost'].map((h) => (
                    <th key={h} className="bg-brand-navy px-5 py-4 font-display text-[13px] font-semibold text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row[0]} className="border-b border-brand-line last:border-0 hover:bg-brand-cloud">
                    <td className="px-5 py-4">{row[0]}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-brand-marine">{row[1]}</td>
                    <td className="px-5 py-4">{row[2]}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-brand-marine">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>
    </>
  )
}
