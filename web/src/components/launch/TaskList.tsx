'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useOptimistic, useState, useTransition } from 'react'
import { Icon } from '@/components/Icon'
import { setLaunchNote, setLaunchTask } from '@/server/actions/launch'
import type { Owner } from '@/server/launch-core'

export interface TaskJson {
  key: string
  owner: Owner
  points: number
  href: string | null
  auto: boolean
  autoDone: boolean
  done: boolean
  doneAt: string | null
  note: string
}

/** A list of launch tasks. Ticking one off is instant (optimistic) and earns its points; nothing is ever overdue. */
export function TaskList({ tasks, label }: { tasks: TaskJson[]; label: string }) {
  const [optimistic, setDone] = useOptimistic(
    Object.fromEntries(tasks.map((t) => [t.key, t.done])) as Record<string, boolean>,
    (state, change: { key: string; done: boolean }) => ({ ...state, [change.key]: change.done }),
  )
  const [, start] = useTransition()
  const [popped, setPopped] = useState<string | null>(null)

  function toggle(task: TaskJson) {
    const done = !optimistic[task.key]
    if (done) setPopped(task.key)
    start(async () => {
      setDone({ key: task.key, done })
      await setLaunchTask(task.key, done)
    })
  }

  return (
    <ul className="launch-tasks" aria-label={label}>
      {tasks.map((task) => (
        <TaskRow key={task.key} task={task} done={optimistic[task.key] ?? task.done} popped={popped === task.key} onToggle={() => toggle(task)} />
      ))}
    </ul>
  )
}

function TaskRow({ task, done, popped, onToggle }: { task: TaskJson; done: boolean; popped: boolean; onToggle: () => void }) {
  const t = useTranslations('launch')
  const format = useFormatter()
  const title = t(`tasks.${task.key}.title`)
  return (
    <li className={`launch-task${done ? ' done' : ''}`}>
      <button
        type="button"
        className={`launch-check${popped && done ? ' pop' : ''}`}
        aria-pressed={done}
        aria-label={`${done ? t('task.markOpen') : t('task.markDone')}: ${title}`}
        title={task.autoDone ? t('task.autoHint') : undefined}
        disabled={task.autoDone}
        onClick={onToggle}
      >
        <Icon name="check" size={18} />
        {popped && done ? (
          <span className="launch-plus" aria-hidden="true">
            +{task.points}
          </span>
        ) : null}
      </button>
      <div className="launch-task-text">
        <strong>{title}</strong>
        <span className="launch-task-hint">{t(`tasks.${task.key}.hint`)}</span>
        <span className="launch-task-meta">
          <span className={`pill owner-${task.owner}`}>{t(`owner.${task.owner}`)}</span>
          <span className="pill">{t('pointsShort', { n: task.points })}</span>
          {task.auto ? <span className="pill blue">{t('task.auto')}</span> : null}
          {done && task.doneAt ? <span className="muted">{t('task.doneOn', { date: format.dateTime(new Date(task.doneAt), { day: 'numeric', month: 'short' }) })}</span> : null}
          {task.href ? (
            <a href={task.href} target="_blank" rel="noopener noreferrer" className="launch-link">
              {t('task.open')} ↗
            </a>
          ) : null}
        </span>
        <TaskNote taskKey={task.key} note={task.note} />
      </div>
    </li>
  )
}

function TaskNote({ taskKey, note }: { taskKey: string; note: string }) {
  const t = useTranslations('launch.task')
  const [text, setText] = useState(note)
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  return (
    <details className="launch-note">
      <summary>{note ? note : t('note')}</summary>
      <div className="inline-form">
        <input className="input" value={text} maxLength={1000} onChange={(e) => {
            setText(e.target.value)
            setSaved(false)
          }} placeholder={t('notePlaceholder')} aria-label={t('note')} />
        <button
          type="button"
          className="button secondary small"
          disabled={pending || text.trim() === note}
          onClick={() =>
            start(async () => {
              await setLaunchNote(taskKey, text)
              setSaved(true)
            })
          }
        >
          {saved ? t('saved') : t('saveNote')}
        </button>
      </div>
    </details>
  )
}
