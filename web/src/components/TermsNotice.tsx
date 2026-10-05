import Link from 'next/link'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { termsEffectiveAt, termsOutdated } from '@/lib/rules'
import { TERMS_VERSION } from '@/lib/site'
import { pageNow } from '@/server/clock'
import { termsChanges } from '@/server/terms'
import { TermsUpdate } from './TermsUpdate'

/**
 * The changed terms for someone who agreed to an older version (lib/rules.ts termsOutdated). Nothing for
 * everyone else, and never on Vandaag: no wall, no card in front of the one thing to do.
 *
 * Two forms. The step (default): what changed, always unfolded, the full text and one "Akkoord", so
 * nobody agrees without the list in view (/profile/terms, and where a new appointment waits for the yes).
 * The short card (`short`, or on /requests before the terms take effect): what is going on, and a link
 * to /profile/terms, where the step is; `from` is where that page leads back to.
 *
 * `onlyRequired`: only from the day the new terms take effect (the requests page); with `ahead` also
 * before that day, as the short card (a walker with an accepted walk coming up, so nobody first hears
 * about it at the owner's door).
 */
export async function TermsNotice({
  profile,
  next,
  from,
  onlyRequired = false,
  ahead = false,
  short = false,
}: {
  profile: { termsVersion: string } | null
  /** Where the step goes after "Akkoord" (otherwise the page is drawn again). */
  next?: string
  /** The page the short card is on: /profile/terms leads back here after "Akkoord". */
  from?: string
  onlyRequired?: boolean
  ahead?: boolean
  short?: boolean
}) {
  if (!profile || !termsOutdated(profile.termsVersion)) return null
  const effectiveAt = termsEffectiveAt()
  const [now, locale, format] = await Promise.all([pageNow(), getLocale(), getFormatter()])
  const required = now.getTime() >= effectiveAt.getTime()
  if (onlyRequired && !required && !ahead) return null
  const date = format.dateTime(effectiveAt, { day: 'numeric', month: 'long', year: 'numeric' })

  // On /requests before the day: only the short card (ahead).
  if (short || (onlyRequired && !required)) {
    const t = await getTranslations('termsUpdate')
    const href = from ? `/profile/terms?next=${encodeURIComponent(from)}` : '/profile/terms'
    return (
      <section className="card stack-s terms-update" aria-labelledby="terms-update-title">
        <h2 id="terms-update-title">{t('title')}</h2>
        <p>{required ? t('ledeRequired', { date }) : t('lede', { date })}</p>
        <div className="row">
          <Link href={href} className="button secondary">
            {t('review')}
          </Link>
        </div>
      </section>
    )
  }

  // Only what changed since the version this person agreed to: someone on 0.3 does not read 0.3's list again.
  const changes = await termsChanges(locale, profile.termsVersion)
  return (
    <TermsUpdate
      version={TERMS_VERSION}
      sections={changes?.sections ?? []}
      date={date}
      required={required}
      next={next}
    />
  )
}
