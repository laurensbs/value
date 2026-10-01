import { Logo } from './Logo'

const FACTS = [
  {
    value: '23%',
    text: 'van de 16- tot 25-jarigen voelt zich sterk eenzaam.',
    source: 'GGD Gezondheidsmonitor Jongvolwassenen 2024',
  },
  {
    value: '14',
    text: 'gerandomiseerde onderzoeken: contact met honden verlaagt stress en angst op korte termijn.',
    source: 'Meta-analyse, BMC 2025',
  },
  {
    value: '5.500+',
    text: 'senioren zijn via OOPOEH gekoppeld aan een huisdier in de buurt. Het model werkt, maar alleen voor 55+.',
    source: 'OOPOEH / PwC impactmeting',
  },
]

/** Shown next to the app on wide screens: what Rondje is and why. */
export function ConceptPanel() {
  return (
    <aside className="concept" aria-label="Over dit prototype">
      <div className="concept-brand">
        <Logo size={44} />
        <span>Rondje</span>
      </div>
      <h1>
        Een vast rondje met een hond <mark>die op je wacht.</mark>
      </h1>
      <p className="concept-lede">
        Rondje koppelt jongvolwassenen aan honden van buurtgenoten die zelf niet ver meer kunnen lopen, en aan
        honden uit de opvang. Gratis, veilig en goed voor allebei.
      </p>
      <ul className="facts-list">
        {FACTS.map((f) => (
          <li key={f.value}>
            <span className="fact-value">{f.value}</span>
            <span className="fact-text">
              {f.text}
              <span className="fact-source">{f.source}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="concept-note">Prototype met voorbeelddata. Honden, mensen en opvangen zijn verzonnen.</p>
    </aside>
  )
}
