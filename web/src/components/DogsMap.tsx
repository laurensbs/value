'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Sym } from './discover/Sym'
import { DogPortrait } from './DogPortrait'
import { Icon } from './Icon'
import { Map, type MapMarker } from './map'

/** What the small card at the bottom of the map says about a dog, in the page's language already. */
export interface MapDogCard {
  dog: { id: string; name: string; photos: string[]; avatar?: unknown }
  /** Breed and age, or nothing. */
  breed: string
  /** "900 m" with your own location, otherwise the dog's town. */
  where: string
  energy: string
  minutes: string
  /** "Voorbeeld" on an example dog. */
  tag: string | null
}

/**
 * The map of dogs as its own screen, like a maps app: it fills the screen under the search bar.
 * A tap on a paw shows a compact card of that dog at the bottom; a tap on the card opens the dog,
 * a second tap on the same paw (or on the map, or Escape) puts the card away.
 */
export function DogsMap({
  markers,
  cards,
  center,
  label,
  note,
}: {
  markers: MapMarker[]
  cards: Record<string, MapDogCard>
  center: { lat: number; lng: number }
  label: string
  /** One line while no dog is picked: locations are rounded, never an address. */
  note: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const card = selected ? cards[selected] : null

  useEffect(() => {
    if (!selected) return
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  return (
    <div className="map-screen">
      <Map
        center={center}
        zoom={12}
        markers={markers}
        fitToMarkers
        cluster
        controlsOnTop
        selectedId={selected}
        onMarkerClick={(id) => setSelected((current) => (current === id ? null : id))}
        onPick={() => setSelected(null)}
        className="map fill"
        ariaLabel={label}
      />
      <div className="map-overlay" aria-live="polite">
        {card ? (
          <Link href={`/dogs/${card.dog.id}`} className="map-card">
            <DogPortrait dog={card.dog} size={72} decorative />
            <span className="map-card-text">
              <strong>{card.dog.name}</strong>
              <span className="muted">{[card.breed, card.where].filter(Boolean).join(' · ')}</span>
              <span className="dcard-pills">
                {card.tag ? <span className="dcard-tag">{card.tag}</span> : null}
                <span className="pill green">
                  <Sym name="bolt" size={14} />
                  {card.energy}
                </span>
                <span className="pill blue">
                  <Icon name="clock" size={14} />
                  {card.minutes}
                </span>
              </span>
            </span>
            <Sym name="chevron" size={20} />
          </Link>
        ) : (
          <p className="map-note">{note}</p>
        )}
      </div>
    </div>
  )
}
