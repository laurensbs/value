'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { MASCOT } from '@/lib/avatar'
import { closeStep, LATER_COOKIE, parseLater, pickStep, putLater, serializeLater, type LaterStore } from '@/lib/next-step'
import { DogFace } from './DogFace'
import { Icon } from './Icon'

/** A step from lib/next-step.ts, with its texts in the page's language. */
export interface CardStep {
  id: string
  later: boolean
  dismiss: boolean
  /** Above the text instead of "Eén ding nu" (like "Je volgende afspraak"). */
  eyebrow?: string
  /** A short line before the text ("We beginnen hier."). */
  title?: string
  text: string
  detail?: string
  button?: { label: string; href: string }
  /** A second, smaller way (the empty town: tip a shelter). */
  secondary?: { label: string; href: string }
  /** "Nee, nu niet", as big as the button next to it. */
  no?: string
}

// "Later" and "Nee, nu niet" are remembered in a cookie on this device (lib/next-step.ts), so the
// server picks the same step and nothing jumps after the page loads. Without cookies, as in some
// private windows, they last until the page is left.
const listeners = new Set<() => void>()
let memory: string | null = null

function read(): string {
  try {
    const found = document.cookie.split('; ').find((c) => c.startsWith(`${LATER_COOKIE}=`))
    if (found) return decodeURIComponent(found.slice(LATER_COOKIE.length + 1))
  } catch {
    // No cookies here: the in-memory copy below.
  }
  return memory ?? '{}'
}

function write(store: LaterStore) {
  memory = serializeLater(store)
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${LATER_COOKIE}=${encodeURIComponent(memory)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
  } catch {
    // No cookies: the in-memory copy has it until the page is left.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * "Eén ding nu": one big card on top of Vandaag with the one thing to do next and one button.
 * "Later" puts a suggestion away for a week (twice: for good); a talk-over after meeting someone
 * has "Nee, nu niet" instead, as big as "Bekijk". Nothing is sent to anyone.
 */
export function NextStepCard({
  steps,
  stored,
  now,
  label,
  laterLabel,
  welcome,
  welcomeText,
  compact = false,
}: {
  steps: CardStep[]
  /** The cookie as the server read it, so the first paint already shows the right step. */
  stored: string
  /** The moment the page was made, so the server and the browser pick the same step. */
  now: number
  label: string
  laterLabel: string
  /** The first time after signing up: a welcome above the step, and a line about your level. */
  welcome?: string | null
  welcomeText?: string | null
  /** One line above the dogs on Ontdek instead of the big card; gone once put away. */
  compact?: boolean
}) {
  const raw = useSyncExternalStore(subscribe, read, () => stored)
  const store = parseLater(raw)
  const step = pickStep(steps, store, now) ?? (compact ? null : steps[steps.length - 1])
  if (!step) return null

  if (compact) {
    return (
      <aside className="next-line" aria-label={label}>
        <DogFace look={MASCOT} size={40} />
        <p>
          {step.text}
          {step.detail ? ` ${step.detail}` : null}{' '}
          {step.button ? (
            <Link href={step.button.href} className="next-line-link">
              {step.button.label}
            </Link>
          ) : null}
        </p>
        {step.later ? (
          <button type="button" className="next-line-close" aria-label={laterLabel} title={laterLabel} onClick={() => write(putLater(parseLater(read()), step.id, Date.now()))}>
            <Icon name="close" size={20} />
          </button>
        ) : null}
      </aside>
    )
  }

  return (
    <section className="next-step" aria-label={label}>
      <div className="next-step-top">
        <DogFace look={MASCOT} size={52} />
        <p className="eyebrow">{step.eyebrow ?? label}</p>
      </div>
      {welcome ? <h2 className="next-step-welcome">{welcome}</h2> : null}
      {welcome && welcomeText ? <p className="next-step-detail">{welcomeText}</p> : null}
      <div key={step.id} className="next-step-body">
        {step.title ? <p className="next-step-title">{step.title}</p> : null}
        <p className="next-step-text">{step.text}</p>
        {step.detail ? <p className="next-step-detail">{step.detail}</p> : null}
      </div>
      {step.no && step.button ? (
        <div className="next-step-pair">
          <Link href={step.button.href} className="button primary big">
            {step.button.label}
          </Link>
          <button type="button" className="button secondary big" onClick={() => write(closeStep(parseLater(read()), step.id))}>
            {step.no}
          </button>
        </div>
      ) : step.button ? (
        <Link href={step.button.href} className="button primary big next-step-button">
          {step.button.label}
          <Icon name="arrow" size={20} />
        </Link>
      ) : null}
      {step.secondary || step.later ? (
        <div className="next-step-more">
          {step.secondary ? (
            <Link href={step.secondary.href} className="next-step-link">
              {step.secondary.label}
            </Link>
          ) : null}
          {step.later ? (
            <button type="button" className="next-step-link" onClick={() => write(putLater(parseLater(read()), step.id, Date.now()))}>
              {laterLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
