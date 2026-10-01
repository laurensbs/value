import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'

interface Props {
  onClose: () => void
}

/** Lets anyone sign up a dog: their own, or one of a relative or neighbour. */
export function SignupSheet({ onClose }: Props) {
  const [sent, setSent] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [sent])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-button sheet-close" onClick={onClose} aria-label="Sluiten">
          <Icon name="close" />
        </button>

        {sent ? (
          <div className="sent">
            <span className="sent-badge" aria-hidden="true">
              <Icon name="check" size={34} />
            </span>
            <h2 id="signup-title" ref={headingRef} tabIndex={-1}>
              Bedankt voor het aanmelden
            </h2>
            <p className="muted" role="status">
              In de pilot belt de coördinator binnen twee dagen voor een kennismaking. In dit prototype
              wordt niets verstuurd.
            </p>
            <button type="button" className="button primary wide" onClick={onClose}>
              Terug naar de honden
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Hond aanmelden</p>
            <h2 id="signup-title" ref={headingRef} tabIndex={-1}>
              Ken je een hond die vaker naar buiten wil?
            </h2>
            <p className="muted">
              Van jezelf, je oma of de buurman. De eigenaar hoeft de app niet te gebruiken: we bellen eerst
              en komen langs voor een kennismaking.
            </p>
            <form className="form" onSubmit={submit}>
              <label htmlFor="su-dog">
                Naam van de hond
                <input id="su-dog" name="dog" required autoComplete="off" placeholder="Bijvoorbeeld Saar" />
              </label>
              <label htmlFor="su-area">
                Wijk of postcode
                <input id="su-area" name="area" required autoComplete="postal-code" placeholder="3581 of Wittevrouwen" />
              </label>
              <fieldset className="radio-row">
                <legend>Voor wie meld je aan?</legend>
                <label>
                  <input id="su-self" type="radio" name="for" value="zelf" defaultChecked /> Mijn eigen hond
                </label>
                <label>
                  <input id="su-other" type="radio" name="for" value="ander" /> Voor iemand anders
                </label>
              </fieldset>
              <label htmlFor="su-phone">
                Telefoonnummer voor het kennismakingsgesprek
                <input id="su-phone" name="phone" type="tel" required autoComplete="tel" placeholder="06 12345678" />
              </label>
              <p className="privacy-line">
                <Icon name="lock" size={14} />
                Alleen de coördinator ziet dit nummer. Het komt nooit in de app te staan.
              </p>
              <button type="submit" className="button primary wide">
                Meld aan
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
