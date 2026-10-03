'use client'

import Link from 'next/link'
import { useOptimistic, useState, useTransition } from 'react'
import type { HubTask } from '@/lib/hub/content'
import { setTask } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

const OWNER_LABEL = { claude: 'Claude doet dit', samen: 'Samen' } as const

/**
 * One step of the plan, with a big round tick. Ticking it gives its points right away. A step that
 * ticked itself off (`auto`) cannot be ticked back while its check holds.
 */
export function TaskCard({ task, done, auto = false, showHow = true }: { task: HubTask; done: boolean; auto?: boolean; showHow?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [pending, start] = useTransition()
  const [burst, setBurst] = useState(0)

  function toggle() {
    if (auto) return
    const next = !optimistic
    start(async () => {
      setOptimistic(next)
      const result = await setTask(task.id, next)
      if (!result.ok) {
        toast('Dat lukte niet. Probeer het nog eens.')
        return
      }
      if (next && result.xp) {
        setBurst((n) => n + 1)
        toast(task.title, result.xp)
      }
    })
  }

  return (
    <li className={`hub-task${optimistic ? ' is-done' : ''}`}>
      <button
        type="button"
        className="hub-tick"
        aria-pressed={optimistic}
        aria-label={
          auto ? `${task.title}: vanzelf afgevinkt` : optimistic ? `${task.title}: gedaan. Tik om terug te zetten.` : `${task.title}: afvinken`
        }
        onClick={toggle}
        disabled={pending || auto}
      >
        <HubIcon name="check" size={22} />
        {burst > 0 && optimistic ? (
          <span key={burst} className="hub-burst" aria-hidden="true">
            +{task.xp}
          </span>
        ) : null}
      </button>
      <div className="hub-task-main">
        <span className="hub-task-title">{task.title}</span>
        {showHow && !optimistic ? (
          <ul className="hub-task-how">
            {task.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}
        <div className="hub-task-meta">
          <span className="hub-xp">
            <HubIcon name="star" size={12} /> {task.xp}
          </span>
          {task.owner ? <span className={`pill${task.owner === 'claude' ? ' blue' : ''}`}>{OWNER_LABEL[task.owner]}</span> : null}
          {task.auto ? (
            <span className="pill green" title="Dit vinkt zichzelf af zodra de cijfers of de live site het laten zien.">
              {auto ? 'Vanzelf afgevinkt' : 'Vinkt vanzelf af'}
            </span>
          ) : null}
          {task.yours ? (
            <span className="pill warn" title="Kost geld, staat op jouw naam of is niet terug te draaien: dit doe je zelf, bewust.">
              Doe je zelf
            </span>
          ) : null}
          {task.template ? (
            <Link href={`/hub/mails?t=${task.template}${task.partner ? `&p=${task.partner}` : ''}`} className="button secondary small">
              <HubIcon name="mail" size={16} /> Mail klaarzetten
            </Link>
          ) : null}
          {task.link ? (
            task.link.href.startsWith('http') ? (
              <a href={task.link.href} target="_blank" rel="noopener noreferrer" className="button ghost small">
                {task.link.label} <HubIcon name="arrow" size={14} />
              </a>
            ) : (
              <Link href={task.link.href} className="button ghost small">
                {task.link.label} <HubIcon name="arrow" size={14} />
              </Link>
            )
          ) : null}
        </div>
      </div>
    </li>
  )
}
