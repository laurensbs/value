import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { progressJson } from '@/server/progress-json'
import { Icon } from '../Icon'
import { dayNumber } from './day'
import { Sym, type SymName } from './Sym'

// Your first steps (on /progress) and the tip of the day (under the dogs on Ontdek), built from the
// same server code as the app API (progressJson).

export type ProgressView = Awaited<ReturnType<typeof progressJson>>

const STEP_ICONS: Record<string, SymName> = {
  account: 'user',
  about: 'camera',
  dog: 'paw',
  quiz: 'shield',
  meet: 'users',
  walk: 'walker',
  dogMet: 'users',
  dogWalk: 'walker',
}

/** "Je eerste stappen": a short path to a first walk. Gone once everything is done. */
export async function FirstSteps({ steps }: { steps: ProgressView['steps'] }) {
  const t = await getTranslations('today')
  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null
  const next = steps.find((s) => !s.done)
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <section className="steps-card" aria-labelledby="steps-title">
      <div className="steps-head">
        <div>
          <h2 id="steps-title">{t('stepsTitle')}</h2>
          <p className="muted">{t('stepsCount', { done, total: steps.length })}</p>
        </div>
        <span className="steps-ring" aria-hidden="true">
          <svg className="ring" viewBox="0 0 46 46" width="46" height="46">
            <circle cx="23" cy="23" r={r} className="ring-track" />
            <circle cx="23" cy="23" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - done / steps.length)} transform="rotate(-90 23 23)" />
          </svg>
          <Icon name="paw" size={18} />
        </span>
      </div>
      <ol className="first-steps">
        {steps.map((step) => {
          const isNext = step === next
          const href = step.href
          return (
            <li key={step.key} className={step.done ? 'done' : isNext ? 'next' : undefined}>
              <span className="step-dot" aria-hidden="true">
                <Sym name={step.done ? 'check' : (STEP_ICONS[step.key] ?? 'paw')} size={17} />
              </span>
              <span className="step-text">
                <span className="step-title">
                  {step.done ? <span className="visually-hidden">✓ </span> : null}
                  {step.title}
                </span>
                {isNext ? <span className="step-hint">{step.hint}</span> : null}
              </span>
              {isNext && href ? (
                <Link href={href} className="button primary small">
                  {t('start')}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const WALKER_TIPS: SymName[] = ['drop', 'hand', 'leaf', 'ear', 'moon', 'walker', 'heart', 'paw', 'sun', 'chat']
const OWNER_TIPS: SymName[] = ['edit', 'home', 'calendar', 'users', 'camera', 'eye', 'heart', 'flag']

/** One calm tip a day, like a note from a friend who knows dogs. */
export async function TipCard({ owner }: { owner: boolean }) {
  const t = await getTranslations('today')
  const icons = owner ? OWNER_TIPS : WALKER_TIPS
  const index = dayNumber() % icons.length
  return (
    <section className="tip-card" aria-labelledby="tip-title">
      <span className="tip-icon" aria-hidden="true">
        <Sym name={icons[index]} size={24} />
      </span>
      <div>
        <h2 id="tip-title" className="tip-title">
          {t('tipTitle')}
        </h2>
        <p>{t(`tips.${owner ? 'owner' : 'walker'}.${index + 1}`)}</p>
      </div>
    </section>
  )
}
