'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOCALE_NAMES, LOCALES, type Locale } from '@/i18n/config'
import { setLocale } from '@/server/actions/profile'

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <label className="lang">
      <span className="visually-hidden">{label}</span>
      <select
        className="lang-select"
        value={current}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setLocale(e.target.value)
            router.refresh()
          })
        }
      >
        {LOCALES.map((l: Locale) => (
          <option key={l} value={l}>
            {l.toUpperCase()} · {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
