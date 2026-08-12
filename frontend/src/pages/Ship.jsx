import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Plus, Trash2, Ship as ShipIcon, Plane, Truck, Zap, CheckCircle2, Lock } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { createShipmentRequest, saveQuote } from '../lib/api'
import { resolveGateway } from '../lib/pricing/gateway'
import { computeLiveEstimate } from '../lib/pricing/index'

const DRAFT_KEY = 'portline_ship_draft_v1'

function getMinDeliveryDate(readyDateStr) {
  if (!readyDateStr) {
    const d = new Date(Date.now() + 2 * 86400000)
    return d.toISOString().split('T')[0]
  }
  const d = new Date(readyDateStr)
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

const SERVICE_CHIPS = [
  { key: 'OCEAN', label: 'Ocean Freight', icon: ShipIcon },
  { key: 'AIR', label: 'Air Freight', icon: Plane },
  { key: 'GROUND_RAIL', label: 'Ground & Rail', icon: Truck },
  { key: 'EXPRESS_AIR', label: 'Express Air', icon: Zap },
]

let cargoIdSeq = 0
function newCargoItem(isFcl = true) {
  cargoIdSeq += 1
  return {
    id: cargoIdSeq,
    package_type: isFcl ? 'CONTAINER' : 'PALLET',
    container_type: '40HC',
    container_count: 1,
    gross_weight_kg: '',
    quantity: 1,
    weight_per_unit_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    is_stackable: true,
    commodity_description: '',
    hs_code: ''
  }
}

export default function Ship() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { addShipment, user, loggedIn } = useApp()
  const toast = useToast()

  const [showAuthGate, setShowAuthGate] = useState(false)

  // 1. Route state
  const [originGw, setOriginGw] = useState(null)
  const [destGw, setDestGw] = useState(null)
  const [originSearch, setOriginSearch] = useState('')
  const [destSearch, setDestSearch] = useState('')
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)
  const [showDestDropdown, setShowDestDropdown] = useState(false)

  const [pickupAddress, setPickupAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [readyDate, setReadyDate] = useState(tomorrowStr)
  const [reqDeliveryDate, setReqDeliveryDate] = useState(getMinDeliveryDate(tomorrowStr))

  // 2. Service type state
  const [mode, setMode] = useState(params.get('service')?.toUpperCase() || 'OCEAN')
  const [loadType, setLoadType] = useState('FCL')
  const [incoterm, setIncoterm] = useState('FOB')

  // 3. Cargo items state
  const [cargo, setCargo] = useState([newCargoItem(true)])

  // 4. Additional details state
  const [declaredValue, setDeclaredValue] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isFragile, setIsFragile] = useState(false)
  const [isHazardous, setIsHazardous] = useState(false)
  const [isTempControlled, setIsTempControlled] = useState(false)
  const [needsInsurance, setNeedsInsurance] = useState(false)

  const [unNumber, setUnNumber] = useState('')
  const [imoClass, setImoClass] = useState('')
  const [tempMinC, setTempMinC] = useState('-18')
  const [tempMaxC, setTempMaxC] = useState('-10')

  // 5. Destination contact details state — starts empty so user types recipient info
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('India')
  const [hasCustomerCode, setHasCustomerCode] = useState(false)
  const [existingCustomerCode, setExistingCustomerCode] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const isLoaded = useRef(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved && !isLoaded.current) {
        const d = JSON.parse(saved)
        if (d.mode) setMode(d.mode)
        if (d.loadType) setLoadType(d.loadType)
        if (d.incoterm) setIncoterm(d.incoterm)
        toast('Restored draft - continue where you left off')
      }
    } catch {
      // ignore draft error
    }
    isLoaded.current = true
  }, [toast])

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draftData = { mode, loadType, incoterm }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      } catch {
        // ignore storage error
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [mode, loadType, incoterm])

  const estimate = useMemo(() => {
    return computeLiveEstimate({
      originGateway: originGw,
      destGateway: destGw,
      mode,
      loadType,
      cargoItems: cargo,
      readyDate
    })
  }, [originGw, destGw, mode, loadType, cargo, readyDate])

  const originCandidates = useMemo(() => resolveGateway(originSearch, mode), [originSearch, mode])
  const destCandidates = useMemo(() => resolveGateway(destSearch, mode), [destSearch, mode])

  const handleSwap = () => {
    const tempGw = originGw
    const tempText = originSearch
    setOriginGw(destGw)
    setOriginSearch(destSearch)
    setDestGw(tempGw)
    setDestSearch(tempText)
  }

  const updateCargo = (id, field, value) => {
    setCargo((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeCargo = (id) => {
    if (cargo.length <= 1) { toast('At least one cargo item is required'); return }
    setCargo((prev) => prev.filter((item) => item.id !== id))
  }

  const checkAuthGate = () => {
    if (!loggedIn && !user) {
      setShowAuthGate(true)
      return true
    }
    return false
  }

  const handleSubmitQuote = async () => {
    if (checkAuthGate()) return

    if (!originGw || !destGw) {
      toast('Please select origin and destination locations from master data')
      return
    }
    if (!fullName.trim() || !email.trim() || !companyName.trim()) {
      toast('Please fill in destination contact information')
      return
    }

    setSubmitting(true)

    const quoteId = `QT-2026-${Math.floor(10000 + Math.random() * 89999)}`
    const tn = `PORT-${Math.floor(10000 + Math.random() * 89999)}-${destGw.countryCode || 'IN'}`

    const quoteRecord = {
      id: quoteId,
      user_email: user?.email || email,
      customer: companyName,
      city: originGw.city,
      laneCode: `${originGw.code} → ${destGw.code}`,
      laneName: `${originGw.city} → ${destGw.city}`,
      region: `${originGw.country}–${destGw.country}`,
      mode: mode === 'OCEAN' ? `Ocean ${loadType}` : mode === 'AIR' ? 'Air Freight' : mode === 'EXPRESS_AIR' ? 'Express Air' : 'Ground & Rail',
      modeKey: mode.toLowerCase(),
      basis: estimate.unitsLabel,
      transit: estimate.transitRange,
      indicativeTotal: estimate.totalAmount,
      status: 'Draft',
      created: 'Just now',
      details: {
        originGw,
        destGw,
        pickupAddress,
        deliveryAddress,
        readyDate,
        incoterm,
        commodity: cargo[0]?.commodity_description || 'General Merchandise',
        hsCode: cargo[0]?.hs_code || '',
        grossWeightKg: estimate.grossWeightKg,
        cargoItems: cargo,
        routes: estimate.routes,
        transitBreakdown: [
          { label: `Pickup leg (${pickupAddress ? 'Door pickup' : 'Road transit'})`, val: `${estimate.transitBreakdown.pickupDays} d` },
          { label: `Origin dwell — ${loadType}`, val: `${estimate.transitBreakdown.originDwell} d` },
          { label: `Main leg — ${estimate.mainDistanceNm} ${estimate.distanceLabel.toLowerCase()}`, val: `${estimate.transitBreakdown.linehaulDays} d` },
          { label: 'Schedule wait', val: `${estimate.transitBreakdown.scheduleWait} d` },
          { label: 'Destination dwell', val: `${estimate.transitBreakdown.destDwell} d` },
          { label: 'Delivery leg', val: `${estimate.transitBreakdown.deliveryDays} d` }
        ]
      }
    }

    const shipmentRecord = {
      tn,
      user_email: user?.email || email,
      from: `${originGw.city}, ${originGw.countryCode}`,
      to: `${destGw.city}, ${destGw.countryCode}`,
      service: quoteRecord.mode,
      status: 'Booked',
      weight: estimate.grossWeightKg,
      cost: estimate.totalAmount,
      date: new Date().toISOString().slice(0, 10),
      steps: [
        { label: 'Booked', loc: `${originGw.city}, ${originGw.countryCode}`, ts: 'Just now', done: true, current: true },
        { label: 'Picked up', loc: originGw.name, ts: 'Pending', done: false },
        { label: 'In transit', loc: '—', ts: 'Pending', done: false },
        { label: 'Customs clearance', loc: destGw.name, ts: 'Pending', done: false },
        { label: 'Out for delivery', loc: `${destGw.city}, ${destGw.countryCode}`, ts: 'Pending', done: false },
        { label: 'Delivered', loc: `${destGw.city}, ${destGw.countryCode}`, ts: 'Pending', done: false },
      ]
    }

    try {
      saveQuote(quoteRecord)
      addShipment(shipmentRecord)
      await createShipmentRequest(shipmentRecord)
      toast(`Quotation ${quoteId} generated successfully!`)
      localStorage.removeItem(DRAFT_KEY)
      navigate(`/quotes/${quoteId}`)
    } catch (err) {
      toast(err.message || 'Error generating quote')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageBanner
        crumb="Ship"
        title="Freight Quote Generator"
        subtitle="Everything we need is on this one page — fill it in and get a live estimate as you go."
        icon={ShipIcon}
      />
      
      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1220px] px-8 sm:px-5">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
            
            {/* FORM LEFT PANEL */}
            <div className="rounded-lg2 border border-brand-line bg-white p-[34px] shadow-sm2 space-y-8">
              
              {/* STEP 1: ROUTE */}
              <FormSection num={1} title="Route">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  {/* Origin Gateway */}
                  <div className="relative">
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Origin port / airport <span className="text-brand-danger">*</span>
                    </label>
                    {originGw ? (
                      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-brand-marine bg-brand-marinePale px-3.5 py-2.5">
                        <span className="font-mono text-xs font-bold text-brand-marine">{originGw.code}</span>
                        <span className="flex-1 truncate text-[13px] font-medium text-brand-navy">{originGw.name}</span>
                        <button
                          type="button"
                          onClick={() => { setOriginGw(null); setOriginSearch(''); setShowOriginDropdown(false) }}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-marine/20 text-brand-marine text-xs font-bold hover:bg-brand-marine hover:text-white transition-colors"
                          title="Clear origin"
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={originSearch}
                          onChange={(e) => {
                            if (checkAuthGate()) return
                            setOriginSearch(e.target.value)
                            setShowOriginDropdown(true)
                          }}
                          onFocus={() => {
                            if (checkAuthGate()) return
                            setShowOriginDropdown(true)
                          }}
                          onClick={() => checkAuthGate()}
                          className={brandInputStyle}
                          placeholder="Search origin port or airport..."
                        />
                        {showOriginDropdown && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md2 border border-brand-line bg-white shadow-md2">
                            {originCandidates.length === 0 ? (
                              <div className="p-3 text-xs text-brand-slate">No matching ports/airports found</div>
                            ) : (
                              originCandidates.map((g) => (
                                <div
                                  key={g.code}
                                  onClick={() => {
                                    if (checkAuthGate()) return
                                    setOriginGw(g)
                                    setOriginSearch(`${g.code} — ${g.name}`)
                                    setShowOriginDropdown(false)
                                  }}
                                  className="cursor-pointer px-4 py-2.5 text-xs hover:bg-brand-cloud border-b border-brand-line/50 last:border-0"
                                >
                                  <span className="font-mono font-semibold text-brand-marine">{g.code}</span> — {g.name} ({g.country})
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Swap button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (checkAuthGate()) return
                      handleSwap()
                    }}
                    className="mx-auto mb-0.5 flex h-[42px] w-[42px] items-center justify-center rounded-full border-[1.5px] border-brand-line bg-brand-cloud text-brand-marine transition-transform hover:rotate-180 hover:bg-brand-marinePale shadow-xs"
                    title="Swap origin and destination"
                  >
                    <ArrowLeftRight className="h-[18px] w-[18px]" />
                  </button>

                  {/* Destination Gateway */}
                  <div className="relative">
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination port / airport <span className="text-brand-danger">*</span>
                    </label>
                    {destGw ? (
                      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-brand-marine bg-brand-marinePale px-3.5 py-2.5">
                        <span className="font-mono text-xs font-bold text-brand-marine">{destGw.code}</span>
                        <span className="flex-1 truncate text-[13px] font-medium text-brand-navy">{destGw.name}</span>
                        <button
                          type="button"
                          onClick={() => { setDestGw(null); setDestSearch(''); setShowDestDropdown(false) }}
                          className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-marine/20 text-brand-marine text-xs font-bold hover:bg-brand-marine hover:text-white transition-colors"
                          title="Clear destination"
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={destSearch}
                          onChange={(e) => { setDestSearch(e.target.value); setShowDestDropdown(true) }}
                          onFocus={() => setShowDestDropdown(true)}
                          className={brandInputStyle}
                          placeholder="Search destination port or airport..."
                        />
                        {showDestDropdown && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md2 border border-brand-line bg-white shadow-md2">
                            {destCandidates.length === 0 ? (
                              <div className="p-3 text-xs text-brand-slate">No matching ports/airports found</div>
                            ) : (
                              destCandidates.map((g) => (
                                <div
                                  key={g.code}
                                  onClick={() => {
                                    setDestGw(g)
                                    setDestSearch(`${g.code} — ${g.name}`)
                                    setShowDestDropdown(false)
                                  }}
                                  className="cursor-pointer px-4 py-2.5 text-xs hover:bg-brand-cloud border-b border-brand-line/50 last:border-0"
                                >
                                  <span className="font-mono font-semibold text-brand-marine">{g.code}</span> — {g.name} ({g.country})
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Pickup address <span className="text-brand-slateLight font-normal">(door pickup)</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Street, city, PIN code"
                      className={brandInputStyle}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Delivery address <span className="text-brand-slateLight font-normal">(door delivery)</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street, city, postal code"
                      className={brandInputStyle}
                    />
                  </div>
                </div>

                <div className="mt-[18px] grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Ready date <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="date"
                      value={readyDate}
                      onChange={(e) => {
                        const val = e.target.value
                        setReadyDate(val)
                        const minDel = getMinDeliveryDate(val)
                        if (!reqDeliveryDate || reqDeliveryDate < minDel) {
                          setReqDeliveryDate(minDel)
                        }
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className={brandInputStyle}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Required delivery date <span className="text-brand-slateLight font-normal">(min. 2 days after ready date)</span>
                    </label>
                    <input
                      type="date"
                      value={reqDeliveryDate}
                      onChange={(e) => setReqDeliveryDate(e.target.value)}
                      min={getMinDeliveryDate(readyDate)}
                      className={brandInputStyle}
                    />
                  </div>
                </div>
              </FormSection>

              {/* STEP 2: SERVICE TYPE */}
              <FormSection num={2} title="Service type">
                <div className="mb-4">
                  <label className="mb-2.5 block text-[13px] font-semibold text-brand-navy">
                    Mode <span className="text-brand-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {SERVICE_CHIPS.map((chip) => {
                      const Icon = chip.icon
                      const active = mode === chip.key
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => {
                            setMode(chip.key)
                            if (chip.key !== 'OCEAN') {
                              setLoadType('LCL')
                            }
                          }}
                          className={`flex items-center gap-2 rounded-full border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                            active
                              ? 'border-brand-navy bg-brand-navy text-white'
                              : 'border-brand-line text-brand-slate hover:border-brand-marineLight'
                          }`}
                        >
                          <Icon className="h-4 w-4" /> {chip.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Ocean freight parameters */}
                {mode === 'OCEAN' && (
                  <div className="rounded-md2 border border-brand-line bg-brand-cloud p-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                          Load type <span className="text-brand-danger">*</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoadType('FCL')
                              setCargo([newCargoItem(true)])
                            }}
                            className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              loadType === 'FCL'
                                ? 'border-brand-marine bg-brand-marinePale text-brand-marine font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate'
                            }`}
                          >
                            FCL — Full container
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`flex-1 py-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              loadType === 'LCL'
                                ? 'border-brand-marine bg-brand-marinePale text-brand-marine font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate'
                            }`}
                          >
                            LCL — Consolidated
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                          Incoterm <span className="text-brand-danger">*</span>
                        </label>
                        <select
                          value={incoterm}
                          onChange={(e) => setIncoterm(e.target.value)}
                          className={brandInputStyle}
                        >
                          <option value="FOB">FOB — Free On Board</option>
                          <option value="EXW">EXW — Ex Works</option>
                          <option value="FCA">FCA — Free Carrier</option>
                          <option value="CIF">CIF — Cost Insurance Freight</option>
                          <option value="CFR">CFR — Cost and Freight</option>
                          <option value="DAP">DAP — Delivered At Place</option>
                          <option value="DDP">DDP — Delivered Duty Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* STEP 3: SHIPMENT DETAILS */}
              <FormSection num={3} title="Shipment details">
                <div className="space-y-4">
                  {cargo.map((item, index) => (
                    <div key={item.id} className="rounded-md2 border border-brand-line bg-white p-5 shadow-sm2">
                      <div className="flex items-center justify-between border-b border-brand-line pb-3 mb-4">
                        <span className="font-mono text-xs font-semibold tracking-wider text-brand-slateLight">
                          ITEM #{String(index + 1).padStart(2, '0')}
                        </span>
                        {cargo.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCargo(item.id)}
                            className="text-xs font-semibold text-brand-danger hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                        <div>
                          <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                            Package type <span className="text-brand-danger">*</span>
                          </label>
                          <select
                            value={item.package_type}
                            onChange={(e) => {
                              const val = e.target.value
                              updateCargo(item.id, 'package_type', val)
                              if (val === 'CONTAINER') {
                                setLoadType('FCL')
                              } else {
                                setLoadType('LCL')
                              }
                            }}
                            className={brandInputStyle}
                          >
                            <option value="CONTAINER">Container</option>
                            <option value="PALLET">Pallet</option>
                            <option value="CARTON">Carton</option>
                            <option value="CRATE">Crate</option>
                            <option value="DRUM">Drum</option>
                            <option value="BAG">Bag</option>
                            <option value="LOOSE">Loose Cargo</option>
                          </select>
                        </div>

                        {item.package_type === 'CONTAINER' && (
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                              Container type <span className="text-brand-danger">*</span>
                            </label>
                            <select
                              value={item.container_type}
                              onChange={(e) => updateCargo(item.id, 'container_type', e.target.value)}
                              className={brandInputStyle}
                            >
                              <option value="40HC">40HC — 40ft High Cube</option>
                              <option value="20GP">20GP — 20ft General</option>
                              <option value="40GP">40GP — 40ft General</option>
                              <option value="40RF">40RF — Reefer</option>
                              <option value="20RF">20RF — 20ft Reefer</option>
                              <option value="20OT">20OT — Open Top</option>
                              <option value="40FR">40FR — Flat Rack</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Conditional Container FCL Branch */}
                      {item.package_type === 'CONTAINER' ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                              Container count <span className="text-brand-danger">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={item.container_count}
                              onChange={(e) => updateCargo(item.id, 'container_count', e.target.value)}
                              placeholder="1"
                              className={brandInputStyle}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                              Total gross weight (kg) <span className="text-brand-danger">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.gross_weight_kg}
                              onChange={(e) => updateCargo(item.id, 'gross_weight_kg', e.target.value)}
                              placeholder="e.g. 18400"
                              className={brandInputStyle}
                            />
                          </div>
                        </div>
                      ) : (
                        /* LCL / Air Branch */
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateCargo(item.id, 'quantity', e.target.value)}
                              placeholder="1"
                              className={brandInputStyle}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">Weight / unit (kg)</label>
                            <input
                              type="number"
                              value={item.weight_per_unit_kg}
                              onChange={(e) => updateCargo(item.id, 'weight_per_unit_kg', e.target.value)}
                              placeholder="e.g. 250"
                              className={brandInputStyle}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">L × W × H (cm)</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              <input
                                placeholder="L"
                                value={item.length_cm}
                                onChange={(e) => updateCargo(item.id, 'length_cm', e.target.value)}
                                className={brandInputStyle}
                              />
                              <input
                                placeholder="W"
                                value={item.width_cm}
                                onChange={(e) => updateCargo(item.id, 'width_cm', e.target.value)}
                                className={brandInputStyle}
                              />
                              <input
                                placeholder="H"
                                value={item.height_cm}
                                onChange={(e) => updateCargo(item.id, 'height_cm', e.target.value)}
                                className={brandInputStyle}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                            Commodity description <span className="text-brand-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.commodity_description}
                            onChange={(e) => updateCargo(item.id, 'commodity_description', e.target.value)}
                            placeholder="Detailed product description..."
                            className={brandInputStyle}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                            HS code <span className="text-brand-slateLight font-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={item.hs_code}
                            onChange={(e) => updateCargo(item.id, 'hs_code', e.target.value)}
                            placeholder="e.g. 5208.11"
                            className={`${brandInputStyle} font-mono`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCargo((prev) => [...prev, newCargoItem(loadType === 'FCL')])}
                  className="mt-4 flex items-center justify-center gap-2 py-2.5 text-[13.5px] font-semibold text-brand-marine hover:underline"
                >
                  <Plus className="h-4 w-4" /> Add another item
                </button>
              </FormSection>

              {/* STEP 4: ADDITIONAL DETAILS */}
              <FormSection num={4} title="Additional details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">Declared value</label>
                    <input
                      type="number"
                      value={declaredValue}
                      onChange={(e) => setDeclaredValue(e.target.value)}
                      placeholder="0.00"
                      className={brandInputStyle}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Currency <span className="text-brand-danger">*</span>
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={brandInputStyle}
                    >
                      <option value="INR">INR — Indian Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="AED">AED — UAE Dirham</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                    Special instructions <span className="text-brand-slateLight font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. call before delivery"
                    className={brandInputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px] text-brand-slate">
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)} className="rounded accent-brand-navy" />
                    Fragile goods
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer py-1 font-semibold text-brand-navy">
                    <input type="checkbox" checked={isHazardous} onChange={(e) => setIsHazardous(e.target.checked)} className="rounded accent-brand-navy" />
                    Hazardous materials
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={isTempControlled} onChange={(e) => setIsTempControlled(e.target.checked)} className="rounded accent-brand-navy" />
                    Temperature controlled
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={needsInsurance} onChange={(e) => setNeedsInsurance(e.target.checked)} className="rounded accent-brand-navy" />
                    Add cargo insurance
                  </label>
                </div>

                {isTempControlled && (
                  <div className="mt-4 rounded-md2 border border-brand-line bg-brand-cloud p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-[12.5px] font-semibold text-brand-navy">
                          Min temperature (°C) <span className="text-brand-danger">*</span>
                        </label>
                        <input
                          type="number"
                          value={tempMinC}
                          onChange={(e) => setTempMinC(e.target.value)}
                          placeholder="-18"
                          className={brandInputStyle}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12.5px] font-semibold text-brand-navy">
                          Max temperature (°C) <span className="text-brand-danger">*</span>
                        </label>
                        <input
                          type="number"
                          value={tempMaxC}
                          onChange={(e) => setTempMaxC(e.target.value)}
                          placeholder="-10"
                          className={brandInputStyle}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isHazardous && (
                  <div className="mt-4 rounded-md2 border border-brand-line bg-brand-cloud p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-[12.5px] font-semibold text-brand-navy">
                          UN number <span className="text-brand-danger">*</span>
                        </label>
                        <input
                          placeholder="e.g. UN1234"
                          value={unNumber}
                          onChange={(e) => setUnNumber(e.target.value)}
                          className={`${brandInputStyle} font-mono`}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12.5px] font-semibold text-brand-navy">
                          IMO class <span className="text-brand-danger">*</span>
                        </label>
                        <select
                          value={imoClass}
                          onChange={(e) => setImoClass(e.target.value)}
                          className={brandInputStyle}
                        >
                          <option value="">Select Class...</option>
                          <option value="3">Class 3 — Flammable</option>
                          <option value="8">Class 8 — Corrosive</option>
                          <option value="9">Class 9 — Misc Dangerous</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-[12.5px] font-semibold text-brand-navy">
                          MSDS document <span className="text-brand-danger">*</span>
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          className="text-xs text-brand-slate file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:bg-brand-marinePale file:text-brand-marine"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* STEP 5: DESTINATION CONTACT DETAILS */}
              <FormSection num={5} title="Destination contact details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination contact name <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Receiver / Consignee name"
                      className={brandInputStyle}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination company <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Destination company name"
                      className={brandInputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination email <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="consignee@company.com"
                      className={brandInputStyle}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination country <span className="text-brand-danger">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={brandInputStyle}
                    >
                      <option value="India">India</option>
                      <option value="UAE">UAE</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Germany">Germany</option>
                      <option value="USA">USA</option>
                    </select>
                  </div>
                </div>

                {/* Existing Customer Code Toggle */}
                <div className="mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] text-brand-navy font-semibold">
                    <input
                      type="checkbox"
                      checked={hasCustomerCode}
                      onChange={(e) => setHasCustomerCode(e.target.checked)}
                      className="rounded accent-brand-navy"
                    />
                    I have an existing customer code
                  </label>
                  {hasCustomerCode && (
                    <div className="mt-3 max-w-sm">
                      <input
                        type="text"
                        value={existingCustomerCode}
                        onChange={(e) => setExistingCustomerCode(e.target.value)}
                        placeholder="e.g. CUST-88412"
                        className={`${brandInputStyle} font-mono`}
                      />
                    </div>
                  )}
                </div>
              </FormSection>

            </div>

            {/* LIVE ESTIMATE RIGHT PANEL */}
            <div className="sticky top-[92px]">
              <div className="rounded-lg2 bg-brand-navy p-7 text-white shadow-md2">
                <div className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">
                  LIVE ESTIMATE
                </div>

                <div className="mb-4 rounded-md2 bg-white/5 p-3 text-xs text-slate-300">
                  Charge basis
                  <b className="mt-1 block font-display text-[15px] font-bold text-white">{estimate.chargeBasis}</b>
                </div>

                <div className="space-y-3 font-mono text-xs text-slate-300">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">Containers / Units</span>
                    <span className="font-semibold text-white">{estimate.unitsLabel}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">Gross weight</span>
                    <span className="font-semibold text-white">{estimate.grossWeightKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">{estimate.distanceLabel}</span>
                    <span className="font-semibold text-white">{estimate.mainDistanceNm.toLocaleString()} {mode === 'OCEAN' ? 'nm' : 'km'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">Estimated transit</span>
                    <span className="font-semibold text-white">{estimate.transitRange}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">Est. arrival</span>
                    <span className="font-semibold text-white">{estimate.arrivalDateFormatted}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-sans">Route options</span>
                    <span className="font-semibold text-brand-orangeLight">{estimate.routeOptionsCount} found</span>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">ESTIMATED TOTAL</div>
                  <div className="mt-1 font-display text-[30px] font-bold tracking-tight text-white">
                    {estimate.totalFormatted}
                  </div>
                  <div className="mt-2 inline-block rounded-md border border-brand-orange/40 bg-brand-orange/15 px-2.5 py-1 font-mono text-[10px] font-bold text-brand-orangeLight">
                    ◆ INDICATIVE RATE
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitQuote}
                  className="mt-6 w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 font-display text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {submitting ? 'Generating…' : 'Generate full quotation →'}
                </button>

                <div className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  Final rates confirmed by your account manager. Estimate excludes duties & taxes.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AUTH GATE MODAL */}
      {showAuthGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-brand-line text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orangePale text-brand-orange">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="font-display text-xl font-bold text-brand-navy">Login Required</h3>
            <p className="mt-2 text-sm text-brand-slate leading-relaxed">
              Please log in or create an account to select route origins and generate live freight quotations.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/login?redirect=/ship')}
                className="w-full rounded-xl bg-brand-navy py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-marine shadow-md"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?tab=signup&redirect=/ship')}
                className="w-full rounded-xl border border-brand-line bg-brand-cloud py-3 text-sm font-semibold text-brand-navy hover:bg-brand-marinePale"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setShowAuthGate(false)}
                className="text-xs text-brand-slateLight hover:underline mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FormSection({ num, title, children }) {
  return (
    <div>
      <div className="mb-[18px] flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy font-display text-[13px] font-bold text-white">
          {num}
        </div>
        <h3 className="text-lg text-brand-navy font-bold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

const brandInputStyle = 'w-full rounded-[10px] border-[1.5px] border-brand-line bg-white py-3 px-3.5 font-sans text-[14px] text-brand-navy transition-colors focus:border-brand-marine focus:outline-none placeholder:text-brand-slateLight/60'
