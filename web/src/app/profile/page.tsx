import { count, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { DeleteAccountForm, InviteLink, PasskeyButton, SignOutButton } from '@/components/ProfileTools'
import { WalkerCard } from '@/components/WalkerCard'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import type { Locale } from '@/i18n/config'
import { siteUrl } from '@/lib/site'
import { trustSignals } from '@/server/queries'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('profile')
  return { title: t('title') }
}

export default async function ProfilePage() {
  const viewer = await requireOnboarded('/profile')
  const p = viewer.profile
  const t = await getTranslations()
  const locale = (await getLocale()) as Locale
  const signals = await trustSignals(viewer.userId)
  const db = await getDb()
  const [{ n: invited }] = p.referralCode
    ? await db.select({ n: count() }).from(s.profile).where(eq(s.profile.referredBy, p.referralCode))
    : [{ n: 0 }]
  const inviteUrl = `${siteUrl()}/r/${p.referralCode ?? ''}`

  return (
    <div className="narrow-page stack-l">
      <header className="spread">
        <h1>{t('profile.title')}</h1>
        <Link href="/profile/edit" className="button secondary small">
          <Icon name="edit" size={16} /> {t('profile.edit')}
        </Link>
      </header>

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
      </section>

      {viewer.orgs.length === 0 ? (
        <section className="card flat stack-s">
          <h2>{t('shelter.title')}</h2>
          <p className="muted">{t('profile.shelterCta')}</p>
          <div>
            <Link href="/shelter" className="button secondary small">
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
