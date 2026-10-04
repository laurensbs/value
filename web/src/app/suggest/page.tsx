import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { InviteLink } from '@/components/ProfileTools'
import { SuggestForm } from '@/components/SuggestForm'
import { isCountry, type Country } from '@/lib/countries'
import { directoryEntry } from '@/lib/directory'
import { inviteUrl } from '@/lib/invite'
import { siteUrl } from '@/lib/site'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const t = await getTranslations('suggest')
  return pageMetadata({ path: '/suggest', title: t('title'), description: t('metaDescription') })
}

export default async function SuggestPage({ searchParams }: { searchParams: Promise<{ kind?: string; directory?: string }> }) {
  const sp = await searchParams
  const kind = sp.kind === 'owner' ? 'owner' : 'shelter'
  const viewer = await getViewer()
  const t = await getTranslations()
  const entry = directoryEntry(sp.directory)
  const here = `/suggest?kind=${kind}${entry ? `&directory=${encodeURIComponent(entry.id)}` : ''}`
  const country: Country = isCountry(viewer?.profile?.country) ? viewer.profile.country : 'NL'
  const invite = viewer?.profile ? inviteUrl(siteUrl(), viewer.profile.referralCode, 'owner') : null

  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <p className="eyebrow">{t('suggest.eyebrow')}</p>
        <h1>{t('suggest.title')}</h1>
        <p className="lede">{t('suggest.lede')}</p>
      </header>

      <nav className="choices" aria-label={t('suggest.title')}>
        <Link href="/suggest?kind=shelter" className={`chip${kind === 'shelter' ? ' on' : ''}`} aria-current={kind === 'shelter' ? 'page' : undefined}>
          <Icon name="building" size={15} /> {t('suggest.tabs.shelter')}
        </Link>
        <Link href="/suggest?kind=owner" className={`chip${kind === 'owner' ? ' on' : ''}`} aria-current={kind === 'owner' ? 'page' : undefined}>
          <Icon name="home" size={15} /> {t('suggest.tabs.owner')}
        </Link>
      </nav>

      {kind === 'shelter' ? (
        !viewer?.profile ? (
          <div className="card flat stack-s">
            <h2>{t('suggest.loginTitle')}</h2>
            <p className="muted">{t('suggest.loginText')}</p>
            <div className="row">
              <Link href={viewer ? `/onboarding?next=${encodeURIComponent(here)}` : `/signup?next=${encodeURIComponent(here)}`} className="button primary">
                {viewer ? t('shelter.finishProfile') : t('nav.signup')}
              </Link>
              {viewer ? null : (
                <Link href={`/login?next=${encodeURIComponent(here)}`} className="button ghost">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <SuggestForm
              defaultCountry={country}
              prefill={entry ? { name: entry.name, country: entry.country, city: entry.city ?? '', website: entry.website ?? '' } : {}}
            />
            <p className="muted small">{t('suggest.privacy')}</p>
          </>
        )
      ) : (
        <section className="card stack-s">
          <h2>{t('suggest.ownerTitle')}</h2>
          <p>{t('suggest.ownerText')}</p>
          <ol className="steps-list">
            <li>{t('suggest.ownerStep1')}</li>
            <li>
              {t('suggest.ownerStep2')}{' '}
              <Link href="/my-dogs/new">{t('suggest.ownerAddDog')}</Link>
            </li>
            <li>{t('suggest.ownerStep3')}</li>
          </ol>
          {invite ? (
            <InviteLink url={invite} message={t('suggest.ownerMessage', { url: invite })} />
          ) : (
            <div className="row">
              <Link href={`/signup?intent=owner`} className="button secondary">
                {t('suggest.ownerSignup')}
              </Link>
            </div>
          )}
          <p className="small">
            <Link href="/flyer?for=owner">{t('suggest.ownerFlyer')} →</Link>
          </p>
          <p className="muted small">{t('suggest.ownerPrivacy')}</p>
        </section>
      )}
    </div>
  )
}
