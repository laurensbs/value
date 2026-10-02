'use client'

import { useMemo, useState, useTransition } from 'react'
import { STATUS_LABELS, type HubSettings, type MailTemplate, type PartnerStatus } from '@/lib/hub/content'
import { blanksIn, fillTemplate, gmailHref, mailtoHref, outlookHref } from '@/lib/hub/game'
import { markFollowedUp, setPartnerStatus } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

export interface ComposerPartner {
  id: string
  name: string
  generic: boolean
  email: string
  contact: string
  template: string
  status: PartnerStatus
}

interface Props {
  templates: MailTemplate[]
  partners: ComposerPartner[]
  settings: HubSettings
  initialTemplate: string
  initialPartner: string | null
}

const HINTS: Record<string, string> = {
  '[stad]': 'Vul je stad in bij Jij',
  '[wijk]': 'Vul je pilotwijk in bij Jij',
  '[organisatie]': 'Vul de naam van de organisatie in',
}

/**
 * Puts a mail together from a template, your details and the partner. You read it, change what
 * you like and send it from your own mail app. The hub never sends anything itself.
 */
export function MailComposer({ templates, partners, settings, initialTemplate, initialPartner }: Props) {
  const [partnerId, setPartnerId] = useState(initialPartner ?? '')
  const partner = partners.find((p) => p.id === partnerId) ?? null
  const [templateId, setTemplateId] = useState(initialTemplate)
  const template = templates.find((t) => t.id === templateId) ?? templates[0]
  const [short, setShort] = useState(false)
  const [to, setTo] = useState(partner?.email ?? '')
  const [naam, setNaam] = useState(partner?.contact ?? '')
  const [pending, start] = useTransition()

  const vars = useMemo(() => {
    const original = templates.find((t) => t.id === (partner?.template ?? 'welzijn'))
    return {
      naam,
      organisatie: partner && !partner.generic ? partner.name : '',
      jouwNaam: settings.jouwNaam,
      telefoon: settings.telefoon,
      website: settings.website,
      stad: settings.stad,
      wijk: settings.wijk,
      onderwerp: original ? fillTemplate(original.subject, { stad: settings.stad, wijk: settings.wijk }) : 'Rondje',
    }
  }, [naam, partner, settings, templates])

  const filled = useMemo(
    () => ({
      subject: fillTemplate(template.subject, vars),
      body: fillTemplate(short && template.short ? template.short : template.body, vars),
    }),
    [template, vars, short],
  )
  // Your own edits win until you pick another mail or partner.
  const [edit, setEdit] = useState<{ key: string; subject: string; body: string } | null>(null)
  const key = `${template.id}:${partnerId}:${short}:${naam}`
  const subject = edit?.key === key ? edit.subject : filled.subject
  const body = edit?.key === key ? edit.body : filled.body
  const blanks = blanksIn(`${subject}\n${body}`)

  function pickPartner(id: string) {
    const p = partners.find((x) => x.id === id) ?? null
    setPartnerId(id)
    setTo(p?.email ?? '')
    setNaam(p?.contact ?? '')
    if (p && templateId !== 'opvolgen') setTemplateId(p.template)
    setEdit(null)
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${what} gekopieerd`)
    } catch {
      toast('Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.')
    }
  }

  async function share() {
    if (!('share' in navigator)) return copy(`${subject}\n\n${body}`, 'Mail')
    try {
      await navigator.share({ title: subject, text: body })
    } catch {
      // Closing the share sheet is fine.
    }
  }

  function sent() {
    if (!partner) return
    start(async () => {
      if (template.id === 'opvolgen') {
        const r = await markFollowedUp(partner.id)
        toast(r.ok ? `Opgevolgd: ${partner.name}` : 'Dat lukte niet.')
        return
      }
      const r = await setPartnerStatus(partner.id, 'gemaild')
      toast(r.ok ? `${partner.name}: gemaild` : 'Dat lukte niet.', r.xp ?? 0)
    })
  }

  const message = { to, subject, body }

  return (
    <div className="hub-mail card">
      <div className="grid-2">
        <label className="field">
          <span>Voor wie?</span>
          <select className="select" value={partnerId} onChange={(e) => pickPartner(e.target.value)}>
            <option value="">Niemand in het bijzonder</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Welke mail?</span>
          <select
            className="select"
            value={template.id}
            onChange={(e) => {
              setTemplateId(e.target.value)
              setShort(false)
              setEdit(null)
            }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Aan</span>
          <input className="input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="naam@organisatie.nl" />
        </label>
        <label className="field">
          <span>
            Naam contactpersoon <span className="hint">(voor &lsquo;Beste ...&rsquo;)</span>
          </span>
          <input className="input" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Leeg: Beste medewerker" />
        </label>
      </div>

      <p className="muted small">
        <b>Voor:</b> {template.audience}
      </p>

      {template.short ? (
        <div className="choices" role="group" aria-label="Lengte">
          <button type="button" className={`chip${short ? '' : ' on'}`} aria-pressed={!short} onClick={() => setShort(false)}>
            Mail
          </button>
          <button type="button" className={`chip${short ? ' on' : ''}`} aria-pressed={short} onClick={() => setShort(true)}>
            Kort (WhatsApp of DM)
          </button>
        </div>
      ) : null}

      <label className="field">
        <span>Onderwerp</span>
        <input className="input" value={subject} onChange={(e) => setEdit({ key, subject: e.target.value, body })} />
      </label>
      <label className="field">
        <span>Tekst</span>
        <textarea className="textarea" value={body} onChange={(e) => setEdit({ key, subject, body: e.target.value })} />
      </label>

      {blanks.length ? (
        <div className="notice warn small">
          <HubIcon name="edit" size={18} />
          <div className="stack-s">
            <span>Nog invullen voor je verstuurt:</span>
            <div className="hub-blanks">
              {blanks.map((b) => (
                <span key={b} className="pill warn" title={HINTS[b]}>
                  {b}
                </span>
              ))}
            </div>
            {blanks.some((b) => b === '[stad]' || b === '[wijk]') ? <span>Tip: vul je stad en wijk één keer in bij Jij, dan staan ze in elke mail.</span> : null}
          </div>
        </div>
      ) : null}

      <div className="hub-actions">
        <a className="button primary" href={mailtoHref(message)}>
          <HubIcon name="mail" size={18} /> Open in Mail
        </a>
        <button type="button" className="button secondary" onClick={() => copy(`${subject}\n\n${body}`, 'Mail')}>
          <HubIcon name="copy" size={18} /> Kopieer alles
        </button>
        <button type="button" className="button ghost" onClick={() => copy(body, 'Tekst')}>
          Alleen tekst
        </button>
        {short ? (
          <a className="button ghost" href={`https://wa.me/?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        ) : null}
        <a className="button ghost" href={gmailHref(message)} target="_blank" rel="noopener noreferrer">
          Gmail
        </a>
        <a className="button ghost" href={outlookHref(message)} target="_blank" rel="noopener noreferrer">
          Outlook
        </a>
        <button type="button" className="button ghost" onClick={share}>
          <HubIcon name="share" size={18} /> Deel
        </button>
      </div>

      {partner ? (
        <div className="notice success">
          <HubIcon name="check" size={18} />
          <div className="stack-s">
            <span>
              {template.id === 'opvolgen'
                ? `Opvolgmail verstuurd naar ${partner.name}? Dan begint de week opnieuw.`
                : partner.status === 'doel'
                  ? `Verstuurd? Zet ${partner.name} op gemaild. Over een week herinnert de hub je eraan als er geen antwoord is.`
                  : `${partner.name} staat al op ‘${STATUS_LABELS[partner.status].toLowerCase()}’.`}
            </span>
            {template.id === 'opvolgen' || partner.status === 'doel' ? (
              <div>
                <button type="button" className="button primary small" onClick={sent} disabled={pending}>
                  {template.id === 'opvolgen' ? 'Opvolging verstuurd' : 'Verstuurd'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
