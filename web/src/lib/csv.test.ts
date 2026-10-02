import { describe, expect, it } from 'vitest'
import { csvToObjects, parseCsv } from './csv'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes and newlines in fields', () => {
    const rows = parseCsv('name,story\r\nMo,"Lief, maar ""stoer""\nen rustig"\r\n')
    expect(rows).toEqual([
      ['name', 'story'],
      ['Mo', 'Lief, maar "stoer"\nen rustig'],
    ])
  })

  it('detects semicolon-separated files from Excel', () => {
    expect(parseCsv('name;breed\nKees;Beagle')).toEqual([
      ['name', 'breed'],
      ['Kees', 'Beagle'],
    ])
  })

  it('maps rows to objects by header and skips empty lines', () => {
    expect(csvToObjects('﻿Name , Age_Years\nNoor,5\n\n')).toEqual([{ name: 'Noor', age_years: '5' }])
  })
})
