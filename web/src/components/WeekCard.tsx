import { getFormatter, getTranslations } from 'next-intl/server'
import { localParts } from '@/lib/progress'
import { Icon } from './Icon'
import { WeeklyGoalPicker } from './WeeklyGoalPicker'

interface Props {
  goal: number | null
  walks: number
  /** Walks per day this week, Monday first. */
  days: number[]
  activeWeeks: number
  now?: Date
}

/** This week at a glance: the weekly goal, the days with a walk, and the weeks that only add up. */
export async function WeekCard({ goal, walks, days, activeWeeks, now = new Date() }: Props) {
  const t = await getTranslations('progress')
  const format = await getFormatter()
  const today = localParts(now).weekday
  // Weekday initials, Monday first (5 October 2026 is a Monday).
  const names = Array.from({ length: 7 }, (_, i) => format.dateTime(new Date(Date.UTC(2026, 9, 5 + i, 12)), { weekday: 'narrow', timeZone: 'UTC' }))
  const done = goal != null && walks >= goal

  return (
    <section className="card week-card" aria-labelledby="week-title">
      <div className="week-head">
        {goal != null ? <Ring value={Math.min(1, walks / goal)} label={`${Math.min(walks, 99)}/${goal}`} done={done} /> : null}
        <div className="stack-s">
          <h2 id="week-title" className="small-title">
            {t('weekTitle')}
          </h2>
          <p className="week-status">{goal != null ? (done ? t('weekDone') : t('weekGoal', { done: walks, goal })) : t('weekNoGoal', { n: walks })}</p>
        </div>
      </div>
      <ol className="week-days" aria-hidden="true">
        {names.map((name, i) => (
          <li key={i} className={[days[i] ? 'walked' : '', i + 1 === today ? 'today' : ''].filter(Boolean).join(' ') || undefined}>
            <span className="dot">{days[i] ? <Icon name="paw" size={16} /> : null}</span>
            <span className="day">{name}</span>
          </li>
        ))}
      </ol>
      {activeWeeks > 0 ? (
        <p className="muted small">
          <strong>{t('activeWeeks', { n: activeWeeks })}</strong> · {t('activeWeeksHint')}
        </p>
      ) : null}
      {goal == null ? (
        <div className="stack-s">
          <p className="small">{t('weekSet')}</p>
          <WeeklyGoalPicker current={null} />
        </div>
      ) : (
        <details className="goal-change">
          <summary>{t('weekChange')}</summary>
          <WeeklyGoalPicker current={goal} />
        </details>
      )}
    </section>
  )
}

function Ring({ value, label, done }: { value: number; label: string; done: boolean }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <span className={`ring${done ? ' done' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={r} className="ring-track" />
        <circle cx="32" cy="32" r={r} className="ring-value" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
      </svg>
      <span className="ring-label">{done ? <Icon name="check" size={22} /> : label}</span>
    </span>
  )
}
