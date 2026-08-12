import { Link, useLocation } from 'react-router-dom'
import { Container, Linkedin, Twitter, Instagram } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function Footer() {
  const location = useLocation()
  const toast = useToast()
  if (location.pathname === '/login') return null

  return (
    <footer className="bg-brand-navy pt-16 text-slate-400">
      <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
        <div className="grid grid-cols-1 gap-8 border-b border-white/10 pb-11 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 font-display text-lg font-bold text-white">
              <Container className="h-8 w-8 text-brand-orangeLight" strokeWidth={1.6} />
              <span>Freight Quote Generator</span>
            </div>
            <p className="my-3.5 max-w-[280px] text-[13.5px]">
              Global freight forwarding across ocean, air and ground — with live tracking on every shipment.
            </p>
            <div className="flex max-w-[300px] gap-2">
              <input type="email" placeholder="Your email" className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-white placeholder:text-slate-500" />
              <button
                onClick={() => toast('Subscribed to freight market updates')}
                className="rounded-lg bg-gradient-to-br from-brand-orange to-brand-orangeLight px-4 py-2.5 text-[13.5px] font-semibold text-white"
              >
                Join
              </button>
            </div>
          </div>

          <FooterCol title="Company" links={[['/', 'Home'], ['/services', 'Services'], ['/contact', 'Careers'], ['/contact', 'Contact']]} />
          <FooterCol title="Services" links={[['/services', 'Ocean Freight'], ['/services', 'Air Freight'], ['/services', 'Ground & Rail'], ['/services', 'Warehousing']]} />
          <FooterCol title="Support" links={[['/tracking', 'Track a shipment'], ['/portal', 'Customer portal'], ['/contact', 'Help center'], ['/contact', 'Contact support']]} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 py-6 text-[12.5px]">
          <span>© 2026 Freight Quote Generator. All rights reserved.</span>
          <div className="flex gap-2.5">
            {[Linkedin, Twitter, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/5 hover:bg-brand-orange" aria-label="Social link">
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h5 className="mb-4 font-display text-[13.5px] tracking-wide text-white">{title}</h5>
      <ul className="space-y-2.5">
        {links.map(([to, label], i) => (
          <li key={i}>
            <Link to={to} className="text-[13.5px] hover:text-brand-orangeLight">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
