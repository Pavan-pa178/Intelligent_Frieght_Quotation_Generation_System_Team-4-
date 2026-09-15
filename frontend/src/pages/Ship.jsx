import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Plus, Trash2, Ship as ShipIcon, Plane, Truck, Zap, Route, CheckCircle2, Lock, Search, Globe, MapPin, X, Clock, Sparkles, Loader2, Check, AlertCircle, Phone } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import GlobalPortDirectory from '../components/GlobalPortDirectory'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { createShipmentRequest, saveQuote, triggerQuotePipeline } from '../lib/api'
import { resolveGateway, getGatewayByCode } from '../lib/pricing/gateway'
import { computeLiveEstimate } from '../lib/pricing/index'

const DRAFT_KEY = 'portline_ship_draft_v1'

const COUNTRY_DIAL_CODES = [
  { code: '+91', country: 'IN', label: '+91 (India)' },
  { code: '+94', country: 'LK', label: '+94 (Sri Lanka)' },
  { code: '+971', country: 'AE', label: '+971 (UAE)' },
  { code: '+65', country: 'SG', label: '+65 (Singapore)' },
  { code: '+1', country: 'US', label: '+1 (USA / Canada)' },
  { code: '+44', country: 'GB', label: '+44 (United Kingdom)' },
  { code: '+49', country: 'DE', label: '+49 (Germany)' },
  { code: '+31', country: 'NL', label: '+31 (Netherlands)' },
  { code: '+86', country: 'CN', label: '+86 (China)' },
  { code: '+60', country: 'MY', label: '+60 (Malaysia)' },
  { code: '+81', country: 'JP', label: '+81 (Japan)' },
  { code: '+82', country: 'KR', label: '+82 (South Korea)' },
  { code: '+61', country: 'AU', label: '+61 (Australia)' },
  { code: '+64', country: 'NZ', label: '+64 (New Zealand)' },
  { code: '+33', country: 'FR', label: '+33 (France)' },
  { code: '+39', country: 'IT', label: '+39 (Italy)' },
  { code: '+34', country: 'ES', label: '+34 (Spain)' },
  { code: '+32', country: 'BE', label: '+32 (Belgium)' },
  { code: '+41', country: 'CH', label: '+41 (Switzerland)' },
  { code: '+46', country: 'SE', label: '+46 (Sweden)' },
  { code: '+47', country: 'NO', label: '+47 (Norway)' },
  { code: '+45', country: 'DK', label: '+45 (Denmark)' },
  { code: '+48', country: 'PL', label: '+48 (Poland)' },
  { code: '+90', country: 'TR', label: '+90 (Turkey)' },
  { code: '+966', country: 'SA', label: '+966 (Saudi Arabia)' },
  { code: '+968', country: 'OM', label: '+968 (Oman)' },
  { code: '+974', country: 'QA', label: '+974 (Qatar)' },
  { code: '+965', country: 'KW', label: '+965 (Kuwait)' },
  { code: '+973', country: 'BH', label: '+973 (Bahrain)' },
  { code: '+880', country: 'BD', label: '+880 (Bangladesh)' },
  { code: '+92', country: 'PK', label: '+92 (Pakistan)' },
  { code: '+977', country: 'NP', label: '+977 (Nepal)' },
  { code: '+66', country: 'TH', label: '+66 (Thailand)' },
  { code: '+84', country: 'VN', label: '+84 (Vietnam)' },
  { code: '+62', country: 'ID', label: '+62 (Indonesia)' },
  { code: '+63', country: 'PH', label: '+63 (Philippines)' },
  { code: '+886', country: 'TW', label: '+886 (Taiwan)' },
  { code: '+852', country: 'HK', label: '+852 (Hong Kong)' },
  { code: '+20', country: 'EG', label: '+20 (Egypt)' },
  { code: '+27', country: 'ZA', label: '+27 (South Africa)' },
  { code: '+234', country: 'NG', label: '+234 (Nigeria)' },
  { code: '+254', country: 'KE', label: '+254 (Kenya)' },
  { code: '+55', country: 'BR', label: '+55 (Brazil)' },
  { code: '+52', country: 'MX', label: '+52 (Mexico)' },
  { code: '+54', country: 'AR', label: '+54 (Argentina)' },
  { code: '+56', country: 'CL', label: '+56 (Chile)' },
  { code: '+57', country: 'CO', label: '+57 (Colombia)' },
  { code: '+351', country: 'PT', label: '+351 (Portugal)' },
  { code: '+43', country: 'AT', label: '+43 (Austria)' },
  { code: '+420', country: 'CZ', label: '+420 (Czech Republic)' },
  { code: '+36', country: 'HU', label: '+36 (Hungary)' },
  { code: '+30', country: 'GR', label: '+30 (Greece)' },
  { code: '+353', country: 'IE', label: '+353 (Ireland)' },
  { code: '+358', country: 'FI', label: '+358 (Finland)' },
  { code: '+225', country: 'CI', label: '+225 (Côte d\'Ivoire)' },
  { code: '+221', country: 'SN', label: '+221 (Senegal)' },
  { code: '+237', country: 'CM', label: '+237 (Cameroon)' },
  { code: '+230', country: 'MU', label: '+230 (Mauritius)' },
  { code: '+242', country: 'CG', label: '+242 (Congo)' },
  { code: '+593', country: 'EC', label: '+593 (Ecuador)' },
  { code: '+507', country: 'PA', label: '+507 (Panama)' },
  { code: '+1787', country: 'PR', label: '+1 (Puerto Rico)' },
  { code: '+212', country: 'MA', label: '+212 (Morocco)' },
  { code: '+233', country: 'GH', label: '+233 (Ghana)' },
  { code: '+255', country: 'TZ', label: '+255 (Tanzania)' },
]

const DESTINATION_COUNTRIES = [
  'Sri Lanka',
  'India',
  'UAE',
  'Singapore',
  'Malaysia',
  'United States',
  'United Kingdom',
  'Germany',
  'Netherlands',
  'China',
  'Japan',
  'South Korea',
  'Australia',
  'New Zealand',
  'Saudi Arabia',
  'Oman',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'Bangladesh',
  'Pakistan',
  'Nepal',
  'Thailand',
  'Vietnam',
  'Indonesia',
  'Philippines',
  'Taiwan',
  'Hong Kong',
  'France',
  'Italy',
  'Spain',
  'Belgium',
  'Switzerland',
  'Sweden',
  'Norway',
  'Denmark',
  'Poland',
  'Portugal',
  'Austria',
  'Czech Republic',
  'Hungary',
  'Greece',
  'Ireland',
  'Finland',
  'Turkey',
  'Egypt',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Morocco',
  'Ghana',
  'Tanzania',
  'Senegal',
  'Ivory Coast',
  'Cameroon',
  'Mauritius',
  'Congo',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
  'Ecuador',
  'Panama',
  'Puerto Rico',
  'Canada'
]


function checkAddressMatchesGateway(address, gateway) {
  if (!address || !gateway) return { matches: false, missing: true }
  const addr = address.toLowerCase().trim()
  const city = (gateway.city || '').toLowerCase().trim()
  const country = (gateway.country || '').toLowerCase().trim()
  const code = (gateway.code || '').toLowerCase().trim()
  const name = (gateway.name || '').toLowerCase().trim()

  // Match if address explicitly mentions city, port code, or port name keywords
  const matches = (city && addr.includes(city)) || 
                  (code && addr.includes(code)) || 
                  (name && addr.includes(name.split(' ')[0].toLowerCase()))
  return { matches, city: gateway.city, name: gateway.name }
}

function getMinDeliveryDate(readyDateStr) {

  if (!readyDateStr) return ''
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
  const [showPortDirectoryModal, setShowPortDirectoryModal] = useState(false)
  const [portDirectoryTarget, setPortDirectoryTarget] = useState('origin') // 'origin' | 'dest'

  // 1. Route state
  const [originGw, setOriginGw] = useState(null)
  const [destGw, setDestGw] = useState(null)
  const [originSearch, setOriginSearch] = useState('')
  const [destSearch, setDestSearch] = useState('')
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)
  const [showDestDropdown, setShowDestDropdown] = useState(false)
  const originDropdownRef = useRef(null)
  const destDropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (originDropdownRef.current && !originDropdownRef.current.contains(event.target)) {
        setShowOriginDropdown(false)
      }
      if (destDropdownRef.current && !destDropdownRef.current.contains(event.target)) {
        setShowDestDropdown(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowOriginDropdown(false)
        setShowDestDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Sync gateways from URL params if present (e.g. ?origin=INNSA&dest=AEJEA&service=ocean)
  useEffect(() => {
    const originParam = params.get('origin')
    const destParam = params.get('dest')
    if (originParam) {
      const g = getGatewayByCode(originParam)
      if (g) {
        setOriginGw(g)
        setOriginSearch(`${g.code} — ${g.name}`)
      }
    }
    if (destParam) {
      const g = getGatewayByCode(destParam)
      if (g) {
        setDestGw(g)
        setDestSearch(`${g.code} — ${g.name}`)
      }
    }
  }, [params])

  // Sync destination country and dial code when destination gateway changes
  useEffect(() => {
    if (destGw) {
      if (destGw.country) {
        setCountry(destGw.country)
      }
      const match = COUNTRY_DIAL_CODES.find(
        (c) => c.country === destGw.countryCode || (destGw.country && c.label.toLowerCase().includes(destGw.country.toLowerCase()))
      )
      if (match) {
        setDestinationPhoneCode(match.code)
      }
    }
  }, [destGw])

  const [pickupAddress, setPickupAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  
  const todayStr = new Date().toISOString().split('T')[0]
  const [readyDate, setReadyDate] = useState('')
  const [reqDeliveryDate, setReqDeliveryDate] = useState('')

  // 2. Service type state
  const [mode, setMode] = useState(params.get('service')?.toUpperCase() || 'OCEAN')
  const [subService, setSubService] = useState('FCL')
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
  const [destinationPhoneCode, setDestinationPhoneCode] = useState('+91')
  const [destinationPhone, setDestinationPhone] = useState('')
  const [country, setCountry] = useState('India')
  const [hasCustomerCode, setHasCustomerCode] = useState(false)
  const [existingCustomerCode, setExistingCustomerCode] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calcCountdown, setCalcCountdown] = useState(15)
  const [hasCalculated, setHasCalculated] = useState(false)

  // 30-second computation countdown
  useEffect(() => {
    let interval = null
    if (isCalculating && calcCountdown > 0) {
      interval = setInterval(() => {
        setCalcCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setIsCalculating(false)
            setHasCalculated(true)
            toast('Quotation calculation complete! Pricing and routing ready.')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isCalculating, calcCountdown, toast])

  // Reset calculation when core shipment parameters change
  useEffect(() => {
    setHasCalculated(false)
    setIsCalculating(false)
    setCalcCountdown(15)
  }, [originGw, destGw, mode, loadType, cargo, readyDate])

  const handleStartCalculation = () => {
    if (checkAuthGate()) return

    if (!originGw || !destGw) {
      toast('Please select origin and destination locations from master data')
      return
    }
    if (!readyDate) {
      toast('Please select a shipment ready date')
      return
    }
    if (!cargo || cargo.length === 0) {
      toast('Please add at least one cargo item')
      return
    }

    setIsCalculating(true)
    setCalcCountdown(15)
    setHasCalculated(false)
  }

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

    // Auto-fill or adjust pickup address to match gateway if empty
    let finalPickup = pickupAddress.trim()
    if (!finalPickup && originGw) {
      finalPickup = `${originGw.name}, ${originGw.city}, ${originGw.country}`
      setPickupAddress(finalPickup)
    }

    // Auto-fill or adjust delivery address to match gateway if empty
    let finalDelivery = deliveryAddress.trim()
    if (!finalDelivery && destGw) {
      finalDelivery = `${destGw.name}, ${destGw.city}, ${destGw.country}`
      setDeliveryAddress(finalDelivery)
    }

    // Validate destination contact details entered by the user
    if (!fullName.trim() || !companyName.trim() || !email.trim()) {
      toast('Please fill in destination contact name, company, and email')
      return
    }
    if (!destinationPhone.trim()) {
      toast('Please enter a destination contact phone number')
      return
    }
    const formattedPhone = destinationPhone.trim().startsWith('+') ? destinationPhone.trim() : `${destinationPhoneCode} ${destinationPhone.trim()}`

    setSubmitting(true)

    const quoteId = `QT-2026-${Math.floor(10000 + Math.random() * 89999)}`
    const tn = `PORT-${Math.floor(10000 + Math.random() * 89999)}-${destGw.countryCode || 'IN'}`

    const quoteUserEmail = (user?.email || email || 'customer@portline.in').trim().toLowerCase()
    const quoteCompany = (user?.company || companyName.trim() || 'Shipper').trim()
    const recommendedRoute = estimate.routes?.find(r => r.recommended) || estimate.routes?.[0] || null
    const chosenCarrier = recommendedRoute?.carrier || 'CMA CGM'

    const quoteRecord = {
      id: quoteId,
      tn,
      tracking_number: tn,
      shipment_id: tn,
      user_email: quoteUserEmail,
      customer: quoteCompany,
      city: originGw.city,
      laneCode: `${originGw.code} → ${destGw.code}`,
      laneName: `${originGw.city} → ${destGw.city}`,
      region: `${originGw.country}–${destGw.country}`,
      mode: mode === 'OCEAN' 
        ? `Ocean ${loadType}` 
        : mode === 'GROUND_RAIL' 
          ? (subService === 'FTL' ? 'Ground FTL' : subService === 'LTL' ? 'Ground LTL' : subService === 'RAIL_INTERMODAL' ? 'Rail Intermodal' : 'Rail Bulk')
          : mode === 'EXPRESS_AIR' 
            ? (subService === 'NFO' ? 'Express Air (NFO)' : subService === 'CHARTER' ? 'Air Charter' : 'Express Courier')
            : (subService === 'AIR_PRIORITY' ? 'Air Priority' : subService === 'AIR_PERISHABLE' ? 'Air Pharma/Cold Chain' : 'Air Freight'),
      modeKey: mode.toLowerCase(),
      basis: estimate.unitsLabel,
      transit: estimate.transitRange,
      indicativeTotal: estimate.totalAmount,
      status: 'Quotation Pending',
      pipeline_status: 'QUOTATION_PENDING',
      is_finalised: false,
      carrier: null,
      assigned_carrier: null,
      selectedCarrier: null,
      selected_route: null,
      created: new Date().toISOString(),
      created_at: new Date().toISOString(),
      details: {
        originGw,
        destGw,
        pickupAddress: finalPickup,
        deliveryAddress: finalDelivery,
        destinationPhone: formattedPhone,
        destinationContactName: fullName.trim(),
        destinationEmail: email.trim(),
        destinationCompany: companyName.trim(),
        readyDate,
        incoterm,
        commodity: cargo[0]?.commodity_description || 'General Merchandise',
        hsCode: cargo[0]?.hs_code || '',
        grossWeightKg: estimate.grossWeightKg,
        costBreakdown: estimate.costBreakdown || [],
        cargoItems: cargo,
        routes: estimate.routes,
        selected_route: null,
        carrier: null,
        is_finalised: false,
        transitBreakdown: [
          { label: `Pickup leg (${finalPickup ? 'Door pickup' : 'Road transit'})`, val: `${estimate.transitBreakdown.pickupDays} d` },
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
      quote_id: quoteId,
      carrier: chosenCarrier,
      user_email: quoteUserEmail,
      userName: user?.name || 'Shipper',
      userCompany: quoteCompany,
      customer: quoteCompany,
      destinationContactName: fullName.trim(),
      destinationCompany: companyName.trim(),
      destinationEmail: email.trim(),
      from: `${originGw.city}, ${originGw.countryCode}`,
      to: `${destGw.city}, ${destGw.countryCode}`,
      service: quoteRecord.mode,
      status: 'Quotation Pending',
      weight: estimate.grossWeightKg,
      cost: estimate.totalAmount,
      destinationPhone: formattedPhone,
      pickupAddress: finalPickup,
      deliveryAddress: finalDelivery,
      date: new Date().toISOString().slice(0, 10),
      steps: [
        { label: 'Quoted', loc: `${originGw.city}, ${originGw.countryCode}`, ts: 'Just now', done: true, current: true },
        { label: 'Booking confirmed', loc: 'Customer Acceptance Desk', ts: 'Awaiting Sign-off', done: false },
        { label: 'Picked up', loc: originGw.name, ts: 'Pending', done: false },
        { label: 'In transit', loc: '—', ts: 'Pending', done: false },
        { label: 'Customs clearance', loc: destGw.name, ts: 'Pending', done: false },
        { label: 'Out for delivery', loc: `${destGw.city}, ${destGw.countryCode}`, ts: 'Pending', done: false },
        { label: 'Delivered', loc: `${destGw.city}, ${destGw.countryCode}`, ts: 'Pending', done: false },
      ]
    }

    try {
      await saveQuote(quoteRecord)
      if (addShipment) {
        addShipment(shipmentRecord)
      }

      // Background asynchronous sync to backend without blocking navigation
      createShipmentRequest(shipmentRecord)
        .then((shipRes) => {
          const sid = shipRes?.shipment_id || quoteId
          triggerQuotePipeline(sid, {
            ...shipmentRecord,
            quote_id: quoteId,
            originGw,
            destGw,
            weight: estimate.grossWeightKg,
            commodity: cargo[0]?.commodity_description || 'General Merchandise',
            hs_code: cargo[0]?.hs_code || '850440',
            incoterm,
            container_count: cargo[0]?.container_count || 1,
            container_type: cargo[0]?.container_type || '40HC',
            modeKey: mode.toLowerCase(),
            service: quoteRecord.mode,
            indicativeTotal: estimate.totalAmount,
            cost: estimate.totalAmount,
            routes: estimate.routes,
            details: quoteRecord.details,
          }).catch((pipeErr) => {
            console.warn('Pipeline run notice:', pipeErr?.message)
          })
        })
        .catch((err) => {
          console.warn('Backend shipment creation notice:', err?.message)
        })

      toast(`Quotation ${quoteId} generated successfully!`)
      localStorage.removeItem(DRAFT_KEY)
      navigate(`/quotes/${quoteId}`, { state: { from: '/quotes' } })
    } catch (err) {
      console.warn('Error during quote generation:', err)
      toast(`Quotation ${quoteId} generated!`)
      localStorage.removeItem(DRAFT_KEY)
      navigate(`/quotes/${quoteId}`, { state: { from: '/quotes' } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageBanner
        crumb="Ship"
        title="Agentic AI for Maritime Freight Pricing and Route Optimization"
        subtitle="PORTLINE autonomous multimodal quote engine — live ML pricing, composite risk index, and dynamic route optimization."
        icon={ShipIcon}
      />
      
      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
            
            {/* FORM LEFT PANEL */}
            <div className="rounded-lg2 border border-brand-line bg-white p-[34px] shadow-sm2 space-y-8">
              
              {/* STEP 1: ROUTE */}
              <FormSection num={1} title="Route">
                <div className="relative">
                  <div className="grid grid-cols-1 items-end gap-x-12 gap-y-4 sm:grid-cols-2">
                    {/* Origin Gateway */}
                  <div ref={originDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[13px] font-semibold text-brand-navy">
                        Origin <span className="text-brand-danger">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (checkAuthGate()) return
                          setPortDirectoryTarget('origin')
                          setShowPortDirectoryModal(true)
                        }}
                        className="text-[11px] font-semibold text-brand-marine hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" /> Directory
                      </button>
                    </div>
                    {originGw ? (
                      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-brand-marine bg-brand-marinePale px-3.5 py-2.5 shadow-xs">
                        <span className="font-mono text-xs font-bold text-brand-marine bg-white px-2 py-0.5 rounded shadow-2xs">{originGw.code}</span>
                        <div className="flex-1 truncate">
                          <span className="truncate text-[13px] font-bold text-brand-navy block">{originGw.name}</span>
                          <span className="text-[11px] text-brand-slate block truncate">{originGw.city}, {originGw.country}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOriginGw(null); setOriginSearch(''); setShowOriginDropdown(false) }}
                          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-marine/20 text-brand-marine text-xs font-bold hover:bg-brand-marine hover:text-white transition-colors"
                          title="Clear origin"
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                          <input
                            type="text"
                            value={originSearch}
                            onChange={(e) => {
                              if (checkAuthGate()) return
                              setOriginSearch(e.target.value)
                              setShowOriginDropdown(true)
                              setShowDestDropdown(false)
                            }}
                            onFocus={() => {
                              if (checkAuthGate()) return
                              setShowOriginDropdown(true)
                              setShowDestDropdown(false)
                            }}
                            onClick={() => {
                              if (checkAuthGate()) return
                              setShowOriginDropdown(true)
                              setShowDestDropdown(false)
                            }}
                            className={`${brandInputStyle} pl-10 pr-9`}
                            placeholder={
                              mode === 'OCEAN' 
                                ? "Search sea port name, city, UN/LOCODE... (e.g. JNPT, Rotterdam, Singapore)"
                                : (mode === 'AIR' || mode === 'EXPRESS_AIR')
                                  ? "Search air cargo hub, IATA code, city... (e.g. BOM, DXB, FRA, JFK)"
                                  : "Search city, port, airport, rail ICD, or road hub... (e.g. Dadri, Bhiwandi, JNPT)"
                            }
                          />
                          {originSearch && (
                            <button
                              type="button"
                              onClick={() => { setOriginSearch(''); setShowOriginDropdown(false) }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-slateLight/20 text-brand-slate text-xs hover:bg-brand-slateLight/40"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {showOriginDropdown && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-brand-line bg-white shadow-xl">
                            <div className="sticky top-0 bg-brand-cloud/90 backdrop-blur-sm px-3.5 py-1.5 border-b border-brand-line flex items-center justify-between text-[11px] text-brand-slate font-medium">
                              <span>
                                {mode === 'OCEAN' ? `Matching sea ports (${originCandidates.length})` : (mode === 'AIR' || mode === 'EXPRESS_AIR') ? `Matching air cargo hubs (${originCandidates.length})` : `Matching gateways (${originCandidates.length})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setPortDirectoryTarget('origin'); setShowPortDirectoryModal(true); setShowOriginDropdown(false); }}
                                className="text-brand-marine font-semibold hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" /> Full Directory
                              </button>
                            </div>
                            {originCandidates.length === 0 ? (
                              <div className="p-4 text-center text-xs text-brand-slate">
                                <p className="font-semibold text-brand-navy">
                                  {mode === 'OCEAN' ? 'No matching sea ports found' : (mode === 'AIR' || mode === 'EXPRESS_AIR') ? 'No matching air cargo hubs found' : 'No matching locations found'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => { setPortDirectoryTarget('origin'); setShowPortDirectoryModal(true); setShowOriginDropdown(false); }}
                                  className="mt-2 text-xs text-brand-marine font-semibold underline"
                                >
                                  Browse full directory
                                </button>
                              </div>
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
                                  className="cursor-pointer px-3.5 py-2.5 hover:bg-brand-cloud/70 border-b border-brand-line/40 last:border-0 flex items-center justify-between gap-2 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono text-xs font-bold text-brand-marine bg-brand-marinePale px-1.5 py-0.5 rounded flex-shrink-0">
                                      {g.code}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-semibold text-brand-navy">{g.name}</div>
                                      <div className="truncate text-[11px] text-brand-slate flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" /> {g.city}, {g.country}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1 ${
                                    g.type === 'AIRPORT' 
                                      ? 'bg-amber-50 text-amber-700' 
                                      : g.type === 'RAIL_TERMINAL'
                                        ? 'bg-purple-50 text-purple-700'
                                        : g.type === 'ROAD_HUB'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {g.type === 'AIRPORT' ? <Plane className="h-2.5 w-2.5" /> : g.type === 'RAIL_TERMINAL' ? <Route className="h-2.5 w-2.5" /> : g.type === 'ROAD_HUB' ? <Truck className="h-2.5 w-2.5" /> : <ShipIcon className="h-2.5 w-2.5" />}
                                    {g.type === 'AIRPORT' ? 'AIR' : g.type === 'RAIL_TERMINAL' ? 'RAIL ICD' : g.type === 'ROAD_HUB' ? 'ROAD' : 'PORT'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Mobile Swap button */}
                  <div className="flex sm:hidden justify-center -my-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (checkAuthGate()) return
                        handleSwap()
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-line bg-white text-brand-marine shadow-2xs transition-transform hover:rotate-180"
                      title="Swap origin and destination"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>

                  {/* Destination Gateway */}
                  <div ref={destDropdownRef} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[13px] font-semibold text-brand-navy">
                        Destination <span className="text-brand-danger">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (checkAuthGate()) return
                          setPortDirectoryTarget('dest')
                          setShowPortDirectoryModal(true)
                        }}
                        className="text-[11px] font-semibold text-brand-marine hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" /> Directory
                      </button>
                    </div>
                    {destGw ? (
                      <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-brand-marine bg-brand-marinePale px-3.5 py-2.5 shadow-xs">
                        <span className="font-mono text-xs font-bold text-brand-marine bg-white px-2 py-0.5 rounded shadow-2xs">{destGw.code}</span>
                        <div className="flex-1 truncate">
                          <span className="truncate text-[13px] font-bold text-brand-navy block">{destGw.name}</span>
                          <span className="text-[11px] text-brand-slate block truncate">{destGw.city}, {destGw.country}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setDestGw(null); setDestSearch(''); setShowDestDropdown(false) }}
                          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-marine/20 text-brand-marine text-xs font-bold hover:bg-brand-marine hover:text-white transition-colors"
                          title="Clear destination"
                        >×</button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slateLight" />
                          <input
                            type="text"
                            value={destSearch}
                            onChange={(e) => {
                              if (checkAuthGate()) return
                              setDestSearch(e.target.value)
                              setShowDestDropdown(true)
                              setShowOriginDropdown(false)
                            }}
                            onFocus={() => {
                              if (checkAuthGate()) return
                              setShowDestDropdown(true)
                              setShowOriginDropdown(false)
                            }}
                            onClick={() => {
                              if (checkAuthGate()) return
                              setShowDestDropdown(true)
                              setShowOriginDropdown(false)
                            }}
                            className={`${brandInputStyle} pl-10 pr-9`}
                            placeholder={
                              mode === 'OCEAN' 
                                ? "Search sea port name, city, UN/LOCODE... (e.g. Jebel Ali, Singapore, Hamburg)"
                                : (mode === 'AIR' || mode === 'EXPRESS_AIR')
                                  ? "Search destination airport, IATA, city... (e.g. DXB, LHR, JFK, PVG)"
                                  : "Search city, port, airport, rail ICD, or road hub... (e.g. Duisburg, Chicago, Dallas)"
                            }
                          />
                          {destSearch && (
                            <button
                              type="button"
                              onClick={() => { setDestSearch(''); setShowDestDropdown(false) }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-slateLight/20 text-brand-slate text-xs hover:bg-brand-slateLight/40"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {showDestDropdown && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-brand-line bg-white shadow-xl">
                            <div className="sticky top-0 bg-brand-cloud/90 backdrop-blur-sm px-3.5 py-1.5 border-b border-brand-line flex items-center justify-between text-[11px] text-brand-slate font-medium">
                              <span>
                                {mode === 'OCEAN' ? `Matching sea ports (${destCandidates.length})` : (mode === 'AIR' || mode === 'EXPRESS_AIR') ? `Matching air cargo hubs (${destCandidates.length})` : `Matching gateways (${destCandidates.length})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setPortDirectoryTarget('dest'); setShowPortDirectoryModal(true); setShowDestDropdown(false); }}
                                className="text-brand-marine font-semibold hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" /> Full Directory
                              </button>
                            </div>
                            {destCandidates.length === 0 ? (
                              <div className="p-4 text-center text-xs text-brand-slate">
                                <p className="font-semibold text-brand-navy">
                                  {mode === 'OCEAN' ? 'No matching sea ports found' : (mode === 'AIR' || mode === 'EXPRESS_AIR') ? 'No matching air cargo hubs found' : 'No matching locations found'}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => { setPortDirectoryTarget('dest'); setShowPortDirectoryModal(true); setShowDestDropdown(false); }}
                                  className="mt-2 text-xs text-brand-marine font-semibold underline"
                                >
                                  Browse full directory
                                </button>
                              </div>
                            ) : (
                              destCandidates.map((g) => (
                                <div
                                  key={g.code}
                                  onClick={() => {
                                    setDestGw(g)
                                    setDestSearch(`${g.code} — ${g.name}`)
                                    setShowDestDropdown(false)
                                  }}
                                  className="cursor-pointer px-3.5 py-2.5 hover:bg-brand-cloud/70 border-b border-brand-line/40 last:border-0 flex items-center justify-between gap-2 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono text-xs font-bold text-brand-marine bg-brand-marinePale px-1.5 py-0.5 rounded flex-shrink-0">
                                      {g.code}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-semibold text-brand-navy">{g.name}</div>
                                      <div className="truncate text-[11px] text-brand-slate flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" /> {g.city}, {g.country}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1 ${
                                    g.type === 'AIRPORT' 
                                      ? 'bg-amber-50 text-amber-700' 
                                      : g.type === 'RAIL_TERMINAL'
                                        ? 'bg-purple-50 text-purple-700'
                                        : g.type === 'ROAD_HUB'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {g.type === 'AIRPORT' ? <Plane className="h-2.5 w-2.5" /> : g.type === 'RAIL_TERMINAL' ? <Route className="h-2.5 w-2.5" /> : g.type === 'ROAD_HUB' ? <Truck className="h-2.5 w-2.5" /> : <ShipIcon className="h-2.5 w-2.5" />}
                                    {g.type === 'AIRPORT' ? 'AIR' : g.type === 'RAIL_TERMINAL' ? 'RAIL ICD' : g.type === 'ROAD_HUB' ? 'ROAD' : 'PORT'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  </div>

                  {/* Desktop Swap button centered between Origin and Destination */}
                  <button
                    type="button"
                    onClick={() => {
                      if (checkAuthGate()) return
                      handleSwap()
                    }}
                    className="hidden sm:flex absolute left-1/2 bottom-[6px] -translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-brand-line bg-white text-brand-marine shadow-sm transition-transform hover:rotate-180 hover:bg-brand-marinePale"
                    title="Swap origin and destination"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Pickup address <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder={originGw ? `e.g. 12 Industrial Area, ${originGw.city}` : "Street, city, PIN code"}
                      className={`${brandInputStyle} ${
                        pickupAddress && originGw && !checkAddressMatchesGateway(pickupAddress, originGw).matches
                          ? 'border-rose-400 bg-rose-50/20'
                          : pickupAddress && originGw && checkAddressMatchesGateway(pickupAddress, originGw).matches
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : ''
                      }`}
                    />
                    {originGw && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        {pickupAddress && checkAddressMatchesGateway(pickupAddress, originGw).matches ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Address verified: In {originGw.city}
                          </span>
                        ) : pickupAddress ? (
                          <span className="text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Address must be in {originGw.city} to match origin port ({originGw.name})
                          </span>
                        ) : (
                          <span className="text-brand-slateLight">
                            Must be located in {originGw.city} (matches selected origin port)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Delivery address <span className="text-brand-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={destGw ? `e.g. 45 Logistics Blvd, ${destGw.city}` : "Street, city, postal code"}
                      className={`${brandInputStyle} ${
                        deliveryAddress && destGw && !checkAddressMatchesGateway(deliveryAddress, destGw).matches
                          ? 'border-rose-400 bg-rose-50/20'
                          : deliveryAddress && destGw && checkAddressMatchesGateway(deliveryAddress, destGw).matches
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : ''
                      }`}
                    />
                    {destGw && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        {deliveryAddress && checkAddressMatchesGateway(deliveryAddress, destGw).matches ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Address verified: In {destGw.city}
                          </span>
                        ) : deliveryAddress ? (
                          <span className="text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Address must be in {destGw.city} to match destination port ({destGw.name})
                          </span>
                        ) : (
                          <span className="text-brand-slateLight">
                            Must be located in {destGw.city} (matches selected destination port)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
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
                        if (reqDeliveryDate && val && reqDeliveryDate < getMinDeliveryDate(val)) {
                          setReqDeliveryDate('')
                        }
                      }}
                      min={todayStr}
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
                      min={readyDate ? getMinDeliveryDate(readyDate) : todayStr}
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
                            const newMode = chip.key
                            setMode(newMode)
                            if (newMode === 'OCEAN') {
                              setLoadType('FCL')
                              setSubService('FCL')
                              if (originGw && originGw.type !== 'PORT') {
                                setOriginGw(null)
                                setOriginSearch('')
                              }
                              if (destGw && destGw.type !== 'PORT') {
                                setDestGw(null)
                                setDestSearch('')
                              }
                              setCargo([newCargoItem(true)])
                            } else if (newMode === 'GROUND_RAIL') {
                              setSubService('FTL')
                              setLoadType('FCL')
                              setCargo([{ ...newCargoItem(true), package_type: 'CONTAINER', container_type: '32FT_MXL' }])
                            } else if (newMode === 'EXPRESS_AIR' || newMode === 'AIR') {
                              setSubService(newMode === 'EXPRESS_AIR' ? 'NFO' : 'AIR_STANDARD')
                              setLoadType('LCL')
                              if (originGw && originGw.type !== 'AIRPORT') {
                                setOriginGw(null)
                                setOriginSearch('')
                              }
                              if (destGw && destGw.type !== 'AIRPORT') {
                                setDestGw(null)
                                setDestSearch('')
                              }
                              setCargo([{ ...newCargoItem(false), package_type: newMode === 'EXPRESS_AIR' ? 'BOX' : 'CARTON', weight_per_unit_kg: '15' }])
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

                {/* Sub-Service Option & Incoterm */}
                <div className="rounded-md2 border border-brand-line bg-brand-cloud p-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                        Service type <span className="text-brand-danger">*</span>
                      </label>

                      {/* Ocean Options */}
                      {mode === 'OCEAN' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setLoadType('FCL')
                              setSubService('FCL')
                              setCargo([newCargoItem(true)])
                            }}
                            className={`py-2.5 px-3 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              loadType === 'FCL'
                                ? 'border-brand-marine bg-brand-marinePale text-brand-marine font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            FCL — Full container
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoadType('LCL')
                              setSubService('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2.5 px-3 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              loadType === 'LCL'
                                ? 'border-brand-marine bg-brand-marinePale text-brand-marine font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            LCL — Consolidated
                          </button>
                        </div>
                      )}

                      {/* Ground & Rail Options */}
                      {mode === 'GROUND_RAIL' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('FTL')
                              setLoadType('FCL')
                              setCargo([{ ...newCargoItem(true), package_type: 'CONTAINER', container_type: '32FT_MXL' }])
                            }}
                            className={`py-2.5 px-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'FTL'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            FTL — Full Truckload
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('LTL')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2.5 px-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'LTL'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            LTL — Part Load / Pallets
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('RAIL_INTERMODAL')
                              setLoadType('FCL')
                              setCargo([{ ...newCargoItem(true), package_type: 'CONTAINER', container_type: '40HC' }])
                            }}
                            className={`py-2.5 px-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'RAIL_INTERMODAL'
                                ? 'border-purple-600 bg-purple-50 text-purple-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Rail Intermodal (ICD)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('RAIL_BULK')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2.5 px-2.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'RAIL_BULK'
                                ? 'border-purple-600 bg-purple-50 text-purple-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Rail Bulk / Rake
                          </button>
                        </div>
                      )}

                      {/* Express Air Options */}
                      {mode === 'EXPRESS_AIR' && (
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('NFO')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'NFO'
                                ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Next Flight Out (24h)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('COURIER')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'COURIER'
                                ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Express Courier
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('CHARTER')
                              setLoadType('FCL')
                              setCargo([newCargoItem(true)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'CHARTER'
                                ? 'border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Air Charter
                          </button>
                        </div>
                      )}

                      {/* Air Freight Options */}
                      {mode === 'AIR' && (
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('AIR_STANDARD')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'AIR_STANDARD'
                                ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Standard Cargo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('AIR_PRIORITY')
                              setLoadType('LCL')
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'AIR_PRIORITY'
                                ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Direct Priority
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubService('AIR_PERISHABLE')
                              setLoadType('LCL')
                              setIsTempControlled(true)
                              setCargo([newCargoItem(false)])
                            }}
                            className={`py-2 px-1.5 text-center text-xs font-semibold rounded-[10px] border-[1.5px] transition-all ${
                              subService === 'AIR_PERISHABLE'
                                ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-xs'
                                : 'border-brand-line bg-white text-brand-slate hover:bg-brand-cloud'
                            }`}
                          >
                            Pharma / Cold Chain
                          </button>
                        </div>
                      )}
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
                            {mode === 'GROUND_RAIL' && subService === 'FTL' ? 'Truck / Vehicle type' : 'Package type'} <span className="text-brand-danger">*</span>
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
                            {mode === 'GROUND_RAIL' && subService === 'FTL' ? (
                              <>
                                <option value="CONTAINER">Dedicated Truck Body / Semi Trailer</option>
                              </>
                            ) : mode === 'AIR' || mode === 'EXPRESS_AIR' ? (
                              <>
                                <option value="BOX">Express Box (1–15 kg)</option>
                                <option value="CARTON">Master Export Carton</option>
                                <option value="PALLET">Air Cargo Skid / Pallet</option>
                                <option value="CONTAINER">Air ULD Container (LD3 / AKE)</option>
                                <option value="CRATE">Wooden Crate</option>
                                <option value="LOOSE">Loose Cargo</option>
                              </>
                            ) : (
                              <>
                                <option value="CONTAINER">Container</option>
                                <option value="PALLET">Pallet</option>
                                <option value="CARTON">Carton</option>
                                <option value="CRATE">Crate</option>
                                <option value="DRUM">Drum</option>
                                <option value="BAG">Bag</option>
                                <option value="LOOSE">Loose Cargo</option>
                              </>
                            )}
                          </select>
                        </div>

                        {item.package_type === 'CONTAINER' && (
                          <div>
                            <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                              {mode === 'GROUND_RAIL' ? (subService === 'FTL' ? 'Truck Configuration' : 'Rail Equipment') : (mode === 'AIR' || mode === 'EXPRESS_AIR') ? 'Aviation ULD Spec' : 'Container type'} <span className="text-brand-danger">*</span>
                            </label>
                            <select
                              value={item.container_type}
                              onChange={(e) => updateCargo(item.id, 'container_type', e.target.value)}
                      className={brandInputStyle}
                            >
                              {mode === 'GROUND_RAIL' && subService === 'FTL' ? (
                                <>
                                  <option value="32FT_MXL">32ft MXL Closed Container Truck (14 Ton)</option>
                                  <option value="40FT_TRAILER">40ft High-Bed Semi Trailer (24 Ton)</option>
                                  <option value="53FT_INTERMODAL">53ft Domestic Intermodal Van (26 Ton)</option>
                                  <option value="20FT_FLATBED">20ft Flatbed Open Truck (9 Ton)</option>
                                  <option value="14FT_CITY">14ft City Truck (4 Ton)</option>
                                </>
                              ) : mode === 'GROUND_RAIL' && subService === 'RAIL_INTERMODAL' ? (
                                <>
                                  <option value="40HC">40HC — 40ft High Cube Intermodal</option>
                                  <option value="20GP">20GP — 20ft Standard Intermodal</option>
                                  <option value="45PW">45ft Euro Palletwide Container</option>
                                  <option value="60FLAT">60ft Rail Flatcar</option>
                                </>
                              ) : mode === 'AIR' || mode === 'EXPRESS_AIR' ? (
                                <>
                                  <option value="LD3">LD3 (AKE) Aviation ULD Container (1,588 kg cap)</option>
                                  <option value="LD7">LD7 (PAG) Aviation Main Deck Pallet (6,804 kg cap)</option>
                                  <option value="AKH">AKH Narrow-Body ULD Container (1,134 kg cap)</option>
                                </>
                              ) : (
                                <>
                                  <option value="40HC">40HC — 40ft High Cube</option>
                                  <option value="20GP">20GP — 20ft General</option>
                                  <option value="40GP">40GP — 40ft General</option>
                                  <option value="40RF">40RF — Reefer</option>
                                  <option value="20RF">20RF — 20ft Reefer</option>
                                  <option value="20OT">20OT — Open Top</option>
                                  <option value="40FR">40FR — Flat Rack</option>
                                </>
                              )}
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
                      className={brandInputStyle}
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
                      className={brandInputStyle}
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
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-brand-marine" /> Mobile number / Phone <span className="text-brand-danger">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={destinationPhoneCode}
                        onChange={(e) => setDestinationPhoneCode(e.target.value)}
                        className="w-36 rounded-xl border border-brand-line bg-brand-cloud/40 px-2.5 py-2.5 text-xs font-semibold text-brand-navy focus:border-brand-marine focus:bg-white focus:outline-none shadow-xs"
                      >
                        {COUNTRY_DIAL_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={destinationPhone}
                        onChange={(e) => setDestinationPhone(e.target.value)}
                        placeholder="e.g. 98765 43210"
                        className={`flex-1 ${brandInputStyle}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-brand-navy">
                      Destination country <span className="text-brand-danger">*</span>
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={brandInputStyle}
                    >
                      {/* Show current country option if not in predefined list */}
                      {country && !DESTINATION_COUNTRIES.includes(country) && (
                        <option value={country}>{country}</option>
                      )}
                      {DESTINATION_COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
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
                      className={brandInputStyle}
                      />
                    </div>
                  )}
                </div>
              </FormSection>

            </div>

            {/* LIVE ESTIMATE RIGHT PANEL */}
            <div className="sticky top-[92px]">
              {!hasCalculated && !isCalculating && (
                <div className="rounded-lg2 bg-brand-navy p-7 text-white shadow-md2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">
                      QUOTATION ESTIMATE
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                      AWAITING INPUT
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center my-4">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/20 text-brand-orangeLight">
                      <Zap className="h-6 w-6" />
                    </div>
                    <h4 className="font-display text-[16px] font-bold text-white mb-1.5">
                      Ready to Generate Quotation
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Fill in your shipment route, cargo and schedule details, then click below to trigger the AI route intelligence & pricing analysis.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-left bg-black/25 rounded-lg p-2.5 text-[11px] text-slate-300 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ROUTE</span>
                        <span className="truncate block font-semibold text-white">
                          {originGw && destGw ? `${originGw.city} → ${destGw.city}` : 'Select gateways'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">SERVICE</span>
                        <span className="truncate block font-semibold text-white">
                          {mode} {loadType || ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCalculation}
                    className="w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 font-display text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" /> Generate Quotation →
                  </button>

                  <div className="mt-4 text-[11px] leading-relaxed text-slate-400 text-center">
                    Runs a ~15s multi-carrier tariff and transit time estimation. Instant estimate also available.
                  </div>
                </div>
              )}

              {isCalculating && (
                <div className="rounded-lg2 bg-brand-navy p-7 text-white shadow-md2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-brand-orangeLight flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-brand-orange animate-ping" />
                      GENERATING ESTIMATE
                    </div>
                    <span className="rounded-full bg-brand-orange/20 border border-brand-orange/40 px-2.5 py-0.5 text-xs font-mono font-bold text-brand-orangeLight">
                      {calcCountdown}s
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-orange to-amber-400 h-2 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.min(100, Math.round(((15 - calcCountdown) / 15) * 100))}%` }}
                    />
                  </div>

                  {/* Dynamic Pipeline Stage Card */}
                  <div className="rounded-xl border border-brand-orange/30 bg-white/5 p-4 mb-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orangeLight flex-shrink-0 animate-spin">
                        <Route className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          Analysis Pipeline (Stage {Math.min(5, Math.floor((15 - calcCountdown) / 3) + 1)}/5)
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {calcCountdown > 12 && "Route Intelligence Agent querying direct and transshipment schedules..."}
                          {calcCountdown <= 12 && calcCountdown > 9 && "Calculating sea distance, dwell buffers and weather contingency..."}
                          {calcCountdown <= 9 && calcCountdown > 6 && "Computing base tariffs, BAF adjustments and Terminal Handling Charges..."}
                          {calcCountdown <= 6 && calcCountdown > 3 && "Checking corporate margin floor rules, currency conversion and discounts..."}
                          {calcCountdown <= 3 && "Packaging formal quotation record with transit timeline and multi-route comparisons..."}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-2 border-t border-white/10 pt-2">
                      {calcCountdown > 12 && "Route Intelligence Agent querying direct and transshipment schedules..."}
                      {calcCountdown <= 12 && calcCountdown > 9 && "Calculating sea distance, dwell buffers and weather contingency..."}
                      {calcCountdown <= 9 && calcCountdown > 6 && "Computing base tariffs, BAF adjustments and Terminal Handling Charges..."}
                      {calcCountdown <= 6 && calcCountdown > 3 && "Checking corporate margin floor rules, currency conversion and discounts..."}
                      {calcCountdown <= 3 && "Packaging formal quotation record with transit timeline and multi-route comparisons..."}
                    </p>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1.5 text-[11px] font-mono text-slate-300 border-t border-white/10 pt-3">
                    <div className="flex justify-between">
                      <span>1. Route & Vessel Matching</span>
                      <span className={calcCountdown <= 12 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {calcCountdown <= 12 ? 'Done' : 'Analyzing...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Transit Time Modeling</span>
                      <span className={calcCountdown <= 9 ? 'text-emerald-400 font-bold' : calcCountdown <= 12 ? 'text-amber-400' : 'text-slate-500'}>
                        {calcCountdown <= 9 ? 'Done' : calcCountdown <= 12 ? 'Analyzing...' : 'Queued'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>3. 5-Layer Cost Tariffs</span>
                      <span className={calcCountdown <= 6 ? 'text-emerald-400 font-bold' : calcCountdown <= 9 ? 'text-amber-400' : 'text-slate-500'}>
                        {calcCountdown <= 6 ? 'Done' : calcCountdown <= 9 ? 'Analyzing...' : 'Queued'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>4. Margin & Compliance</span>
                      <span className={calcCountdown <= 3 ? 'text-emerald-400 font-bold' : calcCountdown <= 6 ? 'text-amber-400' : 'text-slate-500'}>
                        {calcCountdown <= 3 ? 'Done' : calcCountdown <= 6 ? 'Analyzing...' : 'Queued'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>5. Final Quotation Compilation</span>
                      <span className={calcCountdown === 0 ? 'text-emerald-400 font-bold' : calcCountdown <= 3 ? 'text-amber-400' : 'text-slate-500'}>
                        {calcCountdown === 0 ? 'Done' : calcCountdown <= 3 ? 'Finalizing...' : 'Queued'}
                      </span>
                    </div>
                  </div>

                  {/* Skip / Use instant estimate */}
                  <button
                    type="button"
                    onClick={() => { setIsCalculating(false); setCalcCountdown(0); setHasCalculated(true) }}
                    className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    ⚡ Skip animation — use instant estimate
                  </button>

                </div>
              )}

              {hasCalculated && !isCalculating && (
                <div className="rounded-lg2 bg-brand-navy p-7 text-white shadow-md2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[.18em] text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> ESTIMATE READY
                    </div>
                    <button
                      type="button"
                      onClick={handleStartCalculation}
                      className="text-[11px] font-mono text-slate-400 hover:text-white underline"
                    >
                      Recalculate (15s)
                    </button>
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

                  {/* Itemized 5-Layer Cost Build-Up */}
                  {estimate.costBreakdown && estimate.costBreakdown.length > 0 && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-2 text-xs font-mono">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-brand-orangeLight font-sans mb-1 flex items-center justify-between">
                        <span>Cost Build-Up</span>
                        <span>Itemized Tariff</span>
                      </div>
                      {estimate.costBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className={"flex justify-between " + (
                            item.isTotal
                              ? "border-t border-brand-orange/40 pt-2 font-bold text-white text-[13px]"
                              : item.isSubtotal
                              ? "border-t border-white/10 pt-1.5 font-semibold text-slate-200"
                              : "text-slate-300"
                          )}
                        >
                          <span className={item.isTotal || item.isSubtotal ? "font-sans font-semibold" : "text-slate-400 font-sans"}>
                            {item.label}
                          </span>
                          <span className={item.isTotal ? "text-brand-orangeLight font-bold font-mono" : "font-mono"}>
                            Rs. {Number(item.val || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="font-mono text-[11px] uppercase tracking-wide text-slate-400">FINAL SELL PRICE</div>
                    <div className="mt-1 font-display text-[30px] font-bold tracking-tight text-white">
                      {estimate.totalFormatted}
                    </div>
                    <div className="mt-2 inline-block rounded-md border border-brand-orange/40 bg-brand-orange/15 px-2.5 py-1 font-mono text-[10px] font-bold text-brand-orangeLight">
                      CONFIRMED TARIFF & MARGIN
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitQuote}
                    className="mt-6 w-full rounded-[10px] bg-gradient-to-br from-brand-orange to-brand-orangeLight py-3.5 font-display text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(217,80,10,.55)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <span className="inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Generating Quotation...
                      </>
                    ) : (
                      'Generate Full Quotation'
                    )}
                  </button>

                  <div className="mt-4 text-[11px] leading-relaxed text-slate-400">
                    Final rates confirmed by your account manager. Estimate excludes duties & taxes.
                  </div>
                </div>
              )}
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

      {/* GLOBAL PORT & AIRPORT DIRECTORY MODAL */}
      {showPortDirectoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl">
            <GlobalPortDirectory
              isModal={true}
              activeMode={mode}
              onClose={() => setShowPortDirectoryModal(false)}
              onSelectPort={(g, asOrigin) => {
                const targetIsOrigin = asOrigin !== undefined ? asOrigin : (portDirectoryTarget === 'origin')
                if (targetIsOrigin) {
                  setOriginGw(g)
                  setOriginSearch(`${g.code} — ${g.name}`)
                } else {
                  setDestGw(g)
                  setDestSearch(`${g.code} — ${g.name}`)
                }
                setShowPortDirectoryModal(false)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function FormSection({ num, title, children }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
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
