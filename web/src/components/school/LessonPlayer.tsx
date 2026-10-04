'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DogFace } from '@/components/DogFace'
import { Icon } from '@/components/Icon'
import { MASCOT } from '@/lib/avatar'
import { addLocalLesson } from '@/lib/lesson-storage'
import { LESSONS, nextLesson, type Lesson, type LessonId } from '@/lib/lessons'
import { playSound } from '@/lib/sounds'
import { LessonArt, SchoolIcon } from './LessonArt'
import { SoftWall } from './SoftWall'
import { useLessons } from './useLessons'

interface Props {
  lesson: Lesson
  /** The app's name, for the sentences that say it ({app}). */
  app: string
  signedIn: boolean
  serverDone: LessonId[]
  quizPassed: boolean
  /** Where "Niet nu" leads: the path, or back to the quiz that pointed here. */
  back: string
  fromQuiz: boolean
}

/**
 * One lesson, one card at a time (onderzoek §3.5): one idea or one question per card. No score, no
 * hearts, no clock. A wrong pick gets one kind sentence why, shows the right answer, and the question
 * comes back at the end of the lesson; no sound for a miss. Finishing it gives no points.
 */
export function LessonPlayer({ lesson, app, signedIn, serverDone, quizPassed, back, fromQuiz }: Props) {
  const t = useTranslations('school')
  const tq = useTranslations('quiz')
  const text = (key: string) => t(`lessons.${lesson.id}.${key}`, { app })
  const [queue, setQueue] = useState<number[]>(() => lesson.cards.map((_, i) => i))
  const [completed, setCompleted] = useState(0)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [held, setHeld] = useState(false)
  const [finished, setFinished] = useState(false)
  const done = useLessons(serverDone, signedIn)
  const heading = useRef<HTMLHeadingElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const doneTitle = useRef<HTMLHeadingElement>(null)
  const markHeld = useCallback(() => setHeld(true), [])

  const index = queue[0]
  const card = index === undefined ? null : lesson.cards[index]
  const right = card?.kind === 'choice' && picked === card.correct
  const answered = card?.kind === 'choice' ? picked !== null : card?.kind === 'hold' ? held : false
  const progress = finished ? 1 : (completed + (answered && (right || card?.kind === 'hold') ? 1 : 0)) / (completed + queue.length)

  // Each new card starts at the top of the screen, and (not the first, which the page introduces) takes
  // the focus, so a screen reader reads it.
  useEffect(() => {
    if (step === 0) return
    window.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [step])

  useEffect(() => {
    if (answered) strip.current?.focus({ preventScroll: true })
  }, [answered])

  useEffect(() => {
    if (!finished) return
    window.scrollTo({ top: 0 })
    doneTitle.current?.focus({ preventScroll: true })
  }, [finished])

  function pick(option: number) {
    if (!card || card.kind !== 'choice' || picked !== null) return
    setPicked(option)
    // A soft sound for a right answer; a miss stays quiet.
    if (option === card.correct) playSound('select')
  }

  function onward() {
    if (index === undefined || !card) return
    const rest = queue.slice(1)
    if (card.kind === 'choice' && picked !== card.correct) {
      // A question you missed comes back at the end of the lesson.
      setQueue([...rest, index])
    } else {
      setCompleted((n) => n + 1)
      if (rest.length === 0) return finish()
      setQueue(rest)
    }
    setPicked(null)
    setHeld(false)
    setStep((n) => n + 1)
  }

  function finish() {
    setQueue([])
    setPicked(null)
    setHeld(false)
    setFinished(true)
    // Kept in this browser first; signed in, useLessons adds it to the account and then removes it here.
    addLocalLesson(lesson.id)
    playSound('success')
  }

  const title = t(`lessons.${lesson.id}.title`)

  return (
    <div className="lesson stack">
      <div className="lesson-top">
        <Link href={back} className="lesson-close">
          <Icon name="close" size={20} /> {t('notNow')}
        </Link>
        <div className="lesson-bar" role="progressbar" aria-label={t('progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
      <h1 className="lesson-name">{title}</h1>

      {finished ? (
        <section className="lesson-done stack" aria-labelledby="lesson-done-title">
          <span className="lesson-done-art">
            <LessonArt art={{ kind: 'guus', mood: 'happy' }} size={112} />
          </span>
          <h2 id="lesson-done-title" ref={doneTitle} tabIndex={-1}>
            {t('done')}
          </h2>
          <Ending signedIn={signedIn} done={done} quizPassed={quizPassed} back={back} fromQuiz={fromQuiz} />
        </section>
      ) : card ? (
        <>
          <section key={`${index}-${step}`} className="lesson-card stack" aria-labelledby="lesson-card-title">
            {card.kind === 'info' ? (
              <>
                <span className="lesson-card-art">
                  <LessonArt art={card.art} />
                </span>
                <h2 id="lesson-card-title" className="lesson-sentence" ref={heading} tabIndex={-1}>
                  {text(card.key)}
                </h2>
              </>
            ) : card.kind === 'hold' ? (
              <>
                <h2 id="lesson-card-title" className="lesson-sentence" ref={heading} tabIndex={-1}>
                  {text(`${card.key}.text`)}
                </h2>
                <HoldButton seconds={card.seconds} held={held} onDone={markHeld} label={t('hold')} doneLabel={t('held')} hint={t('holdHint')} />
              </>
            ) : (
              <>
                <h2 id="lesson-card-title" className="lesson-sentence" ref={heading} tabIndex={-1}>
                  {text(`${card.key}.q`)}
                </h2>
                <div className={card.art ? 'lesson-options pictures' : 'lesson-options'}>
                  {Array.from({ length: card.options }, (_, i) => {
                    const state = picked === null ? '' : i === card.correct ? ' is-right' : i === picked ? ' is-wrong' : ' is-other'
                    return (
                      <button key={i} type="button" className={`lesson-option${state}`} onClick={() => pick(i)} disabled={picked !== null}>
                        {card.art ? <LessonArt art={card.art[i]} size={88} /> : null}
                        <span>{text(`${card.key}.a${i}`)}</span>
                        {picked !== null && (i === card.correct || i === picked) ? (
                          <span className="lesson-mark" aria-hidden="true">
                            <SchoolIcon name={i === card.correct ? 'check' : 'again'} size={18} />
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <div className="lesson-foot">
            {card.kind === 'info' ? (
              <button type="button" className="button primary big wide lesson-button" onClick={onward}>
                {t('next')}
              </button>
            ) : answered ? (
              <div className={`lesson-strip ${card.kind === 'hold' || right ? 'right' : 'wrong'}`} ref={strip} tabIndex={-1} role="status">
                <div className="lesson-strip-text">
                  <span className="lesson-strip-guus" aria-hidden="true">
                    <DogFace look={MASCOT} mood={card.kind === 'hold' || right ? 'happy' : 'neutral'} size={40} />
                  </span>
                  <div className="stack-s">
                    {card.kind === 'hold' ? (
                      <p>{text(`${card.key}.after`)}</p>
                    ) : right ? (
                      <p>{text(`${card.key}.explain`)}</p>
                    ) : (
                      <>
                        <p>{text(`${card.key}.why${picked}`)}</p>
                        <p className="small">{tq('answerWas', { answer: text(`${card.key}.a${card.correct}`) })}</p>
                        <p className="small muted">{t('comesBack')}</p>
                      </>
                    )}
                  </div>
                </div>
                <button type="button" className="button primary big wide lesson-button" onClick={onward}>
                  {t('next')}
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

/** What comes after "Les klaar!": the next lesson, the quiz, back to the quiz, or (without an account) the soft wall. */
function Ending({ signedIn, done, quizPassed, back, fromQuiz }: { signedIn: boolean; done: LessonId[]; quizPassed: boolean; back: string; fromQuiz: boolean }) {
  const t = useTranslations('school')
  const count = <p className="lede">{t('doneCount', { done: done.length, total: LESSONS.length })}</p>
  if (!signedIn) {
    return (
      <>
        {count}
        <SoftWall next="/school" />
      </>
    )
  }
  if (fromQuiz) {
    return (
      <>
        {count}
        <div className="stack-s">
          <Link href={back} className="button primary big wide lesson-button">
            {t('backToQuiz')}
          </Link>
          <Link href="/school" className="button ghost wide lesson-button">
            {t('toPath')}
          </Link>
        </div>
      </>
    )
  }
  const next = nextLesson(done)
  if (!next && !quizPassed) {
    return (
      <>
        <p className="lede">{t('quizReady')}</p>
        <div className="stack-s">
          <Link href="/profile/quiz?next=%2Fschool" className="button primary big wide lesson-button">
            {t('toQuiz')}
          </Link>
          <Link href="/school" className="button ghost wide lesson-button">
            {t('later')}
          </Link>
        </div>
      </>
    )
  }
  return (
    <>
      {count}
      <div className="stack-s">
        {next ? (
          <Link href={`/school/${next}`} className="button primary big wide lesson-button">
            {t('nextLesson', { title: t(`lessons.${next}.title`) })}
          </Link>
        ) : null}
        <Link href="/school" className={`button ${next ? 'ghost' : 'primary big'} wide lesson-button`}>
          {t('toPath')}
        </Link>
      </div>
    </>
  )
}

/**
 * Something to do for real: press and hold until the ring is full. Letting go early just starts over,
 * without a word. A keyboard or a screen reader cannot hold for seconds: Enter or a tap from assistive
 * technology completes it.
 */
function HoldButton({ seconds, held, onDone, label, doneLabel, hint }: { seconds: number; held: boolean; onDone: () => void; label: string; doneLabel: string; hint: string }) {
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (start === null || held) return
    const timer = window.setInterval(() => {
      const at = Date.now()
      if (at - start >= seconds * 1000) {
        setStart(null)
        onDone()
      } else setNow(at)
    }, 100)
    return () => window.clearInterval(timer)
  }, [start, held, seconds, onDone])

  const elapsed = held ? seconds : start === null ? 0 : Math.min(seconds, Math.max(0, (now - start) / 1000))
  const circumference = 2 * Math.PI * 84
  const stop = () => setStart(null)

  return (
    <div className="hold stack-s">
      <button
        type="button"
        className={`hold-button${held ? ' is-held' : ''}`}
        aria-describedby="hold-hint"
        disabled={held}
        onPointerDown={(e) => {
          if (held || e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const at = Date.now()
          setStart(at)
          setNow(at)
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onClick={(e) => {
          // detail 0: Enter, Space or assistive technology, which cannot hold.
          if (e.detail === 0) onDone()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 190 190" aria-hidden="true" className="hold-ring">
          <circle cx="95" cy="95" r="84" className="hold-track" />
          <circle cx="95" cy="95" r="84" className="hold-fill" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - elapsed / seconds)} />
        </svg>
        <span className="hold-label">
          {held ? (
            <Icon name="check" size={40} />
          ) : start !== null ? (
            <span className="hold-count">{Math.min(seconds, Math.floor(elapsed) + 1)}</span>
          ) : (
            <SchoolIcon name="wave" size={36} />
          )}
          <strong>{held ? doneLabel : label}</strong>
        </span>
      </button>
      <p id="hold-hint" className="muted small">
        {hint}
      </p>
    </div>
  )
}
