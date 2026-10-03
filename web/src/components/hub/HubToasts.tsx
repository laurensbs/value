'use client'

import { useEffect, useState } from 'react'

interface Toast {
  id: number
  text: string
  xp: number
}

const EVENT = 'hub:toast'

/** Shows a short "+20 punten" from anywhere in the hub. */
export function toast(text: string, xp = 0) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, xp } }))
}

export function HubToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let next = 1
    function onToast(e: Event) {
      const { text, xp } = (e as CustomEvent<{ text: string; xp: number }>).detail
      const id = next++
      setToasts((list) => [...list.slice(-2), { id, text, xp }])
      window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2700)
    }
    window.addEventListener(EVENT, onToast)
    return () => window.removeEventListener(EVENT, onToast)
  }, [])

  return (
    <div className="hub-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="hub-toast">
          {t.xp > 0 ? <span className="hub-xp">+{t.xp}</span> : null}
          {t.text}
        </div>
      ))}
    </div>
  )
}
