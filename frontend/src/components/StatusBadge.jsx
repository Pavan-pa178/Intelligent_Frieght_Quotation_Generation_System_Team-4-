const STYLES = {
  'In Transit': 'bg-brand-warningBg text-brand-warning',
  'Out for Delivery': 'bg-brand-warningBg text-brand-warning',
  Customs: 'bg-brand-orangePale text-brand-orange',
  Delivered: 'bg-brand-successBg text-brand-success',
  Booked: 'bg-brand-marinePale text-brand-marine',
}

const PULSE = new Set(['In Transit', 'Out for Delivery', 'Customs'])

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.Booked
  const dotColor = style.includes('warning')
    ? 'bg-brand-warning'
    : style.includes('orange')
    ? 'bg-brand-orange'
    : style.includes('success')
    ? 'bg-brand-success'
    : 'bg-brand-marine'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${PULSE.has(status) ? 'animate-shimmerDot' : ''}`} />
      {status}
    </span>
  )
}
