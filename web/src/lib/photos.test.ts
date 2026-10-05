import { describe, expect, it } from 'vitest'
import { cleanAuthUser, isAllowedPhotoUrl, isProviderPhoto } from './photos'

describe('photo addresses', () => {
  it('accepts our own storage and inline images', () => {
    expect(isAllowedPhotoUrl('https://abc.public.blob.vercel-storage.com/photos/u/1.jpg')).toBe(true)
    expect(isAllowedPhotoUrl('data:image/jpeg;base64,AAAA')).toBe(true)
    expect(isAllowedPhotoUrl('https://evil.example/p.gif')).toBe(false)
  })

  it('knows Google profile pictures, over https only', () => {
    expect(isProviderPhoto('https://lh3.googleusercontent.com/a/ACg8ocK=s96-c')).toBe(true)
    expect(isProviderPhoto('http://lh3.googleusercontent.com/a/x')).toBe(false)
    expect(isProviderPhoto('https://googleusercontent.com.evil.example/a')).toBe(false)
    expect(isProviderPhoto('not a url')).toBe(false)
  })
})

describe('cleanAuthUser', () => {
  it('drops a picture address someone made up, and keeps names short', () => {
    expect(cleanAuthUser({ name: '  Kees  ', image: 'https://tracker.example/p.gif' })).toEqual({ name: 'Kees', image: null })
    expect(cleanAuthUser({ name: 'x'.repeat(500) }).name).toHaveLength(100)
  })

  it('keeps a Google picture and leaves fields that were not sent alone', () => {
    const google = 'https://lh3.googleusercontent.com/a/ACg8ocK=s96-c'
    expect(cleanAuthUser({ email: 'kees@example.org', image: google })).toEqual({ email: 'kees@example.org', image: google })
    expect(cleanAuthUser({ name: 'Kees', emailVerified: true })).toStrictEqual({ name: 'Kees', emailVerified: true })
    expect(cleanAuthUser({ image: null })).toEqual({ image: null })
  })
})
