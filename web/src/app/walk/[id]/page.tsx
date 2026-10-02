import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { WalkSummary } from '@/components/WalkSummary'
import { WalkTracker } from '@/components/WalkTracker'
import { countryInfo } from '@/lib/countries'
import { progressFor } from '@/server/progress'
import { progressJson } from '@/server/progress-json'
import { hostContacts } from '@/server/queries'
import { requireOnboarded, type OnboardedViewer } from '@/server/session'
import { pointsSince, walkAccess, walkPhotos } from '@/server/walks'

export async function generateMetadata() {
  const t = await getTranslations('walk')
  return { title: t('live') }
}

/** Right after ending: the points this walk earned and a new level or badge to celebrate, if any. */
async function celebrationFor(viewer: OnboardedViewer, walkId: string) {
  const raw = await progressFor(viewer)
  const p = await progressJson(raw)
  const celebration =
    p.levelUp || p.newAwards.length
      ? { level: p.level.number, name: p.level.name, levelUp: p.levelUp, awards: p.newAwards.map((a) => ({ key: a.key, title: a.title, color: a.color })) }
      : null
  return { points: raw.byWalk[walkId] ?? null, celebration }
}

export default async function WalkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const { ended } = await searchParams
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
        justEnded={ended === '1' ? await celebrationFor(viewer, walk.id) : null}
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
      initialCare={{ pee: walk.pee, poo: walk.poo, water: walk.water }}
      initialPhotos={(await walkPhotos(walk.id)).map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() }))}
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
