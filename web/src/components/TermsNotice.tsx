import { getFormatter, getLocale } from 'next-intl/server'
import { termsEffectiveAt, termsOutdated } from '@/lib/rules'
import { TERMS_VERSION } from '@/lib/site'
import { pageNow } from '@/server/clock'
import { termsChanges } from '@/server/terms'
import { TermsUpdate } from './TermsUpdate'

/**
 * The changed terms for someone who agreed to an older version (lib/rules.ts termsOutdated), on Vandaag,
 * the profile, and wherever a new appointment waits for the yes. Nothing for everyone else.
 * `onlyRequired`: only from the day the new terms take effect (the requests page).
 */
export async function TermsNotice({
  profile,
  next,
  onlyRequired = false,
  collapsed = false,
}: {
  profile: { termsVersion: string } | null
  next?: string
  onlyRequired?: boolean
  /** The list of changes folded, to open with a tap (Vandaag, the profile). */
  collapsed?: boolean
}) {
  if (!profile || !termsOutdated(profile.termsVersion)) return null
  const effectiveAt = termsEffectiveAt()
  const [now, locale, format] = await Promise.all([pageNow(), getLocale(), getFormatter()])
  const required = now.getTime() >= effectiveAt.getTime()
  if (onlyRequired && !required) return null
  const changes = await termsChanges(locale)
  return (
    <TermsUpdate
      version={TERMS_VERSION}
      intro={changes?.intro ?? ''}
      items={changes?.items ?? []}
      date={format.dateTime(effectiveAt, { day: 'numeric', month: 'long', year: 'numeric' })}
      required={required}
      next={next}
      collapsed={collapsed}
    />
  )
}
