import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import { appPlaces } from '@/lib/places'
import { APP_NAME } from '@/lib/site'
import { rolesOf } from '@/server/progress'
import type { Viewer } from '@/server/session'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { NavLinks } from './shell/NavLinks'

/**
 * Visitors get the site header with the links about Rondje. Signed in, it becomes the app's top
 * bar: on phones only the logo, help and notifications (the tab bar does the rest); on wide
 * screens the same places as the tab bar, with the current one marked, and Beheer for admins.
 */
export async function Header({ viewer, unread }: { viewer: Viewer | null; unread: number }) {
  const t = await getTranslations('nav')
  const locale = (await getLocale()) as Locale

  if (viewer?.profile) {
    const ts = await getTranslations('shell')
    const links = [
      ...appPlaces(rolesOf(viewer.profile), viewer.orgs[0]?.id).map((p) => ({ href: p.href, label: p.key === 'dogs' ? ts('tabs.discover') : t(p.key) })),
      ...(viewer.isAdmin || viewer.adminUnconfirmed ? [{ href: '/admin', label: t('admin') }] : []),
    ]
    return (
      <header className="header app-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={APP_NAME}>
            <Logo />
            <span>{APP_NAME}</span>
          </Link>
          <NavLinks links={links} label={t('menu')} />
          <div className="header-actions">
            <Link href="/help" className="help-pill" aria-label={t('helpPill')}>
              <Icon name="help" size={16} />
              <span className="label">{t('helpPill')}</span>
            </Link>
            <span className="wide-only header-lang">
              <LanguageSwitcher current={locale} label={t('language')} compact />
            </span>
            <Link href="/notifications" className="icon-link" aria-label={`${t('notifications')}${unread ? ` (${unread})` : ''}`}>
              <Icon name="bell" />
              {unread ? <span className="tab-dot">{unread}</span> : null}
            </Link>
            <Link href="/profile" className="icon-link wide-only" aria-label={t('profile')}>
              <Avatar name={viewer.profile.firstName ?? viewer.name} src={viewer.profile.photoUrl ?? viewer.image} size="small" />
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label={APP_NAME}>
          <Logo />
          <span>{APP_NAME}</span>
        </Link>
        <nav className="nav" aria-label={t('menu')}>
          {viewer?.profile ? <Link href="/">{t('today')}</Link> : null}
          <Link href="/dogs">{t('dogs')}</Link>
          <Link href="/group-walks">{t('groupWalks')}</Link>
          <Link href="/shelters">{t('shelters')}</Link>
          <Link href="/safety">{t('safety')}</Link>
        </nav>
        <div className="header-actions">
          <Link href="/help" className="help-pill" aria-label={t('helpPill')}>
            <Icon name="help" size={16} />
            <span className="label">{t('helpPill')}</span>
          </Link>
          <LanguageSwitcher current={locale} label={t('language')} compact />
          {/* Signed in but not onboarded yet: only help and language, nothing that leads away from the first steps. */}
          {viewer ? null : (
            <Link href="/login" className="button primary small">
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
