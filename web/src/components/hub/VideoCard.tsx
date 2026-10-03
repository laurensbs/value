'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { VIDEO_STATUSES, VIDEO_STATUS_LABELS, type VideoStatus } from '@/lib/hub/content'
import { addVideoIdea, removeVideoIdea, saveVideoDetails, setVideoStatus } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

interface Props {
  id: string
  title: string
  hook?: string
  why?: string
  effort?: 'laag' | 'midden'
  now?: boolean
  own: boolean
  status: VideoStatus
  link?: string
  note?: string
}

export function VideoCard({ id, title, hook, why, effort, now, own, status: saved, link, note }: Props) {
  const [status, setStatus] = useOptimistic(saved)
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)

  function move(next: VideoStatus) {
    if (next === status) return
    start(async () => {
      setStatus(next)
      const r = await setVideoStatus(id, next)
      toast(r.ok ? `${title}: ${VIDEO_STATUS_LABELS[next].toLowerCase()}` : 'Dat lukte niet.', r.xp ?? 0)
    })
  }

  return (
    <li className="hub-item">
      <div className="hub-item-head">
        <h3>{title}</h3>
        <div className="row" style={{ gap: 6 }}>
          {now ? <span className="pill ball">Kan vandaag</span> : null}
          {effort ? <span className="pill">Moeite: {effort}</span> : null}
        </div>
      </div>
      {hook ? <p className="hand">&ldquo;{hook}&rdquo;</p> : null}
      {why ? <p className="small muted">{why}</p> : null}
      {note ? <p className="small">{note}</p> : null}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="small">
          Bekijk de video
        </a>
      ) : null}
      <div className="hub-steps" role="group" aria-label={`Status van ${title}`}>
        {VIDEO_STATUSES.map((s) => (
          <button key={s} type="button" className="hub-step" aria-pressed={status === s} onClick={() => move(s)} disabled={pending}>
            {VIDEO_STATUS_LABELS[s]}
          </button>
        ))}
        <button type="button" className="hub-step" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <HubIcon name="edit" size={14} /> Link of notitie
        </button>
      </div>
      {open ? (
        <form
          className="form"
          action={(form) =>
            start(async () => {
              const r = await saveVideoDetails(id, form)
              setError(!r.ok)
              if (r.ok) {
                setOpen(false)
                toast('Opgeslagen')
              }
            })
          }
        >
          <label className="field">
            <span>Link naar de video</span>
            <input className="input" name="link" type="url" defaultValue={link ?? ''} placeholder="https://www.tiktok.com/..." />
          </label>
          <label className="field">
            <span>Notitie</span>
            <textarea className="textarea" name="note" defaultValue={note ?? ''} maxLength={1000} placeholder="Wie filmt, waar, welke hond, toestemming geregeld?" />
          </label>
          {error ? <p className="notice danger small">Die link klopt niet. Begin met https://</p> : null}
          <div className="hub-actions">
            <button className="button primary small" disabled={pending}>
              Opslaan
            </button>
            {own ? (
              <button
                type="button"
                className="button ghost small"
                onClick={() =>
                  start(async () => {
                    if (!window.confirm('Dit idee weghalen?')) return
                    const r = await removeVideoIdea(id)
                    toast(r.ok ? 'Weggehaald' : 'Dat lukte niet.')
                  })
                }
              >
                <HubIcon name="trash" size={15} /> Weghalen
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </li>
  )
}

export function AddVideoIdea() {
  const [pending, start] = useTransition()
  const [value, setValue] = useState('')
  return (
    <form
      className="row card"
      action={(form) =>
        start(async () => {
          const r = await addVideoIdea(form)
          if (r.ok) {
            setValue('')
            toast('Idee toegevoegd')
          } else toast('Schrijf er een paar woorden bij.')
        })
      }
    >
      <label className="field" style={{ flex: '1 1 260px' }}>
        <span>Eigen idee</span>
        <input className="input" name="title" value={value} onChange={(e) => setValue(e.target.value)} minLength={3} maxLength={140} placeholder="Bijvoorbeeld: de mooiste rondjes van Utrecht" required />
      </label>
      <button className="button primary" disabled={pending} style={{ alignSelf: 'flex-end' }}>
        <HubIcon name="plus" size={18} /> Toevoegen
      </button>
    </form>
  )
}
