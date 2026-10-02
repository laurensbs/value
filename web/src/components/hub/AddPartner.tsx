'use client'

import { useRef, useState, useTransition } from 'react'
import { PARTNER_TYPES } from '@/lib/hub/content'
import { addPartner, addShelterTarget } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

/** Add an organisation you thought of yourself. It starts as a goal. */
export function AddPartner() {
  const [pending, start] = useTransition()
  const [error, setError] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={form}
      className="form card"
      action={(data) =>
        start(async () => {
          const r = await addPartner(data)
          setError(!r.ok)
          if (r.ok) {
            form.current?.reset()
            toast('Op je lijst gezet, als doel')
          }
        })
      }
    >
      <h3>Zelf iemand toevoegen</h3>
      <div className="grid-2">
        <label className="field">
          <span>Naam</span>
          <input className="input" name="name" required minLength={2} maxLength={120} placeholder="Bijvoorbeeld Buurthuis De Pijp" />
        </label>
        <label className="field">
          <span>Soort</span>
          <select className="select" name="type" defaultValue="welzijn">
            {Object.entries(PARTNER_TYPES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Plaats</span>
          <input className="input" name="city" maxLength={80} />
        </label>
        <label className="field">
          <span>E-mailadres</span>
          <input className="input" name="email" type="email" maxLength={200} />
        </label>
      </div>
      <label className="field">
        <span>Website</span>
        <input className="input" name="website" type="url" maxLength={200} placeholder="https://" />
      </label>
      {error ? <p className="notice danger small">Vul een naam in, en een geldig e-mailadres als je er een invult.</p> : null}
      <button className="button primary" disabled={pending}>
        <HubIcon name="plus" size={18} /> Toevoegen
      </button>
    </form>
  )
}

export function AddShelterButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className="button secondary small"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await addShelterTarget(id)
          toast(r.ok ? `${name} staat op je lijst` : 'Dat lukte niet.')
        })
      }
    >
      <HubIcon name="plus" size={15} /> Op mijn lijst
    </button>
  )
}
