'use client'

import { useTranslations } from 'next-intl'
import { useId, useState, useSyncExternalStore } from 'react'
import { Disclosure } from './Disclosure'
import { Icon } from './Icon'

const noop = () => () => {}

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '[]'
  } catch {
    return '[]'
  }
}

function parse(raw: string): string[] {
  try {
    const list: unknown = JSON.parse(raw)
    return Array.isArray(list) ? list.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}

/**
 * What to talk about when meeting a dog for the first time, to tick off on the spot. The ticks stay
 * on this device only: it is a memory aid, nothing more, and nothing depends on it.
 */
export function MeetChecklist({ requestId, title, items }: { requestId: string; title: string; items: { key: string; text: string }[] }) {
  const t = useTranslations('meetCheck')
  const tr = useTranslations('requests')
  const hintId = useId()
  const storageKey = `rondje.meetCheck.${requestId}`
  const stored = useSyncExternalStore(noop, () => read(storageKey), () => '[]')
  // After the first tick this device's list is the truth, also when storage is not available.
  const [ticked, setTicked] = useState<string[] | null>(null)
  const done = ticked ?? parse(stored)

  function toggle(key: string) {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key]
    setTicked(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // Ticks then last until the page closes.
    }
  }

  const count = items.filter((item) => done.includes(item.key)).length
  return (
    <Disclosure
      className="meet-check"
      defaultOpen
      summary={
        <>
          <span className="grow">{title}</span>
          <span className={`pill${count === items.length ? ' green' : ''}`}>{t('count', { done: count, total: items.length })}</span>
        </>
      }
    >
      <p className="muted small">{t('intro')}</p>
      <ul className="checklist">
        {items.map((item) => {
          const on = done.includes(item.key)
          // How to look at an ID: only looking, nothing kept (DPIA maatregel M6). Under the item and
          // linked to its checkbox as a description, so it is not part of the checkbox's name (like TrustForm).
          const hint = item.key === 'id' ? tr('idHow') : null
          return (
            <li key={item.key} className={on ? 'done' : undefined}>
              <label>
                <input type="checkbox" checked={on} onChange={() => toggle(item.key)} aria-describedby={hint ? `${hintId}-${item.key}` : undefined} />
                <span className="tick" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <span className="label">{item.text}</span>
              </label>
              {hint ? (
                <p className="checklist-hint" id={`${hintId}-${item.key}`}>
                  {hint}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
      {count === items.length ? (
        <p className="notice success small" role="status">
          {t('done')}
        </p>
      ) : null}
    </Disclosure>
  )
}
