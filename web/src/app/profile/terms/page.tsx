import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { TermsNotice } from '@/components/TermsNotice'
import { termsOutdated } from '@/lib/rules'
import { safeNext } from '@/lib/site'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('termsUpdate')
  return { title: t('pageTitle') }
}

/**
 * The changed terms as a step of their own, like the safety quiz: a button where something waits for the
 * yes (a group walk, an answer that came back 'needs-terms') leads here with `next`, and "Akkoord"
 * goes straight back there.
 */
export default async function TermsUpdatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: asked } = await searchParams
  const viewer = await requireOnboarded('/profile/terms')
  const t = await getTranslations()
  const next = safeNext(asked, '/')
  const outdated = termsOutdated(viewer.profile.termsVersion)
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <Link href={asked ? next : '/profile'} className="link-button">
          ← {asked ? t('termsUpdate.onward') : t('profile.title')}
        </Link>
        <h1>{t('termsUpdate.pageTitle')}</h1>
      </header>
      {outdated ? (
        <TermsNotice profile={viewer.profile} next={next} />
      ) : (
        <div className="stack-s">
          <p className="notice success">{t('termsUpdate.upToDate')}</p>
          <div className="row">
            <Link href={next} className="button primary">
              {t('termsUpdate.onward')}
            </Link>
            <Link href="/legal/terms" className="button ghost">
              {t('termsUpdate.read')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
