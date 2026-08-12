/**
 * A self-contained "port at sunset" scene used as a banner background.
 * Pure vector silhouettes (no external image), so it loads instantly and
 * carries no licensing risk. Uses the same orange/navy palette and dashed
 * route-line motif as the rest of the site so it reads as one design system.
 */
export default function PortScene({ className = '' }) {
  return (
    <svg
      viewBox="0 0 1600 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ps-glow" cx="82%" cy="62%" r="60%">
          <stop offset="0%" stopColor="#F0692A" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#D9500A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0A1F33" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1F33" />
          <stop offset="100%" stopColor="#0A1F33" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="ps-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#123153" />
          <stop offset="100%" stopColor="#050D17" />
        </linearGradient>
        <linearGradient id="ps-reflect" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020407" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#020407" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect x="0" y="0" width="1600" height="362" fill="url(#ps-sky)" />
      <rect x="0" y="0" width="1600" height="362" fill="url(#ps-glow)" />

      {/* sun disc, low on the horizon */}
      <circle cx="1310" cy="330" r="46" fill="#F0692A" opacity="0.5" />

      {/* plane + contrail, upper right, continues the route-line motif */}
      <g opacity="0.9">
        <path
          d="M1080,70 C1180,105 1300,140 1560,150"
          fill="none"
          stroke="#F0692A"
          strokeWidth="2"
          strokeDasharray="5 7"
          opacity="0.55"
        />
        <g transform="translate(1560,150) rotate(12)">
          <path
            d="M0,0 L34,3 L46,-2 L50,0 L46,3 L34,7 L14,16 L6,16 L12,7 L2,6 L-4,10 L-9,9 L-4,3 Z"
            fill="#E7EDF3"
            opacity="0.92"
          />
        </g>
      </g>

      {/* distant crane skyline */}
      <g fill="#06121F" opacity="0.9">
        <Crane x={860} baseY={362} height={130} />
        <Crane x={940} baseY={362} height={168} />
        <Crane x={1030} baseY={362} height={112} flip />
        <Crane x={1140} baseY={362} height={190} />
        <Crane x={1230} baseY={362} height={140} flip />
        <Crane x={1360} baseY={362} height={160} />
        <Crane x={1470} baseY={362} height={120} flip />
      </g>

      {/* container stacks along the quay */}
      <g fill="#06121F" opacity="0.85">
        <rect x="820" y="330" width="230" height="32" />
        <rect x="1060" y="318" width="170" height="44" />
        <rect x="1250" y="336" width="200" height="26" />
        <rect x="1460" y="322" width="140" height="40" />
      </g>

      {/* waterline */}
      <rect x="0" y="362" width="1600" height="138" fill="url(#ps-water)" />
      <rect x="0" y="378" width="1600" height="2" fill="#F0692A" opacity="0.18" />
      <rect x="0" y="404" width="1600" height="1.5" fill="#F0692A" opacity="0.12" />
      <rect x="0" y="428" width="1600" height="1.5" fill="#F0692A" opacity="0.08" />

      {/* soft reflection blob beneath the ship — simple and always renders correctly,
          rather than a fragile mirrored duplicate of the hull geometry */}
      <ellipse cx={410} cy={392} rx={340} ry={26} fill="url(#ps-reflect)" />

      {/* cargo ship, foreground */}
      <ShipHull x={120} y={362} fill="#06121F" opacity={0.95} />

      {/* foreground quay edge */}
      <rect x="0" y="470" width="1600" height="30" fill="#040A12" />
    </svg>
  )
}

function Crane({ x, baseY, height, flip }) {
  const dir = flip ? -1 : 1
  const top = baseY - height
  return (
    <g transform={`translate(${x},0)`}>
      <rect x={-4} y={top} width={8} height={height} />
      <rect x={flip ? -126 : -6} y={top} width={120} height={7} />
      <rect x={-40 * dir} y={top - 22} width={8} height={22} />
      <line x1={-4} y1={top + 6} x2={110 * dir - 4} y2={top + 4} stroke="#06121F" strokeWidth="3" />
    </g>
  )
}

function ShipHull({ x, y, fill, opacity = 1 }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <path d="M0,60 L20,86 L560,86 L590,60 L560,44 L20,44 Z" fill={fill} />
      <rect x="60" y="14" width="330" height="30" fill={fill} />
      <rect x="90" y="-6" width="34" height="20" fill={fill} />
      <rect x="150" y="-6" width="34" height="20" fill={fill} />
      <rect x="210" y="-6" width="34" height="20" fill={fill} />
      <rect x="270" y="-6" width="34" height="20" fill={fill} />
      <rect x="330" y="-6" width="34" height="20" fill={fill} />
      <rect x="420" y="-2" width="60" height="16" fill={fill} />
      <rect x="470" y="4" width="46" height="40" fill={fill} />
      <rect x="480" y="-16" width="10" height="20" fill={fill} />
    </g>
  )
}
