'use client'

import { Map, type MapMarker } from './map'

export function DogsMap({ markers, center, label }: { markers: MapMarker[]; center: { lat: number; lng: number }; label: string }) {
  return <Map center={center} zoom={12} markers={markers} fitToMarkers className="map tall" ariaLabel={label} />
}
