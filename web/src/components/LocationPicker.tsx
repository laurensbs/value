'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { Map } from './map'

interface Props {
  initial?: { lat: number; lng: number } | null
  fallback: { lat: number; lng: number }
  labels: { useMyLocation: string; map: string }
}

/** A map to drop a pin near home; the server rounds it to ~500 m before storing. */
export function LocationPicker({ initial, fallback, labels }: Props) {
  const [point, setPoint] = useState(initial ?? null)
  const center = point ?? fallback

  return (
    <div className="stack-s">
      <Map
        center={center}
        zoom={point ? 14 : 12}
        markers={point ? [{ id: 'me', ...point, label: labels.map, kind: 'pin' }] : []}
        onPick={setPoint}
        className="map small"
        ariaLabel={labels.map}
      />
      <div className="row">
        <button
          type="button"
          className="button secondary small"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (pos) => setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => undefined,
              { enableHighAccuracy: false, timeout: 10_000 },
            )
          }
        >
          <Icon name="location" size={16} />
          {labels.useMyLocation}
        </button>
      </div>
      <input type="hidden" name="lat" value={point?.lat ?? ''} />
      <input type="hidden" name="lng" value={point?.lng ?? ''} />
    </div>
  )
}
