import Link from 'next/link'
import { change } from '@/lib/hub/game'
import type { MilestoneView } from '@/lib/hub/game'
import { HubIcon, type HubIconName } from './HubIcon'

// Small building blocks for the hub screens. Server-safe: no state, no effects.

const nl = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })

export function fmt(n: number | null | undefined, empty = '–'): string {
  return n === null || n === undefined || Number.isNaN(n) ? empty : nl.format(n)
}

export function Tile({
  value,
  label,
  href,
  trend,
  accent,
  wide,
  sub,
}: {
  value: string
  label: string
  href?: string
  /** This week against last week. */
  trend?: { now: number; before: number }
  accent?: boolean
  wide?: boolean
  sub?: string
}) {
  const pct = trend ? change(trend.now, trend.before) : null
  const body = (
    <>
      <span className="hub-num">{value}</span>
      <span className="hub-label">{label}</span>
      {trend ? (
        <span className={`hub-trend${trend.now > trend.before ? ' up' : ''}`}>
          {pct === null ? (trend.now > 0 ? 'nieuw deze week' : 'vorige week ook 0') : `${pct > 0 ? '+' : ''}${pct}% t.o.v. vorige week`}
        </span>
      ) : null}
      {sub ? <span className="hub-trend">{sub}</span> : null}
    </>
  )
  const cls = `hub-tile${accent ? ' accent' : ''}${wide ? ' wide' : ''}`
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function Ring({ now, goal, label }: { now: number; goal: number; label: string }) {
  const p = goal > 0 ? Math.min(1, now / goal) : 0
  return (
    <div className="hub-ring">
      <span className={`hub-ring-dial${goal > 0 && now >= goal ? ' is-full' : ''}`} style={{ '--p': p } as React.CSSProperties}>
        {goal > 0 ? `${now}/${goal}` : now}
      </span>
      <span className="small">{label}</span>
    </div>
  )
}

const MEDAL_ICON: Record<string, HubIconName> = {
  'first-dog': 'paw',
  'first-walk': 'route',
  'walks-10': 'route',
  'walks-100': 'route',
  'walks-1000': 'trophy',
  'walkers-10': 'users',
  'walkers-100': 'users',
  'first-pair': 'heart',
  'pairs-5': 'heart',
  'first-shelter': 'building',
  'km-100': 'map',
  'first-mail': 'mail',
  'mails-10': 'mail',
  'first-reply': 'chat',
  'first-meeting': 'calendar',
  'first-partner': 'star',
  'first-video': 'video',
  'videos-10': 'video',
  fundament: 'home',
  'first-member': 'heart',
  'costs-covered': 'euro',
}

export function MedalGrid({ items }: { items: MilestoneView[] }) {
  return (
    <ul className="hub-medals">
      {items.map((m) => (
        <li key={m.id} className={`hub-medal${m.reachedAt ? '' : ' is-locked'}`}>
          <span className={`medal ${m.reachedAt ? (m.group === 'app' ? 'green' : 'ball') : 'locked'}`} style={{ '--size': '52px' } as React.CSSProperties}>
            <HubIcon name={MEDAL_ICON[m.id] ?? 'star'} size={22} />
          </span>
          <strong>{m.title}</strong>
          <span className="muted small">{m.text}</span>
          {m.reachedAt ? (
            <span className="pill green">{new Date(m.reachedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', timeZone: 'Europe/Amsterdam' })}</span>
          ) : (
            <>
              <span className="badge-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((m.now / m.goal) * 100)}%` }} />
              </span>
              <span className="muted small">
                {fmt(m.now)} / {fmt(m.goal)}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Bars per week. The current week is highlighted; values sit on top of each bar. */
export function Bars({ data, label, alt }: { data: { week: string; value: number }[]; label: string; alt?: boolean }) {
  const w = 360
  const h = 150
  const top = 18
  const bottom = 20
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = w / Math.max(1, data.length)
  const barW = Math.min(20, step * 0.62)
  const empty = data.every((d) => d.value === 0)
  return (
    <>
      <svg className="hub-bars" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${data.map((d) => `week van ${d.week}: ${d.value}`).join(', ')}`}>
        {data.map((d, i) => {
          const bh = Math.round(((h - top - bottom) * d.value) / max)
          const x = i * step + (step - barW) / 2
          const y = h - bottom - bh
          const last = i === data.length - 1
          const [, m, day] = d.week.split('-')
          return (
            <g key={d.week}>
              <rect className={`bar${alt ? ' alt' : ''}${last ? ' is-now' : ''}`} x={x} y={y} width={barW} height={Math.max(bh, d.value > 0 ? 2 : 0)} rx={5} />
              {d.value > 0 ? (
                <text className="value" x={x + barW / 2} y={y - 5} textAnchor="middle">
                  {d.value}
                </text>
              ) : null}
              {i % 2 === (data.length - 1) % 2 ? (
                <text x={x + barW / 2} y={h - 6} textAnchor="middle">
                  {last ? 'nu' : `${Number(day)}/${Number(m)}`}
                </text>
              ) : null}
            </g>
          )
        })}
        <line x1={0} x2={w} y1={h - bottom + 0.5} y2={h - bottom + 0.5} stroke="var(--line)" />
      </svg>
      {empty ? <p className="hub-chart-empty">Nog niets in de laatste 12 weken.</p> : null}
    </>
  )
}

/** Each step as a share of the first, so you see where people drop off. */
export function Funnel({ steps }: { steps: { label: string; n: number }[] }) {
  const first = steps[0]?.n ?? 0
  return (
    <ol className="hub-funnel">
      {steps.map((s, i) => {
        const share = first > 0 ? Math.round((s.n / first) * 100) : 0
        const prev = i > 0 ? steps[i - 1].n : null
        const fromPrev = prev ? Math.round((s.n / prev) * 100) : null
        return (
          <li key={s.label}>
            <span>{s.label}</span>
            <span className="bar" aria-hidden="true">
              <span style={{ width: `${first > 0 ? Math.max(2, share) : 0}%` }} />
            </span>
            <span className="n">
              {fmt(s.n)}
              {fromPrev !== null ? <span className="muted small"> · {fromPrev}%</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function SectionHead({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <header>
      <h2>{title}</h2>
      {href ? <Link href={href}>{linkLabel ?? 'Alles'}</Link> : null}
    </header>
  )
}
