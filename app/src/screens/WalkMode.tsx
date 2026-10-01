import { useEffect, useRef, useState } from 'react'
import type { Dog } from '../data/dogs'
import { DogFace } from '../components/DogFace'
import { Icon } from '../components/Icon'
import { MoodPicker } from '../components/MoodPicker'
import { ShareWalk } from '../components/ShareWalk'
import { WALK_PROMPTS, formatDuration, minutesFromSeconds, moodLabel, weeklyLabel, type Mood } from '../lib/walks'

type Phase = 'before' | 'walking' | 'after' | 'done'

export interface WalkResult {
  minutes: number
  before?: Mood
  after?: Mood
  /** Chosen slot when the walker wants a fixed weekly walk with this dog. */
  weeklySlot?: string
}

interface Props {
  dog: Dog
  /** True after a first meeting: then we offer to become regular buddies. */
  offerWeekly: boolean
  onFinish: (result: WalkResult) => void
  onClose: () => void
  onHelp: () => void
}

export function WalkMode({ dog, offerWeekly, onFinish, onClose, onHelp }: Props) {
  const [phase, setPhase] = useState<Phase>('before')
  const [before, setBefore] = useState<Mood | undefined>()
  const [after, setAfter] = useState<Mood | undefined>()
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [promptIndex, setPromptIndex] = useState(0)
  const [weeklySlot, setWeeklySlot] = useState<string | undefined>()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'walking' || startedAt === null) return
    const tick = () => setElapsed((Date.now() - startedAt) / 1000)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [phase, startedAt])

  const startWalk = (mood?: Mood) => {
    setBefore(mood)
    setStartedAt(Date.now())
    setPhase('walking')
  }

  const minutes = minutesFromSeconds(elapsed)
  const shift = before !== undefined && after !== undefined ? after - before : null

  return (
    <div className={`walk-mode phase-${phase}`} role="dialog" aria-modal="true" aria-labelledby="walk-title">
      <div className="walk-top">
        <button type="button" className="icon-button" onClick={onClose} aria-label="Rondje sluiten">
          <Icon name="close" />
        </button>
        <span className="walk-with">Rondje met {dog.name}</span>
        <button type="button" className="help-pill" onClick={onHelp}>
          Hulp
        </button>
      </div>

      {phase === 'before' && (
        <div className="walk-body">
          <h2 id="walk-title" ref={headingRef} tabIndex={-1}>
            Hoe voel je je nu?
          </h2>
          <p className="muted">Eén tik. Het blijft op dit apparaat, en je mag het ook overslaan.</p>
          <MoodPicker name="before" value={before} onChange={(m) => startWalk(m)} />
          <button type="button" className="link-button" onClick={() => startWalk(undefined)}>
            Overslaan en beginnen
          </button>
          <ShareWalk dog={dog} />
        </div>
      )}

      {phase === 'walking' && (
        <div className="walk-body walking">
          <div className="walk-dog">
            <svg className="walk-ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="92" />
            </svg>
            <DogFace look={dog.look} size={132} />
          </div>
          <h2 id="walk-title" ref={headingRef} tabIndex={-1} className="timer" aria-live="off">
            {formatDuration(elapsed)}
          </h2>
          <p className="muted">Doel: ongeveer {dog.walkMinutes} minuten. Telefoon mag in je zak.</p>

          <div className="prompt-card">
            <p className="prompt-label">Opdrachtje, als je zin hebt</p>
            <p className="prompt-text">{WALK_PROMPTS[promptIndex]}</p>
            <button
              type="button"
              className="link-button"
              onClick={() => setPromptIndex((promptIndex + 1) % WALK_PROMPTS.length)}
            >
              Ander opdrachtje
            </button>
          </div>

          <button type="button" className="button primary wide" onClick={() => setPhase('after')}>
            <Icon name="check" size={20} />
            Rondje klaar
          </button>
        </div>
      )}

      {phase === 'after' && (
        <div className="walk-body">
          <h2 id="walk-title" ref={headingRef} tabIndex={-1}>
            En nu?
          </h2>
          <p className="muted">
            {minutes} {minutes === 1 ? 'minuut' : 'minuten'} buiten geweest met {dog.name}.
          </p>
          <MoodPicker
            name="after"
            value={after}
            onChange={(m) => {
              setAfter(m)
              setPhase('done')
            }}
          />
          <button type="button" className="link-button" onClick={() => setPhase('done')}>
            Overslaan
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="walk-body done">
          <span className="done-tag" aria-hidden="true">
            <DogFace look={dog.look} size={88} />
          </span>
          <h2 id="walk-title" ref={headingRef} tabIndex={-1}>
            {dog.name} heeft {minutes} {minutes === 1 ? 'minuut' : 'minuten'} de wereld besnuffeld.
          </h2>
          {shift !== null && (
            <p className="shift">
              {moodLabel(before)} <Icon name="arrow" size={18} /> {moodLabel(after)}
            </p>
          )}

          {after !== undefined && after <= 2 && (
            <div className="notice calm">
              <p>
                Gaat het niet zo goed? Je hoeft het niet alleen op te lossen. Praten helpt, ook anoniem.
              </p>
              <button type="button" className="button secondary small" onClick={onHelp}>
                Bekijk wie je kunt bellen of chatten
              </button>
            </div>
          )}

          {offerWeekly && (
            <section className="buddy-offer" aria-labelledby="buddy-title">
              <h3 id="buddy-title">Vaste maatjes worden?</h3>
              <p>
                Een vast moment per week maakt het makkelijker. {dog.name} weet wanneer je komt
                {dog.host.kind === 'buurt' ? `, en ${dog.host.name.split(',')[0]} ook.` : '.'}
              </p>
              <div className="chips" role="radiogroup" aria-labelledby="buddy-title">
                {dog.slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={weeklySlot === s}
                    className="chip"
                    onClick={() => setWeeklySlot(weeklySlot === s ? undefined : s)}
                  >
                    {weeklyLabel(s).replace('Elke ', '')}
                  </button>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            className="button primary wide"
            onClick={() => onFinish({ minutes, before, after, weeklySlot })}
          >
            {weeklySlot ? `Bewaar en word vaste maatjes` : 'Bewaar in mijn rondjes'}
          </button>
        </div>
      )}
    </div>
  )
}
