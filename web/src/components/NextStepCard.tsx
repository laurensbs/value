'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { MASCOT } from '@/lib/avatar'
import { closeStep, pickStep, putLater, type LaterStore } from '@/lib/next-step'
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

// "Later" and "Nee, nu niet" are remembered in this browser only (the cookie statement names it).
// Without storage, as in some private windows, they last until the page is left.
const KEY = 'rondje.nextStep'
const listeners = new Set<() => void>()
let memory = '{}'

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? memory
  } catch {
    return memory
  }
}

function write(store: LaterStore) {
  memory = JSON.stringify(store)
  try {
    localStorage.setItem(KEY, memory)
  } catch {
    // No storage: the in-memory copy has it until the page is left.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function parse(raw: string): LaterStore {
  try {
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' ? (value as LaterStore) : {}
  } catch {
    return {}
  }
}

/**
 * "Eén ding nu": one big card on top of Vandaag with the one thing to do next and one button.
 * "Later" puts a suggestion away for a week (twice: for good); a talk-over after meeting someone
 * has "Nee, nu niet" instead, as big as "Bekijk". Nothing is sent anywhere.
 */
export function NextStepCard({
  steps,
  now,
  label,
  laterLabel,
  welcome,
  compact = false,
}: {
  steps: CardStep[]
  /** The moment the page was made, so the server and the browser pick the same step. */
  now: number
  label: string
  laterLabel: string
  /** The first time after signing up: a welcome above the step. */
  welcome?: string | null
  /** One line above the dogs on Ontdek instead of the big card; gone once put away. */
  compact?: boolean
}) {
  const raw = useSyncExternalStore(subscribe, read, () => '{}')
  const store = parse(raw)
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
          <button type="button" className="next-line-close" aria-label={laterLabel} title={laterLabel} onClick={() => write(putLater(parse(read()), step.id, Date.now()))}>
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
          <button type="button" className="button secondary big" onClick={() => write(closeStep(parse(read()), step.id))}>
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
            <button type="button" className="next-step-link" onClick={() => write(putLater(parse(read()), step.id, Date.now()))}>
              {laterLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
