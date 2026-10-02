'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import { PARTNER_STATUSES, PARTNER_TYPES, STATUS_LABELS, type PartnerStatus } from '@/lib/hub/content'
import type { PartnerView } from '@/lib/hub/game'
import { removePartner, savePartnerDetails, setPartnerStatus } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

const STATUS_PILL: Record<PartnerStatus, string> = {
  doel: '',
  gemaild: 'blue',
  reactie: 'ball',
  gesprek: 'ball',
  partner: 'green',
  nee: '',
}

interface Props {
  partner: PartnerView
  /** "Gemaild 3 dagen geleden", worked out on the server. */
  lastContact: string | null
  followUpDue: boolean
}

export function PartnerCard({ partner, lastContact, followUpDue }: Props) {
  const [status, setStatus] = useOptimistic(partner.state.status)
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function move(next: PartnerStatus) {
    if (next === status) return
    start(async () => {
      setStatus(next)
      const r = await setPartnerStatus(partner.id, next)
      if (!r.ok) toast('Dat lukte niet.')
      else toast(`${partner.name}: ${STATUS_LABELS[next].toLowerCase()}`, r.xp ?? 0)
    })
  }

  return (
    <li className="hub-item">
      <div className="hub-item-head">
        <div className="stack-s" style={{ gap: 4 }}>
          <h3>{partner.name}</h3>
          <div className="row" style={{ gap: 6 }}>
            <span className="pill">{PARTNER_TYPES[partner.type]}</span>
            {partner.city ? <span className="pill">{partner.city}</span> : null}
            {partner.generic ? <span className="pill blue">Zoek er een in je buurt</span> : null}
          </div>
        </div>
        <span className={`pill ${STATUS_PILL[status]}`}>{STATUS_LABELS[status]}</span>
      </div>

      {partner.why ? (
        <p className="small">
          <b>Waarom:</b> {partner.why}
          <br />
          <b>Je vraagt:</b> {partner.ask}
        </p>
      ) : null}
      {partner.state.note ? <p className="small muted">{partner.state.note}</p> : null}
      {lastContact ? (
        <p className="small muted">
          {lastContact}
          {followUpDue ? (
            <>
              {' '}
              · <b style={{ color: 'var(--warn)' }}>tijd om op te volgen</b>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="hub-steps" role="group" aria-label={`Status van ${partner.name}`}>
        {PARTNER_STATUSES.map((s) => (
          <button key={s} type="button" className={`hub-step${s === 'nee' ? ' is-no' : ''}`} aria-pressed={status === s} onClick={() => move(s)} disabled={pending}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="hub-actions">
        <Link href={`/hub/mails?p=${partner.id}${followUpDue ? '&t=opvolgen' : ''}`} className="button primary small">
          <HubIcon name="mail" size={16} /> {followUpDue ? 'Opvolgmail' : 'Mail klaarzetten'}
        </Link>
        {partner.website ? (
          <a href={partner.website} target="_blank" rel="noopener noreferrer" className="button ghost small">
            Website <HubIcon name="arrow" size={14} />
          </a>
        ) : null}
        <button type="button" className="button ghost small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <HubIcon name="edit" size={15} /> Gegevens
        </button>
      </div>

      {open ? (
        <form
          className="form"
          action={(form) =>
            start(async () => {
              const r = await savePartnerDetails(partner.id, form)
              if (r.ok) {
                setError(null)
                setOpen(false)
                toast('Opgeslagen')
              } else setError(r.error === 'email' ? 'Dat e-mailadres klopt niet.' : 'Opslaan lukte niet.')
            })
          }
        >
          <div className="grid-2">
            <label className="field">
              <span>Contactpersoon</span>
              <input className="input" name="contact" defaultValue={partner.state.contact ?? ''} placeholder="Bijvoorbeeld Anna de Vries" maxLength={120} />
            </label>
            <label className="field">
              <span>E-mailadres</span>
              <input className="input" name="email" type="email" defaultValue={partner.state.email ?? partner.email ?? ''} maxLength={200} />
            </label>
          </div>
          <label className="field">
            <span>Notitie</span>
            <textarea className="textarea" name="note" defaultValue={partner.state.note ?? ''} maxLength={2000} placeholder="Wat is er gezegd, wat is de volgende stap?" />
          </label>
          {error ? <p className="notice danger small">{error}</p> : null}
          <div className="hub-actions">
            <button className="button primary small" disabled={pending}>
              Opslaan
            </button>
            {partner.custom ? (
              <button
                type="button"
                className="button ghost small"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!window.confirm(`${partner.name} van je lijst halen?`)) return
                    const r = await removePartner(partner.id)
                    toast(r.ok ? 'Van je lijst gehaald' : 'Dat lukte niet.')
                  })
                }
              >
                <HubIcon name="trash" size={15} /> Van lijst
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </li>
  )
}
