import '../progress.css'
import { count, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { HelpUsRow } from '@/components/HelpUsInApp'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { DeleteAccountForm, EmailNotificationsToggle, InviteLink, PasskeyButton, RemindersToggle, SignOutButton } from '@/components/ProfileTools'
import { LevelCard } from '@/components/progress/LevelCard'
import { ProgressIcon, type ProgressIconName } from '@/components/progress/ProgressIcon'
import { PushToggle } from '@/components/PushToggle'
import { SoundToggle } from '@/components/SoundToggle'
import { WalkerCard } from '@/components/WalkerCard'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import type { Locale } from '@/i18n/config'
import { inviteUrl } from '@/lib/invite'
import { siteUrl } from '@/lib/site'
import { isNativeRequest } from '@/server/native'
import { LESSONS } from '@/lib/lessons'
import { lessonsDoneBy } from '@/server/lessons'
import { progressFor } from '@/server/progress'
import { progressJson } from '@/server/progress-json'
import { webPushKey } from '@/server/push'
import { trustSignals } from '@/server/queries'
import { requireOnboarded } from '@/server/session'
import { dogFriendsOf } from './friends/dog-friends'

export async function generateMetadata() {
  const t = await getTranslations('profile')
  return { title: t('title') }
}

/** A row in the app-style lists on the profile: icon, title, one line of context, chevron. */
function HubRow({ href, icon, title, text, tone }: { href: string; icon: ProgressIconName; title: string; text: string; tone?: 'warn' | 'calm' | 'ball' }) {
  return (
    <li>
      <Link href={href} className="hub-row">
        <span className={`hub-icon${tone ? ` ${tone}` : ''}`} aria-hidden="true">
          <ProgressIcon name={icon} size={20} />
        </span>
        <span className="hub-row-text">
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
        <span className="hub-chevron" aria-hidden="true">
          <ProgressIcon name="chevron" size={18} />
        </span>
      </Link>
    </li>
  )
}

export default async function ProfilePage() {
  const viewer = await requireOnboarded('/profile')
  const pushKey = webPushKey()
  const p = viewer.profile
  const db = await getDb()
  const [native, t, locale, signals, progress, friends, [{ n: invited }], lessons] = await Promise.all([
    isNativeRequest(),
    getTranslations(),
    getLocale() as Promise<Locale>,
    trustSignals(viewer.userId),
    progressFor(viewer).then(progressJson),
    dogFriendsOf(viewer.userId),
    p.referralCode ? db.select({ n: count() }).from(s.profile).where(eq(s.profile.referredBy, p.referralCode)) : Promise.resolve([{ n: 0 }]),
    lessonsDoneBy(viewer.userId),
  ])
  const invite = inviteUrl(siteUrl(), p.referralCode ?? '')
  const walksTogether = friends.reduce((n, f) => n + f.walks, 0)

  return (
    <div className="narrow-page stack-l profile-hub">
      <header className="spread">
        <h1>{t('profile.title')}</h1>
        <Link href="/profile/edit" className="button secondary small">
          <Icon name="edit" size={16} /> {t('profile.edit')}
        </Link>
      </header>

      <section className="stack" aria-label={t('profile.public')}>
        <div className="stack-s">
          <h2 className="eyebrow">{t('profile.public')}</h2>
          <div className="card">
            <WalkerCard walker={p} signals={signals} />
          </div>
        </div>
        <LevelCard progress={progress} link />
        <ul className="hub-list">
          {progress.roles.walker || friends.length ? (
            <HubRow
              href="/progress#friends-title"
              icon="book"
              title={t('profileHub.friendsTitle')}
              text={friends.length ? t('profileHub.friendsCount', { dogs: friends.length, walks: walksTogether }) : t('profileHub.friendsEmpty')}
              tone="ball"
            />
          ) : null}
          <HubRow href="/breathe" icon="breathe" title={t('profileHub.breatheTitle')} text={t('profileHub.breatheText')} tone="calm" />
          <HubRow href="/school" icon="school" title={t('school.title')} text={t('profileHub.schoolText', { done: lessons.length, total: LESSONS.length })} tone="ball" />
          <HubRow
            href="/profile/quiz"
            icon="shield"
            title={t('profile.quiz')}
            text={p.quizPassedAt ? t('profile.quizDone') : t('profileHub.quizTodo')}
            tone={p.quizPassedAt ? undefined : 'warn'}
          />
        </ul>
      </section>

      <section className="stack" aria-labelledby="more-title">
        <h2 id="more-title">{t('profileHub.moreTitle')}</h2>
        <div id="invite" className="card stack-s more-invite">
          <div className="hub-row-head">
            <span className="hub-icon ball" aria-hidden="true">
              <ProgressIcon name="share" size={20} />
            </span>
            <span className="hub-row-text">
              <strong>{t('profile.invite')}</strong>
              <span>{t('profileHub.inviteShort')}</span>
            </span>
          </div>
          <InviteLink url={invite} message={t('profile.inviteMessage', { url: invite })} />
          <p className="muted small">
            {t('profile.invited', { n: invited })}{' '}
            <Link href="/flyer" className="link-button small">
              {t('profile.flyer')} →
            </Link>
          </p>
        </div>
        <ul className="hub-list">
          {native ? null : <HubRow href="/support" icon="heart" title={t('profile.supportTitle')} text={t('profileHub.supportText')} />}
          <HubRow href="/suggest" icon="sparkle" title={t('profile.tipTitle')} text={t('profileHub.tipText')} />
          {viewer.orgs.length === 0 ? <HubRow href="/shelter" icon="building" title={t('shelter.title')} text={t('profileHub.shelterText')} /> : null}
        </ul>
      </section>

      {/* On a phone the header has no menu: this is the way into Beheer and the launch hub. */}
      {viewer.isAdmin || viewer.adminUnconfirmed ? (
        <ul className="hub-list">
          <HubRow href="/admin" icon="key" title={t('nav.admin')} text={t('profileHub.adminText')} tone="calm" />
        </ul>
      ) : null}

      {/* Everything about notifications in one place, with one sentence on what you do and do not get. */}
      <section id="alerts" className="stack" aria-labelledby="alerts-title">
        <h2 id="alerts-title">{t('profile.alerts')}</h2>
        <div className="card stack">
          <p className="muted small">{t('profile.alertsText')}</p>
          {pushKey ? <PushToggle publicKey={pushKey} /> : null}
          <EmailNotificationsToggle on={viewer.profile.emailNotifications} />
          <RemindersToggle on={viewer.profile.reminders} />
        </div>
      </section>

      <section className="stack" aria-labelledby="settings-title">
        <h2 id="settings-title">{t('profile.settings')}</h2>
        <div className="card stack">
          <div className="spread">
            <strong>{t('profile.language')}</strong>
            <LanguageSwitcher current={locale} label={t('profile.language')} />
          </div>
          <div className="stack-s">
            <strong>{t('profile.passkeys')}</strong>
            <PasskeyButton />
          </div>
          <SoundToggle />
        </div>
      </section>

      <section className="stack" aria-labelledby="privacy-title">
        <h2 id="privacy-title">{t('profile.privacy')}</h2>
        <div className="card stack">
          <p className="muted small">{t('profile.privacyText')}</p>
          <div className="row">
            <a href="/api/me/export" className="button secondary small" download>
              <Icon name="download" size={16} /> {t('profile.export')}
            </a>
            <Link href="/legal/privacy" className="button ghost small">
              {t('footer.privacy')}
            </Link>
          </div>
          <details className="danger-zone">
            <summary>{t('profile.deleteTitle')}</summary>
            <DeleteAccountForm />
          </details>
        </div>
      </section>

      {/* In the apps only: "Help ons via Whydonate", low on the page, one tap to the campaign in the browser. */}
      <HelpUsRow native={native} />

      <SignOutButton label={t('nav.logout')} />
    </div>
  )
}
