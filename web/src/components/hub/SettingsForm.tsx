'use client'

import { useActionState } from 'react'
import type { HubSettings } from '@/lib/hub/content'
import { saveSettings } from '@/server/actions/hub'
import { toast } from './HubToasts'

/** Your details for every mail, and the weekly rhythm the hub counts towards. */
export function SettingsForm({ initial }: { initial: HubSettings }) {
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveSettings>> | null, form: FormData) => {
    const r = await saveSettings(prev, form)
    if (r.ok) toast('Opgeslagen. Je mails zijn bijgewerkt.')
    return r
  }, null)

  return (
    <form className="form card" action={action}>
      <h2>In je mails</h2>
      <div className="grid-2">
        <label className="field">
          <span>Je naam</span>
          <input className="input" name="jouwNaam" required maxLength={80} defaultValue={initial.jouwNaam} autoComplete="name" />
        </label>
        <label className="field">
          <span>Telefoon</span>
          <input className="input" name="telefoon" type="tel" maxLength={30} defaultValue={initial.telefoon} autoComplete="tel" />
        </label>
        <label className="field">
          <span>
            E-mailadres <span className="hint">Alleen voor jezelf, het staat niet in de mails.</span>
          </span>
          <input className="input" name="email" type="email" maxLength={200} defaultValue={initial.email} autoComplete="email" />
        </label>
        <label className="field">
          <span>Website</span>
          <input className="input" name="website" maxLength={120} defaultValue={initial.website} placeholder="goedrondje.nl" />
        </label>
        <label className="field">
          <span>Stad</span>
          <input className="input" name="stad" maxLength={80} defaultValue={initial.stad} placeholder="Utrecht" />
        </label>
        <label className="field">
          <span>Pilotwijk</span>
          <input className="input" name="wijk" maxLength={80} defaultValue={initial.wijk} placeholder="Lombok" />
        </label>
      </div>
      <h2>Je ritme</h2>
      <div className="grid-2">
        <label className="field">
          <span>Mails per week</span>
          <input className="input" name="mailsPerWeek" type="number" min={0} max={30} defaultValue={initial.mailsPerWeek} />
        </label>
        <label className="field">
          <span>Video&rsquo;s per week</span>
          <input className="input" name="videosPerWeek" type="number" min={0} max={14} defaultValue={initial.videosPerWeek} />
        </label>
      </div>
      {state && !state.ok ? <p className="notice danger small">Kijk {state.error === 'email' ? 'je e-mailadres' : 'de velden'} na.</p> : null}
      <button className="button primary" disabled={pending}>
        Opslaan
      </button>
    </form>
  )
}
