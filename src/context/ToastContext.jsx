import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((message) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3400)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() must be used inside <ToastProvider>')
  return ctx
}

function ToastStack({ toasts }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-5 right-5 left-5 sm:left-auto z-[2000] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slideIn flex max-w-none sm:max-w-[320px] items-center gap-3 rounded-[10px] bg-brand-navy px-[18px] py-3.5 text-[13.5px] font-medium text-white shadow-lg2"
        >
          <CheckCircleGlyph />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

function CheckCircleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px] flex-shrink-0 text-brand-success">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.4 2.4L16 10" />
    </svg>
  )
}
