'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { playSound } from '@/lib/sounds'
import { MOOD_FACES } from './mood'

/** Five faces with big targets and no wrong answer. What happens with the answer is up to the parent. */
export function MoodPicker({ title, value, onPick, id }: { title: string; value: number | null; onPick: (mood: number) => void; id: string }) {
  const t = useTranslations('walk')
  return (
    <div className="stack-s">
      <p className="mood-title" id={id}>
        {title}
      </p>
      <div className="mood-faces" role="radiogroup" aria-labelledby={id}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={t(`moods.${v}`)}
            className={value === v ? 'on' : undefined}
            onClick={() => {
              playSound('tap')
              onPick(v)
            }}
          >
            <span aria-hidden="true">{MOOD_FACES[v - 1]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** A kind line after picking; a low mood always shows where to find help (113 guidelines). */
export function MoodReply({ mood }: { mood: number | null }) {
  const t = useTranslations('walk')
  if (mood == null) return null
  if (mood <= 2) {
    return (
      <p className="mood-reply" role="status">
        {t('moodLow')} <Link href="/help">{t('moodHelp')}</Link>
      </p>
    )
  }
  return (
    <p className="mood-reply" role="status">
      {t('moodThanks')}
    </p>
  )
}
