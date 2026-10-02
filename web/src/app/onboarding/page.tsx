import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { OnboardingFlow, type OnboardingRole } from '@/components/OnboardingFlow'
import { adultBirthDateLimit, guessCountry } from '@/lib/guess-country'
import { safeNext } from '@/lib/site'
import { requireViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('onboarding')
  return { title: t('title') }
}

// Sign-up sends everyone here with a default destination. Those defaults are replaced by the
// first screen that fits the role someone picks; a real destination (a dog they were looking
// at, a page that asked them to sign in) is kept.
const DEFAULT_DESTINATIONS = new Set(['/', '/dogs', '/my-dogs/new', '/shelter'])

const ROLES: Record<string, OnboardingRole> = { walker: 'walker', owner: 'owner', both: 'both', shelter: 'shelter' }

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; intent?: string }> }) {
  const params = await searchParams
  const viewer = await requireViewer('/onboarding')
  const asked = params.next ? safeNext(params.next, '/') : null
  const next = asked && !DEFAULT_DESTINATIONS.has(asked) ? asked : undefined
  if (viewer.profile) redirect(viewer.profile.bannedAt ? '/banned' : (asked ?? '/'))

  return (
    <OnboardingFlow
      firstName={viewer.name?.trim().split(/\s+/)[0] ?? ''}
      photoUrl={viewer.image}
      country={await guessCountry()}
      maxBirthDate={adultBirthDateLimit()}
      role={params.intent && Object.hasOwn(ROLES, params.intent) ? ROLES[params.intent] : null}
      next={next}
    />
  )
}
