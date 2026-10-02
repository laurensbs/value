'use client'

import L from 'leaflet'
import { useEffect, useRef } from 'react'

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
  /** Zoom to show the whole route (for summaries). */
  fitToRoute?: boolean
  onPick?: (p: { lat: number; lng: number }) => void
  className?: string
  ariaLabel: string
}

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function icon(kind: MapMarker['kind'], label: string): L.DivIcon {
  const safe = label.replace(/[<>&"]/g, '')
  if (kind === 'me' || kind === 'walker' || kind === 'pin') {
    return L.divIcon({ className: '', html: '<div class="map-pin-hit"><div class="map-pin"></div></div>', iconSize: [44, 44], iconAnchor: [22, 22] })
  }
  const glyph = kind === 'shelter' ? '🏠' : '🐾'
  return L.divIcon({
    className: '',
    html: `<div class="map-pin-hit"><div class="map-dog" title="${safe}"><span aria-hidden="true">${glyph}</span></div></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  route,
  follow = false,
  fitToMarkers = false,
  fitToRoute = false,
  onPick,
  className = 'map',
  ariaLabel,
}: LeafletMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markerLayer = useRef<L.LayerGroup | null>(null)
  const routeLine = useRef<L.Polyline | null>(null)
  const pickRef = useRef(onPick)
  useEffect(() => {
    pickRef.current = onPick
  })

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom)
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m)
    markerLayer.current = L.layerGroup().addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }))
    map.current = m
    return () => {
      m.remove()
      map.current = null
      // Layers belonged to the removed map; the next map (e.g. after a remount) needs new ones.
      markerLayer.current = null
      routeLine.current = null
    }
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const layer = markerLayer.current
    const m = map.current
    if (!layer || !m) return
    layer.clearLayers()
    for (const mk of markers) {
      const marker = L.marker([mk.lat, mk.lng], { icon: icon(mk.kind, mk.label), title: mk.label, keyboard: true })
      if (mk.href) {
        const a = document.createElement('a')
        a.href = mk.href
        a.textContent = mk.label
        marker.bindPopup(a)
      }
      marker.addTo(layer)
    }
    if (fitToMarkers && markers.length > 1) {
      m.fitBounds(L.latLngBounds(markers.map((mk) => [mk.lat, mk.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 })
    } else if (follow && markers.length > 0) {
      const last = markers[markers.length - 1]
      m.setView([last.lat, last.lng], Math.max(m.getZoom(), 15))
    }
  }, [markers, fitToMarkers, follow])

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
