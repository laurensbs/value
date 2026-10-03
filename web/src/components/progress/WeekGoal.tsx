'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { playSound } from '@/lib/sounds'
import { setWeeklyGoal } from '@/server/actions/progress'

const OPTIONS = [null, 1, 2, 3, 4] as const

/**
 * A calm weekly goal, the same choices as in the iPhone app. Missing a week costs nothing:
 * there is no streak to lose, only this week's walks.
 */
export function WeekGoal({ goal, walks, activeWeeks }: { goal: number | null; walks: number; activeWeeks: number }) {
  const t = useTranslations('progress')
  const tp = useTranslations('progressPage')
  const router = useRouter()
  const [value, setValue] = useState<number | null>(goal)
  const [pending, startTransition] = useTransition()

  function pick(next: number | null) {
    if (next === value) return
    setValue(next)
    playSound('select')
    startTransition(async () => {
      await setWeeklyGoal(next)
      router.refresh()
    })
  }

  const status =
    value == null
      ? t('weekNoGoal', { n: walks })
      : walks >= value
        ? t('weekDone')
        : `${t('weekGoal', { done: walks, goal: value })} · ${t('weekLeft', { n: value - walks })}`

  return (
    <div className="stack" aria-busy={pending}>
      <div className="goal-picker" role="radiogroup" aria-label={t('weekSet')}>
        {OPTIONS.map((option) => (
          <button
            key={option ?? 'none'}
            type="button"
            role="radio"
            aria-checked={value === option}
            aria-label={option == null ? t('goalNone') : t('goalOption', { n: option })}
            className={value === option ? 'on' : undefined}
            onClick={() => pick(option)}
          >
            {option == null ? tp('goalNone') : tp('goalTimes', { n: option })}
          </button>
        ))}
      </div>
      {value != null ? (
        <div className="goal-dots" aria-hidden="true">
          {Array.from({ length: Math.max(value, Math.min(walks, 7)) }, (_, i) => (
            <span key={i} className={i < walks ? 'done' : undefined} />
          ))}
        </div>
      ) : null}
      <p className={value != null && walks >= value ? 'week-status done' : 'week-status'} role="status">
        {status}
      </p>
      <p className="muted small">{tp('weekLede')}</p>
      {activeWeeks > 0 ? (
        <p className="muted small">
          <strong>{t('activeWeeks', { n: activeWeeks })}</strong> · {t('activeWeeksHint')}
        </p>
      ) : null}
    </div>
  )
}
