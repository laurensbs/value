import { useEffect, useRef, useState } from 'react'
import type { Dog } from '../data/dogs'
import { DogFace } from '../components/DogFace'
import { Icon } from '../components/Icon'

export const SAFETY_RULES = [
  'De eerste keer loop je samen met de eigenaar of iemand van de opvang.',
  'Je laat iemand die je vertrouwt weten waar en wanneer je wandelt.',
  'De hond blijft aan de lijn, tenzij de eigenaar iets anders met je afspreekt.',
]

interface Props {
  dog: Dog
  slot: string
  firstMeet: boolean
  safetyAccepted: boolean
  onAcceptSafety: () => void
  onConfirm: () => void
  onClose: () => void
  onDone: () => void
}

type Step = 'safety' | 'confirm' | 'sent'

export function PlanSheet(props: Props) {
  const { dog, slot, firstMeet, safetyAccepted, onAcceptSafety, onConfirm, onClose, onDone } = props
  const [step, setStep] = useState<Step>(safetyAccepted ? 'confirm' : 'safety')
  const [adult, setAdult] = useState<'ja' | 'nee' | null>(null)
  const [rules, setRules] = useState<boolean[]>(SAFETY_RULES.map(() => false))
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canContinue = adult === 'ja' && rules.every(Boolean)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-button sheet-close" onClick={onClose} aria-label="Sluiten">
          <Icon name="close" />
        </button>

        {step === 'safety' && (
          <>
            <p className="eyebrow">Voor je eerste rondje</p>
            <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
              Drie afspraken, zodat het voor iedereen fijn blijft
            </h2>

            <fieldset className="age">
              <legend>Ben je 18 jaar of ouder?</legend>
              <div className="segmented">
                <label>
                  <input
                    id="age-yes"
                    type="radio"
                    name="age"
                    checked={adult === 'ja'}
                    onChange={() => setAdult('ja')}
                  />
                  <span>Ja</span>
                </label>
                <label>
                  <input
                    id="age-no"
                    type="radio"
                    name="age"
                    checked={adult === 'nee'}
                    onChange={() => setAdult('nee')}
                  />
                  <span>Nee</span>
                </label>
              </div>
            </fieldset>

            {adult === 'nee' ? (
              <div className="notice calm">
                <p>
                  Rondje is voorlopig voor wandelaars vanaf 18 jaar. Veel dierenopvangen hebben wel
                  plekken voor jongere vrijwilligers samen met een ouder.
                </p>
                <p>
                  Wil je met iemand praten? De Kindertelefoon is gratis en anoniem:{' '}
                  <strong className="selectable">0800-0432</strong>.
                </p>
              </div>
            ) : (
              <ul className="rules">
                {SAFETY_RULES.map((rule, i) => (
                  <li key={rule}>
                    <label className="check">
                      <input
                        id={`rule-${i}`}
                        type="checkbox"
                        checked={rules[i]}
                        onChange={(e) => setRules(rules.map((r, j) => (j === i ? e.target.checked : r)))}
                      />
                      <span className="box" aria-hidden="true">
                        <Icon name="check" size={16} />
                      </span>
                      <span>{rule}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="button primary wide"
              disabled={!canContinue}
              onClick={() => {
                onAcceptSafety()
                setStep('confirm')
              }}
            >
              Ik doe mee
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="eyebrow">{firstMeet ? 'Kennismaking' : 'Rondje plannen'}</p>
            <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
              {firstMeet ? `Kennismaken met ${dog.name}` : `Rondje met ${dog.name}`}
            </h2>
            <div className="summary-card">
              <DogFace look={dog.look} size={64} />
              <dl>
                <div>
                  <dt>Wanneer</dt>
                  <dd>{slot}</dd>
                </div>
                <div>
                  <dt>Waar</dt>
                  <dd>{dog.meetPoint}</dd>
                </div>
                <div>
                  <dt>Duur</dt>
                  <dd>ongeveer {dog.walkMinutes} minuten</dd>
                </div>
              </dl>
            </div>
            <p className="muted">
              {dog.host.kind === 'opvang'
                ? `${dog.host.name} krijgt je aanvraag en bevestigt meestal binnen een dag.`
                : `${dog.host.name.split(',')[0]} krijgt je aanvraag. Rondje stuurt nooit je adres of telefoonnummer mee.`}
            </p>
            <button
              type="button"
              className="button primary wide"
              onClick={() => {
                onConfirm()
                setStep('sent')
              }}
            >
              Verstuur aanvraag
            </button>
          </>
        )}

        {step === 'sent' && (
          <div className="sent">
            <span className="sent-badge" aria-hidden="true">
              <Icon name="check" size={34} />
            </span>
            <h2 id="sheet-title" ref={headingRef} tabIndex={-1}>
              Aanvraag verstuurd
            </h2>
            <p className="muted">
              {dog.name} staat in je rondjes voor {slot.toLowerCase()}. In dit prototype is de aanvraag
              meteen bevestigd.
            </p>
            <button type="button" className="button primary wide" onClick={onDone}>
              Naar mijn rondjes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
