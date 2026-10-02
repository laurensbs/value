import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseDogCsv } from '@/lib/dog-import'
test('the downloadable shelter CSV template imports cleanly', () => {
  const r = parseDogCsv(readFileSync('public/rondje-honden-voorbeeld.csv', 'utf8'))
  expect(r.errors).toEqual([])
  expect(r.dogs.map((d) => [d.name, d.sex, d.size, d.level, d.treats, d.traits.length])).toEqual([
    ['Bram', 'male', 'large', 'starter', 'yes', 3],
    ['Mila', 'female', 'medium', 'starter', 'own', 2],
    ['Rocky', 'male', 'large', 'experienced', 'no', 2],
  ])
})
