'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icon'

/** Copies text to the clipboard, also in older browsers or without clipboard permission. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
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
}

/** A button that copies `text` and says so for two seconds. */
export function CopyButton({ text, label, done, className = 'button secondary small' }: { text: string; label: string; done: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await copyText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={16} /> <span aria-live="polite">{copied ? done : label}</span>
    </button>
  )
}
