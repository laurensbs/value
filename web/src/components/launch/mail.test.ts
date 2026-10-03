import { describe, expect, it } from 'vitest'
import { AUDIENCES } from './audiences'
import { clipboardText, fillTemplate, isEmail, mailtoHref, placeholdersIn, PLACEHOLDERS, segments } from './mail'
import { MAIL_KINDS, TEMPLATES, templatesFor } from './templates'

describe('mailto links', () => {
  it('percent-encodes subject and body (spaces, &, ?, #, accents, line breaks)', () => {
    const href = mailtoHref({ to: 'info@opvang.test', subject: 'Honden & wandelen? #1', body: 'Beste Ans,\n\nTot ziens – één' })
    expect(href).toBe(
      'mailto:info@opvang.test?subject=Honden%20%26%20wandelen%3F%20%231&body=Beste%20Ans%2C%0D%0A%0D%0ATot%20ziens%20%E2%80%93%20%C3%A9%C3%A9n',
    )
    expect(href).not.toContain('+')
    // Decoding gives back exactly the text (with CRLF line breaks, as RFC 6068 asks).
    const url = new URL(href)
    expect(decodeURIComponent(url.search.split('&body=')[1])).toBe('Beste Ans,\r\n\r\nTot ziens – één')
  })

  it('cannot be broken out of with & or = in the text', () => {
    const href = mailtoHref({ to: null, subject: 'a&cc=evil@x.test', body: 'x&bcc=evil@x.test' })
    expect(href).toBe('mailto:?subject=a%26cc%3Devil%40x.test&body=x%26bcc%3Devil%40x.test')
  })

  it('leaves the recipient empty when the address is missing or invalid', () => {
    expect(mailtoHref({ to: '', subject: '', body: 'Hoi' })).toBe('mailto:?body=Hoi')
    expect(mailtoHref({ to: 'geen adres', subject: 'S', body: 'B' })).toBe('mailto:?subject=S&body=B')
    expect(mailtoHref({ to: 'a@b.test?cc=x@y.test', subject: 'S', body: 'B' })).toBe('mailto:?subject=S&body=B')
    expect(mailtoHref({ to: ' Jan.de+opvang@dieren.test ', subject: 'S', body: 'B' })).toBe('mailto:Jan.de%2Bopvang@dieren.test?subject=S&body=B')
  })

  it('checks e-mail addresses loosely', () => {
    expect(isEmail('info@opvang.test')).toBe(true)
    expect(isEmail('info@opvang')).toBe(false)
    expect(isEmail('')).toBe(false)
    expect(isEmail(null)).toBe(false)
  })
})

describe('filling in templates', () => {
  it('replaces placeholders that have a value and keeps the empty ones visible', () => {
    const text = 'Beste {naam}, groet van {afzender} ({app}) uit {stad}.'
    expect(fillTemplate(text, { naam: 'Ans', afzender: '  ', app: 'Rondje' })).toBe('Beste Ans, groet van {afzender} (Rondje) uit {stad}.')
    expect(placeholdersIn(fillTemplate(text, { naam: 'Ans', app: 'Rondje' }))).toEqual(['afzender', 'stad'])
  })

  it('does not touch unknown braces', () => {
    expect(fillTemplate('{onbekend} en {naam}', { naam: 'Ans' })).toBe('{onbekend} en Ans')
  })

  it('splits text into plain parts and placeholders for highlighting', () => {
    expect(segments('Hoi {naam}!')).toEqual([
      { text: 'Hoi ', placeholder: false },
      { text: '{naam}', placeholder: true },
      { text: '!', placeholder: false },
    ])
  })

  it('copies the subject above the body', () => {
    expect(clipboardText('Onderwerp', 'Tekst')).toBe('Onderwerp\n\nTekst')
    expect(clipboardText('', 'Tekst')).toBe('Tekst')
  })
})

describe('the message bank', () => {
  it('has texts for every audience, with unique ids', () => {
    for (const audience of AUDIENCES) expect(templatesFor(audience).length, audience).toBeGreaterThan(0)
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
  })

  it('has the shelter mails in Dutch, French and Spanish', () => {
    const shelterMails = templatesFor('shelter').filter((t) => t.kind === 'mail')
    expect(shelterMails.map((t) => t.lang).sort()).toEqual(['es', 'fr', 'nl'])
  })

  it('only uses known placeholders, gives every mail a subject, and never hardcodes the name', () => {
    for (const t of TEMPLATES) {
      const braces = [...`${t.subject} ${t.body}`.matchAll(/\{([^}]*)\}/g)].map((m) => m[1])
      for (const key of braces) expect(PLACEHOLDERS, `${t.id}: {${key}}`).toContain(key)
      if (MAIL_KINDS.includes(t.kind)) expect(t.subject, t.id).not.toBe('')
      // The name is not final yet: texts use {app} (APP_NAME).
      expect(`${t.subject} ${t.body}`, t.id).not.toMatch(/\bRondje\b/)
      expect(`${t.subject} ${t.body}`, t.id).toContain('{app}')
    }
  })

  it('makes no health claims and names no partner organisations', () => {
    const forbidden = /depress|somber|eenzaam|mentale|gezondheid|therap|behandel|Dierenbescherming|partner/i
    for (const t of TEMPLATES) expect(`${t.subject} ${t.body}`, t.id).not.toMatch(forbidden)
  })

  it('says the new texts are free and new', () => {
    for (const t of TEMPLATES.filter((x) => x.audience !== 'shelter')) {
      if (t.kind === 'followup') continue
      expect(t.body, t.id).toMatch(/gratis/)
      expect(t.body, t.id).toMatch(/\bnieuw|net begonnen|Nieuw/)
    }
  })
})
