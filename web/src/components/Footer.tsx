import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import { CONTACT_PATH } from '@/lib/contact'
import { APP_NAME } from '@/lib/site'
import { supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import { HelpUsFooterLink } from './HelpUsInApp'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

/**
 * The site footer. `compact` is the one line under the app pages for signed-in people
 * (FooterSwitch picks it): the essentials and the language, without the big link list.
 * Both have the language switcher.
 */
export async function Footer({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations('footer')
  const native = await isNativeRequest()
  if (compact) {
    const ts = await getTranslations('shell')
    const tn = await getTranslations('nav')
    const locale = (await getLocale()) as Locale
    return (
      <footer className="footer compact">
        <div className="footer-inner">
          <span className="footer-brand">
            <Logo size={18} />
            {ts('footerLine', { name: APP_NAME })}
          </span>
          <nav className="footer-links" aria-label={t('more')}>
            <Link href="/about">{t('about')}</Link>
            <Link href="/help">{tn('help')}</Link>
            <Link href={CONTACT_PATH}>{t('contact')}</Link>
            <Link href="/legal/terms">{t('terms')}</Link>
            <Link href="/legal/privacy">{t('privacy')}</Link>
            {/* In the apps "Help ons" goes straight to the campaign, in the phone's browser (HelpUsInApp). */}
            {native ? <HelpUsFooterLink native /> : <Link href="/support">{t('support')}</Link>}
          </nav>
          <LanguageSwitcher current={locale} label={tn('language')} compact />
        </div>
      </footer>
    )
  }
  const [tc, tn, locale] = await Promise.all([getTranslations('cities'), getTranslations('nav'), getLocale() as Promise<Locale>])
  const { instagram } = supportConfig()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-row" aria-label={t('more')}>
          <Link href="/about">{t('about')}</Link>
          {native ? <HelpUsFooterLink native /> : <Link href="/support">{t('support')}</Link>}
          <Link href="/suggest">{t('tip')}</Link>
          <Link href="/cities">{tc('footerLink')}</Link>
          <Link href="/shelter">{t('forShelters')}</Link>
          <Link href={CONTACT_PATH}>{t('contact')}</Link>
          {instagram ? (
            <a href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          ) : null}
        </nav>
        <span>{t('tagline')}</span>
        <Link href="/legal/terms">{t('terms')}</Link>
        <Link href="/legal/privacy">{t('privacy')}</Link>
        <Link href="/legal/conduct">{t('conduct')}</Link>
        <Link href="/legal/safety">{t('safety')}</Link>
        <Link href="/legal/shelters">{t('shelterTerms')}</Link>
        <Link href="/legal/cookies">{t('cookies')}</Link>
        {/* Also here, so the language can be changed on every page: signed in on a phone the top bar has no room for it. */}
        <LanguageSwitcher current={locale} label={tn('language')} compact />
      </div>
    </footer>
  )
}
