import { count, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { DeleteAccountForm, EmailNotificationsToggle, InviteLink, PasskeyButton, RemindersToggle, SignOutButton } from '@/components/ProfileTools'
import { PushToggle } from '@/components/PushToggle'
import { WalkerCard } from '@/components/WalkerCard'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import type { Locale } from '@/i18n/config'
import { siteUrl } from '@/lib/site'
import { isNativeRequest } from '@/server/native'
import { progressFor } from '@/server/progress'
import { webPushKey } from '@/server/push'
import { trustSignals } from '@/server/queries'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('profile')
  return { title: t('title') }
}

export default async function ProfilePage() {
  const viewer = await requireOnboarded('/profile')
  const pushKey = webPushKey()
  const native = await isNativeRequest()
  const p = viewer.profile
  const t = await getTranslations()
  const locale = (await getLocale()) as Locale
  const signals = await trustSignals(viewer.userId)
  const db = await getDb()
  const [{ n: invited }] = p.referralCode
    ? await db.select({ n: count() }).from(s.profile).where(eq(s.profile.referredBy, p.referralCode))
    : [{ n: 0 }]
  const inviteUrl = `${siteUrl()}/r/${p.referralCode ?? ''}`
  const progress = await progressFor(viewer)
  const level = progress.level

  return (
    <div className="narrow-page stack-l">
      <header className="spread">
        <h1>{t('profile.title')}</h1>
        <Link href="/profile/edit" className="button secondary small">
          <Icon name="edit" size={16} /> {t('profile.edit')}
        </Link>
      </header>

      <Link href="/progress" className="card progress-card">
        <span className="level-badge" style={{ '--p': level.progress } as React.CSSProperties} aria-hidden="true">
          {level.level}
        </span>
        <span className="stack-s">
          <strong>{t('profile.progressTitle')}</strong>
          <span className="muted small">
            {t('progress.levelN', { n: level.level })} · {t(`progress.levels.${level.key}`)} · {t('progress.points', { n: progress.points })}
          </span>
        </span>
        <Icon name="arrow" size={20} />
      </Link>

      <section className="stack-s">
        <h2 className="eyebrow">{t('profile.public')}</h2>
        <div className="card">
          <WalkerCard walker={p} signals={signals} />
        </div>
      </section>

      <section className="card stack-s">
        <div className="spread">
          <h2>{t('profile.quiz')}</h2>
          {p.quizPassedAt ? <span className="pill green">{t('profile.quizDone')}</span> : null}
        </div>
        {p.quizPassedAt ? null : (
          <>
            <p className="muted">{t('profile.quizTodo')}</p>
            <div>
              <Link href="/profile/quiz" className="button primary small">
                {t('profile.quizStart')}
              </Link>
            </div>
          </>
        )}
      </section>

      <section id="invite" className="card stack-s invite-card">
        <h2>{t('profile.invite')}</h2>
        <p>{t('profile.inviteText')}</p>
        <InviteLink url={inviteUrl} message={t('profile.inviteMessage', { url: inviteUrl })} />
        <p className="muted small">{t('profile.invited', { n: invited })}</p>
        <div>
          <Link href="/flyer" className="link-button small">
            {t('profile.flyer')} →
          </Link>
        </div>
      </section>

      {native ? null : (
        <section className="card flat stack-s">
          <h2>{t('profile.supportTitle')}</h2>
          <p className="muted">{t('profile.supportText')}</p>
          <div>
            <Link href="/support" className="button ghost small">
              <Icon name="heart" size={16} /> {t('support.title')}
            </Link>
          </div>
        </section>
      )}

      <section className="card flat stack-s">
        <h2>{t('profile.tipTitle')}</h2>
        <p className="muted">{t('profile.tipText')}</p>
        <div className="row">
          <Link href="/suggest?kind=shelter" className="button ghost small">
            <Icon name="heart" size={16} /> {t('suggest.tabs.shelter')}
          </Link>
          <Link href="/suggest?kind=owner" className="button ghost small">
            <Icon name="home" size={16} /> {t('suggest.tabs.owner')}
          </Link>
        </div>
      </section>

      {viewer.orgs.length === 0 ? (
        <section className="card flat stack-s">
          <h2>{t('shelter.title')}</h2>
          <p className="muted">{t('profile.shelterCta')}</p>
          <div>
            <Link href="/shelter" className="button ghost small">
              <Icon name="building" size={16} /> {t('shelter.create')}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="stack">
        <h2>{t('profile.settings')}</h2>
        <div className="card stack">
          <div className="spread">
            <strong>{t('profile.language')}</strong>
            <LanguageSwitcher current={locale} label={t('profile.language')} />
          </div>
          <div className="stack-s">
            <strong>{t('profile.passkeys')}</strong>
            <PasskeyButton />
          </div>
          <div className="stack-s">
            <strong>{t('profile.alerts')}</strong>
            <EmailNotificationsToggle on={viewer.profile.emailNotifications} />
            {pushKey ? <PushToggle publicKey={pushKey} /> : null}
            <RemindersToggle on={viewer.profile.reminders} />
          </div>
        </div>
      </section>

      <section className="stack">
        <h2>{t('profile.privacy')}</h2>
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

      <SignOutButton label={t('nav.logout')} />
    </div>
  )
}
