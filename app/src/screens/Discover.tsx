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

interface Props {
  onOpenDog: (id: string) => void
  onSignup: () => void
}

export function Discover({ onOpenDog, onSignup }: Props) {
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

      <ol className="how" aria-label="Zo werkt Rondje">
        <li>
          <span className="how-dot" aria-hidden="true">1</span>
          Kies een hond in de buurt
        </li>
        <li>
          <span className="how-dot" aria-hidden="true">2</span>
          Maak kennis, samen met de eigenaar
        </li>
        <li>
          <span className="how-dot" aria-hidden="true">3</span>
          Loop een vast rondje per week
        </li>
      </ol>

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

      <aside className="owner-cta" aria-labelledby="owner-cta-title">
        <h2 id="owner-cta-title">Ken je een hond die vaker naar buiten wil?</h2>
        <p>Van je oma, de buurman of jezelf. De eigenaar hoeft de app niet te gebruiken.</p>
        <button type="button" className="button primary small" onClick={onSignup}>
          Meld een hond aan
        </button>
      </aside>
    </div>
  )
}
