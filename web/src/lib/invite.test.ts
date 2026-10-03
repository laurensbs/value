import { describe, expect, it } from 'vitest'
import { cleanDogId, cleanInviteCode, dogShareUrl } from './invite'

describe('invite links', () => {
  it('keeps only the letters and digits of a code, at most 12', () => {
    expect(cleanInviteCode('ab3-def')).toBe('AB3DEF')
    expect(cleanInviteCode('<script>')).toBe('SCRIPT')
    expect(cleanInviteCode('A'.repeat(20))).toHaveLength(12)
  })

  it('keeps a dog id as it is, and nothing that could lead elsewhere', () => {
    expect(cleanDogId('3f2c1e5a-4b1d-4c55-9a8e-1f2d3c4b5a6e')).toBe('3f2c1e5a-4b1d-4c55-9a8e-1f2d3c4b5a6e')
    expect(cleanDogId('demo-bello')).toBe('demo-bello')
    expect(cleanDogId('../../evil.example/x')).toBe('evilexamplex')
    expect(cleanDogId('//evil.example')).toBe('evilexample')
  })

  it("links to the dog's page through the owner's invite", () => {
    expect(dogShareUrl('https://rondje.example', 'ABC234', 'dog-1')).toBe('https://rondje.example/r/ABC234/dog-1')
  })
})
