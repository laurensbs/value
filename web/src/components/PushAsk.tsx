'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { MASCOT } from '@/lib/avatar'
import { enablePush, pushState } from '@/lib/push-client'
import { DogFace } from './DogFace'

const LATER_KEY = 'rondje.pushAsk'
const LATER_MS = 14 * 86_400_000

function askLater() {
  try {
    localStorage.setItem(LATER_KEY, String(Date.now() + LATER_MS))
  } catch {
    // Without storage the card simply comes back on the next visit.
  }
}

function waiting(): boolean {
  try {
    return Number(localStorage.getItem(LATER_KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/**
 * A friendly question at a moment it matters: may Rondje send a heads-up in this browser? Only
 * where push works and this browser has none yet. "Later", or closing the browser's own question,
 * keeps it away for two weeks; a "no" in the browser keeps it away for good.
 */
export function PushAsk({ publicKey, text }: { publicKey: string; text: string }) {
  const t = useTranslations('pushAsk')
  const [view, setView] = useState<'hidden' | 'ask' | 'done'>('hidden')
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    if (!waiting()) {
      pushState()
        .then((s) => !cancelled && s === 'off' && setView('ask'))
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [])

  if (view === 'hidden') return null
  if (view === 'done') {
    return (
      <p className="notice success push-ask-done" role="status">
        {t('done')}
      </p>
    )
  }

  function yes() {
    start(async () => {
      try {
        const state = await enablePush(publicKey)
        if (state !== 'on') askLater()
        setView(state === 'on' ? 'done' : 'hidden')
      } catch {
        askLater()
        setView('hidden')
      }
    })
  }

  function later() {
    askLater()
    setView('hidden')
  }

  return (
    <section className="card push-ask" aria-labelledby="push-ask-title">
      <DogFace look={MASCOT} size={56} />
      <div className="stack-s">
        <h2 id="push-ask-title" className="small-title">
          {t('title')}
        </h2>
        <p>{text}</p>
        <p className="muted small">{t('calm')}</p>
        <div className="row">
          <button type="button" className="button primary small" onClick={yes} disabled={pending}>
            {t('yes')}
          </button>
          <button type="button" className="button ghost small" onClick={later} disabled={pending}>
            {t('later')}
          </button>
        </div>
      </div>
    </section>
  )
}
