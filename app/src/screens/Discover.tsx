import { useMemo, useState } from 'react'
import { DOGS, type Dog } from '../data/dogs'
import { DogCard } from '../components/DogCard'

type Filter = 'alle' | 'rustig' | 'energiek' | 'opvang' | 'buurt'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'alle', label: 'Alle honden' },
  { id: 'rustig', label: 'Rustig' },
  { id: 'energiek', label: 'Energiek' },
  { id: 'opvang', label: 'Uit de opvang' },
  { id: 'buurt', label: 'Uit de buurt' },
]

function matches(dog: Dog, filter: Filter): boolean {
  switch (filter) {
    case 'alle':
      return true
    case 'rustig':
      return dog.energy === 'rustig'
    case 'energiek':
      return dog.energy === 'energiek'
    case 'opvang':
    case 'buurt':
      return dog.host.kind === filter
  }
}

export function Discover({ onOpenDog }: { onOpenDog: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('alle')
  const dogs = useMemo(
    () => DOGS.filter((d) => matches(d, filter)).sort((a, b) => a.distanceKm - b.distanceKm),
    [filter],
  )

  return (
    <div className="screen">
      <header className="intro">
        <p className="eyebrow">Utrecht · {DOGS.length} honden in de buurt</p>
        <h1>
          Wie gaat er vandaag mee <mark>naar buiten?</mark>
        </h1>
        <p className="lede">
          Honden uit de opvang en uit de buurt die een extra rondje goed kunnen gebruiken. Jij komt even
          buiten, zij ook.
        </p>
      </header>

      <div className="chips" role="group" aria-label="Filter honden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="chip"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="dog-list" aria-label="Honden">
        {dogs.map((dog) => (
          <li key={dog.id}>
            <DogCard dog={dog} onOpen={onOpenDog} />
          </li>
        ))}
      </ul>
    </div>
  )
}
