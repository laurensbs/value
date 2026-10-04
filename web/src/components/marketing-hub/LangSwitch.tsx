'use client'

import { LOCALES, type Locale } from '@/i18n/config'

/** NL · EN · ES · FR: which language a text is in (not the language of the page). */
export function LangSwitch({ value, onChange, label }: { value: Locale; onChange: (l: Locale) => void; label: string }) {
  return (
    <div className="mk-langs" role="group" aria-label={label}>
      {LOCALES.map((l) => (
        <button key={l} type="button" aria-pressed={l === value} onClick={() => onChange(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
