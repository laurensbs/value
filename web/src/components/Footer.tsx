import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'

export async function Footer() {
  const t = await getTranslations('footer')
  const tc = await getTranslations('cities')
  const native = await isNativeRequest()
  const { instagram } = supportConfig()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-row" aria-label={t('more')}>
          <Link href="/about">{t('about')}</Link>
          {native ? null : <Link href="/support">{t('support')}</Link>}
          <Link href="/suggest">{t('tip')}</Link>
          <Link href="/cities">{tc('footerLink')}</Link>
          <Link href="/shelter">{t('forShelters')}</Link>
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
      </div>
    </footer>
  )
}
