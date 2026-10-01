import type { WalkLog } from '../lib/walks'

const W = 300
const H = 128
const PAD = { top: 12, right: 12, bottom: 22, left: 26 }

/** Dumbbell chart: mood before (open dot) and after (filled dot) for recent walks. */
export function MoodChart({ logs }: { logs: WalkLog[] }) {
  const rows = logs.filter((l) => l.before !== undefined && l.after !== undefined).slice(-8)
  if (rows.length === 0) return null

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (rows.length === 1 ? innerW / 2 : (i / (rows.length - 1)) * innerW)
  const y = (mood: number) => PAD.top + innerH - ((mood - 1) / 4) * innerH

  return (
    <figure className="mood-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stemming voor en na je laatste rondjes">
        {[1, 3, 5].map((m) => (
          <g key={m}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)} className="grid" />
            <text x={PAD.left - 8} y={y(m) + 4} textAnchor="end" className="axis">
              {m}
            </text>
          </g>
        ))}
        {rows.map((r, i) => (
          <g key={r.id}>
            <line x1={x(i)} x2={x(i)} y1={y(r.before!)} y2={y(r.after!)} className="stem" />
            <circle cx={x(i)} cy={y(r.before!)} r="5" className="dot-before" />
            <circle cx={x(i)} cy={y(r.after!)} r="5.5" className="dot-after" />
          </g>
        ))}
        <text x={PAD.left} y={H - 4} className="axis">
          eerder
        </text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="axis">
          laatste rondje
        </text>
      </svg>
      <figcaption>
        <span className="legend-before" aria-hidden="true" /> voor
        <span className="legend-after" aria-hidden="true" /> na het rondje
      </figcaption>
    </figure>
  )
}
