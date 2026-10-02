import { and, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { formatWalkDistance } from '@/lib/geo'
import { walkPhotos, type Walk } from '@/server/walks'
import { DogPortrait } from './DogPortrait'
import { Map } from './map'
import { ReportButton } from './ReportButton'
import { MoodCheck, WalkFeedback } from './WalkFeedback'
import { WalkCareTally } from './WalkCare'
import { WalkPhotoStrip } from './WalkPhotos'

interface Props {
  walk: Walk
  dog: { id: string; name: string; photos: string[]; avatar: unknown; ownerId: string | null; orgId: string | null }
  route: { lat: number; lng: number }[]
  role: 'walker' | 'owner'
  viewerId: string
  otherUserId: string | null
  fallbackCenter: { lat: number; lng: number }
}

/** After a walk: the route, private feedback from both sides, and (for walkers) a mood check. */
export async function WalkSummary({ walk, dog, route, role, viewerId, otherUserId, fallbackCenter }: Props) {
  const t = await getTranslations()
  const locale = await getLocale()
  const db = await getDb()
  const [given] = await db
    .select({ id: s.feedback.id })
    .from(s.feedback)
    .where(and(eq(s.feedback.walkId, walk.id), eq(s.feedback.fromUserId, viewerId)))
  const photos = (await walkPhotos(walk.id)).map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() }))
  const minutes = Math.max(1, Math.round(((walk.endedAt ?? new Date()).getTime() - walk.startedAt.getTime()) / 60_000))

  return (
    <div className="narrow-page stack-l">
      <header className="summary-head">
        <DogPortrait dog={dog} size={88} />
        <div className="stack-s">
          <p className="eyebrow">{t('walk.ended')}</p>
          <h1>{t('walk.with', { name: dog.name })}</h1>
          <p className="lede">
            {t('walk.endedText', { name: dog.name, distance: formatWalkDistance(walk.distanceM ?? 0, locale), minutes })}
          </p>
        </div>
      </header>
      {route.length > 1 ? (
        <Map
          center={route[0] ?? fallbackCenter}
          route={route}
          markers={[
            { id: 'start', ...route[0], label: t('walk.startPoint'), kind: 'pin' },
            { id: 'end', ...route[route.length - 1], label: t('walk.endPoint'), kind: 'walker' },
          ]}
          fitToRoute
          className="map"
          ariaLabel={t('walk.mapLabel')}
        />
      ) : null}
      <WalkCareTally care={{ pee: walk.pee, poo: walk.poo, water: walk.water }} hideEmpty />
      <WalkPhotoStrip photos={photos} dogName={dog.name} />
      {role === 'walker' ? <MoodCheck /> : null}
      {given ? (
        <p className="notice success">{t('walk.thanks')}</p>
      ) : (
        <WalkFeedback walkId={walk.id} role={role} dogName={dog.name} />
      )}
      <div className="row">
        <Link href="/requests" className="button secondary">
          {t('nav.requests')}
        </Link>
        {role === 'walker' ? (
          <Link href={`/dogs/${dog.id}`} className="button ghost">
            {t('walk.again', { name: dog.name })}
          </Link>
        ) : null}
      </div>
      <ReportButton walkId={walk.id} subjectUserId={otherUserId} dogId={dog.id} />
    </div>
  )
}
