import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { FileText, ArrowLeft, Ship, Check, ShieldCheck, CheckCircle2, XCircle, Clock, ThumbsUp, ThumbsDown, Upload, X, Loader2, AlertTriangle, Receipt, Lock, Sparkles, Trash2, Edit3, IndianRupee, BadgeCheck, RotateCcw } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import WeatherRiskPanel from '../components/WeatherRiskPanel'
import CustomsComplianceCard from '../components/CustomsComplianceCard'
import CompositeRiskCard from '../components/CompositeRiskCard'
import MLPricingCard from '../components/MLPricingCard'
import { assessRouteWeather } from '../lib/weatherEngine'
import { validateCustomsCompliance } from '../lib/customsRAG'
import { computeCompositeRisk } from '../lib/riskEngine'
import { predictMLFreightPrice } from '../lib/mlPricingEngine'
import {
  fetchQuoteById,
  deleteQuote,
  customerDecisionOnQuote,
  selectQuoteRoute,
  finaliseQuote,
  uploadQuoteDocuments,
  fetchBackendMLPrice,
  fetchBackendWeatherAssess,
  fetchBackendCustomsValidate,
  saveAgentPriceEdit,
  agentActionOnQuote,
  getAgentPriceEdits,
  resolveEffectiveQuoteStatus
} from '../lib/api'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getAgentDesk, isCarrierMatch } from '../lib/mockData'

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { user } = useApp()

  const getBackNavigation = () => {
    const from = location.state?.from || (searchParams.get('view') === 'agent' ? '/agent' : null)
    if (location.state?.from) {
      return { 
        path: location.state.from, 
        label: location.state.fromLabel || (location.state.from === '/quotes' ? 'Back to Quotations' : location.state.from === '/portal' ? 'Back to Shipper Portal' : 'Back') 
      }
    }
    if (from === '/agent' || user?.role === 'agent' || user?.role === 'broker') {
      return { path: '/agent', label: 'Back to Agent Workspace' }
    }
    if (from === '/customs' || user?.role === 'customs_officer') {
      return { path: '/customs', label: 'Back to Customs Workspace' }
    }
    if (from === '/admin' || user?.role === 'admin') {
      return { path: '/admin', label: 'Back to Admin Console' }
    }
    if (user?.role === 'customer') {
      return { path: '/quotes', label: 'Back to Quotations' }
    }
    return { path: '/quotes', label: 'Back to Quotations' }
  }
  const backNav = getBackNavigation()

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(backNav.path)
    }
  }
  const toast = useToast()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [selectingRouteId, setSelectingRouteId] = useState(null)

  // Agent Price Edit state
  const [editPriceMode, setEditPriceMode] = useState(false)
  const [editPriceVal, setEditPriceVal] = useState('')
  const [editPriceReason, setEditPriceReason] = useState('')
  const [editPriceSaving, setEditPriceSaving] = useState(false)
  const [agentPriceEdit, setAgentPriceEdit] = useState(null)

  const isAgentOrAdmin = 
    user?.role === 'agent' || 
    user?.role === 'admin' || 
    user?.role === 'manager' || 
    user?.role === 'customs_officer' || 
    user?.role === 'agent_operator' ||
    searchParams.get('view') === 'agent' ||
    searchParams.get('role') === 'agent' ||
    searchParams.get('role') === 'admin'

  const isAgentView = isAgentOrAdmin

  const currentDesk = getAgentDesk(user)
  const agentEmail = (user?.email || '').toLowerCase().trim()
  const isSupervisorOrLead =
    user?.role === 'admin' ||
    user?.role === 'agent_operator' ||
    user?.role === 'manager' ||
    user?.role === 'customs_officer' ||
    agentEmail === 'agent@portline.in' ||
    agentEmail === 'agent.demo@portline.in' ||
    agentEmail.startsWith('agent@') ||
    agentEmail.startsWith('agent.demo@') ||
    currentDesk?.carrierKey?.toLowerCase() === 'general'

  const isSpecificCarrierAgent = (user?.role === 'agent' || user?.role === 'broker') && !isSupervisorOrLead

  // Real backend async state (used if quote document doesn't already have precomputed AI)
  const [liveML, setLiveML] = useState(null)
  const [liveWeather, setLiveWeather] = useState(null)
  const [liveCustoms, setLiveCustoms] = useState(null)

  useEffect(() => {
    fetchQuoteById(id).then((res) => {
      setQuote(res)
      setLoading(false)

      // Load agent price revision if one exists
      if (res) {
        try {
          const edits = getAgentPriceEdits()
          const edit = edits?.[id] || edits?.[(id || '').toUpperCase()] || res.agent_price_edit
          if (edit && edit.revised_price > 0) {
            setAgentPriceEdit(edit)
            setEditPriceVal(String(edit.revised_price))
            setEditPriceReason(edit.reason || '')
          }
        } catch (e) {
          console.warn('Failed loading agent price revision:', e)
        }
      }

      // If quote lacks precomputed backend AI, fetch from real backend endpoints
      if (res) {
        const d = res.details || {}
        const ogCode = d.originGw?.code || 'INMAA'
        const dgCode = d.destGw?.code || 'SGSIN'
        const mode = res.mode || 'OCEAN'

        if (!res.m2_ml_pricing) {
          fetchBackendMLPrice({
            distance_nm: 1205,
            weight_kg: d.grossWeightKg || 15000,
            container_count: d.containerCount || 2,
            mode,
            container_type: d.containerType || '40HC',
            rule_price: res.indicativeTotal || 148350,
            origin: d.originGw?.city || 'Chennai',
            destination: d.destGw?.city || 'Singapore',
            cargo_type: d.commodity || 'General Cargo'
          }).then(mlRes => mlRes && setLiveML(mlRes))
        }

        if (!res.m3_weather) {
          fetchBackendWeatherAssess({
            origin_code: ogCode,
            dest_code: dgCode,
            mode
          }).then(wRes => wRes && setLiveWeather(wRes))
        }

        if (!res.m3_customs) {
          fetchBackendCustomsValidate({
            hs_code: d.hsCode || '850440',
            commodity: d.commodity || 'General Merchandise',
            origin: 'IN',
            destination: 'SG',
            shipment_id: res.shipment_id || res.id
          }).then(cRes => cRes && setLiveCustoms(cRes))
        }
      }
    })
  }, [id])

  const d = quote?.details || {}
  const allRoutes = d.routes || []

  // Route visibility isolation:
  // - Customer, Admin, and Lead/Main Agent (agent@portline.in) see all routes for comparison.
  // - Specific carrier desk agents (e.g. Hapag, CMA CGM, Maersk) ONLY see their own respective carrier route.
  const routes = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return []
    if (!isSpecificCarrierAgent) return allRoutes

    // Specific carrier desk agent: only show this agent's carrier route
    const deskKey = currentDesk?.carrierKey || ''
    const filtered = allRoutes.filter(r => isCarrierMatch(deskKey, r.carrier))
    if (filtered.length > 0) return filtered

    // If quote.selected_route exists and matches this desk:
    if (quote?.selected_route && isCarrierMatch(deskKey, quote.selected_route.carrier)) {
      return [quote.selected_route]
    }

    return filtered
  }, [allRoutes, isSpecificCarrierAgent, currentDesk, quote?.selected_route])

  // Milestone 3 Intelligence calculations (prioritizes real backend data from MongoDB)
  const weatherData = useMemo(() => {
    if (!quote) return null
    if (quote.m3_weather) {
      const w = quote.m3_weather
      return {
        riskScore: w.risk_score,
        riskLevel: w.risk_level,
        delayProbabilityPct: w.delay_probability_pct,
        maxWaveHeightM: w.max_wave_height_m,
        maxWindSpeedKts: w.max_wind_speed_kts,
        waypoints: w.observations || [],
        storms: w.storm_details || [],
        routeAdvice: w.route_advice || 'Standard transit schedule expected.'
      }
    }
    if (liveWeather) {
      return {
        riskScore: liveWeather.risk_score,
        riskLevel: liveWeather.risk_level,
        delayProbabilityPct: liveWeather.delay_probability_pct,
        maxWaveHeightM: liveWeather.max_wave_height_m,
        maxWindSpeedKts: liveWeather.max_wind_speed_kts,
        waypoints: liveWeather.observations || [],
        storms: liveWeather.storm_details || [],
        routeAdvice: liveWeather.route_advice
      }
    }
    return assessRouteWeather(d.originGw?.code || 'INMAA', d.destGw?.code || 'SGSIN', quote.mode || 'OCEAN')
  }, [quote, liveWeather, d])

  const customsData = useMemo(() => {
    if (!quote) return null
    if (quote.m3_customs) {
      const c = quote.m3_customs
      const checklistItems = Array.isArray(c.checklist) ? c.checklist : []
      return {
        hsCode: c.hs_code || d.hsCode || '850440',
        hsDescription: d.commodity || 'Standard Commercial Cargo',
        readinessScore: c.readiness_score || 85,
        complianceStatus: c.compliance_status || 'APPROVED',
        checklist: checklistItems.map(item => ({
          name: item?.item_name || item?.name || 'Statutory Declaration',
          uploaded: item?.document_uploaded ?? item?.uploaded ?? true,
          status: item?.status || 'VERIFIED'
        })),
        citations: Array.isArray(c.retrieved_citations) ? c.retrieved_citations : [],
        summary: c.summary || 'Customs trade classification verified against regulatory corpus.',
        requiresOfficerReview: c.requires_officer_review || false
      }
    }
    if (liveCustoms) {
      const liveChecklist = Array.isArray(liveCustoms.document_checklist) ? liveCustoms.document_checklist : []
      return {
        hsCode: liveCustoms.hs_code || d.hsCode || '850440',
        hsDescription: d.commodity || 'Standard Commercial Cargo',
        readinessScore: liveCustoms.readiness_score || 85,
        complianceStatus: liveCustoms.compliance_status || 'APPROVED',
        checklist: liveChecklist.map(item => ({
          name: item?.item_name || item?.name || 'Statutory Declaration',
          uploaded: item?.document_uploaded ?? true,
          status: item?.status || 'VERIFIED'
        })),
        citations: Array.isArray(liveCustoms.retrieved_citations) ? liveCustoms.retrieved_citations : [],
        summary: liveCustoms.summary,
        requiresOfficerReview: liveCustoms.requires_officer_review
      }
    }
    return validateCustomsCompliance({
      hsCode: d.hsCode || '850440',
      commodity: d.commodity || 'Static Inverters',
      originCountry: 'IN',
      destCountry: 'SG'
    })
  }, [quote, liveCustoms, d])

  const compositeRiskData = useMemo(() => {
    if (!quote) return null
    const r = quote.m3_risk || quote.m3_composite_risk
    if (r) {
      const factors = Array.isArray(r.factor_breakdown) ? r.factor_breakdown : []
      return {
        overallScore: r.overall_score ?? 20,
        riskLevel: r.risk_level || 'LOW',
        color: r.risk_level === 'CRITICAL' ? '#991B1B' : r.risk_level === 'HIGH' ? '#EF4444' : r.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981',
        primaryDriver: r.primary_driver || 'Normal transit corridors',
        explanation: r.explanation || 'Nominal operational risk profile.',
        guidance: r.guidance || 'Standard dispatch schedule recommended.',
        formula: r.formula || 'Weather (30%) + Customs (25%) + Route (20%) + Port (15%) + Cargo (10%)',
        factors: factors.map(f => ({
          name: f?.factor_name || 'Risk Factor',
          score: f?.score ?? 20,
          weight: f?.weight_pct ?? 20,
          contribution: f?.contribution_pts ?? 4,
          severity: f?.severity || 'LOW',
          reason: f?.reason || 'Clear baseline parameters',
          source: f?.source || 'Analytical Assessment'
        }))
      }
    }
    if (!weatherData || !customsData) return null
    return computeCompositeRisk({
      weatherScore: weatherData.riskScore,
      customsScore: customsData.complianceStatus === 'APPROVED' ? 18 : 65,
      routeScore: 22,
      portScore: 18,
      cargoScore: 12,
      weatherDetails: weatherData.routeAdvice,
      customsDetails: customsData.summary
    })
  }, [quote, weatherData, customsData])

  const mlPricingData = useMemo(() => {
    if (!quote) return null
    if (quote.m2_ml_pricing) {
      const ml = quote.m2_ml_pricing
      const rule = ml.rule_based_price || quote.indicativeTotal || 148350
      const pred = ml.ml_predicted_price || rule
      return {
        rulePrice: rule,
        mlPredictedPrice: pred,
        varianceInr: pred - rule,
        variancePct: ml.price_variance_pct || 0,
        lowerBound: Math.round(pred * 0.96),
        upperBound: Math.round(pred * 1.04),
        marketSentiment: ml.confidence_level === 'HIGH' ? 'BALANCED' : 'TIGHT',
        recommendation: 'RULE_COMPETITIVE',
        explanation: `LightGBM ML Model v${ml.model_version || '2.0'} predicts Rs. ${pred.toLocaleString()} (${ml.price_variance_pct >= 0 ? '+' : ''}${ml.price_variance_pct}% vs rule tariff) with R2 = ${ml.r2_score || 0.8387}.`,
        modelName: 'LightGBM Gradient Boosted Regressor (v2.0)',
        accuracyR2: ml.r2_score || 0.8387
      }
    }
    if (liveML) {
      const rule = liveML.rule_based_price || quote.indicativeTotal || 148350
      const pred = liveML.ml_predicted_price || rule
      return {
        rulePrice: rule,
        mlPredictedPrice: pred,
        varianceInr: pred - rule,
        variancePct: liveML.price_variance_pct || 0,
        lowerBound: Math.round(pred * 0.96),
        upperBound: Math.round(pred * 1.04),
        marketSentiment: liveML.confidence_level === 'HIGH' ? 'BALANCED' : 'TIGHT',
        recommendation: 'RULE_COMPETITIVE',
        explanation: `LightGBM ML Model predicts Rs. ${pred.toLocaleString()} (${liveML.price_variance_pct >= 0 ? '+' : ''}${liveML.price_variance_pct}% vs rule tariff) with R2 = ${liveML.r2_score || 0.8387}.`,
        modelName: liveML.model_type || 'LightGBM Regression v2.0',
        accuracyR2: liveML.r2_score || 0.8387
      }
    }
    return predictMLFreightPrice({
      distanceNm: 1205,
      weightKg: d.grossWeightKg || 15000,
      containerCount: d.containerCount || 2,
      mode: quote.mode || 'OCEAN',
      containerType: d.containerType || '40HC',
      rulePrice: quote.indicativeTotal || 148350
    })
  }, [quote, liveML, d])

  const activeRevisedPrice = Number(agentPriceEdit?.revised_price || quote?.agent_price_edit?.revised_price || 0)
  const hasPriceRevision = Boolean(activeRevisedPrice > 0 || quote?.agent_price_edit?.revised_price > 0 || quote?.original_indicative_total)
  const isRevisionAccepted = Boolean(
    activeRevisedPrice > 0 &&
    (quote?.customer_decision?.status === 'ACCEPTED' ||
     quote?.status === 'Price Accepted (Pending Agent Sign-off)' ||
     quote?.status === 'Accepted')
  )
  const effectiveDisplayTotal = isRevisionAccepted
    ? activeRevisedPrice
    : Number(quote?.indicativeTotal || 0)

  // Clean, transparent commercial tariff breakdown for customers & invoices
  const customerTariffBreakdown = useMemo(() => {
    if (!quote) return []
    const total = effectiveDisplayTotal || (quote.indicativeTotal || 0)
    const modeLabel = quote.mode || 'Freight'
    const basisLabel = quote.basis || 'Per Unit Tariff'

    // Clean commercial tariff build-up calculated from effectiveDisplayTotal
    const baseVal = Math.round(total * 0.72)
    const bafVal = Math.round(total * 0.10)
    const thcVal = Math.round(total * 0.15)
    const docVal = total - (baseVal + bafVal + thcVal)

    return [
      {
        label: `${modeLabel} Base Carriage`,
        val: baseVal,
        basis: basisLabel,
        note: `Primary haulage tariff for ${quote.laneCode || 'origin to destination'}`
      },
      {
        label: 'Bunker Adjustment Factor (BAF)',
        val: bafVal,
        basis: '10% Fuel Surcharge',
        note: 'Compensates fuel market fluctuations along voyage'
      },
      {
        label: 'Origin Terminal Handling Charges (THC)',
        val: thcVal,
        basis: 'Port Standard Tariff',
        note: 'Wharfage, crane handling, and port staging charges'
      },
      {
        label: 'Carrier Documentation & Port Filing',
        val: docVal > 0 ? docVal : 3000,
        basis: 'Statutory BL Fee',
        note: 'Export declarations and customs manifest transmission'
      },
      {
        label: isRevisionAccepted ? 'Revised All-Inclusive Total' : 'Total Commercial Tariff (Indicative)',
        val: total,
        basis: 'All-Inclusive Total',
        isTotal: true,
        note: isRevisionAccepted ? 'Agreed agent revised tariff' : 'Guaranteed valid for standard dispatch window'
      }
    ]
  }, [quote, effectiveDisplayTotal, isRevisionAccepted])

  const handleCustomerDecision = async (decision) => {
    setDeciding(true)
    try {
      const isBooking = decision === 'booked' || (decision === 'accepted' && isReadyForCustomerBooking)
      const isAcceptRevision = !isBooking && (decision === 'accept_revision' || (decision === 'accepted' && hasPriceRevision && !quote.customer_decision?.status))
      const isDecline = decision === 'rejected' || decision === 'declined'

      const effectiveDecision = isBooking ? 'booked' : (isAcceptRevision ? 'accept_revision' : 'rejected')
      const note = decisionNotes || (isBooking ? 'Confirmed shipment booking' : (isAcceptRevision ? 'Accepted revised price offer' : 'Declined quote offer'))

      await customerDecisionOnQuote(quote.id, effectiveDecision, note, user)

      const newStatus = isBooking
        ? 'Booked'
        : (isAcceptRevision 
            ? 'Revised Priced Accepted (Agent Approval Pending)' 
            : (hasPriceRevision 
                ? 'Revised Price Declined' 
                : `Booking decline by Customer (${user?.name || quote.customer || 'Customer'})`))

      const revPrice = (hasPriceRevision && activeRevisedPrice > 0) ? activeRevisedPrice : null

      toast(isBooking ? `Quotation ${quote.id} booked successfully! Carrier slot secured.` : `Quotation ${quote.id} updated.`)
      setQuote(prev => ({
        ...prev,
        status: newStatus,
        pipeline_status: isBooking ? 'BOOKED' : newStatus.toUpperCase(),
        booking_confirmed: isBooking,
        ...(revPrice ? {
          indicativeTotal: revPrice,
          original_indicative_total: prev.original_indicative_total || prev.indicativeTotal
        } : {}),
        customer_decision: {
          status: isBooking ? 'BOOKED' : (isAcceptRevision ? 'ACCEPTED' : 'REJECTED'),
          notes: note,
          decided_at: new Date().toISOString(),
          is_revised_price: hasPriceRevision,
          is_booking_confirmation: isBooking
        }
      }))
      setShowDeclineModal(false)
      setDecisionNotes('')
    } catch (err) {
      toast(err.message || 'Error updating quote decision')
    } finally {
      setDeciding(false)
    }
  }

  const [finalising, setFinalising] = useState(false)

  const handleSelectRoute = async (route) => {
    // Agents & Admins cannot override customer route selection
    if (isAgentOrAdmin) {
      toast("Route selection is reserved for the customer. As an agent, your role is to validate the customer's preferred route.")
      return
    }
    // Block if quotation is already finalised or approved
    if (quote?.is_finalised || quote?.status === 'Accepted' || agentApproved) {
      toast('Route selection is locked because this quotation has already been finalised and submitted for commercial review.')
      return
    }

    setSelectingRouteId(route.id)
    // Optimistic UI: update selected route and indicativeTotal immediately
    setQuote(prev => ({
      ...prev,
      selected_route: route,
      indicativeTotal: route.cost || prev.indicativeTotal
    }))

    try {
      await selectQuoteRoute(quote.id, route, user?.email || quote.user_email)
      toast(`Route selected: ${route.carrier} (${route.transitDays}d) — ₹${(route.cost || 0).toLocaleString('en-IN')}. Click "Finalise Quote" below to submit for agent approval.`)
    } catch (err) {
      toast(`Route selection notice: ${err.message}`)
    } finally {
      setSelectingRouteId(null)
    }
  }

  const handleFinaliseQuote = async () => {
    if (isAgentOrAdmin) {
      toast("Only the customer can finalise and lock route selection.")
      return
    }
    const currentRoute = quote?.selected_route || recommendedRoutes[0]
    if (!currentRoute) {
      toast("Please select a route option first.")
      return
    }
    setFinalising(true)
    try {
      await finaliseQuote(quote.id, currentRoute, user)
      setQuote(prev => ({
        ...prev,
        is_finalised: true,
        finalised_at: new Date().toISOString(),
        selected_route: currentRoute,
        carrier: currentRoute.carrier,
        assigned_carrier: currentRoute.carrier,
        indicativeTotal: currentRoute.cost || prev.indicativeTotal,
        status: 'Agent Approval Pending',
        pipeline_status: 'AGENT_APPROVAL_PENDING'
      }))
      toast(`Quotation finalised with ${currentRoute.carrier}! Dispatched to carrier desk for commercial agent approval.`)
    } catch (err) {
      toast(`Finalise error: ${err.message}`)
    } finally {
      setFinalising(false)
    }
  }

  const handleUploadSubmit = async () => {
    setIsUploading(true)
    try {
      const docsList = await Promise.all(
        Object.entries(uploadedFiles).map(async ([name, file]) => {
          let fileData = null
          try {
            fileData = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = reject
              reader.readAsDataURL(file)
            })
          } catch (e) {
            console.error('Failed reading file data URL', e)
          }
          return {
            name,
            file_name: file.name,
            file_size: `${Math.round(file.size / 1024)} KB`,
            file_type: file.type || (file.name.match(/\.(png|jpe?g|webp|gif)$/i) ? 'image/jpeg' : 'application/pdf'),
            file_data: fileData
          }
        })
      )
      await uploadQuoteDocuments(quote.id, docsList, user?.name || 'Customer')
      toast('Customs documents uploaded successfully! Customs compliance desk notified.')
      setShowUploadModal(false)
      setQuote(prev => ({
        ...prev,
        status: 'Documents Submitted (Pending Customs Sign-off)',
        customs_document_request: {
          ...(prev.customs_document_request || {}),
          status: 'DOCUMENTS_SUBMITTED'
        },
        customer_uploaded_documents: [
          ...(prev.customer_uploaded_documents || []),
          ...docsList
        ]
      }))
    } catch (err) {
      toast(`Document upload failed: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const agentApproved = 
    quote?.agent_review?.status === 'approved' || 
    quote?.status === 'Approved by Agent' ||
    quote?.status === 'Agent Approved' ||
    quote?.status === 'Approved by Agent and Awaiting Customs Clearance' ||
    quote?.pipeline_status === 'AGENT_APPROVED' ||
    quote?.status === 'Approved by Customs' ||
    quote?.status === 'Approved by Customs and Awaiting for Customer confirmation' ||
    quote?.status === 'Approved' ||
    quote?.pipeline_status === 'CUSTOMS_APPROVED'

  const agentRejected = 
    quote?.agent_review?.status === 'rejected' || 
    quote?.status === 'Rejected by Agent' ||
    quote?.pipeline_status === 'AGENT_REJECTED' ||
    (quote?.status === 'Rejected' && !quote?.customer_decision?.status && quote?.customs_review?.status !== 'rejected')

  const customsApproved = Boolean(
    quote?.customs_review?.status === 'approved' || 
    quote?.status === 'Approved by Customs' ||
    quote?.status === 'Approved by Customs and Awaiting for Customer confirmation' ||
    quote?.pipeline_status === 'CUSTOMS_APPROVED' ||
    (quote?.m3_customs?.compliance_status === 'APPROVED' && agentApproved)
  )

  const customsRejected = 
    quote?.customs_review?.status === 'rejected' ||
    quote?.status === 'Rejected by Customs' ||
    quote?.pipeline_status === 'CUSTOMS_REJECTED' ||
    quote?.m3_customs?.compliance_status === 'REJECTED'

  const isQuoteBooked = Boolean(
    (quote?.status === 'Booked' ||
     quote?.pipeline_status === 'BOOKED' ||
     quote?.customer_decision?.status === 'BOOKED' ||
     quote?.booking_confirmed === true ||
     (quote?.status === 'Accepted' && quote?.customer_decision?.is_booking_confirmation)) &&
    quote?.status !== 'Price Accepted (Pending Agent Sign-off)' &&
    quote?.status !== 'Revised Priced Accepted (Agent Approval Pending)' &&
    quote?.status !== 'Price Revised (Awaiting Customer Decision)'
  )

  const isRejectedByCustomer = 
    quote?.customer_decision?.status === 'REJECTED' ||
    quote?.status === 'Revised Price Declined' ||
    quote?.status?.startsWith('Booking decline by Customer') ||
    quote?.status === 'Declined by Customer' ||
    (quote?.status === 'Rejected' && quote?.customer_decision?.status === 'REJECTED')

  // Both Agent and Customs must have approved for the customer to be ready to book
  const isReadyForCustomerBooking = 
    !isAgentOrAdmin &&
    !isQuoteBooked &&
    !isRejectedByCustomer &&
    !agentRejected &&
    !customsRejected &&
    agentApproved &&
    customsApproved &&
    quote?.status !== 'Price Accepted (Pending Agent Sign-off)' &&
    quote?.status !== 'Revised Priced Accepted (Agent Approval Pending)' &&
    quote?.status !== 'Price Revised (Awaiting Customer Decision)'

  const canCustomerAccept = isReadyForCustomerBooking || hasPriceRevision
  const isAcceptedByCustomer = isQuoteBooked

  const docReq = quote?.customs_document_request
  const docsSubmitted = !customsApproved && Boolean(
    docReq?.status === 'DOCUMENTS_SUBMITTED' || 
    quote?.status === 'Documents Submitted (Pending Customs Sign-off)' || 
    quote?.pipeline_status === 'DOCS_SUBMITTED'
  )

  const hasOfficerRequestedDocs = !customsApproved && !docsSubmitted && Boolean(
    (docReq?.requested_docs && Array.isArray(docReq.requested_docs) && docReq.requested_docs.length > 0 && docReq?.status !== 'APPROVED') ||
    quote?.status === 'Documents Requested' ||
    quote?.status === 'Documents Requested by Customs' ||
    docReq?.status === 'REQUESTED' ||
    docReq?.status === 'PENDING_CUSTOMER_UPLOAD'
  )

  const pendingDocsList = useMemo(() => {
    if (docReq?.requested_docs && Array.isArray(docReq.requested_docs) && docReq.requested_docs.length > 0) {
      return docReq.requested_docs
    }
    if (quote?.status === 'Documents Requested') {
      const customsChecklist = Array.isArray(customsData?.checklist) ? customsData.checklist : []
      return customsChecklist.filter(c => c && !c.uploaded).map(c => c.name)
    }
    return []
  }, [docReq, customsData, quote?.status])

  const handleSaveEditedPrice = () => {
    const rawVal = String(editPriceVal || '').replace(/,/g, '').replace(/[^\d.]/g, '')
    const parsed = parseFloat(rawVal)
    if (!parsed || parsed <= 0) {
      toast('Please enter a valid revised price greater than 0.')
      return
    }
    if (!editPriceReason || !editPriceReason.trim()) {
      toast('Please provide a reason / justification for this price revision.')
      return
    }
    setEditPriceSaving(true)
    try {
      const saved = saveAgentPriceEdit(quote.id, parsed, editPriceReason.trim(), user)
      if (saved && saved.revised_price > 0) {
        setAgentPriceEdit(saved)
        setEditPriceMode(false)
        setQuote(prev => ({ ...prev, agent_price_edit: saved }))
        toast('Revised price saved! The updated quotation is now active and visible to the customer and admin.')
      } else {
        throw new Error('Save did not return a valid revised price')
      }
    } catch (err) {
      console.error('Error in handleSaveEditedPrice:', err)
      toast('Failed to save price revision. Please try again.')
    } finally {
      setEditPriceSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-brand-slate">
        <p>Loading quotation details…</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-xl font-bold text-brand-navy">Quote not found</h3>
        <button onClick={handleBack} className="mt-4 rounded-lg bg-brand-navy px-5 py-2 text-white">{backNav.label}</button>
      </div>
    )
  }

  const userEmail = (user?.email || '').trim().toLowerCase()
  const quoteEmail = (quote?.user_email || '').trim().toLowerCase()
  const isOwner = !quoteEmail || (userEmail && quoteEmail === userEmail)

  if (!isAgentOrAdmin && user && !isOwner) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-brand-navy">Confidential Quotation</h3>
        <p className="mt-2 text-xs text-brand-slate leading-relaxed">
          Quotation <span className="font-mono font-bold text-brand-navy">{quote.id}</span> belongs to another registered account and is protected by Portline privacy policies. You can only view quotations associated with your active login ({user?.email}).
        </p>
        <button onClick={handleBack} className="mt-6 rounded-xl bg-brand-navy px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-navy/90 transition-colors">
          Return to My Quotations
        </button>
      </div>
    )
  }

  // Carrier Desk Isolation: Specific carrier desk agents cannot review quotes assigned to other carriers
  if (isSpecificCarrierAgent && quote?.selected_route && !isCarrierMatch(currentDesk?.carrierKey, quote.selected_route.carrier)) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200">
          <Lock className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-brand-navy">Carrier Allocation Restricted</h3>
        <p className="mt-2 text-xs text-brand-slate leading-relaxed">
          Quotation <span className="font-mono font-bold text-brand-navy">{quote.id}</span> has been selected for <span className="font-bold text-brand-navy">{quote.selected_route.carrier}</span>. Your desk ({currentDesk?.deskName || currentDesk?.carrierKey}) is restricted to your carrier assignments.
        </p>
        <button onClick={handleBack} className="mt-6 rounded-xl bg-brand-navy px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-navy/90 transition-colors">
          Return to My Queue
        </button>
      </div>
    )
  }

  const displayTimestamp = quote.created_at 
    ? new Date(quote.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : (quote.created && quote.created !== 'Just now' ? quote.created : 'Today')

  return (
    <>
      <PageBanner
        crumb={`Quotations / ${quote.id}`}
        title={`${quote.customer} · ${quote.laneName}`}
        subtitle={`Quotation ${quote.id} · ${quote.mode} (${quote.basis})`}
        icon={FileText}
      />

      <section className="pt-10 pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <button onClick={handleBack} className="inline-flex items-center gap-2 text-xs font-semibold text-brand-slate hover:text-brand-navy">
              <ArrowLeft className="h-4 w-4" /> {backNav.label}
            </button>
            <div className="flex items-center gap-3">
              <StatusBadge status={resolveEffectiveQuoteStatus(quote)} />
              <span className="font-mono text-xs text-brand-slateLight">Generated {displayTimestamp}</span>
              {(isOwner || isAgentOrAdmin) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete quotation ${quote.id}? This cannot be undone.`)) {
                      await deleteQuote(quote.id)
                      toast(`Quotation ${quote.id} deleted successfully.`)
                      navigate('/quotes', { replace: true })
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                  title={`Delete ${quote.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* ─── AGENT FINAL SIGN-OFF CARD AFTER CUSTOMER ACCEPTED REVISION ─── */}
          {isAgentOrAdmin && agentPriceEdit && agentPriceEdit.revised_price > 0 && 
           (quote.customer_decision?.status === 'ACCEPTED' || quote.status === 'Price Accepted (Pending Agent Sign-off)') && 
           quote.agent_review?.status !== 'approved' && !isQuoteBooked && (
            <div className="mb-6 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 sm:p-6 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-emerald-950">
                        Customer Accepted Revised Price: ₹{Number(agentPriceEdit.revised_price).toLocaleString('en-IN')}
                      </h4>
                      <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-300">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      The customer has agreed to your revised tariff. Grant your agent sign-off below to advance this quotation to customs clearance and lock in carrier slots.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await agentActionOnQuote(quote.id, 'approved', 'Agent sign-off granted after customer accepted revised price', user)
                      const revPrice = Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price || quote.indicativeTotal)
                      const isCustomsDone = customsApproved || quote?.customs_review?.status === 'approved'
                      const nextStatus = isCustomsDone ? 'Approved by Customs' : 'Approved by Agent'
                      const nextPipe = isCustomsDone ? 'CUSTOMS_APPROVED' : 'AGENT_APPROVED'
                      setQuote(prev => ({
                        ...prev,
                        status: nextStatus,
                        indicativeTotal: revPrice,
                        original_indicative_total: prev.original_indicative_total || prev.indicativeTotal,
                        pipeline_status: nextPipe,
                        agent_review: { status: 'approved', reviewed_at: new Date().toISOString(), agent_name: user?.name || 'Agent' }
                      }))
                      toast('Agent sign-off recorded! Consignment advanced to customs review.')
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Approve & Sign-off Tariff
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const note = prompt('Enter rejection reason:') || 'Agent rejected after revision'
                      await agentActionOnQuote(quote.id, 'rejected', note, user)
                      setQuote(prev => ({ ...prev, status: 'Rejected by Agent', agent_review: { status: 'rejected', comment: note } }))
                      toast('Quotation rejected.')
                    }}
                    className="rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC CONSIGNMENT LIFECYCLE UPDATE WINDOW */}
          {(quote.status === 'Price Accepted (Pending Agent Sign-off)' || quote.status === 'Revised Priced Accepted (Agent Approval Pending)') && !isAgentOrAdmin ? (
            /* 1a. CUSTOMER ACCEPTED REVISED PRICE · PENDING FINAL AGENT SIGN-OFF (CUSTOMER ONLY) */
            <div className="mb-8 rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                      Revised Price Offer Accepted · Awaiting Final Agent Sign-off
                    </span>
                    <p className="mt-0.5 text-xs text-emerald-900 leading-relaxed">
                      You have accepted the revised commercial tariff of ₹ {Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price || 0).toLocaleString('en-IN')}. The freight desk is executing final operational review and slot allocation.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  Pending Agent Sign-off
                </span>
              </div>
            </div>
          ) : hasPriceRevision && !quote.customer_decision?.status && quote.status !== 'Accepted' && quote.status !== 'Rejected' ? (
            /* 1b. AGENT REVISED PRICE OFFER · CUSTOMER DECISION REQUIRED */
            <div className="mb-8 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-amber-500 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                        Commercial Tariff Revised by Freight Agent
                      </span>
                      <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-400 animate-pulse">
                        Action Required
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                      Your freight agent reviewed this quotation and adjusted the commercial tariff to <b className="text-amber-950 font-mono">₹ {Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price || 0).toLocaleString('en-IN')}</b>. Please accept or decline the updated offer below.
                    </p>
                    {(agentPriceEdit?.reason || quote.agent_price_edit?.reason) && (
                      <p className="mt-1.5 rounded-lg border border-amber-300 bg-white/90 p-2 text-xs italic text-amber-950 font-medium">
                        Agent Justification: &ldquo;{agentPriceEdit?.reason || quote.agent_price_edit?.reason}&rdquo; ({agentPriceEdit?.agent_name || quote.agent_price_edit?.agent_name || 'Freight Agent'})
                      </p>
                    )}
                  </div>
                </div>
                {!isAgentOrAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => handleCustomerDecision('accepted')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Accept ₹{Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price || 0).toLocaleString('en-IN')}
                    </button>
                    <button
                      type="button"
                      disabled={deciding}
                      onClick={() => setShowDeclineModal(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : isQuoteBooked ? (
            /* 1c. POST-ACCEPTANCE: QUOTATION BOOKED SUCCESSFULLY */
            <div className="mb-8 rounded-2xl border-2 border-emerald-500 bg-emerald-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                      Quotation Booked Successfully
                    </span>
                    <p className="mt-0.5 text-xs text-emerald-900 leading-relaxed">
                      Your quotation has been confirmed and booked. Our operations team is now coordinating carrier booking, container release, and dispatch.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Booked & Confirmed
                </span>
              </div>
            </div>
          ) : isRejectedByCustomer ? (
            /* 2. CUSTOMER DECLINED */
            <div className="mb-8 rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-950 block">
                      Quotation Declined by Customer
                    </span>
                    <p className="mt-0.5 text-xs text-rose-900 leading-relaxed">
                      You have declined this quotation. You can generate a new quotation with revised cargo specifications or dates at any time.
                    </p>
                    {quote?.customer_decision?.notes && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-white/90 p-2 text-xs italic text-rose-950 font-medium">
                        Customer Note: &ldquo;{quote.customer_decision.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-800 border border-rose-300">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Declined
                </span>
              </div>
            </div>
          ) : customsRejected ? (
            /* 3. CUSTOMS REJECTED */
            <div className="mb-8 rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-950 block">
                      Customs Compliance Rejected
                    </span>
                    <p className="mt-0.5 text-xs text-rose-900 leading-relaxed">
                      Customs authorities have reviewed and rejected statutory compliance declarations for this consignment.
                    </p>
                    {(quote?.customs_review?.notes || quote?.customs_document_request?.officer_notes) && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-white/90 p-2 text-xs italic text-rose-950 font-medium">
                        Customs Officer Reason: &ldquo;{quote?.customs_review?.notes || quote?.customs_document_request?.officer_notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-800 border border-rose-300">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Rejected by Customs
                </span>
              </div>
            </div>
          ) : customsApproved ? (
            /* 4. CUSTOMS CLEARED & VERIFIED (Ready for customer action) */
            <div className="mb-8 rounded-2xl border-2 border-emerald-400 bg-emerald-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                      Customs Compliance Cleared & Verified
                    </span>
                    <p className="mt-0.5 text-xs text-emerald-900 leading-relaxed">
                      Customs Authorities have inspected and signed off all statutory compliance declarations for this consignment. Please accept the quotation below to lock in your booking.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Verified by Customs
                </span>
              </div>
            </div>
          ) : docsSubmitted ? (
            /* 5. DOCUMENTS SUBMITTED · AWAITING CUSTOMS SIGN-OFF */
            <div className="mb-8 rounded-2xl border-2 border-indigo-400 bg-indigo-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-indigo-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 block">
                      Documents Uploaded · Awaiting Customs Approval
                    </span>
                    <p className="mt-0.5 text-xs text-indigo-900 leading-relaxed">
                      Your required compliance documents have been submitted successfully. A customs compliance officer is reviewing your paperwork for final clearance.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-100 px-3.5 py-2 text-xs font-bold text-indigo-800 border border-indigo-300">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  Under Customs Review
                </span>
              </div>
            </div>
          ) : hasOfficerRequestedDocs && pendingDocsList.length > 0 ? (
            /* 6. CUSTOMS ACTION REQUIRED · DOCUMENTS REQUESTED */
            <div className="mb-8 rounded-2xl border-2 border-amber-400 bg-amber-50/95 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-amber-500 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-amber-950 uppercase tracking-wider">Customs Action Required · Documents Requested</span>
                      <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                        Action Needed
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                      The customs compliance officer has inspected your consignment and requested specific statutory documents before clearance can be granted.
                    </p>
                    {docReq?.officer_notes && (
                      <p className="mt-2 rounded-lg border border-amber-300 bg-white/90 p-2.5 text-xs italic text-amber-950 font-medium">
                        Customs Officer Message: &ldquo;{docReq.officer_notes}&rdquo;
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pendingDocsList.map((doc, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
                          <FileText className="h-3.5 w-3.5 text-amber-600" /> {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm transition-all"
                >
                  <Upload className="h-4 w-4" /> Upload Required Documents
                </button>
              </div>
            </div>
          ) : agentRejected ? (
            /* 7. AGENT REJECTED */
            <div className="mb-8 rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-950 block">
                      Quotation Declined by Freight Agent
                    </span>
                    <p className="mt-0.5 text-xs text-rose-900 leading-relaxed">
                      The freight agent reviewed this quotation and could not approve it due to commercial tariff or carrier constraints.
                    </p>
                    {quote?.agent_review?.comment && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-white/90 p-2 text-xs italic text-rose-950 font-medium">
                        Agent Reason: &ldquo;{quote.agent_review.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-800 border border-rose-300">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Rejected by Agent
                </span>
              </div>
            </div>
          ) : agentApproved ? (
            /* 8. AGENT APPROVED · AWAITING CUSTOMS */
            <div className="mb-8 rounded-2xl border-2 border-sky-400 bg-sky-50/95 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-sky-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-950 block">
                      Freight Agent Approved · Awaiting Customs Clearance
                    </span>
                    <p className="mt-0.5 text-xs text-sky-900 leading-relaxed">
                      The freight agent has approved your commercial tariff and route schedule. Consignment details are now in queue for customs inspection and clearance.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3.5 py-2 text-xs font-bold text-sky-800 border border-sky-300">
                  <Check className="h-3.5 w-3.5 text-sky-600" />
                  Agent Approved · Pending Customs
                </span>
              </div>
            </div>
          ) : (
            /* 9. INITIAL: QUOTATION GENERATED · AWAITING AGENT REVIEW */
            <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="rounded-xl bg-amber-500 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                      Quotation Generated · Awaiting Freight Agent Review
                    </span>
                    <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                      Your quotation has been generated. A freight agent is currently reviewing the commercial tariff schedule, carrier allocation, and route feasibility.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-300">
                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                  Awaiting Agent Review
                </span>
              </div>
            </div>
          )}

          {/* PROMINENT CUSTOMER ACTION HERO BANNER (When approved & ready to book) */}
          {isReadyForCustomerBooking && (
            <div className="mb-8 overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-6 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 border border-emerald-400/30">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Approvals Granted · Ready For Booking
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white">
                    Accept & Confirm Your Shipment Booking
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    Both Freight Agent and Customs Authorities have verified and cleared all compliance and statutory tariffs. 
                    Confirm now to lock in your carrier slot with <b>{quote.selected_route?.carrier || 'your chosen carrier'}</b> for 
                    <span className="font-bold text-white ml-1">₹ {((agentPriceEdit?.revised_price > 0 ? agentPriceEdit.revised_price : quote.indicativeTotal) || 0).toLocaleString('en-IN')}</span>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
                  <button
                    type="button"
                    disabled={deciding}
                    onClick={() => handleCustomerDecision('booked')}
                    className="flex-1 lg:flex-initial flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-emerald-900 shadow-lg hover:bg-emerald-50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ThumbsUp className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
                    {deciding ? 'Confirming Booking...' : 'Accept & Book Quotation'}
                  </button>
                  <button
                    type="button"
                    disabled={deciding}
                    onClick={() => setShowDeclineModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700/60 border border-emerald-400/40 px-5 py-3.5 text-xs font-semibold text-white hover:bg-rose-600 hover:border-rose-500 transition-all cursor-pointer"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Decline / Revision
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── AGENT REVISED PRICE NOTICE ─── */}
          {Boolean((agentPriceEdit?.revised_price > 0) || (quote?.agent_price_edit?.revised_price > 0)) && (() => {
            const activeEdit = agentPriceEdit?.revised_price > 0 ? agentPriceEdit : quote?.agent_price_edit
            if (!activeEdit || !activeEdit.revised_price) return null
            // 1) After customer accepts Agent Revised Quote Price, this should be gone in agent dashboard but present in customer dashboard
            if (isAgentOrAdmin && (quote?.customer_decision?.status === 'ACCEPTED' || quote?.status === 'Accepted')) return null
            const customerDecided = Boolean(quote?.customer_decision?.status)
            return (
              <div className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  <div className="flex items-start gap-3.5 max-w-2xl">
                    <div className="rounded-xl bg-amber-500 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">Agent Revised Quote Price</span>
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">Updated by {activeEdit.agent_name || 'Freight Agent'}</span>
                        {quote?.customer_decision?.status === 'ACCEPTED' ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">Accepted by Customer · Awaiting Agent Final Sign-off</span>
                        ) : quote?.customer_decision?.status === 'REJECTED' ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-300">Declined by Customer</span>
                        ) : (
                          <span className="rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-400 animate-pulse">Action Required</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                        Your freight agent reviewed and adjusted the commercial tariff for this consignment.
                      </p>
                      {activeEdit.reason && (
                        <p className="mt-1.5 rounded-lg border border-amber-300 bg-white/80 px-3 py-1.5 text-[11px] italic text-amber-950 font-medium">
                          Agent Justification: &ldquo;{activeEdit.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-amber-200 pt-3 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-semibold text-amber-700 uppercase line-through">
                        System Tariff: ₹ {(quote.indicativeTotal || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="font-display text-2xl font-bold text-amber-950">
                        ₹ {(activeEdit.revised_price).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-amber-800 font-semibold">Revised All-Inclusive Tariff</div>
                    </div>

                    {/* Customer Action Buttons directly in Revised Price Banner */}
                    {!isAgentOrAdmin && !customerDecided && (
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-1">
                        <button
                          type="button"
                          disabled={deciding}
                          onClick={() => handleCustomerDecision('accepted')}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> Accept Revised Price
                        </button>
                        <button
                          type="button"
                          disabled={deciding}
                          onClick={() => setShowDeclineModal(true)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-white px-4 py-2.5 text-xs font-semibold text-amber-950 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_370px] items-start">

            {/* LEFT DETAILS */}
            <div className="min-w-0 space-y-8">

              {/* Route Map Card */}
              <div className="rounded-lg2 border border-brand-line bg-brand-navy p-6 shadow-md2 text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-brand-orangeLight" />
                    <span className="font-mono text-sm font-bold">{quote.laneCode}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-300">{quote.transit}</span>
                </div>

                {/* SVG Route Map Visual */}
                <div className="relative my-4 h-48 w-full rounded-md2 bg-brand-navy2 p-4 border border-white/10 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 600 180">
                    <path d="M 80 90 Q 300 20 520 90" fill="none" stroke="#2E6DA8" strokeWidth="2.5" strokeDasharray="6 4" />
                    <path d="M 80 90 Q 300 150 520 90" fill="none" stroke="#F0692A" strokeWidth="3" />
                    <circle cx="80" cy="90" r="8" fill="#F0692A" />
                    <circle cx="520" cy="90" r="8" fill="#1B8A56" />
                    <text x="80" y="130" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{d.originGw?.city || 'Origin'}</text>
                    <text x="520" y="130" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">{d.destGw?.city || 'Destination'}</text>
                  </svg>
                </div>
              </div>

              {/* Itemized Commercial Tariff Breakdown */}
              <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-brand-navy" />
                      <h3 className="text-base font-bold text-brand-navy">Itemized Tariff & Charge Breakdown</h3>
                    </div>
                    <p className="text-xs text-brand-slate mt-0.5">
                      Statutory tariff schedule and linehaul build-up for this consignment.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-navy border border-brand-line">
                      Currency: INR (₹)
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      All-Inclusive Tariff
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-brand-line/80 text-brand-slate uppercase font-mono text-[11px] tracking-wider">
                        <th className="py-2.5 px-3 font-bold">Charge Description</th>
                        <th className="py-2.5 px-3 font-bold">Basis / Rating</th>
                        <th className="py-2.5 px-3 font-bold text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line/50">
                      {customerTariffBreakdown.map((item, idx) => (
                        <tr 
                          key={idx} 
                          className={item.isTotal ? "bg-brand-cloud/70 font-bold text-brand-navy text-[13px]" : "hover:bg-slate-50/60 text-brand-navy"}
                        >
                          <td className="py-3 px-3">
                            <span className={item.isTotal ? "font-bold text-brand-navy" : "font-medium"}>{item.label}</span>
                            {item.note && <span className="block text-[11px] text-brand-slate font-normal mt-0.5">{item.note}</span>}
                          </td>
                          <td className="py-3 px-3 text-brand-slate font-mono">
                            {item.isTotal ? "Final Quote" : item.basis || quote.basis || "Standard Tariff"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            ₹ {(item.val || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-brand-slate border border-brand-line/60">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Includes Ocean/Air carriage, terminal handling at origin, bunker surcharges, and statutory documentation fees.</span>
                  </div>
                  <span className="font-mono text-brand-navy font-semibold">No Hidden Charges</span>
                </div>
              </div>

              {/* INTERNAL BROKER INTELLIGENCE (Strictly Restricted to Agents & Admins) */}
              {isAgentOrAdmin && (
                <div className="space-y-6 rounded-2xl border-2 border-brand-navy/20 bg-brand-cloud/40 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-brand-navy p-2 text-white">
                        <ShieldCheck className="h-5 w-5 text-brand-orangeLight" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-brand-navy">Broker Decision Support & Underwriting Intelligence</h3>
                        <p className="text-xs text-brand-slate">Internal ML pricing benchmarks, spot variance, and risk underwriting models.</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-orange px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                      Agent & Admin Eyes Only
                    </span>
                  </div>

                  {/* ML Pricing Prediction & Benchmark */}
                  {mlPricingData && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-navy">Machine Learning Market Pricing Benchmark</h4>
                      <MLPricingCard mlPricing={mlPricingData} />
                    </div>
                  )}

                  {/* 5-Factor Composite Risk Engine */}
                  {compositeRiskData && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-navy">Composite Shipment Risk Assessment</h4>
                      <CompositeRiskCard risk={compositeRiskData} />
                    </div>
                  )}

                  {/* Customs & Legal RAG Verification */}
                  {customsData && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-navy">Customs Clearance & Trade Regulation Verification</h4>
                      <CustomsComplianceCard customs={customsData} />
                    </div>
                  )}

                  {/* Weather Intelligence Assessment */}
                  {weatherData && (
                    <div>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-navy">Meteorological & Voyage Weather Intelligence</h4>
                      <WeatherRiskPanel weather={weatherData} />
                    </div>
                  )}
                </div>
              )}

              {/* Ranked Route Options */}
              {routes.length > 0 && (
                <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-brand-navy">
                        {isSpecificCarrierAgent
                          ? `${currentDesk?.carrierName || currentDesk?.carrierKey} Route Allocation (${routes.length})`
                          : `Recommended Route Options (${routes.length})`}
                      </h3>
                      {isAgentOrAdmin && quote.selected_route && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 border border-slate-300 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-500" /> Customer Choice Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-slate">
                      {isSpecificCarrierAgent
                        ? (quote.selected_route 
                            ? `The customer has chosen ${quote.selected_route.carrier}. Displaying your desk's confirmed route allocation.`
                            : `Displaying your desk's assigned carrier route allocation.`)
                        : isAgentOrAdmin 
                          ? (quote.selected_route 
                              ? `The customer has selected ${quote.selected_route.carrier}. This route selection is locked to respect the customer's decision.`
                              : 'Available carrier routes and commercial options for this lane.')
                          : (quote.selected_route
                              ? 'Your selected route is confirmed below. You can adjust your route before final agent approval.'
                              : 'Choose your preferred carrier route. Click to select and request approval.')}
                    </p>
                  </div>
                    {quote.selected_route && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        Chosen: {quote.selected_route.carrier}
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {routes.map((r, idx) => {
                      const isSelected = (quote.selected_route?.carrier === r.carrier) || (!quote.selected_route && r.recommended)
                      return (
                        <div
                          key={r.id || idx}
                          className={`rounded-lg2 border-[1.5px] p-6 bg-white shadow-sm2 transition-all ${
                            isSelected
                              ? 'border-emerald-500 shadow-md2 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                              : r.recommended 
                                ? 'border-brand-orange shadow-md2 ring-2 ring-brand-orange/20' 
                                : 'border-brand-line hover:border-brand-navy/30'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-4 mb-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display text-base font-bold text-brand-navy">{r.carrier}</span>
                                {r.personaBadge && (
                                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold border ${
                                    r.persona === 'BEST_VALUE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : r.persona === 'FASTEST_TRANSIT'
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : 'bg-purple-50 text-purple-700 border-purple-200'
                                  }`}>
                                    {r.personaBadge}
                                  </span>
                                )}
                                {r.recommended && !r.personaBadge && (
                                  <span className="rounded-full bg-brand-orangePale px-2.5 py-0.5 font-mono text-[10px] font-bold text-brand-orange">
                                    RECOMMENDED
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> {isAgentOrAdmin ? 'CHOSEN BY CUSTOMER' : 'SELECTED ROUTE'}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-brand-slate mt-0.5">{r.serviceName} · {r.sailingFrequency}</div>
                              {r.selectionReason && (
                                <div className="text-[11px] font-medium text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  <span>{r.selectionReason}</span>
                                  {r.corridorName && <span className="text-slate-400 font-normal">({r.corridorName})</span>}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-display text-xl font-bold text-brand-navy">₹ {(r.cost || 0).toLocaleString('en-IN')}</div>
                                <div className="text-[10px] font-bold text-brand-slate font-mono">{r.transitDays} DAYS TRANSIT</div>
                              </div>
                              {isSelected ? (
                                <span className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs">
                                  <Check className="h-3.5 w-3.5" /> {isAgentOrAdmin ? 'Customer Selection' : 'Chosen'}
                                </span>
                              ) : isAgentOrAdmin ? (
                                <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 border border-slate-200 cursor-not-allowed flex items-center gap-1">
                                  <Lock className="h-3 w-3 text-slate-400" /> Option Only
                                </span>
                              ) : quote.is_finalised ? (
                                <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 border border-slate-200 cursor-not-allowed flex items-center gap-1">
                                  <Lock className="h-3 w-3 text-slate-400" /> Locked
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={quote.is_finalised || quote.status === 'Accepted' || agentApproved || Boolean(selectingRouteId)}
                                  onClick={() => handleSelectRoute(r)}
                                  className={`rounded-lg px-3.5 py-2 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                                    quote.is_finalised || quote.status === 'Accepted' || agentApproved
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                      : selectingRouteId === r.id
                                        ? 'bg-brand-marine text-white cursor-wait'
                                        : 'bg-brand-navy text-white hover:bg-brand-marine'
                                  }`}
                                >
                                  {selectingRouteId === r.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      Selecting...
                                    </>
                                  ) : (
                                    'Select Route'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Score breakdown bars */}
                          {r.scores && (
                            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                              <ScoreBar label="Transit score" val={r.scores.transit} />
                              <ScoreBar label="Cost score" val={r.scores.cost} />
                              <ScoreBar label="Reliability" val={r.scores.reliability} />
                              <ScoreBar label="Congestion" val={r.scores.congestion} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Finalise Route CTA / Locked Route Status */}
                  {!quote.is_finalised && !isAgentOrAdmin && (
                    <div className="mt-4 rounded-xl border-2 border-brand-orange bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-brand-orange px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                              Action Required
                            </span>
                            <h4 className="text-sm font-bold text-brand-navy">Finalise Route Selection</h4>
                          </div>
                          <p className="text-xs text-brand-slate mt-1">
                            Selected Carrier: <strong className="text-brand-navy">{quote.selected_route?.carrier || routes[0]?.carrier}</strong>. Click below to lock your route and submit the quotation for commercial agent approval.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={finalising}
                          onClick={handleFinaliseQuote}
                          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-orangeLight transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                        >
                          {finalising ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Finalising...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 stroke-[2.5]" />
                              Finalise Quote with {quote.selected_route?.carrier || routes[0]?.carrier}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {quote.is_finalised && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 flex items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span><strong>Route Selection Finalised:</strong> Locked with <strong>{quote.selected_route?.carrier || quote.carrier}</strong>. Dispatched for commercial agent review.</span>
                      </div>
                      <span className="rounded-full bg-emerald-200 px-3 py-0.5 font-mono text-[10px] font-bold text-emerald-900 border border-emerald-300 shrink-0">
                        LOCKED
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Transit Breakdown */}
              {d.transitBreakdown && (
                <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                  <h3 className="mb-4 text-base font-bold text-brand-navy">Transit Breakdown & Dwell Times</h3>
                  <div className="divide-y divide-brand-line/60">
                    {d.transitBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-3 text-xs font-medium text-brand-navy">
                        <span className="text-brand-slate">{item.label}</span>
                        <span className="font-mono font-semibold">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Booking Action Box directly in the main flow */}
              {!isAgentOrAdmin && (
                <div className="rounded-2xl border-2 border-brand-navy/15 bg-white p-7 shadow-sm2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-line pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="text-lg font-bold text-brand-navy">Customer Quotation Decision & Booking</h3>
                      </div>
                      <p className="text-xs text-brand-slate mt-0.5">
                        Confirm your freight quote and finalize carrier dispatch instructions.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-brand-slate uppercase">All-Inclusive Total</div>
                      <div className="font-display text-2xl font-bold text-brand-navy">
                        ₹ {(quote.indicativeTotal || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {quote.status === 'Revised Priced Accepted (Agent Approval Pending)' || quote.status === 'Price Accepted (Pending Agent Sign-off)' ? (
                    <div className="rounded-xl bg-teal-50 border border-teal-300 p-5 text-center">
                      <Clock className="h-9 w-9 text-teal-600 mx-auto mb-2" />
                      <h4 className="text-base font-bold text-teal-950">Revised Price Offer Accepted</h4>
                      <p className="text-xs text-teal-800 mt-1">
                        You agreed to the revised tariff of ₹ {Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price || 0).toLocaleString('en-IN')}. Awaiting final freight agent sign-off before statutory customs dispatch.
                      </p>
                    </div>
                  ) : isQuoteBooked ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                      <CheckCircle2 className="h-9 w-9 text-emerald-600 mx-auto mb-2" />
                      <h4 className="text-base font-bold text-emerald-900">Quotation Booked Successfully</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        Carrier allocation secured with {quote.selected_route?.carrier || 'Carrier'}. Operations team notified.
                      </p>
                    </div>
                  ) : quote.customer_decision?.status === 'REJECTED' || quote.status === 'Rejected' || quote.status === 'Revised Price Declined' || (quote.status && quote.status.startsWith('Booking decline')) ? (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-5 text-center">
                      <XCircle className="h-9 w-9 text-rose-600 mx-auto mb-2" />
                      <h4 className="text-base font-bold text-rose-900">Quotation Declined</h4>
                      <p className="text-xs text-rose-700 mt-1">This quotation was declined by customer.</p>
                    </div>
                  ) : isReadyForCustomerBooking || (hasPriceRevision && !quote.customer_decision?.status && quote.status !== 'Accepted' && quote.status !== 'Rejected') ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white border-2 border-emerald-300">
                      <div className="flex items-start gap-3.5">
                        <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-950">
                            {hasPriceRevision && !quote.customer_decision?.status
                              ? 'Agent Revised Commercial Tariff · Action Required'
                              : 'Approvals Complete · Ready For Your Booking'}
                          </div>
                          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                            {hasPriceRevision && !quote.customer_decision?.status
                              ? `Freight Agent revised tariff to ₹${Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price).toLocaleString('en-IN')}: "${agentPriceEdit?.reason || quote.agent_price_edit?.reason}". Confirm acceptance to proceed.`
                              : `Selected Carrier: ${quote.selected_route?.carrier || 'Standard Route'} · Click below to lock in carrier slots.`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          disabled={deciding}
                          onClick={() => handleCustomerDecision(isReadyForCustomerBooking ? 'booked' : 'accept_revision')}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {deciding ? 'Confirming...' : (hasPriceRevision && !quote.customer_decision?.status ? `Accept Revised ₹${Number(agentPriceEdit?.revised_price || quote.agent_price_edit?.revised_price).toLocaleString('en-IN')}` : 'Accept & Book Quotation')}
                        </button>
                        <button
                          type="button"
                          disabled={deciding}
                          onClick={() => setShowDeclineModal(true)}
                          className="rounded-xl border border-slate-300 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 px-5 py-3 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                      <span>
                        {!quote.is_finalised
                          ? 'Please select your preferred carrier route above and click "Finalise Quote" to submit for agent approval.'
                          : quote.status === 'Approved by Agent and Awaiting Customs Clearance'
                            ? 'Freight Agent has approved the commercials. Awaiting Statutory Customs Clearance.'
                            : quote.status === 'Documents Requested by Customs'
                              ? 'Customs Authorities have requested statutory documents. Please upload required certificates.'
                              : quote.status === 'Documents Submitted (Pending Customs Sign-off)'
                                ? 'Customs documents submitted. Awaiting Customs Officer verification and sign-off.'
                                : !agentApproved 
                                  ? 'Freight Agent is validating the commercial tariff schedule.' 
                                  : 'Customs Authorities are inspecting trade documentation.'} The booking buttons will activate as soon as approvals are granted.
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-6">
              
              {/* Quote Summary Box */}
              <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                <h3 className="mb-4 text-base font-bold text-brand-navy">Quotation Details</h3>
                
                <div className="space-y-3 text-xs">
                  <DetailRow label="Customer" val={quote.customer} />
                  <DetailRow label="Commodity" val={d.commodity || 'General Cargo'} />
                  {d.hsCode && <DetailRow label="HS Code" val={d.hsCode} mono />}
                  <DetailRow label="Gross weight" val={`${(d.grossWeightKg || 3000).toLocaleString()} kg`} />
                  <DetailRow label="Mode" val={quote.mode} />
                  <DetailRow label="Basis" val={quote.basis} />
                  {d.destinationPhone && <DetailRow label="Mobile / Phone" val={d.destinationPhone} />}
                  {quote.selected_route && (
                    <DetailRow label="Selected Carrier" val={`${quote.selected_route.carrier} (${quote.selected_route.transitDays}d)`} />
                  )}
                </div>

                <div className="mt-6 border-t border-brand-line pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-brand-slate uppercase">Indicative Total</div>
                    {isRevisionAccepted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Revised Tariff
                      </span>
                    )}
                  </div>
                  <div className="font-display text-2xl font-bold text-brand-navy mt-1">
                    ₹ {Number(effectiveDisplayTotal).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* ─── PRICE HISTORY (FOR REVISED QUOTES ONLY) ─── */}
              {hasPriceRevision && (() => {
                const activeEdit = agentPriceEdit?.revised_price > 0 ? agentPriceEdit : quote.agent_price_edit
                const revisedPrice = Number(activeEdit?.revised_price || 0)
                const origPrice = Number(quote.original_indicative_total || (quote.indicativeTotal !== revisedPrice ? quote.indicativeTotal : null) || 242407)
                const priceDiff = revisedPrice - origPrice
                const pctDiff = origPrice > 0 ? Math.round((priceDiff / origPrice) * 100) : 0
                const customerDec = quote.customer_decision
                const normCustStatus = (customerDec?.status || '').toUpperCase()

                return (
                  <div className="rounded-2xl border border-amber-300/90 bg-gradient-to-b from-amber-50/50 via-white to-white p-5 shadow-sm animate-in fade-in">
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-amber-200/80">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-amber-500 p-1.5 text-white shadow-2xs">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-bold text-brand-navy">Price History</h4>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                        Revised Tariff
                      </span>
                    </div>

                    <div className="space-y-4">
                      
                      {/* 1. Original System Price */}
                      <div className="flex items-start gap-3 relative">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-brand-slate border-2 border-white ring-2 ring-brand-slate/30" />
                          <span className="w-0.5 h-full min-h-[28px] bg-amber-200 mt-1" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-brand-slate">Original System Tariff</span>
                            <span className="font-mono text-xs font-bold text-brand-navy line-through">₹ {origPrice.toLocaleString('en-IN')}</span>
                          </div>
                          <p className="text-[10px] text-brand-slateLight mt-0.5">
                            Initial generated tariff schedule
                          </p>
                        </div>
                      </div>

                      {/* 2. Agent Revision */}
                      <div className="flex items-start gap-3 relative">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-400" />
                          <span className="w-0.5 h-full min-h-[32px] bg-amber-200 mt-1" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-950">
                              Revised by {activeEdit?.agent_name || 'Freight Agent'}
                            </span>
                            <span className="font-mono text-xs font-bold text-amber-900">
                              ₹ {revisedPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-amber-800">
                            <span className="font-semibold">{priceDiff >= 0 ? `+₹${priceDiff.toLocaleString('en-IN')}` : `-₹${Math.abs(priceDiff).toLocaleString('en-IN')}`} ({priceDiff >= 0 ? '+' : ''}{pctDiff}%)</span>
                            {activeEdit?.edited_at && (
                              <>
                                <span>•</span>
                                <span>{new Date(activeEdit.edited_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                          </div>
                          {activeEdit?.reason && (
                            <div className="mt-2 rounded-xl border border-amber-200/90 bg-white/95 px-3 py-2 text-xs italic text-amber-950 shadow-2xs leading-normal">
                              &ldquo;{activeEdit.reason.trim()}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Customer Decision */}
                      <div className="flex items-start gap-3 relative">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                          <span className={`h-2.5 w-2.5 rounded-full border-2 border-white ring-2 ${normCustStatus === 'ACCEPTED' ? 'bg-emerald-600 ring-emerald-400' : ['REJECTED', 'DECLINED'].includes(normCustStatus) ? 'bg-rose-600 ring-rose-400' : 'bg-amber-400 ring-amber-300'}`} />
                          {quote.status === 'Accepted' && quote.agent_review?.status === 'approved' && (
                            <span className="w-0.5 h-full min-h-[24px] bg-amber-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-brand-navy">Customer Acceptance</span>
                            {normCustStatus === 'ACCEPTED' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Accepted
                              </span>
                            ) : ['REJECTED', 'DECLINED'].includes(normCustStatus) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <XCircle className="h-3 w-3" /> Declined
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock className="h-3 w-3" /> Awaiting
                              </span>
                            )}
                          </div>
                          {customerDec?.decided_at && (
                            <p className="text-[10px] text-brand-slateLight mt-0.5">
                              {normCustStatus === 'ACCEPTED' ? 'Offer accepted on ' : 'Offer declined on '}
                              {new Date(customerDec.decided_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 4. Final Sign-off (if approved) */}
                      {quote.status === 'Accepted' && quote.agent_review?.status === 'approved' && (
                        <div className="flex items-start gap-3 relative">
                          <div className="flex flex-col items-center shrink-0 mt-0.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-bold text-emerald-950">Final Agent Sign-off</span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                Confirmed
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-800 mt-0.5">
                              Signed off by {quote.agent_review.agent_name || 'Carrier Agent'}
                              {quote.agent_review.reviewed_at && ` • ${new Date(quote.agent_review.reviewed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )
              })()}


              {/* ─── AGENT EDIT QUOTE PRICE PANEL ─── */}
              {isAgentOrAdmin && (
                <div className="rounded-xl border-2 border-brand-navy/20 bg-gradient-to-br from-[#0A2540]/5 via-white to-orange-50/40 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-brand-navy p-2 text-white shadow-xs">
                        <IndianRupee className="h-4 w-4 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-brand-navy">Agent Price Revision</h4>
                        <p className="text-[11px] text-brand-slate">Override system tariff with agent-adjusted quote</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-orange/10 border border-brand-orange/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                      Agent Only
                    </span>
                  </div>

                  {/* System vs Revised price comparison */}
                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-brand-cloud/60 p-3 border border-brand-line">
                    <div className="text-center border-r border-brand-line pr-2">
                      <div className="text-[10px] font-bold uppercase text-brand-slate tracking-wider mb-1">System Price</div>
                      <div className="font-mono text-sm font-bold text-brand-navy">Rs.{(quote.indicativeTotal || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-center pl-2">
                      <div className="text-[10px] font-bold uppercase text-brand-slate tracking-wider mb-1">Revised Price</div>
                      {agentPriceEdit && agentPriceEdit.revised_price > 0 ? (
                        <div className="font-mono text-sm font-bold text-emerald-700">Rs.{(agentPriceEdit.revised_price).toLocaleString('en-IN')}</div>
                      ) : (
                        <div className="font-mono text-sm text-brand-slateLight italic">Not revised</div>
                      )}
                    </div>
                  </div>

                  {/* Existing revision badge */}
                  {agentPriceEdit && agentPriceEdit.revised_price > 0 && !editPriceMode && (
                    <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-800">Revised by {agentPriceEdit.agent_name}</span>
                        <span className="ml-auto text-[10px] text-emerald-600 font-mono">{new Date(agentPriceEdit.edited_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      {agentPriceEdit.reason && (
                        <div className="text-[11px] text-emerald-800 italic leading-relaxed">
                          Reason: &ldquo;{agentPriceEdit.reason}&rdquo;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit form (expanded) */}
                  {editPriceMode ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-brand-navy">
                          Revised Price (INR) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-slate">Rs.</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editPriceVal}
                            onChange={e => setEditPriceVal(e.target.value)}
                            placeholder={String(quote.indicativeTotal || '')}
                            className="w-full rounded-lg border border-brand-line bg-white pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-brand-navy focus:border-brand-marine focus:outline-none focus:ring-2 focus:ring-brand-marine/20"
                          />
                        </div>
                        {editPriceVal && Number(editPriceVal) > 0 && (
                          <div className="mt-1 text-[11px] text-brand-slate">
                            Preview: <span className="font-mono font-bold text-brand-navy">Rs.{Number(editPriceVal).toLocaleString('en-IN')}</span>
                            {quote.indicativeTotal ? (
                              <span className={Number(editPriceVal) > quote.indicativeTotal ? "ml-2 font-bold text-rose-600" : "ml-2 font-bold text-emerald-600"}>
                                ({Number(editPriceVal) > quote.indicativeTotal ? '+' : ''}{Math.round((Number(editPriceVal) - quote.indicativeTotal) / quote.indicativeTotal * 100)}% vs system)
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-brand-navy">
                          Reason / Justification <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={editPriceReason}
                          onChange={e => setEditPriceReason(e.target.value)}
                          placeholder="e.g. Carrier surcharge adjustment, special contract rate, fuel revision..."
                          className="w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-xs text-brand-navy focus:border-brand-marine focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={editPriceSaving || !editPriceVal || !editPriceReason.trim()}
                          onClick={handleSaveEditedPrice}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-marine transition-colors disabled:opacity-50 shadow-xs"
                        >
                          {editPriceSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                          {editPriceSaving ? 'Saving...' : 'Confirm Revised Price'}
                        </button>
                        <button
                          onClick={() => { setEditPriceMode(false) }}
                          className="flex items-center gap-1.5 rounded-lg border border-brand-line px-4 py-2.5 text-xs font-semibold text-brand-slate hover:bg-brand-cloud transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditPriceMode(true); if (!editPriceVal) setEditPriceVal(String(quote.indicativeTotal || '')) }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-brand-navy bg-white px-4 py-2.5 text-xs font-bold text-brand-navy hover:bg-brand-navy hover:text-white transition-all group shadow-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        {agentPriceEdit && agentPriceEdit.revised_price > 0 ? 'Edit Revised Price' : 'Revise Quote Price'}
                      </button>
                      {agentPriceEdit && agentPriceEdit.revised_price > 0 && (
                        <button
                          onClick={() => {
                            saveAgentPriceEdit(quote.id, 0, 'cleared', user)
                            setAgentPriceEdit(null)
                            setEditPriceVal('')
                            setEditPriceReason('')
                            setQuote(prev => {
                              const copy = { ...prev }
                              delete copy.agent_price_edit
                              return copy
                            })
                            toast('Price revision cleared. Reverted to standard system tariff.')
                          }}
                          title="Clear revision and revert to system price"
                          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Multi-Stage Sequential Approval Tracker */}
              <div className="rounded-lg2 border border-brand-line bg-white p-5 shadow-sm2">
                <h4 className="mb-3 text-xs font-bold text-brand-navy uppercase tracking-wider">Approval Sequence</h4>
                
                <div className="space-y-3 text-xs">
                  {/* Stage 1: Freight Agent Review */}
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-brand-cloud/60 border border-brand-line/60">
                    <div className="mt-0.5">
                      {agentApproved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : agentRejected ? (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-navy">1. Freight Agent Review</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          agentApproved 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : agentRejected 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {agentApproved ? 'APPROVED' : agentRejected ? 'REJECTED' : 'PENDING'}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-slate mt-0.5">
                        {agentApproved 
                          ? `Verified by ${quote.agent_review?.agent_name || 'Agent'}` 
                          : agentRejected 
                            ? 'Commercial tariff rejected by agent' 
                            : 'Awaiting commercial tariff validation'}
                      </p>
                    </div>
                  </div>

                  {/* Stage 2: Customs Officer Check */}
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-brand-cloud/60 border border-brand-line/60">
                    <div className="mt-0.5">
                      {customsApproved ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : customsRejected ? (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      ) : docsSubmitted ? (
                        <Clock className="h-4 w-4 text-indigo-600" />
                      ) : hasOfficerRequestedDocs ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-brand-slateLight" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-navy">2. Customs Officer Check</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          customsApproved 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : customsRejected 
                              ? 'bg-rose-100 text-rose-800' 
                              : docsSubmitted 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : hasOfficerRequestedDocs 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-slate-100 text-slate-700'
                        }`}>
                          {customsApproved 
                            ? 'APPROVED' 
                            : customsRejected 
                              ? 'REJECTED' 
                              : docsSubmitted 
                                ? 'DOCS SUBMITTED' 
                                : hasOfficerRequestedDocs 
                                  ? 'DOCS REQUIRED' 
                                  : 'PENDING'}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-slate mt-0.5">
                        {customsApproved 
                          ? 'Regulatory compliance signed off' 
                          : customsRejected 
                            ? 'Customs compliance rejected' 
                            : docsSubmitted 
                              ? 'Documents under customs review' 
                              : hasOfficerRequestedDocs 
                                ? 'Upload requested docs below' 
                                : 'Awaiting customs inspection'}
                      </p>
                    </div>
                  </div>

                  {/* Stage 3: Customer Final Acceptance */}
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-brand-cloud/60 border border-brand-line/60">
                    <div className="mt-0.5">
                      {isAcceptedByCustomer ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : isRejectedByCustomer ? (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-brand-slateLight" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-navy">3. Customer Acceptance</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isAcceptedByCustomer 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isRejectedByCustomer 
                              ? 'bg-rose-100 text-rose-800' 
                              : canCustomerAccept 
                                ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isAcceptedByCustomer ? 'ACCEPTED' : isRejectedByCustomer ? 'DECLINED' : canCustomerAccept ? 'READY' : 'LOCKED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-slate mt-0.5">
                        {isAcceptedByCustomer 
                          ? 'Quotation booked successfully' 
                          : isRejectedByCustomer 
                            ? 'Quotation declined' 
                            : canCustomerAccept 
                              ? 'All approvals granted. You can accept now!' 
                              : 'Requires Agent & Customs approvals first'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="rounded-lg2 border border-brand-line bg-white p-6 shadow-sm2">
                <h4 className="mb-3 text-xs font-bold text-brand-navy uppercase tracking-wider">Data Verification</h4>
                <div className="space-y-2.5 text-xs text-brand-slate">
                  <CheckItem text="Gateway masterdata verified" />
                  <CheckItem text="5-layer base freight rates applied" />
                  <CheckItem text="Weather satellite ensemble sampled" />
                  <CheckItem text="Customs trade regulations validated" />
                  <CheckItem text="5-factor composite risk calculated" />
                  <CheckItem text="ML market rate benchmarked" />
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* DECLINE CONFIRMATION MODAL */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-brand-line">
            <h3 className="font-display text-lg font-bold text-brand-navy">Decline Quotation</h3>
            <p className="mt-1 text-xs text-brand-slate">
              Please share a reason or feedback for our commercial freight desk:
            </p>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="e.g. Schedule does not align / Rate above budget / Found alternate route..."
              className="mt-3 w-full rounded-xl border border-brand-line p-3 text-xs text-brand-navy focus:border-brand-marine focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 rounded-xl border border-brand-line py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deciding}
                onClick={() => handleCustomerDecision('rejected')}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED CUSTOMS DOCUMENT UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-brand-line bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-brand-line pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-brand-marine" />
                <h3 className="text-base font-bold text-brand-navy">Upload Required Customs Documents</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="rounded-full p-1 text-brand-slate hover:bg-brand-cloud">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-brand-slate">
              Customs compliance requires verifying the following documents before clearance sign-off. Please upload each required document using its dedicated field:
            </p>

            <div className="mt-4 space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
              {pendingDocsList.map((docName, idx) => (
                <div key={idx} className="rounded-xl border border-brand-line bg-brand-cloud/40 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-brand-navy flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-brand-marine" /> {docName} <span className="text-brand-danger">*</span>
                    </label>
                    {uploadedFiles[docName] && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Attached
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadedFiles(prev => ({ ...prev, [docName]: file }))
                      }
                    }}
                    className="block w-full text-xs text-brand-slate file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-marine transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-brand-line pt-4">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl border border-brand-line px-4 py-2 text-xs font-semibold text-brand-slate hover:bg-brand-cloud"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploading || Object.keys(uploadedFiles).length === 0}
                onClick={handleUploadSubmit}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Submit Documents to Customs
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ScoreBar({ label, val }) {
  return (
    <div>
      <div className="flex justify-between text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-bold text-brand-navy">{val}/100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-brand-orange rounded-full" style={{ width: `${val}%` }} />
      </div>
    </div>
  )
}

function DetailRow({ label, val, mono }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-line/40 pb-2">
      <span className="text-brand-slate">{label}</span>
      <span className={`font-semibold text-brand-navy ${mono ? 'font-mono' : ''}`}>{val}</span>
    </div>
  )
}

function CheckItem({ text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="h-2.5 w-2.5 stroke-[3]" />
      </div>
      <span>{text}</span>
    </div>
  )
}
