'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useEffect, useRef, useState, useTransition } from 'react'
import { sendChatMessage } from '@/server/actions/chat'
import type { ChatMessage } from '@/server/chat'

const POLL_MS = 4_000

interface Props {
  requestId: string
  viewerId: string
  dogName: string
  initial: ChatMessage[]
  canSend: boolean
  maxLength: number
}

/** A plain chat: newest at the bottom, polls while open, Enter sends on a keyboard (Shift+Enter for a new line). */
export function ChatThread({ requestId, viewerId, dogName, initial, canSend: initialCanSend, maxLength }: Props) {
  const t = useTranslations('chat')
  const format = useFormatter()
  const [messages, setMessages] = useState(initial)
  const [canSend, setCanSend] = useState(initialCanSend)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const lastAt = useRef(initial.at(-1)?.t ?? 0)
  const end = useRef<HTMLDivElement>(null)

  function merge(incoming: ChatMessage[]) {
    if (!incoming.length) return
    lastAt.current = Math.max(lastAt.current, ...incoming.map((m) => m.t))
    setMessages((list) => [...list, ...incoming.filter((m) => !list.some((x) => x.id === m.id))].sort((a, b) => a.t - b.t))
  }

  useEffect(() => {
    let active = true
    async function poll() {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/chat/${requestId}?after=${lastAt.current}`, { cache: 'no-store' })
        if (!res.ok || !active) return
        const data = (await res.json()) as { messages: ChatMessage[]; canSend: boolean }
        merge(data.messages)
        setCanSend(data.canSend)
      } catch {
        // Try again on the next tick.
      }
    }
    const timer = setInterval(poll, POLL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [requestId])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function send() {
    const body = draft.trim()
    if (!body || pending) return
    if (body.length > maxLength) return setError(t('tooLong', { max: maxLength }))
    setError(null)
    start(async () => {
      const result = await sendChatMessage(requestId, body)
      if (result.ok && result.chat) {
        setDraft('')
        merge([result.chat])
      } else if (result.error === 'too-many') setError(t('tooMany'))
      else if (result.error === 'not-now') setCanSend(false)
      else setError(t('error'))
    })
  }

  return (
    <section className="chat" aria-label={t('label')}>
      <ol className="chat-log" aria-live="polite">
        {messages.length === 0 ? <li className="chat-empty muted">{t('empty', { dogName })}</li> : null}
        {messages.map((m, i) => {
          const mine = m.senderId === viewerId
          const showName = !mine && messages[i - 1]?.senderId !== m.senderId
          return (
            <li key={m.id} className={`chat-bubble${mine ? ' mine' : ''}`}>
              {showName ? <span className="chat-name">{m.name}</span> : null}
              <p>{m.body}</p>
              <time dateTime={new Date(m.t).toISOString()}>
                {mine ? `${t('you')} · ` : ''}
                {format.dateTime(new Date(m.t), { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </time>
            </li>
          )
        })}
      </ol>
      <div ref={end} />
      {canSend ? (
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <label className="visually-hidden" htmlFor="chat-input">
            {t('placeholder')}
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={maxLength}
            placeholder={t('placeholder')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button type="submit" className="button primary" disabled={pending || !draft.trim()}>
            {pending ? t('sending') : t('send')}
          </button>
        </form>
      ) : (
        <p className="notice small">{t('closed')}</p>
      )}
      {error ? (
        <p className="notice warn small" role="alert">
          {error}
        </p>
      ) : null}
      <p className="muted small">{t('safety')}</p>
    </section>
  )
}
