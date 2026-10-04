'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { GUEST_LESSON, LESSONS, nextLesson, type LessonId } from '@/lib/lessons'
import { SchoolIcon } from './LessonArt'
import { SoftWall } from './SoftWall'
import { useLessons } from './useLessons'

/** The zig-zag of the app's path (LessonsView.offsets), in px from the middle. */
const OFFSETS = [-70, 0, 70, 0, -70, 0]

type Stop = 'done' | 'next' | 'open'

/**
 * The Hondenschool path: five lessons in a zig-zag with the safety quiz as the last stop, like the
 * iPhone app. Every stop is open; finishing lessons unlocks nothing by itself. Without an account,
 * lesson 1 plays and the other stops lead to the soft wall.
 */
export function LessonPath({ serverDone, signedIn, quizPassed }: { serverDone: LessonId[]; signedIn: boolean; quizPassed: boolean }) {
  const t = useTranslations('school')
  const tq = useTranslations('quiz')
  const done = useLessons(serverDone, signedIn)
  const next = nextLesson(done)
  const total = LESSONS.length
  const list = useRef<HTMLOListElement>(null)
  const trail = useTrail(list)

  const quizState: Stop = quizPassed ? 'done' : next === null ? 'next' : 'open'

  return (
    <div className="stack-l">
      <div className="school-count">
        <div className="school-count-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${done.length / total})` }} />
        </div>
        <span>{t('count', { done: done.length, total })}</span>
      </div>

      <div className="school-path-wrap">
        {trail ? (
          <svg className="school-trail" width={trail.width} height={trail.height} aria-hidden="true">
            <path d={trail.d} />
          </svg>
        ) : null}
        <ol ref={list} className="school-path" aria-label={t('pathLabel')}>
          {LESSONS.map((lesson, i) => {
            const state: Stop = done.includes(lesson.id) ? 'done' : lesson.id === next ? 'next' : 'open'
            const title = t(`lessons.${lesson.id}.title`)
            const label = t(state === 'done' ? 'stopDone' : state === 'next' ? 'stopNext' : 'stop', { title, n: i + 1, total })
            return (
              <StopItem key={lesson.id} offset={OFFSETS[i]} state={state} href={`/school/${lesson.id}`} label={label} title={title} here={t('here')}>
                <SchoolIcon name={state === 'done' ? 'check' : lesson.icon} size={30} />
              </StopItem>
            )
          })}
          <StopItem
            offset={OFFSETS[total]}
            state={quizState}
            href={signedIn ? '/profile/quiz?next=%2Fschool' : '/school/quiz'}
            label={quizPassed ? t('quizStopPassed', { title: tq('title') }) : quizState === 'next' ? t('stopNext', { title: tq('title'), n: total + 1, total: total + 1 }) : tq('title')}
            title={tq('title')}
            caption={quizPassed ? t('quizPassed') : undefined}
            here={t('here')}
          >
            <SchoolIcon name={quizPassed ? 'check' : 'shield'} size={30} />
          </StopItem>
        </ol>
      </div>

      <p className="muted small">{t('pace')}</p>

      {/* Lesson 1 done without an account: what an account adds, under everything else, so nothing moves. */}
      {!signedIn && done.includes(GUEST_LESSON) ? <SoftWall next="/school" /> : null}
    </div>
  )
}

function StopItem({ offset, state, href, label, title, caption, here, children }: { offset: number; state: Stop; href: string; label: string; title: string; caption?: string; here: string; children: React.ReactNode }) {
  return (
    <li className={`school-stop is-${state}`} style={{ '--x': `${offset}px` } as CSSProperties}>
      <Link href={href} className="school-stop-link" aria-label={label}>
        <span className="school-stop-ball" data-stop>
          {children}
        </span>
        <span className="school-stop-title">
          {title}
          {caption ? <small>{caption}</small> : null}
        </span>
      </Link>
      {state === 'next' ? (
        <span className={`school-here ${offset > 0 ? 'left' : 'right'}`} aria-hidden="true">
          {here}
        </span>
      ) : null}
    </li>
  )
}

/**
 * A dashed walking route through the centres of the stops, in soft curves like the app. Measured after
 * layout (titles can wrap at large text sizes), so it always meets the stops; it is only decoration.
 */
function useTrail(list: React.RefObject<HTMLOListElement | null>) {
  const [trail, setTrail] = useState<{ d: string; width: number; height: number } | null>(null)
  useEffect(() => {
    const el = list.current
    if (!el) return
    const measure = () => {
      const box = el.getBoundingClientRect()
      const points = [...el.querySelectorAll<HTMLElement>('[data-stop]')].map((ball) => {
        const r = ball.getBoundingClientRect()
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      })
      if (points.length < 2) return
      let d = `M${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]
        const b = points[i]
        const mid = (a.y + b.y) / 2
        d += ` C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`
      }
      setTrail({ d, width: box.width, height: box.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [list])
  return trail
}
