import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import type { Viewer } from '@/server/session'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

export async function Header({ viewer, unread }: { viewer: Viewer | null; unread: number }) {
  const t = await getTranslations('nav')
  const locale = (await getLocale()) as Locale
  const firstOrg = viewer?.orgs[0]

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Rondje">
          <Logo />
          <span>Rondje</span>
        </Link>
        <nav className="nav" aria-label={t('menu')}>
          {viewer?.profile ? <Link href="/">{t('today')}</Link> : null}
          <Link href="/dogs">{t('dogs')}</Link>
          <Link href="/group-walks">{t('groupWalks')}</Link>
          {viewer?.profile ? <Link href="/requests">{t('requests')}</Link> : <Link href="/shelters">{t('shelters')}</Link>}
          {viewer?.profile ? (viewer.profile.hasDogs ? <Link href="/my-dogs">{t('myDogs')}</Link> : null) : <Link href="/safety">{t('safety')}</Link>}
          {firstOrg ? <Link href={`/shelter/${firstOrg.id}`}>{t('shelter')}</Link> : null}
          {viewer?.isAdmin || viewer?.adminUnconfirmed ? <Link href="/admin">{t('admin')}</Link> : null}
        </nav>
        <div className="header-actions">
          <Link href="/help" className="help-pill" aria-label={t('helpPill')}>
            <Icon name="help" size={16} />
            <span className="label">{t('helpPill')}</span>
          </Link>
          <LanguageSwitcher current={locale} label={t('language')} compact />
          {viewer ? (
            <>
              <Link href="/notifications" className="icon-link" aria-label={`${t('notifications')}${unread ? ` (${unread})` : ''}`}>
                <Icon name="bell" />
                {unread ? <span className="tab-dot">{unread}</span> : null}
              </Link>
              <Link href="/profile" className="icon-link" aria-label={t('profile')}>
                <Avatar name={viewer.profile?.firstName ?? viewer.name} src={viewer.profile?.photoUrl ?? viewer.image} size="small" />
              </Link>
            </>
          ) : (
            <Link href="/login" className="button primary small">
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
