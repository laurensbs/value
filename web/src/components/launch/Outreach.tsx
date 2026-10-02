'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react'
import { Icon } from '@/components/Icon'
import { deleteContact, setContactStatus } from '@/server/actions/launch'
import { ContactForm } from './ContactForm'
import { clipboardText, fillTemplate, isEmail, mailtoHref, placeholdersIn, segments, type Placeholder, type Values } from './mail'
import { AUDIENCES, CONTACT_STATUSES, type Audience, type ContactJson, type ContactStatus } from './audiences'
import { MAIL_KINDS, templatesFor, type Template } from './templates'

/** The fields in a sensible order: about the recipient first, then about you. */
const FIELD_ORDER: Placeholder[] = ['naam', 'organisatie', 'stad', 'datum', 'dagen', 'afzender', 'telefoon', 'link']

interface Defaults {
  app: string
  link: string
  afzender: string
}

/**
 * The message bank and the contact list. Rondje never sends anything: "Open in mail" opens the
 * admin's own mail app with the text ready, and a contact's status only changes by their own click.
 */
export function Outreach({ contacts, defaults }: { contacts: ContactJson[]; defaults: Defaults }) {
  const [audience, setAudience] = useState<Audience>('shelter')
  const [templateId, setTemplateId] = useState(templatesFor('shelter')[0].id)
  const [contactId, setContactId] = useState('')
  const [values, setValues] = useState<Values>({ afzender: defaults.afzender, link: defaults.link })
  const composer = useRef<HTMLDivElement>(null)

  function chooseAudience(next: Audience) {
    setAudience(next)
    setTemplateId(templatesFor(next)[0].id)
    setContactId('')
  }

  function chooseContact(id: string) {
    setContactId(id)
    const c = contacts.find((x) => x.id === id)
    if (c) setValues((v) => ({ ...v, naam: c.name, organisatie: c.organisation, stad: c.city }))
  }

  function writeTo(c: ContactJson) {
    setAudience(c.audience)
    setTemplateId(templatesFor(c.audience)[0].id)
    setContactId(c.id)
    setValues((v) => ({ ...v, naam: c.name, organisatie: c.organisation, stad: c.city }))
    composer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="stack-l">
      <div ref={composer} className="launch-anchor">
        <Composer
          audience={audience}
          templateId={templateId}
          contact={contacts.find((c) => c.id === contactId) ?? null}
          contacts={contacts.filter((c) => c.audience === audience)}
          values={values}
          defaults={defaults}
          onAudience={chooseAudience}
          onTemplate={setTemplateId}
          onContact={chooseContact}
          onValue={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
        />
      </div>
      <Contacts contacts={contacts} onWrite={writeTo} />
    </div>
  )
}

function Composer({
  audience,
  templateId,
  contact,
  contacts,
  values,
  defaults,
  onAudience,
  onTemplate,
  onContact,
  onValue,
}: {
  audience: Audience
  templateId: string
  contact: ContactJson | null
  contacts: ContactJson[]
  values: Values
  defaults: Defaults
  onAudience: (a: Audience) => void
  onTemplate: (id: string) => void
  onContact: (id: string) => void
  onValue: (key: Placeholder, value: string) => void
}) {
  const t = useTranslations('launch')
  const templates = templatesFor(audience)
  const template: Template = templates.find((x) => x.id === templateId) ?? templates[0]
  const used = placeholdersIn(template.subject, template.body)
  const fields = FIELD_ORDER.filter((p) => used.includes(p))
  const langs = [...new Set(templates.map((x) => x.lang))]
  const kinds = [...new Set(templates.filter((x) => x.lang === template.lang).map((x) => x.kind))]
  const pick = (lang: Template['lang'], kind: Template['kind']) =>
    onTemplate((templates.find((x) => x.lang === lang && x.kind === kind) ?? templates.find((x) => x.lang === lang) ?? template).id)
  const filled = { ...values, app: defaults.app }
  const subject = fillTemplate(template.subject, filled)
  const body = fillTemplate(template.body, filled)
  const missing = placeholdersIn(subject, body)
  const isMail = MAIL_KINDS.includes(template.kind)
  const [copied, setCopied] = useState(false)
  const [opened, setOpened] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function copy() {
    const text = clipboardText(subject, body)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Older browsers or a page without clipboard permission: copy through a hidden text field.
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="stack" aria-labelledby="launch-composer-title">
      <div className="stack-s">
        <h2 id="launch-composer-title">{t('composer.title')}</h2>
        <p className="muted small">{t('composer.hint')}</p>
      </div>

      <div className="launch-chips" role="group" aria-label={t('composer.audience')}>
        {AUDIENCES.map((a) => (
          <button key={a} type="button" className="launch-chip" aria-pressed={a === audience} onClick={() => onAudience(a)}>
            {t(`audience.${a}`)}
          </button>
        ))}
      </div>

      <div className="card stack launch-composer">
        <div className="launch-pickers">
          <div className="launch-chips small" role="group" aria-label={t('composer.template')}>
            {kinds.map((kind) => (
              <button key={kind} type="button" className="launch-chip" aria-pressed={kind === template.kind} onClick={() => pick(template.lang, kind)}>
                {t(`templateKind.${kind}`)}
              </button>
            ))}
          </div>
          {langs.length > 1 ? (
            <div className="launch-langs" role="group" aria-label={t('composer.language')}>
              {langs.map((lang) => (
                <button key={lang} type="button" aria-pressed={lang === template.lang} onClick={() => pick(lang, template.kind)}>
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {isMail ? (
          <label className="field">
            <span>{t('composer.to')}</span>
            <select className="select" value={contact?.id ?? ''} onChange={(e) => onContact(e.target.value)}>
              <option value="">{t('composer.toNone')}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.name, c.organisation].filter(Boolean).join(' · ')}
                  {c.email ? '' : ` (${t('composer.noEmailShort')})`}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {fields.length ? (
          <div className="launch-form-grid">
            {fields.map((key) => (
              <label key={key} className="field">
                <span>{t(`composer.fields.${key}`)}</span>
                <input className="input" value={values[key] ?? ''} onChange={(e) => onValue(key, e.target.value)} autoComplete="off" />
              </label>
            ))}
          </div>
        ) : null}

        <div className="launch-preview" aria-live="polite">
          <span className="eyebrow">{t('composer.preview')}</span>
          {isMail && contact?.email ? (
            <p className="small">
              <span className="muted">{t('composer.toLabel')}</span> {contact.email}
            </p>
          ) : null}
          {subject ? (
            <p className="launch-preview-subject">
              <Highlighted text={subject} />
            </p>
          ) : null}
          <p className="launch-preview-body">
            <Highlighted text={body} />
          </p>
        </div>

        {missing.length ? (
          <p className="notice warn small">{t('composer.missing', { fields: missing.map((m) => t(`composer.fields.${m}`)).join(', ') })}</p>
        ) : null}
        {isMail && contact && !isEmail(contact.email) ? <p className="muted small">{t('composer.noEmail')}</p> : null}

        <div className="row">
          {isMail ? (
            <a className="button primary" href={mailtoHref({ to: contact?.email, subject, body })} onClick={() => setOpened(contact?.id ?? null)}>
              <Icon name="share" size={18} /> {t('composer.openMail')}
            </a>
          ) : null}
          <button type="button" className={`button ${isMail ? 'secondary' : 'primary'}`} onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} size={18} /> {copied ? t('composer.copied') : t('composer.copy')}
          </button>
        </div>

        {opened && contact && opened === contact.id && contact.status === 'todo' ? (
          <div className="notice success small launch-sent-ask">
            <span>{t('composer.sentAsk')}</span>
            <button type="button" className="button primary small" disabled={pending} onClick={() => start(() => setContactStatus(contact.id, 'sent'))}>
              {t('composer.markSent')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {segments(text).map((part, i) =>
        part.placeholder ? (
          <mark key={i} className="launch-gap">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

function Contacts({ contacts, onWrite }: { contacts: ContactJson[]; onWrite: (c: ContactJson) => void }) {
  const t = useTranslations('launch')
  const [filter, setFilter] = useState<Audience | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const shown = filter === 'all' ? contacts : contacts.filter((c) => c.audience === filter)
  const counts = useMemo(
    () => Object.fromEntries(CONTACT_STATUSES.map((s) => [s, contacts.filter((c) => c.status === s).length])) as Record<ContactStatus, number>,
    [contacts],
  )

  return (
    <section className="stack" aria-labelledby="launch-contacts-title">
      <div className="stack-s">
        <div className="spread">
          <h2 id="launch-contacts-title">{t('contacts.title')}</h2>
          <button type="button" className="button secondary small" aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
            <Icon name={adding ? 'close' : 'plus'} size={16} /> {adding ? t('contacts.close') : t('contacts.add')}
          </button>
        </div>
        <p className="muted small">{t('contacts.hint')}</p>
        <p className="launch-status-counts small">
          {CONTACT_STATUSES.map((s) => (
            <span key={s} className={`launch-status-dot s-${s}`}>
              {t(`status.${s}`)} <strong>{counts[s]}</strong>
            </span>
          ))}
        </p>
      </div>

      {adding ? (
        <div className="card">
          <ContactForm audience={filter === 'all' ? 'shelter' : filter} />
        </div>
      ) : null}

      {contacts.length ? (
        <div className="launch-chips small" role="group" aria-label={t('contacts.filter')}>
          {(['all', ...AUDIENCES] as const).map((a) => {
            const n = a === 'all' ? contacts.length : contacts.filter((c) => c.audience === a).length
            if (a !== 'all' && n === 0) return null
            return (
              <button key={a} type="button" className="launch-chip" aria-pressed={filter === a} onClick={() => setFilter(a)}>
                {a === 'all' ? t('contacts.all') : t(`audience.${a}`)} <span className="launch-lang">{n}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="muted">{t('contacts.empty')}</p>
      )}

      <ul className="launch-contacts">
        {shown.map((c) => (
          <ContactCard key={c.id} contact={c} onWrite={() => onWrite(c)} />
        ))}
      </ul>
    </section>
  )
}

function ContactCard({ contact: c, onWrite }: { contact: ContactJson; onWrite: () => void }) {
  const t = useTranslations('launch')
  const format = useFormatter()
  const [status, setOptimistic] = useOptimistic<ContactStatus, ContactStatus>(c.status, (_, next) => next)
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [sure, setSure] = useState(false)
  const reached = CONTACT_STATUSES.indexOf(status)
  const title = c.name || c.organisation

  return (
    <li className="card launch-contact">
      <div className="spread">
        <div className="launch-contact-name">
          <strong>{title}</strong>
          <span className="muted small">{[c.name ? c.organisation : '', c.city].filter(Boolean).join(' · ')}</span>
        </div>
        <span className="pill blue">{t(`audience.${c.audience}`)}</span>
      </div>
      {c.email || c.phone ? <p className="small launch-contact-details">{[c.email, c.phone].filter(Boolean).join(' · ')}</p> : null}

      <div className="launch-steps" role="group" aria-label={t('contacts.statusLabel', { name: title })}>
        {CONTACT_STATUSES.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`launch-step${i < reached ? ' passed' : ''}`}
            aria-pressed={s === status}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setOptimistic(s)
                await setContactStatus(c.id, s)
              })
            }
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>

      {c.lastContactAt || c.note ? (
        <p className="muted small">
          {c.lastContactAt ? t('contacts.lastContact', { date: format.dateTime(new Date(c.lastContactAt), { day: 'numeric', month: 'short' }) }) : null}
          {c.lastContactAt && c.note ? ' · ' : null}
          {c.note}
        </p>
      ) : null}

      <div className="launch-contact-actions">
        <button type="button" className="button secondary small" onClick={onWrite}>
          <Icon name="edit" size={16} /> {t('contacts.write')}
        </button>
        <button type="button" className="button ghost small" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
          {editing ? t('contacts.close') : t('contacts.edit')}
        </button>
        {sure ? (
          <button type="button" className="button danger small" disabled={pending} onClick={() => start(() => deleteContact(c.id))}>
            {t('contacts.deleteConfirm')}
          </button>
        ) : (
          <button type="button" className="button ghost small launch-icon-button" aria-label={`${t('contacts.delete')}: ${title}`} title={t('contacts.delete')} onClick={() => setSure(true)}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
      {editing ? <ContactForm contact={c} onSaved={() => setEditing(false)} /> : null}
    </li>
  )
}
