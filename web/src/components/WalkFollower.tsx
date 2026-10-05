'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { formatWalkDistance, routeLengthM } from '@/lib/geo'
import { Icon } from './Icon'
import { Map, type MapMarker } from './map'
import type { CareCounts } from '@/server/walks'
import { WalkCareTally } from './WalkCare'
import { WalkPhotoStrip, type WalkPhoto } from './WalkPhotos'

interface Point {
  id: number
  lat: number
  lng: number
  t: number
}

interface LiveResponse {
  status: string
  lastAt: string | null
  overdueMin: number
  care: CareCounts
  photos: WalkPhoto[]
  points: Point[]
}

interface Props {
  walkId: string
  dogName: string
  walkerName: string
  walkerPhone: string | null
  startedAt: number
  plannedEndAt: number
  initialRoute: Point[]
  initialPhotos: WalkPhoto[]
  initialCare: CareCounts
  fallbackCenter: { lat: number; lng: number }
  locale: string
  /** False while live location is switched off (LIVE_LOCATION): no map, and a calm line that says so. */
  liveLocation?: boolean
}

const POLL_MS = 5_000

/**
 * The owner's live view: the route so far, where the walker is now, and when they were last seen. With
 * live location switched off: the time, the report and the photos, without a map.
 */
export function WalkFollower({
  walkId,
  dogName,
  walkerName,
  walkerPhone,
  startedAt,
  plannedEndAt,
  initialRoute,
  initialPhotos,
  initialCare,
  fallbackCenter,
  locale,
  liveLocation = true,
}: Props) {
  const [care, setCare] = useState<CareCounts>(initialCare)
  const [photos, setPhotos] = useState<WalkPhoto[]>(initialPhotos)
  const lastPhotoAt = useRef(initialPhotos.at(-1)?.t ?? 0)
  const t = useTranslations('walk')
  const format = useFormatter()
  const [route, setRoute] = useState<Point[]>(initialRoute)
  const [lastAt, setLastAt] = useState<number | null>(initialRoute.at(-1)?.t ?? null)
  const [overdue, setOverdue] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const lastId = useRef(initialRoute.at(-1)?.id ?? 0)

  useEffect(() => {
    let active = true
    async function poll() {
      try {
        const res = await fetch(`/api/walks/${walkId}/live?after=${lastId.current}&photosAfter=${lastPhotoAt.current}`, { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = (await res.json()) as LiveResponse
        if (data.points.length) {
          lastId.current = data.points[data.points.length - 1].id
          setRoute((r) => [...r, ...data.points])
        }
        if (data.photos.length) {
          lastPhotoAt.current = data.photos[data.photos.length - 1].t
          setPhotos((list) => [...list, ...data.photos.filter((p) => !list.some((q) => q.id === p.id))])
        }
        if (data.care) setCare(data.care)
        if (data.lastAt) setLastAt(new Date(data.lastAt).getTime())
        setOverdue(data.overdueMin)
        if (data.status !== 'active') window.location.reload()
      } catch {
        // Try again on the next tick.
      }
    }
    const timer = setInterval(poll, POLL_MS)
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      active = false
      clearInterval(timer)
      clearInterval(tick)
    }
  }, [walkId])

  const here = route.at(-1)
  const markers: MapMarker[] = here ? [{ id: 'walker', lat: here.lat, lng: here.lng, label: `${walkerName} · ${dogName}`, kind: 'walker' }] : []
  const elapsedMin = Math.floor((now - startedAt) / 60_000)
  const staleMin = lastAt ? Math.floor((now - lastAt) / 60_000) : null
  const phone = walkerPhone?.replace(/[^\d+]/g, '')

  return (
    <div className="walk-layout">
      <section className="walk-screen">
        <div className="spread">
          {liveLocation ? (
            <span className="live-label">
              <span className="live-dot" aria-hidden="true" /> {t('live')}
            </span>
          ) : null}
          <span className="muted small">{liveLocation ? t('followLede', { walker: walkerName, dog: dogName }) : t('with', { name: dogName })}</span>
        </div>
        <div className="walk-stats">
          <div>
            <strong>{elapsedMin}′</strong>
            <span className="muted small">{t('time')}</span>
          </div>
          {liveLocation ? (
            <div>
              <strong>{formatWalkDistance(routeLengthM(route), locale)}</strong>
              <span className="muted small">{t('distance')}</span>
            </div>
          ) : null}
          <div>
            <strong>{format.dateTime(new Date(plannedEndAt), { hour: '2-digit', minute: '2-digit' })}</strong>
            <span className="muted small">{t('backAt')}</span>
          </div>
        </div>
        {liveLocation ? (
          <p className="muted small" aria-live="polite">
            {lastAt
              ? t('lastSeen', { time: staleMin && staleMin > 0 ? t('minutesAgo', { n: staleMin }) : t('justNow') })
              : t('waiting')}
          </p>
        ) : null}
        {overdue > 0 ? (
          <p className="notice warn small" role="status">
            {t('overdue', { n: overdue })}
          </p>
        ) : null}
      </section>
      {liveLocation ? (
        <Map center={here ?? fallbackCenter} zoom={15} markers={markers} route={route} follow className="map tall" ariaLabel={t('mapLabel')} />
      ) : (
        <p className="notice live-off" role="status">
          {t('liveOffFollow')}
        </p>
      )}
      <WalkCareTally care={care} />
      <WalkPhotoStrip photos={photos} dogName={dogName} />
      {phone ? (
        <a href={`tel:${phone}`} className="button secondary wide">
          <Icon name="phone" size={18} /> {t('callWalker', { name: walkerName })}
        </a>
      ) : null}
    </div>
  )
}
