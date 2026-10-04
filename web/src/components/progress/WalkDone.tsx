'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { playSound } from '@/lib/sounds'
import { LevelUp, type Celebration } from './LevelUp'
import { moodFor, saveMood } from './mood'
import { MoodPicker, MoodReply } from './MoodPicker'
import { ProgressIcon } from './ProgressIcon'

const noop = () => () => undefined

/** "Goed rondje!" for this walk was shown in this tab before (browser back brings the old screen back). */
function shownBefore(walkId: string): boolean {
  const key = `rondje:walk-done:${walkId}`
  try {
    if (sessionStorage.getItem(key)) return true
    sessionStorage.setItem(key, '1')
  } catch {
    // Storage can be unavailable (private mode): then it simply plays as the first time.
  }
  return false
}

interface Props {
  walkId: string
  dogName: string
  /** The distance walked, or null under 50 m: then the sentence thanks without a number (never "0 m"). */
  distance: string | null
  /** Points this walk earned so far (the walk, report, photo). */
  points: number | null
  feedbackGiven: boolean
  /** A new level or badge to celebrate once the walker moves on, like the app does after this screen. */
  celebration: Celebration | null
}

/**
 * Right after "Rondje klaar": a small celebration, the private mood check and the way to the feedback.
 * The same moment as the iPhone app's "Goed rondje!" sheet: no confetti, it is about the dog. A new
 * level or badge waits until the walker taps "Klaar" or "Hoe ging het?", like the app does after
 * this screen. The timing (0.9 s, as long as the finish sound) lives in progress.css.
 */
export function WalkDone({ walkId, dogName, distance, points, feedbackGiven, celebration }: Props) {
  const t = useTranslations('walkDone')
  const tp = useTranslations('progress')
  const router = useRouter()
  const stored = useSyncExternalStore(noop, () => moodFor(walkId), () => null)
  const [picked, setPicked] = useState<number | null>(null)
  const [then, setThen] = useState<'feedback' | 'done' | null>(null)
  const [celebrated, setCelebrated] = useState(false)
  const started = useRef(false)
  // Back from home: the screen returns from the browser's cache. No second chime and no second party.
  const replay = useRef(false)
  const mood = picked ?? stored

  useEffect(() => {
    if (started.current) return
    started.current = true
    replay.current = shownBefore(walkId)
    if (!replay.current) playSound('finish')
    // A reload shows the plain summary instead of celebrating (and chiming) again.
    const url = new URL(window.location.href)
    if (url.searchParams.has('ended')) {
      url.searchParams.delete('ended')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [walkId])

  function go(action: 'feedback' | 'done') {
    if (action === 'done') {
      router.push('/')
      return
    }
    const form = document.getElementById('feedback')
    if (!form) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    form.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    form.querySelector<HTMLInputElement>('input:not([type=hidden])')?.focus({ preventScroll: true })
  }

  function proceed(action: 'feedback' | 'done') {
    if (celebration && !celebrated && !replay.current) {
      setThen(action)
      return
    }
    go(action)
  }

  return (
    <section className="walk-done" aria-labelledby="walk-done-title">
      <span className="walk-done-paw" aria-hidden="true">
        <ProgressIcon name="paw" size={46} />
      </span>
      <h1 id="walk-done-title" className="walk-done-title">
        {t('title')}
      </h1>
      <p className="walk-done-text">{distance ? t('text', { dog: dogName, distance }) : t('textShort', { dog: dogName })}</p>
      {points ? <span className="pill ball">{tp('walkPoints', { n: points })}</span> : null}
      <div className="walk-done-mood">
        <MoodPicker
          id="walk-done-mood"
          title={t('moodTitle')}
          value={mood}
          onPick={(value) => {
            setPicked(value)
            saveMood(value, walkId)
          }}
        />
        <MoodReply mood={mood} />
        <p className="muted small">{t('moodPrivate')}</p>
      </div>
      <div className="walk-done-actions">
        {feedbackGiven ? null : (
          <button type="button" className="button primary big wide" onClick={() => proceed('feedback')}>
            {t('feedback')}
          </button>
        )}
        <button type="button" className="button secondary big wide" onClick={() => proceed('done')}>
          {t('done')}
        </button>
      </div>
      <Link href={`/breathe?next=${encodeURIComponent(`/walk/${walkId}`)}`} className="walk-done-breathe">
        <ProgressIcon name="breathe" size={18} /> {t('breathe')}
      </Link>
      {then && celebration && !celebrated ? (
        <LevelUp
          celebration={celebration}
          onDone={() => {
            setCelebrated(true)
            const next = then
            setThen(null)
            // Let the dialog close before scrolling or leaving.
            requestAnimationFrame(() => go(next))
          }}
        />
      ) : null}
    </section>
  )
}
