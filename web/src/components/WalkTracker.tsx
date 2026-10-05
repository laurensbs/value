'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { distanceM, formatWalkDistance, routeLengthM } from '@/lib/geo'
import { playSound } from '@/lib/sounds'
import { endWalk } from '@/server/actions/walks'
import { Icon } from './Icon'
import { Map, type MapMarker } from './map'
import { SosSheet } from './SosSheet'
import type { CareCounts } from '@/server/walks'
import { WalkCareButtons } from './WalkCare'
import { WalkPhotoButton, WalkPhotoStrip, type WalkPhoto } from './WalkPhotos'

interface Point {
  lat: number
  lng: number
  t: number
  accuracy?: number
}

interface Props {
  walkId: string
  dogName: string
  startedAt: number
  plannedEndAt: number
  initialRoute: Point[]
  initialPhotos: WalkPhoto[]
  initialCare: CareCounts
  fallbackCenter: { lat: number; lng: number }
  sos: React.ComponentProps<typeof SosSheet>
  locale: string
  /**
   * False while live location is switched off (LIVE_LOCATION): no GPS, nothing sent, no map, and a calm
   * line that says so. The timer, the report, the photos and SOS work as always.
   */
  liveLocation?: boolean
}

const FLUSH_EVERY_MS = 10_000
const noop = () => () => undefined
const MIN_STEP_M = 6
const MIN_STEP_MS = 4_000

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

/**
 * The walker's screen during a walk. It follows the phone's GPS, draws the route,
 * and sends new points to the server every ten seconds so the owner can follow along.
 * The screen is kept awake: web pages cannot track location while the phone is locked.
 * With live location switched off it does none of the location part (see `liveLocation`).
 */
export function WalkTracker({
  walkId,
  dogName,
  startedAt,
  plannedEndAt,
  initialRoute,
  initialPhotos,
  initialCare,
  fallbackCenter,
  sos,
  locale,
  liveLocation = true,
}: Props) {
  const [photos, setPhotos] = useState<WalkPhoto[]>(initialPhotos)
  const t = useTranslations('walk')
  const format = useFormatter()
  const [route, setRoute] = useState<Point[]>(initialRoute)
  const [now, setNow] = useState(() => Date.now())
  const [gpsState, setGps] = useState<'waiting' | 'ok' | 'denied' | 'unavailable'>(initialRoute.length ? 'ok' : 'waiting')
  const hasGeolocation = useSyncExternalStore(noop, () => 'geolocation' in navigator, () => true)
  const gps = hasGeolocation ? gpsState : 'unavailable'
  const [offline, setOffline] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ending, startEnding] = useTransition()
  const queue = useRef<Point[]>([])
  const last = useRef<Point | null>(initialRoute.at(-1) ?? null)
  // Nothing to send while live location is off; the server would refuse it anyway (403 live-location-off).
  const stopped = useRef(!liveLocation)

  const flush = useCallback(
    async (keepalive = false) => {
      if (queue.current.length === 0 || stopped.current) return
      const batch = queue.current.slice(0, 120)
      try {
        const res = await fetch(`/api/walks/${walkId}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: batch }),
          keepalive,
        })
        if (res.ok) {
          queue.current = queue.current.slice(batch.length)
          setOffline(false)
          const body = (await res.json()) as { status?: string }
          if (body.status && body.status !== 'active') {
            stopped.current = true
            window.location.reload()
          }
        } else if (res.status === 403) {
          stopped.current = true
        } else {
          setOffline(true)
        }
      } catch {
        setOffline(true)
      }
    },
    [walkId],
  )

  // A gentle "start" when the walk has just begun (not when you come back to it later).
  useEffect(() => {
    if (initialRoute.length === 0 && Date.now() - startedAt < 60_000) playSound('start')
  }, [initialRoute.length, startedAt])

  // GPS
  useEffect(() => {
    if (!liveLocation || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps('ok')
        const p: Point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: pos.timestamp || Date.now(),
          accuracy: Math.round(pos.coords.accuracy),
        }
        if ((p.accuracy ?? 0) > 120) return
        const prev = last.current
        if (prev && distanceM(prev, p) < MIN_STEP_M && p.t - prev.t < MIN_STEP_MS * 15) return
        if (prev && p.t - prev.t < MIN_STEP_MS) return
        last.current = p
        queue.current.push(p)
        setRoute((r) => [...r, p])
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 30_000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [liveLocation])

  // Upload every few seconds, and right away when the app goes to the background.
  useEffect(() => {
    const timer = setInterval(() => void flush(), FLUSH_EVERY_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush(true)
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Keep the screen on while walking.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      } catch {
        lock = null
      }
    }
    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])

  function finish() {
    startEnding(async () => {
      await flush()
      stopped.current = true
      await endWalk(walkId)
    })
  }

  const elapsed = now - startedAt
  const plannedMin = Math.round((plannedEndAt - startedAt) / 60_000)
  const overMin = Math.floor((now - plannedEndAt) / 60_000)
  const distance = routeLengthM(route)
  const here = route.at(-1)
  const markers: MapMarker[] = here ? [{ id: 'me', lat: here.lat, lng: here.lng, label: dogName, kind: 'walker' }] : []

  return (
    <div className="walk-layout">
      <section className="walk-screen" aria-live="off">
        <div className="spread">
          {liveLocation ? (
            <span className="live-label">
              <span className="live-dot" aria-hidden="true" /> {t('live')}
            </span>
          ) : null}
          <span className="muted small">{t('with', { name: dogName })}</span>
        </div>
        <div className="timer" role="timer" aria-label={t('time')}>
          {clock(elapsed)}
        </div>
        <div className="walk-stats">
          {/* Without live location there is no route, so no distance either. */}
          {liveLocation ? (
            <div>
              <strong>{formatWalkDistance(distance, locale)}</strong>
              <span className="muted small">{t('distance')}</span>
            </div>
          ) : null}
          <div>
            <strong>{format.number(plannedMin)}′</strong>
            <span className="muted small">{t('planned')}</span>
          </div>
          <div>
            <strong>{format.dateTime(new Date(plannedEndAt), { hour: '2-digit', minute: '2-digit' })}</strong>
            <span className="muted small">{t('backAt')}</span>
          </div>
        </div>
        {overMin > 0 ? (
          <p className="notice warn small" role="status">
            {t('overdue', { n: overMin })}
          </p>
        ) : null}
      </section>

      {!liveLocation ? (
        <p className="notice live-off" role="status">
          {t('liveOff')}
        </p>
      ) : gps === 'denied' ? (
        <p className="notice danger" role="alert">
          {t('gpsDenied')}
        </p>
      ) : gps === 'unavailable' ? (
        <p className="notice warn" role="alert">
          {t('noGps')}
        </p>
      ) : gps === 'waiting' ? (
        <p className="notice" role="status">
          {t('waiting')}
        </p>
      ) : null}
      {offline ? <p className="notice warn small">{t('offline')}</p> : null}

      {liveLocation ? (
        <Map center={here ?? fallbackCenter} zoom={16} markers={markers} route={route} follow className="map tall" ariaLabel={t('mapLabel')} />
      ) : null}

      <WalkCareButtons walkId={walkId} dogName={dogName} initial={initialCare} />
      <WalkPhotoButton walkId={walkId} onSent={(p) => setPhotos((list) => [...list, p])} />
      <WalkPhotoStrip photos={photos} dogName={dogName} />

      <div className="walk-actions">
        <SosSheet {...sos} />
        {confirmEnd ? (
          <div className="row">
            <button type="button" className="button primary" onClick={finish} disabled={ending} aria-busy={ending}>
              <Icon name="check" size={18} /> {t('endYes')}
            </button>
            <button type="button" className="button ghost" onClick={() => setConfirmEnd(false)} disabled={ending}>
              {t('endNo')}
            </button>
          </div>
        ) : (
          <button type="button" className="button ball" onClick={() => setConfirmEnd(true)}>
            <Icon name="stop" size={18} /> {t('end')}
          </button>
        )}
      </div>
      {confirmEnd ? <p className="muted small">{t('endConfirm')}</p> : null}
      {liveLocation ? <p className="muted small">{t('locationNote')}</p> : null}
    </div>
  )
}
