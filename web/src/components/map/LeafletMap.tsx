'use client'

import L from 'leaflet'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { groupByOverlap } from '@/lib/map-groups'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  href?: string
  kind?: 'dog' | 'shelter' | 'me' | 'walker' | 'pin'
}

export interface LeafletMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  route?: { lat: number; lng: number }[]
  /** Keep the view on the latest route point / marker. */
  follow?: boolean
  fitToMarkers?: boolean
  /** Markers that would overlap share one numbered marker (dogs in the same street, shelters in one town). */
  cluster?: boolean
  /** Zoom to show the whole route (for summaries). */
  fitToRoute?: boolean
  onPick?: (p: { lat: number; lng: number }) => void
  /** A tap on a single marker selects it (the page shows its card) instead of opening a popup. */
  onMarkerClick?: (id: string) => void
  /** The selected marker, drawn a little bigger. */
  selectedId?: string | null
  /** Zoom buttons and the map credit at the top, for a map that runs under a bar at the bottom. */
  controlsOnTop?: boolean
  className?: string
  ariaLabel: string
}

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

/** From this zoom on, a numbered marker lists its markers instead of zooming in further. */
const LIST_ZOOM = 17

function clusterIcon(count: number): L.DivIcon {
  return L.divIcon({ className: '', html: `<div class="map-pin-hit"><div class="map-cluster" aria-hidden="true">${count}</div></div>`, iconSize: [44, 44], iconAnchor: [22, 22] })
}

/** A marker's link for its popup, or just its name when it has no page. */
function markerLink(mk: MapMarker): HTMLElement {
  const el = document.createElement(mk.href ? 'a' : 'span')
  if (mk.href) el.setAttribute('href', mk.href)
  el.textContent = mk.label
  return el
}

/** The markers in one spot, for the popup of their numbered marker. */
function markerList(items: MapMarker[]): HTMLElement {
  const ul = document.createElement('ul')
  ul.className = 'map-list'
  for (const mk of items) {
    const li = document.createElement('li')
    li.append(markerLink(mk))
    ul.append(li)
  }
  return ul
}

function icon(kind: MapMarker['kind'], label: string, selected = false): L.DivIcon {
  const safe = label.replace(/[<>&"]/g, '')
  if (kind === 'me' || kind === 'walker' || kind === 'pin') {
    return L.divIcon({ className: '', html: '<div class="map-pin-hit"><div class="map-pin"></div></div>', iconSize: [44, 44], iconAnchor: [22, 22] })
  }
  const glyph = kind === 'shelter' ? '🏠' : '🐾'
  return L.divIcon({
    className: '',
    html: `<div class="map-pin-hit"><div class="map-dog${selected ? ' selected' : ''}" title="${safe}"><span aria-hidden="true">${glyph}</span></div></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

/** Less motion asked for: the map jumps instead of gliding. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  route,
  follow = false,
  fitToMarkers = false,
  cluster = false,
  fitToRoute = false,
  onPick,
  onMarkerClick,
  selectedId = null,
  controlsOnTop = false,
  className = 'map',
  ariaLabel,
}: LeafletMapProps) {
  const t = useTranslations('common.map')
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markerLayer = useRef<L.LayerGroup | null>(null)
  const routeLine = useRef<L.Polyline | null>(null)
  const pickRef = useRef(onPick)
  const markerClickRef = useRef(onMarkerClick)
  const selectedRef = useRef(selectedId)
  /** The drawn single markers by id, to mark the selected one without drawing everything again. */
  const drawn = useRef(new globalThis.Map<string, { marker: L.Marker; item: MapMarker }>())
  useEffect(() => {
    pickRef.current = onPick
    markerClickRef.current = onMarkerClick
  })

  useEffect(() => {
    if (!el.current || map.current) return
    const still = reducedMotion()
    const m = L.map(el.current, {
      zoomControl: !controlsOnTop,
      attributionControl: !controlsOnTop,
      zoomAnimation: !still,
      fadeAnimation: !still,
      markerZoomAnimation: !still,
      inertia: !still,
    }).setView([center.lat, center.lng], zoom)
    if (controlsOnTop) {
      L.control.zoom({ position: 'topright' }).addTo(m)
      L.control.attribution({ position: 'topleft' }).addTo(m)
    }
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m)
    markerLayer.current = L.layerGroup().addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }))
    map.current = m
    // A map that was hidden (a step in a flow, a closed section) has no size until it is shown.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.invalidateSize())
    resize?.observe(el.current)
    return () => {
      resize?.disconnect()
      m.remove()
      map.current = null
      // Layers belonged to the removed map; the next map (e.g. after a remount) needs new ones.
      markerLayer.current = null
      routeLine.current = null
    }
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fit the view when the markers change (not when one is selected: the map stays where it is).
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (fitToMarkers && markers.length > 1) {
      m.fitBounds(L.latLngBounds(markers.map((mk) => [mk.lat, mk.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 })
    } else if (follow && markers.length > 0) {
      const last = markers[markers.length - 1]
      m.setView([last.lat, last.lng], Math.max(m.getZoom(), 15))
    }
  }, [markers, fitToMarkers, follow])

  useEffect(() => {
    const layer = markerLayer.current
    const m = map.current
    if (!layer || !m) return
    const draw = () => {
      layer.clearLayers()
      drawn.current.clear()
      // Which markers overlap depends on the zoom.
      const groups = cluster ? groupByOverlap(markers, (mk) => m.latLngToLayerPoint([mk.lat, mk.lng])) : markers.map((mk) => [mk])
      for (const items of groups) {
        const [first] = items
        if (items.length === 1) {
          const marker = L.marker([first.lat, first.lng], { icon: icon(first.kind, first.label, first.id === selectedRef.current), title: first.label, keyboard: true })
          if (markerClickRef.current) {
            // A tap selects it. Leaflet 1.9 gives a focused marker no click on Enter (only popups
            // listen to keys), so Enter and Space are handled on the marker's own element below.
            marker.on('click', () => markerClickRef.current?.(first.id))
          } else if (first.href) {
            marker.bindPopup(markerLink(first))
          }
          marker.addTo(layer)
          if (markerClickRef.current) {
            marker.getElement()?.addEventListener('keydown', (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              markerClickRef.current?.(first.id)
            })
          }
          drawn.current.set(first.id, { marker, item: first })
          continue
        }
        // Several in one spot: a tap zooms in until they come apart. When they share a place
        // (locations are rounded to about 500 m, so neighbours can), or the map is close up
        // already, it lists them instead.
        const bounds = L.latLngBounds(items.map((mk) => [mk.lat, mk.lng] as [number, number]))
        const marker = L.marker([first.lat, first.lng], { icon: clusterIcon(items.length), title: t('cluster', { count: items.length }), keyboard: true })
        if (bounds.getNorthEast().equals(bounds.getSouthWest()) || m.getZoom() >= LIST_ZOOM) {
          marker.bindPopup(markerList(items))
        } else {
          const zoomIn = () => m.fitBounds(bounds, { padding: [60, 60], maxZoom: LIST_ZOOM })
          marker.on('click', zoomIn)
          // Enter on a focused marker, as Leaflet does for popups.
          marker.on('keypress', (e) => {
            if ((e as L.LeafletKeyboardEvent).originalEvent.key === 'Enter') zoomIn()
          })
        }
        marker.addTo(layer)
      }
    }
    draw()
    if (!cluster) return
    m.on('zoomend', draw)
    return () => {
      m.off('zoomend', draw)
    }
  }, [markers, cluster, t])

  // The selected marker: only its look changes, so a marker that has the focus keeps it.
  useEffect(() => {
    const before = selectedRef.current
    selectedRef.current = selectedId
    for (const id of [before, selectedId]) {
      if (!id) continue
      const entry = drawn.current.get(id)
      entry?.marker.getElement()?.querySelector('.map-dog')?.classList.toggle('selected', id === selectedId)
    }
  }, [selectedId])

  useEffect(() => {
    const m = map.current
    if (!m || !route) return
    const latlngs = route.map((p) => [p.lat, p.lng] as [number, number])
    if (!routeLine.current) {
      routeLine.current = L.polyline(latlngs, { className: 'route-line', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(m)
    } else {
      routeLine.current.setLatLngs(latlngs)
    }
    if (follow && latlngs.length > 0) m.setView(latlngs[latlngs.length - 1], Math.max(m.getZoom(), 16))
    else if (fitToRoute && latlngs.length > 1) m.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36], maxZoom: 17 })
  }, [route, follow, fitToRoute])

  useEffect(() => {
    if (!follow && !fitToMarkers && !fitToRoute) map.current?.setView([center.lat, center.lng])
  }, [center.lat, center.lng, follow, fitToMarkers, fitToRoute])

  return <div ref={el} className={className} role="region" aria-label={ariaLabel} />
}
