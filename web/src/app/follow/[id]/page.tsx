import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { ReportButton } from '@/components/ReportButton'
import { WalkFollower } from '@/components/WalkFollower'
import { WalkSummary } from '@/components/WalkSummary'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { countryInfo } from '@/lib/countries'
import { walkHasLiveLocation } from '@/lib/rules'
import { liveLocationNow } from '@/server/live-location'
import { requireOnboarded } from '@/server/session'
import { pointsSince, walkAccess, walkPhotos } from '@/server/walks'

export async function generateMetadata() {
  const t = await getTranslations('walk')
  return { title: t('follow') }
}

export default async function FollowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/follow/${id}`)
  const access = await walkAccess(id, viewer)
  if (!access) notFound()
  if (access.isWalker) redirect(`/walk/${id}`)
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
        role="owner"
        viewer={viewer}
        otherUserId={walk.walkerId}
        fallbackCenter={center}
      />
    )
  }

  const db = await getDb()
  const [walker] = await db
    .select({ firstName: s.profile.firstName, phone: s.profile.phone })
    .from(s.profile)
    .where(eq(s.profile.userId, walk.walkerId))
  const t = await getTranslations('walk')

  return (
    <div className="stack">
      <h1 className="visually-hidden">{t('follow')}</h1>
      <WalkFollower
        walkId={walk.id}
        dogName={dog.name}
        walkerName={walker?.firstName ?? ''}
        walkerPhone={walker?.phone ?? null}
        startedAt={walk.startedAt.getTime()}
        plannedEndAt={walk.plannedEndAt.getTime()}
        initialRoute={points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, t: p.t.getTime() }))}
        initialCare={{ pee: walk.pee, poo: walk.poo, water: walk.water }}
        initialPhotos={(await walkPhotos(walk.id)).map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() }))}
        fallbackCenter={center}
        locale={await getLocale()}
        // Only a walk alone with the dog has a live map; at a first meeting they walk together (lib/rules.ts).
        liveLocation={walkHasLiveLocation(access.kind, await liveLocationNow())}
        together={access.kind === 'meet'}
      />
      <div className="walk-layout">
        <ReportButton walkId={walk.id} subjectUserId={walk.walkerId} dogId={dog.id} />
      </div>
    </div>
  )
}
