import type { CSSProperties } from 'react'
import type { Dog, Energy } from '../data/dogs'
import { DogFace } from './DogFace'
import { Icon } from './Icon'

const ENERGY_LEVEL: Record<Energy, number> = { rustig: 1, gemiddeld: 2, energiek: 3 }

export function EnergyMeter({ energy }: { energy: Energy }) {
  const level = ENERGY_LEVEL[energy]
  return (
    <span className="energy" aria-label={`Energie: ${energy}`}>
      <span className="energy-dots" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= level ? 'on' : ''} />
        ))}
      </span>
      {energy}
    </span>
  )
}

export function HostBadge({ dog }: { dog: Dog }) {
  return (
    <span className={`host-badge host-${dog.host.kind}`}>
      <Icon name={dog.host.kind === 'opvang' ? 'home' : 'pin'} size={14} />
      {dog.host.kind === 'opvang' ? 'Uit de opvang' : 'Uit de buurt'}
    </span>
  )
}

export function tileStyle(dog: Dog): CSSProperties {
  return { '--tile': dog.tile } as CSSProperties
}

export function DogCard({ dog, onOpen }: { dog: Dog; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="dog-card" onClick={() => onOpen(dog.id)}>
      <span className="dog-tile" style={tileStyle(dog)}>
        <DogFace look={dog.look} size={84} />
      </span>
      <span className="dog-card-body">
        <span className="dog-card-top">
          <span className="dog-name">{dog.name}</span>
          <HostBadge dog={dog} />
        </span>
        <span className="dog-breed">
          {dog.breed}, {dog.age} jaar
        </span>
        <span className="hand-note">{dog.note}</span>
        <span className="dog-meta">
          <span>
            <Icon name="clock" size={15} />
            {dog.walkMinutes} min
          </span>
          <span>
            <Icon name="pin" size={15} />
            {dog.distanceKm.toLocaleString('nl-NL')} km
          </span>
          <EnergyMeter energy={dog.energy} />
        </span>
      </span>
    </button>
  )
}
