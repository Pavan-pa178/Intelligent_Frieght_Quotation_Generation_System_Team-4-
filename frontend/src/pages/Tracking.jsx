import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, AlertTriangle, Check, Clock, Upload, FileText, CheckCircle2, X, Loader2, ShieldCheck } from 'lucide-react'
import PageBanner from '../components/PageBanner'
import StatusBadge from '../components/StatusBadge'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'

export default function Tracking() {
  const { findShipment } = useApp()
  const toast = useToast()
  const [params] = useSearchParams()
  const [input, setInput] = useState('')
  const [result, setResult] = useState(undefined) 
  const [loading, setLoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [isUploading, setIsUploading] = useState(false)

  const runSearch = async (tn) => {
    if (!tn?.trim()) return
    setLoading(true)
    const found = await findShipment(tn)
    setResult(found || null)
    setLoading(false)
  }

  useEffect(() => {
    const prefill = params.get('tn')
    if (prefill) {
      setInput(prefill)
      runSearch(prefill)
    }
  }, [])

  const defaultDocsToUpload = ['EU Declaration of Conformity', 'RoHS 3 Compliance Certificate', 'Packing List']

  const handleUploadSubmit = async () => {
    setIsUploading(true)
    setTimeout(() => {
      setIsUploading(false)
      setShowUploadModal(false)
      toast('Customs documents uploaded successfully! Tracking checkpoint updated.')
      if (result) {
        setResult(prev => ({
          ...prev,
          customs_status: 'Documents Uploaded (Pending Verification)',
          steps: prev.steps.map(s => s.label === 'Customs clearance' ? { ...s, ts: 'Docs Submitted' } : s)
        }))
      }
    }, 700)
  }

  return (
    <>
      <PageBanner crumb="Tracking" title="Track your shipment" subtitle="Enter your tracking number for live status, checkpoint history and estimated arrival." extraPadding icon={Search} />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-[70px] mx-auto max-w-[680px] rounded-lg2 bg-white p-8 shadow-md2">
          <form
            onSubmit={(e) => { e.preventDefault(); runSearch(input) }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-slateLight" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="text"
                placeholder="e.g. PORT-58213-IN"
                autoComplete="off"
                className="h-12 w-full rounded-md2 border-[1.5px] border-brand-line pl-11 pr-4 font-mono text-sm tracking-wide text-brand-navy outline-none transition-colors focus:border-brand-orange"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-md2 bg-brand-navy px-8 font-semibold text-white transition-colors hover:bg-brand-navy2"
            >
              Track
            </button>
          </form>
        </div>

        {loading && <p className="mt-10 text-center text-brand-slate">Searching…</p>}

        {!loading && result && (
          <TrackResult 
            shipment={result} 
            onOpenUpload={() => setShowUploadModal(true)} 
          />
        )}

        {!loading && result === null && (
          <div className="mx-auto my-14 max-w-[480px] text-center text-brand-slate">
            <AlertTriangle className="mx-auto mb-[18px] h-11 w-11 text-brand-slateLight" />
            <h3 className="mb-2 text-[17px] font-semibold text-brand-navy">No shipment found</h3>
            <p>Double-check the tracking number and try again — it should look like PORT-XXXXX-XX.</p>
          </div>
        )}
        <div className="h-20" />
      </div>

      {/* DEDICATED CUSTOMS DOCUMENT UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-brand-line bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-brand-line pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-brand-marine" />
                <h3 className="text-base font-bold text-brand-navy">Upload Customs Clearance Documents</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="rounded-full p-1 text-brand-slate hover:bg-brand-cloud">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-brand-slate">
              Please upload the required regulatory trade documents below. Each document has a dedicated file upload field:
            </p>

            <div className="mt-4 space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              {defaultDocsToUpload.map((docName, idx) => (
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
                Submit Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TrackResult({ shipment, onOpenUpload }) {
  const isCustomsApproved = 
    shipment?.customs_status === 'Approved' || 
    shipment?.pipeline_status === 'CUSTOMS_APPROVED' || 
    shipment?.status === 'Approved' || 
    shipment?.customs_verified === true

  const docReq = shipment?.customs_document_request
  const hasCustomsDocRequest = !!(
    (docReq && Array.isArray(docReq.requested_docs) && docReq.requested_docs.length > 0 && docReq.status !== 'DOCUMENTS_SUBMITTED') ||
    shipment?.pipeline_status === 'CUSTOMS_DOCS_REQUESTED' ||
    shipment?.customs_status === 'DOCS_FLAGGED'
  )

  const defaultSteps = [
    { label: 'Booked', loc: shipment?.from || 'Origin Hub', ts: shipment?.date || 'Completed', done: true, current: false },
    { label: 'Picked up', loc: 'Origin Gateway Port', ts: 'Completed', done: true, current: false },
    { label: 'Customs clearance', loc: shipment?.to || 'Destination Port', ts: isCustomsApproved ? 'Verified & Cleared' : 'In Review', done: isCustomsApproved, current: !isCustomsApproved },
    { label: 'In transit', loc: 'International Corridor', ts: 'En route', done: false, current: false },
    { label: 'Out for delivery', loc: shipment?.to || 'Destination', ts: 'Pending', done: false, current: false },
    { label: 'Delivered', loc: shipment?.to || 'Destination', ts: 'Pending', done: false, current: false },
  ]

  const rawSteps = Array.isArray(shipment?.steps) && shipment.steps.length > 0 ? shipment.steps : defaultSteps
  const steps = (Array.isArray(rawSteps) ? rawSteps : defaultSteps).map(s => {
    if (s?.label?.toLowerCase().includes('customs') && isCustomsApproved) {
      return { ...s, done: true, ts: 'Verified & Cleared', current: false }
    }
    return s || { label: 'Checkpoint', loc: '—', ts: 'Pending', done: false }
  })

  const doneCount = Array.isArray(steps) ? steps.filter((s) => s?.done).length : 0
  const pct = Math.max(10, Math.min(100, Math.round((doneCount / Math.max(1, steps.length)) * 100)))

  return (
    <div className="mx-auto mt-12 max-w-[820px]">
      {/* Customs Compliance Banner: Verified vs Upload Notice (Only when requested by customs) */}
      {isCustomsApproved ? (
        <div className="mb-6 rounded-2xl border-2 border-emerald-400 bg-emerald-50/95 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 mt-0.5 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                  Customs Trade Compliance Cleared & Verified
                </span>
                <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                  All statutory import documentation and compliance declarations have been inspected and verified by Customs Authorities. Consignment authorized for expedited port release.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Clearance Verified
            </span>
          </div>
        </div>
      ) : hasCustomsDocRequest ? (
        <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50/95 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500 p-2.5 text-white shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">Customs Trade Compliance Notice</span>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Ensure all required statutory certificates are filed to prevent detention at port border control.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm transition-all"
            >
              <Upload className="h-4 w-4" /> Upload Required Documents
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-9 flex flex-wrap justify-between gap-5 rounded-md2 border border-brand-line bg-white p-7 shadow-xs">
        <Info label="Tracking number" value={shipment.tn} mono />
        <Info label="Route" value={`${shipment.from} → ${shipment.to}`} />
        <Info label="Service" value={shipment.service} />
        <Info label="Weight" value={`${shipment.weight} kg`} />
        {shipment.destinationPhone && (
          <Info label="Recipient Mobile" value={shipment.destinationPhone} />
        )}
        <div className="min-w-[130px]">
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-slateLight">Status</div>
          <StatusBadge status={shipment.status} />
        </div>
      </div>

      <div className="rounded-md2 border border-brand-line bg-white p-7 sm:p-8 shadow-xs">
        <div className="mb-7 flex items-center justify-between border-b border-brand-line/70 pb-4">
          <div>
            <h3 className="text-base font-bold text-brand-navy">Milestone Tracking & Route Path</h3>
            <p className="text-xs text-brand-slate mt-0.5">Live checkpoints and statutory customs clearance inspection log</p>
          </div>
          <span className="rounded-full bg-brand-cloud px-3 py-1 font-mono text-xs font-semibold text-brand-navy border border-brand-line">
            {doneCount} / {steps.length} Complete
          </span>
        </div>

        <div className="space-y-0">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1
            const isLineActive = step.done && (steps[i + 1]?.done || steps[i + 1]?.current)
            return (
              <div key={i} className="flex gap-4 sm:gap-5">
                {/* Timeline Column: Icon Circle + Mathematically Centered Connector Line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      step.current
                        ? 'border-brand-orange bg-brand-orange text-white ring-4 ring-brand-orangePale shadow-xs'
                        : step.done
                        ? 'border-brand-orange bg-brand-orange text-white shadow-2xs'
                        : 'border-brand-line bg-white text-brand-slateLight'
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 grow min-h-[36px] my-1 transition-colors ${
                        isLineActive ? 'bg-brand-orange' : 'bg-brand-line'
                      }`}
                    />
                  )}
                </div>

                {/* Milestone Details Column */}
                <div className={`pt-1.5 ${!isLast ? 'pb-7 sm:pb-8' : 'pb-1'} min-w-0 flex-1`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-[15px] font-semibold ${step.done || step.current ? 'text-brand-navy' : 'text-brand-slate'}`}>
                      {step.label}
                    </h4>
                    {step.current && (
                      <span className="rounded-full bg-brand-orangePale px-2 py-0.5 text-[10.5px] font-bold text-brand-orange">
                        Active Checkpoint
                      </span>
                    )}
                    {step.done && !step.current && (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-brand-slate mt-0.5">{step.loc}</p>
                  <div className="mt-1 font-mono text-[11.5px] text-brand-slateLight">{step.ts}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, mono }) {
  return (
    <div className="min-w-[130px]">
      <div className="mb-1.5 text-[11px] uppercase tracking-wide text-brand-slateLight">{label}</div>
      <div className={`text-[15.5px] font-semibold ${mono ? 'font-mono' : 'font-display'}`}>{value}</div>
    </div>
  )
}
