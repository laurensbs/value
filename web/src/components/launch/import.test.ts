import { describe, expect, it } from 'vitest'
import { contactKey, IMPORT_HEADER, MAX_IMPORT_ROWS, parseContactsCsv, toAudience } from './import'

const csv = (...lines: string[]) => [IMPORT_HEADER, ...lines].join('\n')

describe('parseContactsCsv', () => {
  it('reads the documented header and every field', () => {
    const result = parseContactsCsv(csv('shelter,Stichting Voorbeeld,Sanne,sanne@voorbeeld.test,030 123 4567,Utrecht,"Belt liever, dan mailt"'))
    expect(result).toEqual({
      ok: true,
      counts: { new: 1, duplicate: 0, invalid: 0 },
      rows: [
        {
          line: 2,
          status: 'new',
          contact: {
            audience: 'shelter',
            organisation: 'Stichting Voorbeeld',
            name: 'Sanne',
            email: 'sanne@voorbeeld.test',
            phone: '030 123 4567',
            city: 'Utrecht',
            note: 'Belt liever, dan mailt',
          },
        },
      ],
    })
  })

  it('accepts columns in any order, semicolons from Excel, and leaves empty fields empty', () => {
    const result = parseContactsCsv('City;Name;Audience\nGent;Jonas;press\n')
    expect(result.ok && result.rows[0]).toEqual({
      line: 2,
      status: 'new',
      contact: { audience: 'press', organisation: '', name: 'Jonas', email: null, phone: null, city: 'Gent', note: '' },
    })
  })

  it('understands Dutch words for the audience', () => {
    expect(toAudience('Opvang')).toBe('shelter')
    expect(toAudience('dierenarts')).toBe('vet')
    expect(toAudience(' PERS ')).toBe('press')
    expect(toAudience('student')).toBe('student')
    expect(toAudience('bakker')).toBeNull()
  })

  it('marks rows with an unknown audience, no name, a wrong e-mail address or a too long field', () => {
    const result = parseContactsCsv(
      csv(
        'bakkers,Bakkerij,,,,,',
        'vet,,,info@dierenarts.test,,,',
        'shelter,Opvang Noord,,geen-adres,,,',
        `press,${'x'.repeat(161)},,,,,`,
        'student,Studenten Utrecht,,bestuur@studenten.test,,,',
      ),
    )
    if (!result.ok) throw new Error('expected rows')
    expect(result.rows.map((r) => (r.status === 'invalid' ? r.problem : r.status))).toEqual(['audience', 'missingName', 'email', 'tooLong', 'new'])
    expect(result.counts).toEqual({ new: 1, duplicate: 0, invalid: 4 })
  })

  it('skips duplicates by organisation and e-mail address, in the file and in the existing list', () => {
    const existing = [contactKey({ organisation: 'Dierenasiel Oost', email: 'info@oost.test' })]
    const result = parseContactsCsv(
      csv(
        'shelter,Dierenasiel Oost,,INFO@oost.test,,,',
        'shelter,Opvang West,,west@opvang.test,,,',
        'shelter,opvang  west,Kim,West@Opvang.test,,,',
        'shelter,Opvang West,,ander@opvang.test,,,',
      ),
      existing,
    )
    if (!result.ok) throw new Error('expected rows')
    expect(result.rows.map((r) => [r.status, r.status === 'duplicate' ? r.existing : null])).toEqual([
      ['duplicate', true],
      ['new', null],
      ['duplicate', false],
      ['new', null],
    ])
    expect(result.counts).toEqual({ new: 2, duplicate: 2, invalid: 0 })
  })

  it(`allows at most ${MAX_IMPORT_ROWS} rows`, () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `shelter,Opvang ${i},,,,,`)
    expect(parseContactsCsv(csv(...rows))).toEqual({ ok: false, error: 'tooMany', rows: MAX_IMPORT_ROWS + 1 })
    const result = parseContactsCsv(csv(...rows.slice(0, MAX_IMPORT_ROWS)))
    expect(result.ok && result.counts.new).toBe(MAX_IMPORT_ROWS)
  })

  it('refuses an empty file, a file without the header, and a huge paste', () => {
    expect(parseContactsCsv('')).toEqual({ ok: false, error: 'empty' })
    expect(parseContactsCsv(IMPORT_HEADER)).toEqual({ ok: false, error: 'empty' })
    expect(parseContactsCsv('shelter,Opvang Noord,Sanne\nvet,Dierenarts,Piet')).toEqual({ ok: false, error: 'header' })
    expect(parseContactsCsv('audience,city\nshelter,Utrecht')).toEqual({ ok: false, error: 'header' })
    expect(parseContactsCsv('x'.repeat(250_001))).toEqual({ ok: false, error: 'tooBig' })
  })
})
