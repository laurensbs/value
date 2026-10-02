import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function Footer() {
  const t = await getTranslations('footer')
  return (
    <footer className="footer">
      <div className="footer-inner">
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
