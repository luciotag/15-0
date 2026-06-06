import type { Attrs } from '../game/types'
import { ATTR_ORDER, ATTR_LABELS, FLOOR } from '../engine/ratings'

interface Props {
  attrs: Attrs
  size?: number
  showFloor?: boolean
  accent?: string
}

export default function RadarChart({ attrs, size = 260, showFloor = true, accent = '#d8f24b' }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 34
  const n = ATTR_ORDER.length

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, value: number) => {
    const rad = (value / 100) * r
    return [cx + rad * Math.cos(angle(i)), cy + rad * Math.sin(angle(i))]
  }

  const polygon = ATTR_ORDER.map((k, i) => point(i, attrs[k]).join(',')).join(' ')
  const floorPolygon = ATTR_ORDER.map((_, i) => point(i, FLOOR).join(',')).join(' ')
  const rings = [25, 50, 75, 100]

  const lowest = Math.min(...ATTR_ORDER.map((k) => attrs[k]))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={ATTR_ORDER.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth={1}
        />
      ))}
      {ATTR_ORDER.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.08)" />
      })}

      {showFloor && (
        <polygon
          points={floorPolygon}
          fill="none"
          stroke="rgba(248,113,113,.55)"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
      )}

      <polygon points={polygon} fill={`${accent}3a`} stroke={accent} strokeWidth={2} />

      {ATTR_ORDER.map((k, i) => {
        const [x, y] = point(i, attrs[k])
        const isLow = attrs[k] === lowest && attrs[k] < FLOOR
        return <circle key={k} cx={x} cy={y} r={3.5} fill={isLow ? '#f87171' : accent} />
      })}

      {ATTR_ORDER.map((k, i) => {
        const [x, y] = point(i, 116)
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-emerald-100/80"
            style={{ fontSize: 10.5, fontWeight: 600 }}
          >
            {ATTR_LABELS[k]} {attrs[k]}
          </text>
        )
      })}
    </svg>
  )
}
