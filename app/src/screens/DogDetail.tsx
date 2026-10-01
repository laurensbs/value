import { useEffect, useRef, useState } from 'react'
import { GROUP_SIZE, isGroupWalk, spotsLabel, type Dog } from '../data/dogs'
import { DogFace } from '../components/DogFace'
import { EnergyMeter, HostBadge } from '../components/DogCard'
import { tileStyle } from '../lib/tile'
import { Icon } from '../components/Icon'

interface Props {
  dog: Dog
  hasMet: boolean
  onBack: () => void
  onPlan: (slot: string) => void
}

export function DogDetail({ dog, hasMet, onBack, onPlan }: Props) {
  const [slot, setSlot] = useState(dog.slots[0])
  const headingRef = useRef<HTMLHeadingElement>(null)
  const group = isGroupWalk(dog)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="screen detail">
      <div className="detail-hero" style={tileStyle(dog.tile)}>
        <button type="button" className="icon-button back" onClick={onBack} aria-label="Terug naar alle honden">
          <Icon name="back" />
        </button>
        <svg className="detail-route" viewBox="0 0 320 120" aria-hidden="true" preserveAspectRatio="none">
          <path d="M-10 100 C 60 20, 120 120, 190 60 S 300 10, 330 40" />
        </svg>
        <DogFace look={dog.look} size={168} title={`Tekening van ${dog.name}`} />
      </div>

      <div className="detail-body">
        <div className="detail-title">
          <h1 ref={headingRef} tabIndex={-1}>
            {dog.name}
          </h1>
          <HostBadge dog={dog} />
        </div>
        <p className="dog-breed">
          {dog.breed}, {dog.age} jaar · {dog.area} · {dog.distanceKm.toLocaleString('nl-NL')} km
        </p>

        <p className="hand-note big">“{dog.note}”</p>

        <p className="story">{dog.story}</p>

        <section className="needs" aria-labelledby="needs-title">
          <h2 id="needs-title">Waarom dit rondje telt</h2>
          <p>{dog.needs}</p>
          <p className="needs-host">
            {dog.host.name} · {dog.host.detail}
          </p>
        </section>

        <dl className="facts">
          <div>
            <dt>Wandeling</dt>
            <dd>{dog.walkMinutes} min</dd>
          </div>
          <div>
            <dt>Energie</dt>
            <dd>
              <EnergyMeter energy={dog.energy} />
            </dd>
          </div>
          <div>
            <dt>Niveau</dt>
            <dd>{dog.level === 'starter' ? 'Voor iedereen' : 'Met ervaring'}</dd>
          </div>
        </dl>

        <ul className="traits" aria-label="Goed om te weten">
          {dog.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <section className="slots" aria-labelledby="slots-title">
          <h2 id="slots-title">
            {group ? 'Kies een groepswandeling' : hasMet ? 'Kies een moment' : 'Kies een moment om kennis te maken'}
          </h2>
          <div className="chips" role="radiogroup" aria-labelledby="slots-title">
            {dog.slots.map((s, i) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={slot === s}
                className="chip slot"
                onClick={() => setSlot(s)}
              >
                {s}
                {group && dog.groupSpots && (
                  <>
                    {' · '}
                    <span className="chip-note">{spotsLabel(dog.groupSpots[i])}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          {group ? (
            <p className="meet-note">
              <Icon name="shield" size={18} />
              <span>
                Je loopt in een groep van maximaal {GROUP_SIZE} wandelaars, met een begeleider van {dog.host.name}.
                Verzamelen bij <strong>{dog.meetPoint}</strong>.
              </span>
            </p>
          ) : (
            !hasMet && (
              <p className="meet-note">
                <Icon name="shield" size={18} />
                <span>
                  De eerste keer loop je samen. Afspreken bij: <strong>{dog.meetPoint}</strong>
                </span>
              </p>
            )
          )}
        </section>
      </div>

      <div className="sticky-action">
        <button type="button" className="button primary wide" onClick={() => onPlan(slot)}>
          {group
            ? hasMet
              ? `Plan groepswandeling met ${dog.name}`
              : `Loop mee met ${dog.name}`
            : hasMet
              ? `Plan rondje met ${dog.name}`
              : `Maak kennis met ${dog.name}`}
          <Icon name="arrow" size={20} />
        </button>
      </div>
    </div>
  )
}
