'use client'

import { useEffect, useState } from 'react'
import { HubIcon } from './HubIcon'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
}

/**
 * How to put the hub on your home screen. Hidden once it runs as an app. Chrome and Edge get a
 * button; Safari on iPhone and iPad gets the two taps to do it by hand.
 */
export function InstallTip() {
  const [mode, setMode] = useState<'hidden' | 'ios' | 'prompt' | 'other'>('hidden')
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
    if (standalone) return
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const timer = window.setTimeout(() => setMode(ios ? 'ios' : 'other'), 0)
    function onPrompt(e: Event) {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
      setMode('prompt')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  if (mode === 'hidden' || mode === 'other') return null
  return (
    <div className="hub-install">
      <span className="hub-brand-mark" aria-hidden="true">
        <HubIcon name="download" size={18} />
      </span>
      <div className="stack-s">
        <strong>Zet de hub als app op je telefoon</strong>
        {mode === 'ios' ? (
          <span className="small">
            Tik in Safari op <HubIcon name="share" size={14} /> Deel en kies <b>Zet op beginscherm</b>. Daarna opent hij als losse app, zonder de site eromheen.
          </span>
        ) : (
          <div className="row">
            <span className="small">Eén tik, en hij staat naast je andere apps.</span>
            <button
              type="button"
              className="button primary small"
              onClick={async () => {
                await prompt?.prompt()
                setMode('hidden')
              }}
            >
              Installeer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
