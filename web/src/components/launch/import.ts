// "Importeer CSV" in the launch hub: many contacts at once. The same parser and checks run in the
// browser (for the preview) and in the server action (which never trusts the preview). Pure
// functions, unit-tested in import.test.ts. Contact details only ever go into the database.

import { parseCsv } from '@/lib/csv'
import { AUDIENCES, type Audience } from './audiences'
import { isEmail } from './mail'

/** The columns, in the order of the example header. Only `audience` and a name or organisation are required. */
export const IMPORT_COLUMNS = ['audience', 'organisation', 'name', 'email', 'phone', 'city', 'note'] as const
export type ImportColumn = (typeof IMPORT_COLUMNS)[number]
export const IMPORT_HEADER = IMPORT_COLUMNS.join(',')

/** At most this many contacts per import, so one paste cannot flood the list. */
export const MAX_IMPORT_ROWS = 200
/** Roughly 200 rows of 1000 characters: anything bigger is not a contact list. */
export const MAX_IMPORT_CHARS = 250_000

/** The same limits as the "Contact toevoegen" form (saveContact in server/actions/launch.ts). */
const MAX_LENGTH: Record<ImportColumn, number> = { audience: 40, organisation: 160, name: 120, email: 200, phone: 40, city: 80, note: 1000 }

/** Dutch (and a few English) words people type in a sheet, for the five audiences. */
const AUDIENCE_ALIASES: Record<string, Audience> = {
  opvang: 'shelter',
  opvangen: 'shelter',
  asiel: 'shelter',
  dierenasiel: 'shelter',
  dierenopvang: 'shelter',
  dierenarts: 'vet',
  dierenartsen: 'vet',
  veterinarian: 'vet',
  student: 'student',
  studenten: 'student',
  studentenvereniging: 'student',
  students: 'student',
  buurt: 'neighbourhood',
  wijk: 'neighbourhood',
  buurtgroep: 'neighbourhood',
  neighborhood: 'neighbourhood',
  pers: 'press',
  media: 'press',
  krant: 'press',
}

export function toAudience(value: string): Audience | null {
  const v = value.trim().toLowerCase()
  if ((AUDIENCES as readonly string[]).includes(v)) return v as Audience
  return AUDIENCE_ALIASES[v] ?? null
}

export interface ImportContact {
  audience: Audience
  organisation: string
  name: string
  email: string | null
  phone: string | null
  city: string
  note: string
}

export type RowProblem = 'audience' | 'missingName' | 'email' | 'tooLong'

export type ImportRow =
  | { line: number; status: 'new'; contact: ImportContact }
  | { line: number; status: 'duplicate'; contact: ImportContact; existing: boolean }
  | { line: number; status: 'invalid'; problem: RowProblem; raw: Record<string, string> }

export type ImportError = 'empty' | 'header' | 'tooMany' | 'tooBig'

export type ImportResult = { ok: true; rows: ImportRow[]; counts: { new: number; duplicate: number; invalid: number } } | { ok: false; error: ImportError; rows?: number }

/** Duplicates are recognised by organisation + e-mail address, ignoring case and spaces. */
export function contactKey(c: { organisation: string; email: string | null }): string {
  const norm = (v: string | null) => (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `${norm(c.organisation)}|${norm(c.email)}`
}

/**
 * Reads the CSV text (comma or semicolon, quotes allowed) and checks every row. `existing` are the
 * keys (contactKey) of contacts already in the list: those rows are skipped as duplicates, just
 * like a second row with the same organisation and e-mail address in the file itself.
 */
export function parseContactsCsv(text: string, existing: Iterable<string> = []): ImportResult {
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, error: 'tooBig' }
  const table = parseCsv(text)
  if (!table.length) return { ok: false, error: 'empty' }
  const [header, ...body] = table
  const columns = header.map((h) => h.trim().toLowerCase())
  if (!columns.includes('audience') || !(columns.includes('organisation') || columns.includes('name'))) return { ok: false, error: 'header' }
  if (!body.length) return { ok: false, error: 'empty' }
  if (body.length > MAX_IMPORT_ROWS) return { ok: false, error: 'tooMany', rows: body.length }

  const known = new Set(existing)
  const seen = new Set(known)
  const rows: ImportRow[] = body.map((cells, i) => {
    const raw = Object.fromEntries(IMPORT_COLUMNS.map((col) => [col, (cells[columns.indexOf(col)] ?? '').trim()])) as Record<ImportColumn, string>
    // Line numbers as a spreadsheet shows them: the header is line 1.
    const line = i + 2
    const audience = toAudience(raw.audience)
    if (!audience) return { line, status: 'invalid', problem: 'audience', raw }
    if (!raw.name && !raw.organisation) return { line, status: 'invalid', problem: 'missingName', raw }
    if (raw.email && !isEmail(raw.email)) return { line, status: 'invalid', problem: 'email', raw }
    if (IMPORT_COLUMNS.some((col) => raw[col].length > MAX_LENGTH[col])) return { line, status: 'invalid', problem: 'tooLong', raw }
    const contact: ImportContact = {
      audience,
      organisation: raw.organisation,
      name: raw.name,
      email: raw.email || null,
      phone: raw.phone || null,
      city: raw.city,
      note: raw.note,
    }
    const key = contactKey(contact)
    if (seen.has(key)) return { line, status: 'duplicate', contact, existing: known.has(key) }
    seen.add(key)
    return { line, status: 'new', contact }
  })
  const counts = { new: 0, duplicate: 0, invalid: 0 }
  for (const row of rows) counts[row.status]++
  return { ok: true, rows, counts }
}
