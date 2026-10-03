'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { Locale } from '@/i18n/config'
import { CopyButton } from './CopyButton'
import { LangSwitch } from './LangSwitch'
import { INTERVIEW_AUDIENCES, interviewText, type InterviewAudience, type InterviewText } from './interviews'

export type InterviewSetsJson = Record<Locale, { listen: string; sets: Record<InterviewAudience, InterviewText> }>

/** The interview question sets, per audience, in the language of the call. One copy button per set. */
export function InterviewSets({ texts, initial }: { texts: InterviewSetsJson; initial: Locale }) {
  const t = useTranslations('marketing.interviews')
  const [lang, setLang] = useState<Locale>(initial)
  const { listen, sets } = texts[lang]
  return (
    <div className="stack">
      <LangSwitch value={lang} onChange={setLang} label={t('language')} />
      <div className="mk-interviews">
        {INTERVIEW_AUDIENCES.map((audience, i) => {
          const set = sets[audience]
          return (
            <details key={audience} className="mk-interview card" open={i === 0}>
              <summary>
                <span className="mk-interview-title">{set.title}</span>
                <span className="muted small">{set.who}</span>
              </summary>
              <div className="stack-s mk-interview-body" lang={lang}>
                <p className="small">{set.goal}</p>
                <ol className="mk-interview-questions">
                  {set.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
                <p className="mk-listen">
                  <strong>{listen}:</strong> {set.listen}
                </p>
                <div>
                  <CopyButton text={interviewText(set, listen)} label={t('copy')} done={t('copied')} />
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
