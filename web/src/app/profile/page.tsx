import '../progress.css'
import { count, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { HelpUsRow } from '@/components/HelpUsInApp'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { DeleteAccountForm, EmailNotificationsToggle, InviteButton, InviteLink, PasskeyButton, RemindersToggle, SignOutButton } from '@/components/ProfileTools'
import { ProgressIcon, type ProgressIconName } from '@/components/progress/ProgressIcon'
import { PushToggle } from '@/components/PushToggle'
import { SoundToggle } from '@/components/SoundToggle'
import { WalkerCard } from '@/components/WalkerCard'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import type { Locale } from '@/i18n/config'
import { inviteUrl } from '@/lib/invite'
import { APP_NAME, siteUrl } from '@/lib/site'
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
  const inviteMessage = t('profile.inviteMessage', { url: invite })
  const walksTogether = friends.reduce((n, f) => n + f.walks, 0)
  const badges = progress.badges.filter((b) => b.tier > 0).length
  // Level, points and penningen in one line (the level's number is in the ball next to it); the whole
  // story is one tap away on /progress.
  // No penningen yet: nothing to count, so the line stays short.
  const stats = [progress.level.name, t('progress.points', { n: progress.points }), badges ? t('profileHub.levelBadges', { n: badges }) : null].filter(Boolean).join(' · ')

  return (
    <div className="narrow-page stack-l profile-hub">
      <h1 className="visually-hidden">{t('profile.title')}</h1>

      {/* You, as others see you, with what you do here most: edit it, or invite someone. */}
      <section className="card profile-head" aria-labelledby="profile-public">
        <h2 id="profile-public" className="eyebrow">
          {t('profile.public')}
        </h2>
        <WalkerCard walker={p} signals={signals} />
        <div className="profile-actions">
          <Link href="/profile/edit" className="button primary">
            <Icon name="edit" size={18} /> {t('profile.edit')}
          </Link>
          <InviteButton url={invite} message={inviteMessage} label={t('profile.inviteShort')} title={APP_NAME} />
        </div>
        <Link href="/progress" className="profile-stats" aria-label={`${t('profile.progressTitle')}: ${t('progress.levelN', { n: progress.level.number })}, ${stats}`}>
          <span className="level-badge" style={{ '--p': progress.level.progress } as React.CSSProperties} aria-hidden="true">
            {progress.level.number}
          </span>
          <span className="profile-stats-text">{stats}</span>
          <span className="hub-chevron" aria-hidden="true">
            <ProgressIcon name="chevron" size={18} />
          </span>
        </Link>
      </section>

      {/* On a phone the header has no menu: this is the way into Beheer and the launch hub. */}
      {viewer.isAdmin || viewer.adminUnconfirmed ? (
        <ul className="hub-list">
          <HubRow href="/admin" icon="key" title={t('nav.admin')} text={t('profileHub.adminText')} tone="calm" />
        </ul>
      ) : null}

      <section className="profile-group" aria-labelledby="walk-title">
        <h2 id="walk-title" className="group-title">
          {t('profileHub.walkTitle')}
        </h2>
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
          <HubRow href="/school" icon="school" title={t('school.title')} text={t('profileHub.schoolText', { done: lessons.length, total: LESSONS.length })} tone="ball" />
          <HubRow
            href="/profile/quiz"
            icon="shield"
            title={t('profile.quiz')}
            text={p.quizPassedAt ? t('profile.quizDone') : t('profileHub.quizTodo')}
            // Only a walker needs it before asking for a dog: no warning colour for an owner.
            tone={p.quizPassedAt || !progress.roles.walker ? undefined : 'warn'}
          />
          <HubRow href="/breathe" icon="breathe" title={t('profileHub.breatheTitle')} text={t('profileHub.breatheText')} tone="calm" />
        </ul>
      </section>

      <section className="profile-group" aria-labelledby="more-title">
        <h2 id="more-title" className="group-title">
          {t('profileHub.moreTitle')}
        </h2>
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
          <InviteLink url={invite} message={inviteMessage} />
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

      <section className="profile-group" aria-labelledby="settings-title">
        <h2 id="settings-title" className="group-title">
          {t('profile.settings')}
        </h2>
        <div className="card settings-card">
          {/* Everything about notifications in one place, with one sentence on what you do and do not get. */}
          <section id="alerts" className="stack" aria-labelledby="alerts-title">
            <h3 id="alerts-title">{t('profile.alerts')}</h3>
            <p className="muted small">{t('profile.alertsText')}</p>
            {pushKey ? <PushToggle publicKey={pushKey} /> : null}
            <EmailNotificationsToggle on={viewer.profile.emailNotifications} />
            <RemindersToggle on={viewer.profile.reminders} />
          </section>
          <div className="settings-row spread">
            <h3>{t('profile.language')}</h3>
            <LanguageSwitcher current={locale} label={t('profile.language')} />
          </div>
          <div className="settings-row stack-s">
            <h3>{t('profile.passkeys')}</h3>
            <PasskeyButton />
          </div>
          <div className="settings-row">
            <SoundToggle />
          </div>
        </div>
      </section>

      <section className="profile-group" aria-labelledby="account-title">
        <h2 id="account-title" className="group-title">
          {t('profileHub.accountTitle')}
        </h2>
        <div className="card settings-card">
          <section className="stack-s" aria-labelledby="privacy-title">
            <h3 id="privacy-title">{t('profile.privacy')}</h3>
            <p className="muted small">{t('profile.privacyText')}</p>
            <div className="row">
              <a href="/api/me/export" className="button secondary small" download>
                <Icon name="download" size={16} /> {t('profile.export')}
              </a>
              <Link href="/legal/privacy" className="button ghost small">
                {t('footer.privacy')}
              </Link>
            </div>
          </section>
          <details className="settings-row danger-zone">
            <summary>{t('profile.deleteTitle')}</summary>
            <DeleteAccountForm />
          </details>
        </div>
        {/* In the apps only: "Help ons via Whydonate", at the bottom of the profile just above signing
            out, one tap to the campaign in the phone's browser. */}
        <HelpUsRow native={native} />
        <SignOutButton label={t('nav.logout')} />
      </section>
    </div>
  )
}
