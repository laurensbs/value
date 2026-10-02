'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { MASCOT } from '@/lib/avatar'
import { installWay, iosPushAfterInstall, onInstallChange, promptInstall, type InstallWay } from '@/lib/install-client'
import { askLater, INSTALL_LATER, PUSH_LATER, snoozed } from '@/lib/later'
import { pushState } from '@/lib/push-client'
import { DogFace } from './DogFace'
import { Icon } from './Icon'
import { InstallSteps } from './InstallSteps'

/**
 * Rondje on the home screen, asked on the Today screen: on iPhone and iPad with the three taps in
 * the share menu (only then can Rondje send a heads-up there), from another app's browser by first
 * opening Safari, and in Chrome or Edge with the browser's own question. Where push works in the
 * browser itself, the push question goes first: one question at a time. "Later" keeps it away for
 * two weeks, "It's already there" for a year.
 */
export function InstallAsk({ push }: { push: boolean }) {
  const t = useTranslations('installAsk')
  const [view, setView] = useState<InstallWay | 'done'>(null)
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    let cancelled = false
    async function decide(): Promise<InstallWay> {
      if (snoozed(INSTALL_LATER)) return null
      const way = installWay()
      if (way === 'prompt' && push && !snoozed(PUSH_LATER) && (await pushState()) === 'off') return null
      return way
    }
    const update = () => {
      decide()
        .then((way) => !cancelled && setView((current) => (current === 'done' ? current : way)))
        .catch(() => {})
    }
    update()
    const stop = onInstallChange(update)
    return () => {
      cancelled = true
      stop()
    }
  }, [push])

  if (!view) return null
  if (view === 'done') {
    return (
      <p className="notice success push-ask-done" role="status">
        {t('done')}
      </p>
    )
  }

  function later(days: number) {
    askLater(INSTALL_LATER, days)
    setView(null)
  }

  async function install() {
    const installed = await promptInstall().catch(() => false)
    if (installed) setView('done')
    else later(14)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/`)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
  }

  const withPush = push && view === 'ios' && iosPushAfterInstall(navigator.userAgent)
  return (
    <section className="card push-ask" aria-labelledby="install-ask-title">
      <DogFace look={MASCOT} size={56} />
      <div className="stack-s">
        <h2 id="install-ask-title" className="small-title">
          {t('title')}
        </h2>
        <p>{view === 'ios-in-app' ? t('inApp') : withPush ? t('textPush') : t('text')}</p>
        {view === 'ios' ? <InstallSteps /> : null}
        {copied ? (
          <p className="muted small" role="status">
            {copied === 'yes' ? t('copied') : t('copyFailed', { address: location.host })}
          </p>
        ) : null}
        <div className="row">
          {view === 'prompt' ? (
            <button type="button" className="button primary small" onClick={install}>
              {t('install')}
            </button>
          ) : null}
          {view === 'ios-in-app' ? (
            <button type="button" className="button primary small" onClick={copy}>
              <Icon name="copy" size={16} /> {t('copy')}
            </button>
          ) : null}
          <button type="button" className="button ghost small" onClick={() => later(14)}>
            {t('later')}
          </button>
          {view === 'ios' ? (
            <button type="button" className="button ghost small" onClick={() => later(365)}>
              {t('already')}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
