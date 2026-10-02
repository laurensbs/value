'use client'

import dynamic from 'next/dynamic'
import type { LeafletMapProps } from './LeafletMap'

// Leaflet needs the browser; it is never rendered on the server.
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="map" aria-hidden="true" />,
})

export function Map(props: LeafletMapProps) {
  return <LeafletMap {...props} />
}

export type { MapMarker } from './LeafletMap'
