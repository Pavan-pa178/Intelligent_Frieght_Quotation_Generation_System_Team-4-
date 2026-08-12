export const demoUser = {
  name: 'Ravi Sharma',
  role: 'customer',
  company: 'Sharma Textiles',
  email: 'ravi@sharmatextiles.in',
  phone: '+91 98765 43210',
  since: 'January 2024',
}

export const adminUser = {
  name: 'Priya Admin',
  role: 'admin',
  company: 'PORTLINE Operations',
  email: 'admin@portline.in',
  phone: '+91 99000 11111',
  since: 'March 2023',
}

export const agentUser = {
  name: 'Arjun Agent',
  role: 'agent',
  company: 'PORTLINE Logistics',
  email: 'agent@portline.in',
  phone: '+91 99000 22222',
  since: 'June 2024',
}

export const seedShipments = [
  {
    tn: 'PORT-58213-IN',
    from: 'Mumbai, IN',
    to: 'Dubai, AE',
    service: 'Ocean Freight',
    status: 'In Transit',
    weight: 18400,
    cost: 384500,
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

export const RATES = {
  ocean: { label: 'Ocean Freight', base: 14500, perKg: 68, transit: '18–26 days' },
  air: { label: 'Air Freight', base: 21000, perKg: 260, transit: '3–5 days' },
  ground: { label: 'Ground & Rail', base: 9500, perKg: 95, transit: '5–9 days' },
  express: { label: 'Express Air', base: 27500, perKg: 420, transit: '1–2 days' },
}

export const seedQuotes = [
  {
    id: 'QT-2026-00934',
    customer: 'Sharma Textiles',
    city: 'Mumbai',
    laneCode: 'INNSA → AEJEA',
    laneName: 'Mumbai → Dubai',
    region: 'Middle East',
    mode: 'Ocean FCL',
    modeKey: 'ocean',
    basis: '2 × 40HC',
    transit: '6–10 d',
    indicativeTotal: 384500,
    status: 'Draft',
    created: '2 min ago',
    assigned_agent: 'agent@portline.in',
    agent_review: { status: 'pending', comment: '', agent_name: 'Arjun Agent', reviewed_at: null },
    details: {
      originGw: { code: 'INNSA', name: 'Nhava Sheva, Mumbai', city: 'Mumbai', country: 'India' },
      destGw: { code: 'AEJEA', name: 'Jebel Ali, Dubai', city: 'Dubai', country: 'UAE' },
      commodity: 'Cotton textile rolls, unbleached',
      hsCode: '5208.11',
      grossWeightKg: 18400,
      routes: [
        {
          id: 'r1',
          carrier: 'Maersk',
          serviceName: 'MECL Direct Express',
          type: 'Direct',
          sailingFrequency: 'Weekly sailing (Mon)',
          reliabilityPct: 94,
          recommended: true,
          cost: 384500,
          indicative: true,
          scores: { transit: 0.92, cost: 0.78, reliability: 0.94, congestion: 0.71, composite: 0.86 }
        },
        {
          id: 'r2',
          carrier: 'CMA CGM',
          serviceName: 'EPIC 1 Transhipment',
          type: '1 Transhipment (Salalah)',
          sailingFrequency: 'Twice weekly (Wed/Sat)',
          reliabilityPct: 89,
          recommended: false,
          cost: 341200,
          indicative: true,
          scores: { transit: 0.64, cost: 0.95, reliability: 0.89, congestion: 0.82, composite: 0.80 }
        },
        {
          id: 'r3',
          carrier: 'Hapag-Lloyd',
          serviceName: 'AGX Direct Service',
          type: 'Direct',
          sailingFrequency: 'Weekly sailing (Fri)',
          reliabilityPct: 92,
          recommended: false,
          cost: 402900,
          indicative: true,
          scores: { transit: 0.88, cost: 0.70, reliability: 0.92, congestion: 0.65, composite: 0.79 }
        }
      ],
      transitBreakdown: [
        { label: 'Pickup leg (34 km road)', val: '1.0 d' },
        { label: 'Origin dwell — FCL', val: '3.0 d' },
        { label: 'Sea leg — 1,205 nm ÷ 400', val: '3.0 d' },
        { label: 'Schedule wait (weekly ÷ 2)', val: '3.5 d' },
        { label: 'Destination dwell', val: '3.0 d' },
        { label: 'Delivery leg', val: '0.0 d' }
      ]
    }
  },
  {
    id: 'QT-2026-00933',
    customer: 'Nordic Imports AB',
    city: 'Gothenburg',
    laneCode: 'INNSA → NLRTM',
    laneName: 'Mumbai → Rotterdam',
    region: 'Asia–Europe',
    mode: 'Ocean FCL',
    modeKey: 'ocean',
    basis: '1 × 20GP',
    transit: '24–28 d',
    indicativeTotal: 215800,
    status: 'Issued',
    created: '1 hour ago',
    assigned_agent: 'agent@portline.in',
    agent_review: { status: 'approved', comment: 'Route verified. Maersk weekly slot confirmed.', agent_name: 'Arjun Agent', reviewed_at: '2026-08-10T09:15:00Z' },
    details: {
      originGw: { code: 'INNSA', name: 'Nhava Sheva, Mumbai', city: 'Mumbai', country: 'India' },
      destGw: { code: 'NLRTM', name: 'Port of Rotterdam', city: 'Rotterdam', country: 'Netherlands' },
      commodity: 'Precision engineering components',
      hsCode: '8483.40',
      grossWeightKg: 14200,
      routes: [
        {
          id: 'r1',
          carrier: 'MSC Mediterranean Shipping',
          serviceName: 'IPAK Europe Direct Corridor',
          type: 'Direct',
          sailingFrequency: 'Weekly sailing (Thu)',
          reliabilityPct: 91,
          recommended: true,
          cost: 215800,
          indicative: true,
          scores: { transit: 0.89, cost: 0.85, reliability: 0.91, congestion: 0.75, composite: 0.85 }
        },
        {
          id: 'r2',
          carrier: 'Hapag-Lloyd',
          serviceName: 'IOS Express Express',
          type: 'Direct Express',
          sailingFrequency: 'Weekly sailing (Tue)',
          reliabilityPct: 95,
          recommended: false,
          cost: 238000,
          indicative: true,
          scores: { transit: 0.94, cost: 0.72, reliability: 0.95, congestion: 0.80, composite: 0.85 }
        }
      ],
      transitBreakdown: [
        { label: 'Pickup leg (45 km road)', val: '1.0 d' },
        { label: 'Origin dwell — FCL', val: '3.0 d' },
        { label: 'Sea leg — 6,400 nm ÷ 400', val: '16.0 d' },
        { label: 'Schedule wait', val: '3.5 d' },
        { label: 'Destination dwell (Rotterdam)', val: '3.0 d' }
      ]
    }
  },
  {
    id: 'QT-2026-00932',
    customer: 'Gulf Machinery LLC',
    city: 'Dubai',
    laneCode: 'BOM → DXB',
    laneName: 'Mumbai → Dubai',
    region: 'Middle East',
    mode: 'Air Freight',
    modeKey: 'air',
    basis: '250 kg ch.',
    transit: '5–7 d',
    indicativeTotal: 64300,
    status: 'Issued',
    created: '3 hours ago',
    assigned_agent: 'agent@portline.in',
    agent_review: { status: 'rejected', comment: 'Cargo dimensions exceed airline limits. Customer needs to split shipment.', agent_name: 'Arjun Agent', reviewed_at: '2026-08-09T14:30:00Z' },
    details: {
      originGw: { code: 'BOM', name: 'Mumbai Airport (BOM)', city: 'Mumbai', country: 'India' },
      destGw: { code: 'DXB', name: 'Dubai Intl Airport (DXB)', city: 'Dubai', country: 'UAE' },
      commodity: 'High-precision hydraulic pump valves',
      hsCode: '8413.70',
      grossWeightKg: 250,
      routes: [
        {
          id: 'r1',
          carrier: 'Emirates SkyCargo',
          serviceName: 'EK Priority Air Freighter',
          type: 'Direct Flight',
          sailingFrequency: 'Daily flights',
          reliabilityPct: 97,
          recommended: true,
          cost: 64300,
          indicative: true,
          scores: { transit: 0.98, cost: 0.80, reliability: 0.97, congestion: 0.88, composite: 0.91 }
        }
      ],
      transitBreakdown: [
        { label: 'Airport handling origin (BOM)', val: '1.0 d' },
        { label: 'Flight linehaul (1,920 km)', val: '0.5 d' },
        { label: 'Customs & import handling (DXB)', val: '1.5 d' }
      ]
    }
  },
  {
    id: 'QT-2026-00931',
    customer: 'Silk Road Traders Ltd',
    city: 'Singapore',
    laneCode: 'INNSA → SGSIN',
    laneName: 'Mumbai → Singapore',
    region: 'Intra-Asia',
    mode: 'Ocean LCL',
    modeKey: 'ocean',
    basis: '4.2 R/T',
    transit: '11–16 d',
    indicativeTotal: 88400,
    status: 'Draft',
    created: 'Yesterday',
    assigned_agent: 'agent@portline.in',
    agent_review: { status: 'pending', comment: '', agent_name: 'Arjun Agent', reviewed_at: null },
    details: {
      originGw: { code: 'INNSA', name: 'Nhava Sheva, Mumbai', city: 'Mumbai', country: 'India' },
      destGw: { code: 'SGSIN', name: 'Port of Singapore', city: 'Singapore', country: 'Singapore' },
      commodity: 'Organic essential oils & botanical extracts',
      hsCode: '3301.29',
      grossWeightKg: 2100,
      routes: [
        {
          id: 'r1',
          carrier: 'ONE Ocean Network Express',
          serviceName: 'Intra-Asia Loop 2',
          type: 'Direct',
          sailingFrequency: 'Twice weekly',
          reliabilityPct: 93,
          recommended: true,
          cost: 88400,
          indicative: true,
          scores: { transit: 0.91, cost: 0.88, reliability: 0.93, congestion: 0.80, composite: 0.88 }
        }
      ],
      transitBreakdown: [
        { label: 'Origin LCL consolidation dwell', val: '5.0 d' },
        { label: 'Sea leg — 2,450 nm ÷ 400', val: '6.1 d' },
        { label: 'Destination LCL deconsolidation', val: '4.0 d' }
      ]
    }
  },
  {
    id: 'QT-2026-00930',
    customer: 'Andes Trading SAC',
    city: 'Callao',
    laneCode: 'INNSA → PECLL',
    laneName: 'Mumbai → Callao',
    region: 'South America',
    mode: 'Ocean FCL',
    modeKey: 'ocean',
    basis: '—',
    transit: '—',
    indicativeTotal: null,
    status: 'No routing',
    created: 'Yesterday',
    details: {
      originGw: { code: 'INNSA', name: 'Nhava Sheva, Mumbai', city: 'Mumbai', country: 'India' },
      destGw: { code: 'PECLL', name: 'Port of Callao', city: 'Callao', country: 'Peru' },
      commodity: 'Industrial agricultural tools',
      hsCode: '8201.30',
      grossWeightKg: 16500,
      routes: [],
      transitBreakdown: []
    }
  }
]

export const routeAnalytics = {
  kpis: {
    routesAnalysed: '12,450',
    laneCoveragePct: '98.5%',
    transitMaeDays: '1.7 d',
    avgOptionsPerLane: '3.2'
  },
  lanePerformance: [
    { lane: 'INNSA→AEJEA', sub: 'Asia–Middle East', transit: '6–10 d', onTimePct: 96, vol: 412, status: 'ok' },
    { lane: 'INNSA→NLRTM', sub: 'Asia–Europe', transit: '24–28 d', onTimePct: 93, vol: 318, status: 'ok' },
    { lane: 'INNSA→SGSIN', sub: 'Intra-Asia', transit: '11–16 d', onTimePct: 98, vol: 276, status: 'ok' },
    { lane: 'INNSA→DEHAM', sub: 'Asia–Europe', transit: '26–31 d', onTimePct: 91, vol: 184, status: 'warn' },
    { lane: 'BOM→DXB', sub: 'Air · Middle East', transit: '5–7 d', onTimePct: 97, vol: 142, status: 'ok' },
    { lane: 'INNSA→PECLL', sub: 'Asia–South America', transit: '—', onTimePct: null, vol: 6, status: 'no_data' }
  ]
}
