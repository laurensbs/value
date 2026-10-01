import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'

const PILOT_STEPS = [
  {
    title: 'Intake',
    text: 'De coördinator belt elke eigenaar en wandelaar tien minuten. Eigenaren hoeven zelf geen app te gebruiken.',
  },
  {
    title: 'Kennismaking',
    text: 'De eerste wandeling is altijd samen met de eigenaar of iemand van de opvang. Daarna kiest het koppel of het verder wil.',
  },
  {
    title: 'Vast rondje',
    text: 'Eén vast moment per week. Dezelfde hond, dezelfde wandelaar, en vaak een kop thee na afloop.',
  },
  {
    title: 'Meting na 8 weken',
    text: 'Korte vragenlijsten voor wandelaars en eigenaren. U krijgt een rapport per wijk, zonder namen.',
  },
]

const MEASURES = [
  { what: 'Eenzaamheid', how: 'Korte De Jong Gierveld-schaal, bij de start en na 8 weken' },
  { what: 'Stemming', how: 'Eén tik voor en na een rondje. Blijft op de telefoon, tenzij de wandelaar het deelt.' },
  { what: 'Beweging', how: 'Minuten buiten per week' },
  { what: 'Eigenaar', how: 'Gevoel van steun en sociaal contact, via een belletje van de coördinator' },
  { what: 'Hond', how: 'Extra wandelingen. Bij opvangen ook gedrag in de kennel en tijd tot adoptie.' },
]

const SAFETY = [
  'Wandelaars vanaf 18 jaar, met een intakegesprek',
  'De eerste wandeling altijd samen',
  'Honden ingedeeld op niveau, de opvang beslist mee',
  'De WA-verzekering van de eigenaar dekt de hond',
  'Een verklaring omtrent gedrag (VOG) voor wandelaars die bij kwetsbare ouderen thuiskomen',
  'Hulplijnen altijd één tik weg in de app',
]

const EXAMPLE_REPORT = [
  { value: '12', label: 'vaste koppels' },
  { value: '86', label: 'rondjes deze maand' },
  { value: '9/11', label: 'eigenaren meer contact' },
]

export function OrgPage({ onBack }: { onBack: () => void }) {
  const [asked, setAsked] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="screen org">
      <div className="org-top">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Terug">
          <Icon name="back" />
        </button>
      </div>

      <header className="intro compact">
        <p className="eyebrow">Voor organisaties</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Jong en oud samen, <mark>met de hond als reden.</mark>
        </h1>
        <p className="lede">
          Voor welzijnswerk, dierenopvangen en gemeenten. U brengt vertrouwen en contacten in de wijk.
          Rondje regelt de werving van jongeren, de koppeling en de meting.
        </p>
      </header>

      <section className="block" aria-labelledby="pilot-title">
        <h2 id="pilot-title" className="section-title">
          Zo loopt een pilot van 8 weken
        </h2>
        <ol className="timeline">
          {PILOT_STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="block" aria-labelledby="report-title">
        <h2 id="report-title" className="section-title">
          Wat u terugkrijgt
        </h2>
        <div className="report">
          <p className="report-label">Voorbeeld van een wijkrapport · geen echte cijfers</p>
          <div className="tags">
            {EXAMPLE_REPORT.map((r) => (
              <div className="tag" key={r.label}>
                <span className="tag-value">{r.value}</span>
                <span className="tag-label">{r.label}</span>
              </div>
            ))}
          </div>
          <dl className="measures">
            {MEASURES.map((m) => (
              <div key={m.what}>
                <dt>{m.what}</dt>
                <dd>{m.how}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="block" aria-labelledby="safety-title">
        <h2 id="safety-title" className="section-title">
          Veiligheid
        </h2>
        <ul className="red-lines">
          {SAFETY.map((s) => (
            <li key={s}>
              <Icon name="shield" size={16} />
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="owner-cta" aria-labelledby="org-cta-title">
        <h2 id="org-cta-title">Een pilot in uw wijk?</h2>
        <p>Voor de eerste pilots zijn er geen kosten. We zoeken samen naar financiering voor daarna, bijvoorbeeld via Eén tegen eenzaamheid of een fonds.</p>
        {asked ? (
          <p role="status" className="org-thanks">
            <Icon name="check" size={18} />
            Genoteerd. In dit prototype wordt niets verstuurd.
          </p>
        ) : (
          <button type="button" className="button primary small" onClick={() => setAsked(true)}>
            Plan een kennismaking
          </button>
        )}
      </section>
    </div>
  )
}
