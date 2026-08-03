import { useReveal } from '../hooks/useReveal'


export default function Reveal({ children, className = '', as: Tag = 'div', threshold }) {
  const [ref, inView] = useReveal(threshold)
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`}>
      {children}
    </Tag>
  )
}
