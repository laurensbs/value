import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { WalkSummary } from '@/components/WalkSummary'
import { WalkTracker } from '@/components/WalkTracker'
import { countryInfo } from '@/lib/countries'
import { hostContacts } from '@/server/queries'
import { requireOnboarded } from '@/server/session'
import { pointsSince, walkAccess } from '@/server/walks'

export async function generateMetadata() {
  const t = await getTranslations('walk')
  return { title: t('live') }
}

export default async function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/walk/${id}`)
  const access = await walkAccess(id, viewer)
  if (!access) notFound()
  if (!access.isWalker) redirect(`/follow/${id}`)
  const { walk, dog } = access
  const points = await pointsSince(id, 0)
  const info = countryInfo(dog.country)
  const center = dog.lat != null && dog.lng != null ? { lat: dog.lat, lng: dog.lng } : info.center

  if (walk.status !== 'active') {
    return (
      <WalkSummary
        walk={walk}
        dog={dog}
        route={points}
        role="walker"
        viewerId={viewer.userId}
        otherUserId={dog.ownerId}
        fallbackCenter={center}
      />
    )
  }

  const contact = (await hostContacts([dog])).get(dog.id)
  return (
    <WalkTracker
      walkId={walk.id}
      dogName={dog.name}
      startedAt={walk.startedAt.getTime()}
      plannedEndAt={walk.plannedEndAt.getTime()}
      initialRoute={points.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t.getTime() }))}
      fallbackCenter={center}
      locale={await getLocale()}
      sos={{
        emergency: info.emergency,
        animal: info.animalEmergency,
        contactName: contact?.name ?? '',
        contactPhone: contact?.phone ?? null,
        vetInfo: dog.vetInfo || null,
        registry: info.lostPets.name,
      }}
    />
  )
}
