import { useState } from 'react'
import { Icon } from '../components/Icon'

interface Line {
  id: string
  when: string
  name: string
  number?: string
  detail: string
  site: string
  url: string
}

// Controleer deze gegevens voor elke publieke lancering (zie docs/DECISIONS.md).
const LINES: Line[] = [
  {
    id: '113',
    when: 'Denk je aan zelfdoding?',
    name: '113 Zelfmoordpreventie',
    number: '0800-0113',
    detail: 'Gratis, anoniem en dag en nacht bereikbaar. Je kunt ook 113 bellen.',
    site: '113.nl',
    url: 'https://www.113.nl',
  },
  {
    id: 'mind',
    when: 'Wil je met iemand praten?',
    name: 'MIND Hulplijn',
    number: '0900-1450',
    detail: 'Anoniem praten met psychologen en maatschappelijk werkers. Ook via chat.',
    site: 'wijzijnmind.nl',
    url: 'https://wijzijnmind.nl',
  },
  {
    id: 'injebol',
    when: 'Tussen 16 en 27?',
    name: 'In je bol',
    detail: 'Verhalen, tips en chat met mensen die luisteren. Gemaakt met en voor jongeren.',
    site: 'injebol.nl',
    url: 'https://injebol.nl',
  },
  {
    id: 'kt',
    when: 'Jonger dan 18?',
    name: 'De Kindertelefoon',
    number: '0800-0432',
    detail: 'Gratis en anoniem bellen of chatten.',
    site: 'kindertelefoon.nl',
    url: 'https://www.kindertelefoon.nl',
  },
]

function CopyNumber({ number }: { number: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        navigator.clipboard
          ?.writeText(number.replace(/-/g, ''))
          .then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1800)
          })
          .catch(() => setCopied(false))
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={15} />
      {copied ? 'Gekopieerd' : 'Kopieer'}
    </button>
  )
}

const RED_LINES = [
  'Gratis voor wandelaars en eigenaren.',
  'Geen advertenties, en we verkopen nooit gegevens.',
  'Je check-ins blijven op je eigen telefoon.',
  'Geen streaks of meldingen die je onder druk zetten.',
]

interface Props {
  onSignup: () => void
  onOpenOrg: () => void
}

export function Help({ onSignup, onOpenOrg }: Props) {
  return (
    <div className="screen help">
      <header className="intro compact">
        <p className="eyebrow">Hulp</p>
        <h1>Even niet oké?</h1>
        <p className="lede">
          Wandelen helpt veel mensen, maar het vervangt geen hulp. Hier kun je altijd terecht, gratis en
          anoniem. Bij direct gevaar bel je <strong className="selectable">112</strong>.
        </p>
      </header>

      <ul className="lines">
        {LINES.map((line) => (
          <li key={line.id} className="line">
            <p className="line-when">{line.when}</p>
            <h2 className="line-name">{line.name}</h2>
            <p className="line-detail">{line.detail}</p>
            <div className="line-actions">
              {line.number && (
                <span className="line-number">
                  <Icon name="phone" size={16} />
                  <span className="selectable">{line.number}</span>
                  <CopyNumber number={line.number} />
                </span>
              )}
              <a className="line-site" href={line.url} target="_blank" rel="noreferrer">
                <Icon name="chat" size={16} />
                {line.site}
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="disclaimer">
        <Icon name="shield" size={18} />
        Rondje is geen hulpverlening en stelt geen diagnoses. Merk je dat het langer niet goed gaat? Je
        huisarts kan met je meedenken.
      </p>

      <section className="block about" aria-labelledby="about-title">
        <h2 id="about-title" className="section-title">
          Over Rondje
        </h2>
        <p>
          Rondje koppelt jongvolwassenen aan honden die een extra wandeling goed kunnen gebruiken: van
          buurtgenoten die zelf niet ver meer kunnen lopen, en van de opvang. Jij komt buiten, de hond ook,
          en de eigenaar krijgt een vast gezicht aan de deur.
        </p>
        <ul className="red-lines">
          {RED_LINES.map((r) => (
            <li key={r}>
              <Icon name="check" size={16} />
              {r}
            </li>
          ))}
        </ul>
        <button type="button" className="link-button org-link" onClick={onOpenOrg}>
          Voor welzijnswerk, opvangen en gemeenten
          <Icon name="arrow" size={16} />
        </button>
      </section>

      <section className="block" aria-labelledby="signup-title">
        <h2 id="signup-title" className="section-title">
          Ken je een hond die vaker naar buiten wil?
        </h2>
        <p className="muted">Van jezelf, je oma of de buurman. Je mag ook iemand anders aanmelden.</p>
        <button type="button" className="button secondary" onClick={onSignup}>
          Meld een hond aan
        </button>
      </section>
    </div>
  )
}
