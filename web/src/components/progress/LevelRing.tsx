import type { CSSProperties } from 'react'

/** The level ring: the number in the middle, the way to the next level around it. */
export function LevelRing({ level, progress, size = 72, stroke = 8, label }: { level: number; progress: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * Math.min(1, Math.max(0.03, progress))
  return (
    <span className="level-ring" style={{ width: size, height: size } as CSSProperties} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle className="level-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="level-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ '--dash': dash } as CSSProperties}
        />
      </svg>
      <span className="level-ring-number" style={{ fontSize: Math.round(size * 0.4) }}>
        {level}
      </span>
    </span>
  )
}
