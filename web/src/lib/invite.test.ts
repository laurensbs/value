import { NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'
import { cleanDogId, cleanInviteCode, dogShareUrl, inviteUrl, rememberInviter } from './invite'

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

  it('opens sign-up, for owners with that start already chosen', () => {
    expect(inviteUrl('https://rondje.example', 'abc234')).toBe('https://rondje.example/r/ABC234')
    expect(inviteUrl('https://rondje.example', 'abc234', 'owner')).toBe('https://rondje.example/r/ABC234?intent=owner')
  })

  it("links to the dog's page through the owner's invite", () => {
    expect(dogShareUrl('https://rondje.example', 'ABC234', 'dog-1')).toBe('https://rondje.example/r/ABC234/dog-1')
  })

  it('remembers the inviter for 30 days, and nobody for a code without letters or digits', () => {
    const response = rememberInviter(NextResponse.redirect('https://rondje.example/dogs/dog-1'), 'abc-234')
    expect(response.cookies.get('rondje_ref')).toMatchObject({ value: 'ABC234', maxAge: 2_592_000, httpOnly: true, sameSite: 'lax', path: '/' })
    expect(rememberInviter(NextResponse.redirect('https://rondje.example/dogs'), '---').cookies.get('rondje_ref')).toBeUndefined()
  })
})
