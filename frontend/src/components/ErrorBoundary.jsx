import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-dangerBg text-brand-danger">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-brand-navy">Something went wrong</h2>
          <p className="mb-6 max-w-md text-xs text-brand-slate font-mono bg-brand-cloud p-3 rounded-lg border border-brand-line">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/login'
              }}
              className="rounded-lg bg-brand-navy px-5 py-2.5 text-xs font-bold text-white shadow-xs"
            >
              Reset Session & Clear Storage
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-line bg-white px-5 py-2.5 text-xs font-semibold text-brand-navy shadow-xs"
            >
              <RefreshCw className="h-4 w-4" /> Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
