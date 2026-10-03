import '../../progress.css'
import './launch.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CostsCard } from '@/components/launch/CostsCard'
import { GameCard } from '@/components/launch/GameCard'
import { Outreach } from '@/components/launch/Outreach'
import { TaskList, type TaskJson } from '@/components/launch/TaskList'
import { WeeklyNumbers } from '@/components/launch/WeeklyNumbers'
import { Icon } from '@/components/Icon'
import { APP_NAME, siteUrl } from '@/lib/site'
import { launchData } from '@/server/launch'
import type { TaskState } from '@/server/launch-core'
import { isNativeRequest } from '@/server/native'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('launch')
  return {
    title: t('title'),
    robots: { index: false },
    // Its own manifest and home-screen name: "Zet op beginscherm" opens the hub as an app.
    manifest: '/admin/launch/manifest.webmanifest',
    icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: t('title'), statusBarStyle: 'default' },
  }
}

const json = (tasks: TaskState[]): TaskJson[] =>
  tasks.map((task) => ({
    key: task.key,
    owner: task.owner,
    points: task.points,
    href: task.href ?? null,
    auto: Boolean(task.auto),
    autoDone: task.autoDone,
    done: task.done,
    doneAt: task.doneAt?.toISOString() ?? null,
    note: task.note,
  }))

/** The launch hub: what is left to do and who does it, the message bank, and the numbers. Admin only. */
export default async function LaunchPage() {
  const viewer = await requireAdmin()
  const [t, data, native] = await Promise.all([getTranslations('launch'), launchData(), isNativeRequest()])
  const { waiting, mine, others, done } = data.tasks
  const waitingOpen = waiting.filter((task) => !task.done).length

  return (
    <div className="launch stack-l">
      <header className="stack-s">
        <Link href="/admin" className="link-button">
          ← {t('back')}
        </Link>
        <div className="spread">
          <h1>{t('title')}</h1>
          <a href="#voortgang" className="pill ball launch-level-chip">
            {t('levelChip', { level: t(`game.levels.${data.level.key}`), points: data.points })}
          </a>
        </div>
        <p className="lede">{t('lede')}</p>
      </header>

      <nav className="launch-tabs" aria-label={t('nav.label')}>
        <a href="#taken">
          <Icon name="list" size={18} /> {t('nav.tasks')}
        </a>
        <a href="#berichten">
          <Icon name="chat" size={18} /> {t('nav.messages')}
        </a>
        <a href="#cijfers">
          <Icon name="map" size={18} /> {t('nav.numbers')}
        </a>
      </nav>

      <section id="taken" className="stack-l launch-anchor" aria-label={t('nav.tasks')}>
        <div className="launch-waiting stack">
          <div className="stack-s">
            <div className="spread">
              <h2>{t('waiting.title')}</h2>
              <span className="pill">{t('waiting.count', { open: waitingOpen, total: waiting.length })}</span>
            </div>
            <p className="small">{waitingOpen ? t('waiting.hint') : t('waiting.allDone')}</p>
          </div>
          <TaskList tasks={json(waiting)} label={t('waiting.title')} />
        </div>

        <div className="stack">
          <h2>{t('mine.title')}</h2>
          {mine.length ? <TaskList tasks={json(mine)} label={t('mine.title')} /> : <p className="muted">{t('mine.empty')}</p>}
        </div>

        <GameCard data={data} />

        <div className="stack">
          <h2>{t('others.title')}</h2>
          {others.length ? <TaskList tasks={json(others)} label={t('others.title')} /> : <p className="muted">{t('others.empty')}</p>}
        </div>

        {done.length ? (
          <details className="launch-done">
            <summary>{t('done.title', { n: done.length })}</summary>
            <TaskList tasks={json(done)} label={t('done.label')} />
          </details>
        ) : null}
      </section>

      <section id="berichten" className="launch-anchor" aria-label={t('nav.messages')}>
        <Outreach contacts={data.contacts} defaults={{ app: APP_NAME, link: siteUrl(), afzender: viewer.profile?.firstName ?? viewer.name }} />
      </section>

      <section id="cijfers" className="stack-l launch-anchor" aria-label={t('nav.numbers')}>
        <WeeklyNumbers weeks={data.weeks} kpi={data.kpi} />

        <section className="card stack-s" aria-labelledby="launch-visits-title">
          <h2 id="launch-visits-title">{t('visits.title')}</h2>
          <p className="small">{t('visits.text')}</p>
          <p className="muted small">{t('visits.privacy')}</p>
          <div>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="button secondary small">
              {t('visits.open')} ↗
            </a>
          </div>
        </section>

        {/* The app shells never show anything about money (App Store and Play rules). */}
        {native ? null : <CostsCard costs={data.costs} members={data.members} />}
      </section>

      <p className="muted small launch-install">
        <Icon name="home" size={16} /> {t('install')}
      </p>
    </div>
  )
}
