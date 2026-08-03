
export const demoUser = {
  name: 'Arjun Mehta',
  company: 'Mehta Exports Pvt. Ltd.',
  email: 'demo@portline.in',
  phone: '+91 98765 43210',
  since: 'January 2024',
}

export const seedShipments = [
  {
    tn: 'PORT-58213-IN',
    from: 'Mumbai, IN',
    to: 'Dubai, AE',
    service: 'Ocean Freight',
    status: 'In Transit',
    weight: 1200,
    cost: 215000,
    date: '2026-07-14',
    steps: [
      { label: 'Booked', loc: 'Mumbai, IN', ts: 'Jul 14, 09:02', done: true },
      { label: 'Picked up', loc: 'JNPT Port, Mumbai', ts: 'Jul 15, 14:20', done: true },
      { label: 'Departed origin port', loc: 'Mumbai, IN', ts: 'Jul 16, 22:10', done: true },
      { label: 'In transit — ocean', loc: 'Arabian Sea', ts: 'Jul 20, 06:00', done: true, current: true },
      { label: 'Customs clearance', loc: 'Dubai, AE', ts: 'Est. Aug 01', done: false },
      { label: 'Out for delivery', loc: 'Dubai, AE', ts: 'Est. Aug 02', done: false },
      { label: 'Delivered', loc: 'Dubai, AE', ts: 'Est. Aug 03', done: false },
    ],
  },
  {
    tn: 'PORT-77410-IN',
    from: 'Bengaluru, IN',
    to: 'Singapore, SG',
    service: 'Air Freight',
    status: 'Delivered',
    weight: 84,
    cost: 48200,
    date: '2026-06-30',
    steps: [
      { label: 'Booked', loc: 'Bengaluru, IN', ts: 'Jun 30, 08:11', done: true },
      { label: 'Picked up', loc: 'Kempegowda Intl Cargo', ts: 'Jun 30, 15:40', done: true },
      { label: 'Departed', loc: 'Bengaluru, IN', ts: 'Jul 01, 02:15', done: true },
      { label: 'Arrived destination hub', loc: 'Changi, SG', ts: 'Jul 01, 09:05', done: true },
      { label: 'Customs clearance', loc: 'Singapore, SG', ts: 'Jul 01, 16:30', done: true },
      { label: 'Out for delivery', loc: 'Singapore, SG', ts: 'Jul 02, 08:00', done: true },
      { label: 'Delivered', loc: 'Singapore, SG', ts: 'Jul 02, 13:47', done: true, current: true },
    ],
  },
  {
    tn: 'PORT-33028-IN',
    from: 'Chennai, IN',
    to: 'Hamburg, DE',
    service: 'Ocean Freight',
    status: 'Customs',
    weight: 640,
    cost: 86400,
    date: '2026-07-02',
    steps: [
      { label: 'Booked', loc: 'Chennai, IN', ts: 'Jul 02, 10:00', done: true },
      { label: 'Picked up', loc: 'Chennai, IN', ts: 'Jul 03, 09:30', done: true },
      { label: 'Departed origin port', loc: 'Chennai, IN', ts: 'Jul 05, 20:00', done: true },
      { label: 'In transit — ocean', loc: 'Indian Ocean', ts: 'Jul 15, 12:00', done: true },
      { label: 'Customs clearance', loc: 'Hamburg, DE', ts: 'Jul 26, 09:00', done: true, current: true },
      { label: 'Out for delivery', loc: 'Hamburg, DE', ts: 'Est. Jul 29', done: false },
      { label: 'Delivered', loc: 'Hamburg, DE', ts: 'Est. Jul 30', done: false },
    ],
  },
  {
    tn: 'PORT-91177-IN',
    from: 'Delhi, IN',
    to: 'Mumbai, IN',
    service: 'Ground & Rail',
    status: 'Out for Delivery',
    weight: 320,
    cost: 31500,
    date: '2026-07-24',
    steps: [
      { label: 'Booked', loc: 'Delhi, IN', ts: 'Jul 24, 07:40', done: true },
      { label: 'Picked up', loc: 'Delhi, IN', ts: 'Jul 24, 12:10', done: true },
      { label: 'In transit — ground', loc: 'Gujarat, IN', ts: 'Jul 26, 18:00', done: true },
      { label: 'Arrived local hub', loc: 'Mumbai, IN', ts: 'Jul 27, 21:30', done: true },
      { label: 'Out for delivery', loc: 'Mumbai, IN', ts: 'Jul 28, 08:15', done: true, current: true },
      { label: 'Delivered', loc: 'Mumbai, IN', ts: 'Est. today', done: false },
    ],
  },
]

// Mirrors what a Django "RateConfiguration" model (per the tech-stack diagram)
// would serve from MongoDB — base fee + per-kg rate + typical transit window.
// All figures in INR (₹).
export const RATES = {
  ocean: { label: 'Ocean Freight', base: 14500, perKg: 68, transit: '18–26 days' },
  air: { label: 'Air Freight', base: 21000, perKg: 260, transit: '3–5 days' },
  ground: { label: 'Ground & Rail', base: 9500, perKg: 95, transit: '5–9 days' },
  express: { label: 'Express Air', base: 27500, perKg: 420, transit: '1–2 days' },
}
