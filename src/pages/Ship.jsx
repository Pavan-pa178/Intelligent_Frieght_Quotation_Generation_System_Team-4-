import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowLeftRight, Plus, Trash2, Ship as ShipIcon, Plane, Truck, Zap, CheckCircle2, Search } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getRateTable, createShipmentRequest } from '../lib/api'

const RATES = getRateTable()
const SERVICE_CHIPS = [
  { key: 'ocean', label: 'Ocean Freight', icon: ShipIcon },
  { key: 'air', label: 'Air Freight', icon: Plane },
  { key: 'ground', label: 'Ground & Rail', icon: Truck },
  { key: 'express', label: 'Express Air', icon: Zap },
]

let cargoIdSeq = 0
function newCargoItem() {
  cargoIdSeq += 1
  return { id: cargoIdSeq, pkgType: 'Pallet', qty: 1, weight: '', length: '', width: '', height: '' }
}

export default function Ship() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { addShipment } = useApp()
  const toast = useToast()

  const [service, setService] = useState(params.get('service') || 'ocean')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [pickupAddr, setPickupAddr] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [cargo, setCargo] = useState([newCargoItem()])
  const [declValue, setDeclValue] = useState('')
  const [note, setNote] = useState('')
  const [fragile, setFragile] = useState(false)
  const [hazmat, setHazmat] = useState(false)
  const [insurance, setInsurance] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)

  const updateCargo = (id, field, value) => {
    setCargo((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }
  const removeCargo = (id) => {
    if (cargo.length <= 1) { toast('At least one item is required'); return }
    setCargo((prev) => prev.filter((item) => item.id !== id))
  }

  const summary = useMemo(() => {
    let totalWeight = 0
    let totalVol = 0
    cargo.forEach((item) => {
      const qty = parseFloat(item.qty) || 0
      const w = parseFloat(item.weight) || 0
      const l = parseFloat(item.length) || 0
      const wi = parseFloat(item.width) || 0
      const h = parseFloat(item.height) || 0
      totalWeight += w * qty
      totalVol += ((l * wi * h) / 5000) * qty
    })
    const chargeable = Math.max(totalWeight, totalVol)
    const rate = RATES[service]
    
    let cost = 0
    if (chargeable > 0) {
      cost = rate.base + chargeable * rate.perKg
      if (insurance) cost *= 1.1
      if (hazmat) cost += 75
    }
    return { totalWeight, totalVol, chargeable, transit: rate.transit, cost }
  }, [cargo, service, insurance, hazmat])

  const handleSwap = () => { const t = from; setFrom(to); setTo(t) }

  const handleSubmit = async () => {
    if (!from.trim() || !to.trim() || !name.trim() || !email.trim()) {
      toast('Please fill in origin, destination, name and email')
      return
    }
    setSubmitting(true)
    const countryCode = (to.split(',').pop() || 'XX').trim().slice(0, 2).toUpperCase() || 'XX'
    const tn = `PORT-${Math.floor(10000 + Math.random() * 89999)}-${countryCode}`
    const serviceLabel = RATES[service].label

    const shipment = {
      tn, from, to, service: serviceLabel, status: 'Booked',
      weight: Number(summary.chargeable.toFixed(1)),
      cost: Math.round(summary.cost),
      date: new Date().toISOString().slice(0, 10),
      steps: [
        { label: 'Booked', loc: from, ts: 'Just now', done: true, current: true },
        { label: 'Picked up', loc: from, ts: 'Pending', done: false },
        { label: 'In transit', loc: '—', ts: 'Pending', done: false },
        { label: 'Customs clearance', loc: to, ts: 'Pending', done: false },
        { label: 'Out for delivery', loc: to, ts: 'Pending', done: false },
        { label: 'Delivered', loc: to, ts: 'Pending', done: false },
      ],
    }

    try {
      await createShipmentRequest({ ...shipment, contact: { name, company, email, phone }, declValue, note, fragile, hazmat, insurance })
      addShipment(shipment)
      setSuccess(tn)
      toast(`Shipment ${tn} created`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast(err.message || 'Something went wrong — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <PageBanner crumb="Ship" title="Freight Quote Generator" subtitle="Everything we need is on this one page — fill it in and get a live estimate as you go." icon={ShipIcon} />
        <div className="mx-auto max-w-[1220px] px-8 py-14 sm:px-5">
          <div className="animate-fadeUp rounded-lg2 border border-brand-line bg-white px-8 py-[60px] text-center">
            <div className="mx-auto mb-[22px] flex h-[74px] w-[74px] items-center justify-center rounded-full bg-brand-successBg text-brand-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="mb-2.5 text-2xl">Shipment requested</h3>
            <p className="text-brand-slate">We've sent a confirmation to {email}. Your account manager will confirm final pricing shortly.</p>
            <div className="my-[26px] inline-block rounded-[10px] bg-brand-marinePale px-[22px] py-3 font-mono text-xl font-semibold tracking-wide text-brand-marine">
              {success}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate(`/tracking?tn=${success}`)}
                className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight px-6 py-3.5 text-[14.5px] font-semibold text-white"
              >
                <Search className="h-[18px] w-[18px]" /> Track this shipment
              </button>
              <button onClick={() => navigate('/portal')} className="rounded-[10px] border-[1.5px] border-brand-line bg-white px-6 py-3.5 text-[14.5px] font-semibold shadow-sm2">
                View in portal
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageBanner crumb="Ship" title="Freight Quote Generator" subtitle="Everything we need is on this one page — fill it in and get a live estimate as you go." icon={ShipIcon} />
      <section className="pt-14">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
            {/* FORM */}
            <div className="rounded-lg2 border border-brand-line bg-white p-[34px] shadow-sm2">
              <FormSection num={1} title="Route">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <Field label="From">
                    <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Mumbai, Maharashtra" required className={inputClass} />
                  </Field>
                  <button type="button" onClick={handleSwap} className="mx-auto mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-full border-[1.5px] border-brand-line bg-brand-cloud text-brand-marine transition-transform hover:rotate-180 hover:bg-brand-marinePale sm:rotate-90 sm:hover:rotate-[270deg]">
                    <ArrowLeftRight className="h-[18px] w-[18px]" />
                  </button>
                  <Field label="To">
                    <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Dubai, UAE" required className={inputClass} />
                  </Field>
                </div>
                <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <Field label="Pickup address">
                    <input value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} placeholder="Street, city, PIN code" className={inputClass} />
                  </Field>
                  <Field label="Preferred pickup date">
                    <input value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} type="date" className={inputClass} />
                  </Field>
                </div>
              </FormSection>

              <FormSection num={2} title="Service type">
                <div className="flex flex-wrap gap-2.5">
                  {SERVICE_CHIPS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setService(c.key)}
                      className={`flex items-center gap-2 rounded-full border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                        service === c.key ? 'border-brand-navy bg-brand-navy text-white' : 'border-brand-line text-brand-slate hover:border-brand-marineLight'
                      }`}
                    >
                      <c.icon className="h-4 w-4" /> {c.label}
                    </button>
                  ))}
                </div>
              </FormSection>

              <FormSection num={3} title="Shipment details">
                <div className="space-y-3.5">
                  {cargo.map((item, i) => (
                    <CargoRow key={item.id} index={i} item={item} onChange={updateCargo} onRemove={removeCargo} />
                  ))}
                </div>
                <button type="button" onClick={() => setCargo((p) => [...p, newCargoItem()])} className="mt-2.5 flex items-center gap-2 py-2.5 text-[13.5px] font-semibold text-brand-marine">
                  <Plus className="h-4 w-4" /> Add another item
                </button>
              </FormSection>

              <FormSection num={4} title="Additional details">
                <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <Field label="Declared value (INR)">
                    <input value={declValue} onChange={(e) => setDeclValue(e.target.value)} type="number" min="0" placeholder="0.00" className={inputClass} />
                  </Field>
                  <Field label={<>Special instructions <span className="text-[11.5px] font-normal text-brand-slateLight">(optional)</span></>}>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. call before delivery" className={inputClass} />
                  </Field>
                </div>
                <div className="mt-[18px] flex flex-wrap gap-[22px]">
                  <Checkbox label="Fragile goods" checked={fragile} onChange={setFragile} />
                  <Checkbox label="Hazardous materials" checked={hazmat} onChange={setHazmat} />
                  <Checkbox label="Add cargo insurance" checked={insurance} onChange={setInsurance} />
                </div>
              </FormSection>

              <FormSection num={5} title="Contact details" last>
                <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" required className={inputClass} /></Field>
                  <Field label="Company"><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className={inputClass} /></Field>
                  <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" required className={inputClass} /></Field>
                  <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210" className={inputClass} /></Field>
                </div>
              </FormSection>
            </div>

            {/* LIVE SUMMARY */}
            <aside className="chart-grid sticky top-[92px] overflow-hidden rounded-lg2 bg-brand-navy p-7 text-white">
              <h4 className="mb-5 text-[13px] uppercase tracking-[.1em] text-slate-400">Live estimate</h4>
              <SummaryRow label="Total actual weight" value={`${summary.totalWeight.toFixed(1)} kg`} />
              <SummaryRow label="Volumetric weight" value={`${summary.totalVol.toFixed(1)} kg`} />
              <SummaryRow label="Chargeable weight" value={`${summary.chargeable.toFixed(1)} kg`} />
              <SummaryRow label="Estimated transit" value={summary.transit} />
              <div className="my-5 flex items-baseline justify-between">
                <span className="text-[13px] text-slate-400">Estimated total</span>
                <span className="font-display text-[30px] font-bold text-brand-orangeLight">
                  ₹{summary.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] disabled:opacity-60"
              >
                <ArrowRight className="h-[18px] w-[18px]" /> {submitting ? 'Requesting…' : 'Request shipment'}
              </button>
              <p className="mt-3.5 text-[11.5px] leading-relaxed text-slate-500">
                Final rate confirmed by your account manager within 2 business hours. Estimate excludes duties & taxes.
              </p>
            </aside>
          </div>
        </div>
      </section>
      <div className="h-16" />
    </>
  )
}

const inputClass = 'w-full rounded-[9px] border-[1.5px] border-brand-line px-4 py-3.5 text-[14.5px] leading-normal transition-all focus:border-brand-marine focus:outline-none focus:ring-4 focus:ring-brand-marinePale'

function FormSection({ num, title, children, last }) {
  return (
    <div className={`mb-[30px] ${!last ? 'border-b border-dashed border-brand-line pb-[30px]' : ''}`}>
      <div className="mb-5 flex items-center gap-2.5 font-display text-base font-semibold">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-brand-navy font-mono text-[12.5px] text-white">{num}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-brand-navy">{label}</label>
      {children}
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-[18px] w-[18px] accent-brand-orange" />
      {label}
    </label>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/10 py-2.5 text-[13.5px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}

function CargoRow({ index, item, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-brand-line bg-brand-cloud p-[18px]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-wide text-brand-slateLight">ITEM #{String(index + 1).padStart(2, '0')}</span>
        <button type="button" onClick={() => onRemove(item.id)} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-danger">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Package type">
          <select value={item.pkgType} onChange={(e) => onChange(item.id, 'pkgType', e.target.value)} className={inputClass}>
            {['Pallet', 'Box', 'Crate', 'Container', 'Drum'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Quantity">
          <input type="number" min="1" value={item.qty} onChange={(e) => onChange(item.id, 'qty', e.target.value)} className={inputClass} />
        </Field>
        <Field label={<>Weight (kg) <span className="text-[11.5px] font-normal text-brand-slateLight">per unit</span></>}>
          <input type="number" min="0" placeholder="0" value={item.weight} onChange={(e) => onChange(item.id, 'weight', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Dimensions (cm)">
          <div className="grid grid-cols-3 gap-2.5">
            <input type="number" min="0" placeholder="Length" value={item.length} onChange={(e) => onChange(item.id, 'length', e.target.value)} className={inputClass} />
            <input type="number" min="0" placeholder="Width" value={item.width} onChange={(e) => onChange(item.id, 'width', e.target.value)} className={inputClass} />
            <input type="number" min="0" placeholder="Height" value={item.height} onChange={(e) => onChange(item.id, 'height', e.target.value)} className={inputClass} />
          </div>
        </Field>
      </div>
    </div>
  )
}
