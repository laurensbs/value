'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { WEEKLY_GOALS } from '@/lib/progress'
import { setWeeklyGoal } from '@/server/actions/progress'

/** Pick (or change) how many walks a week someone aims for. */
export function WeeklyGoalPicker({ current }: { current: number | null }) {
  const t = useTranslations('progress')
  const [pending, start] = useTransition()
  return (
    <div className="goal-picker" role="group" aria-label={t('weekSet')} aria-busy={pending}>
      {WEEKLY_GOALS.map((n) => (
        <button
          key={n}
          type="button"
          className={`chip${current === n ? ' on' : ''}`}
          aria-pressed={current === n}
          disabled={pending}
          onClick={() => start(() => setWeeklyGoal(n))}
        >
          {t('goalOption', { n })}
        </button>
      ))}
      {current != null ? (
        <button type="button" className="chip" disabled={pending} onClick={() => start(() => setWeeklyGoal(null))}>
          {t('goalNone')}
        </button>
      ) : null}
    </div>
  )
}
