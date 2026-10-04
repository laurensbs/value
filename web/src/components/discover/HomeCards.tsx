import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { challengesJson, progressJson } from '@/server/progress-json'
import { Icon } from '../Icon'
import { dayNumber, partOfDay } from './day'
import { Sym, type SymName } from './Sym'

// The cards at the top of Ontdek, the same as in the iPhone app (ios/Rondje/Features/Discover):
// a greeting, your first steps, your level, the month's shared challenge and a tip for today.
// Built from the same server code as the app API (progressJson / challengesJson).

export type ProgressView = Awaited<ReturnType<typeof progressJson>>
export type ChallengesView = Awaited<ReturnType<typeof challengesJson>>

export async function Greeting({ name }: { name: string }) {
  const t = await getTranslations()
  return (
    <header className="greeting">
      <p className="greeting-hello">{t(`today.${partOfDay()}`, { name })}</p>
      <h1>{t('discover.title')}</h1>
    </header>
  )
}

export async function WelcomeCard({ name, progress }: { name: string; progress: ProgressView }) {
  const t = await getTranslations('today')
  return (
    <section className="welcome-card" aria-labelledby="welcome-title">
      <span className="welcome-badge" aria-hidden="true">
        <Icon name="paw" size={26} />
      </span>
      <div className="stack-s">
        <h2 id="welcome-title">{t('welcomeTitle', { name })}</h2>
        <p>{t('welcomeText', { level: progress.level.name })}</p>
      </div>
    </section>
  )
}

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
          // "Plan een kennismaking" points at the list right below on this page.
          const href = step.href === '/dogs' ? '#honden' : step.href
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

/** Level in a ring, the way to the next one and the penningen. Links to the progress page. */
export async function LevelCard({ progress }: { progress: ProgressView }) {
  const t = await getTranslations()
  const { level } = progress
  const r = 28
  const c = 2 * Math.PI * r
  const earned = progress.badges.filter((b) => b.tier > 0).length
  return (
    <Link href="/progress" className="level-card">
      <span className="level-ring" aria-hidden="true">
        <svg className="ring" viewBox="0 0 68 68" width="68" height="68">
          <circle cx="34" cy="34" r={r} className="ring-track" />
          <circle cx="34" cy="34" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.03, level.progress))} transform="rotate(-90 34 34)" />
        </svg>
        <span className="level-number">{level.number}</span>
      </span>
      <span className="level-text">
        <span className="visually-hidden">{t('progress.levelN', { n: level.number })}: </span>
        <strong className="level-name">{level.name}</strong>
        <span className="level-next">
          {level.next != null && level.nextName ? t('progress.toNext', { n: Math.max(0, level.next - progress.points), name: level.nextName }) : t('discover.levelTop')}
        </span>
        <span className="level-badges">
          <Sym name="award" size={16} />
          {t('discover.badges', { n: earned })}
        </span>
      </span>
      <span className="level-chevron" aria-hidden="true">
        <Sym name="chevron" size={20} />
      </span>
    </Link>
  )
}

/** "Utrecht loopt 10 rondjes in oktober": a shared goal, only totals, never who walked. */
export async function ChallengeCard({ challenges }: { challenges: ChallengesView }) {
  const t = await getTranslations()
  const goal = challenges.city ?? challenges.all
  const fraction = Math.min(1, goal.walks / Math.max(1, goal.goal))
  return (
    <section className="challenge-card" aria-labelledby="challenge-title" title={t('challenges.private')}>
      <div className="challenge-head">
        <span className="challenge-label">
          <Icon name="users" size={18} />
          {t('discover.together')}
        </span>
      </div>
      <h2 id="challenge-title">{goal.title}</h2>
      <div
        className={`challenge-bar${goal.done ? ' done' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.goal}
        aria-valuenow={Math.min(goal.walks, goal.goal)}
        aria-label={goal.progressText}
      >
        <span style={{ width: `${Math.max(fraction, goal.walks > 0 ? 0.04 : 0) * 100}%` }} />
      </div>
      <div className="challenge-row">
        <strong>{goal.progressText}</strong>
        {goal.mine > 0 ? (
          <span className="challenge-mine">
            <Icon name="heart" size={16} />
            {t('discover.mine', { n: goal.mine })}
          </span>
        ) : (
          <span className="muted small">{t('challenges.mine', { n: 0 })}</span>
        )}
      </div>
      <p className="muted small">{goal.statsText}</p>
      {goal.done ? <p className="challenge-done">{t('challenges.done')}</p> : null}
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
