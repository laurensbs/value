'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { DogFace, type DogLook } from '@/components/DogFace'
import { playSound } from '@/lib/sounds'

/** Same rhythm as the iPhone app: in for 4 seconds, out for 6, for one minute. */
const IN_MS = 4000
const OUT_MS = 6000
const TOTAL_S = 60

const GOLDEN: DogLook = { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b', earStyle: 'floppy', tongue: true, collar: '#1f5a3d' }

type Phase = 'in' | 'out'

/**
 * One calm minute: a circle that grows while you breathe in and shrinks while you breathe out,
 * with an optional soft sound at each turn. Nothing is stored or sent.
 */
export function Breathing({ next }: { next: string }) {
  const t = useTranslations('breathe')
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle')
  const [phase, setPhase] = useState<Phase>('in')
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_S)
  const startedAt = useRef(0)
  const lastPhase = useRef<Phase>('in')

  useEffect(() => {
    if (state !== 'running') return
    const tick = () => {
      const elapsed = Date.now() - startedAt.current
      if (elapsed >= TOTAL_S * 1000) {
        setSecondsLeft(0)
        setState('done')
        playSound('success', 0.4)
        return
      }
      const now: Phase = elapsed % (IN_MS + OUT_MS) < IN_MS ? 'in' : 'out'
      if (now !== lastPhase.current) {
        lastPhase.current = now
        setPhase(now)
        playSound(now === 'in' ? 'breathe-in' : 'breathe-out', 0.4)
      }
      setSecondsLeft(Math.max(0, TOTAL_S - Math.floor(elapsed / 1000)))
    }
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [state])

  function start() {
    startedAt.current = Date.now()
    lastPhase.current = 'in'
    setPhase('in')
    setSecondsLeft(TOTAL_S)
    setState('running')
    playSound('breathe-in', 0.4)
  }

  function stop() {
    setState('idle')
    setPhase('in')
    setSecondsLeft(TOTAL_S)
  }

  const running = state === 'running'
  const label = running ? (phase === 'in' ? t('in') : t('out')) : state === 'done' ? t('done') : t('ready')

  return (
    <section className={`breathe-panel is-${state}`} aria-labelledby="breathe-title">
      <h1 id="breathe-title" className="breathe-title">
        {t('heading')}
      </h1>
      <div className="breathe-stage" aria-hidden="true">
        <span className="breathe-halo" />
        <span className={`breathe-ball${running ? ` is-${phase}` : ''}`} />
        <span className="breathe-dog">
          <DogFace look={GOLDEN} size={110} />
        </span>
      </div>
      <p className="breathe-phase" aria-live="polite">
        {label}
      </p>
      <p className="breathe-count">{running ? t('secondsLeft', { n: secondsLeft }) : ' '}</p>
      <div className="breathe-actions">
        {running ? (
          <button type="button" className="button ghost big wide breathe-stop" onClick={stop}>
            {t('stop')}
          </button>
        ) : state === 'done' ? (
          <>
            <Link href={next} className="button ball big wide">
              {t('back')}
            </Link>
            <button type="button" className="button ghost big wide breathe-stop" onClick={start}>
              {t('again')}
            </button>
          </>
        ) : (
          <button type="button" className="button ball big wide" onClick={start}>
            {t('start')}
          </button>
        )}
      </div>
    </section>
  )
}
