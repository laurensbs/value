/**
 * Splits simple YAML front matter (`key: value` lines between `---` fences) from a
 * markdown body. Values may be quoted. Nested YAML is not supported, and not needed.
 */
export function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const text = raw.replace(/^﻿/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { data: {}, body: text }
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim())
    if (!m) continue
    data[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return { data, body: text.slice(match[0].length) }
}
