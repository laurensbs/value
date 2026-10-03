import { readFileSync } from 'node:fs'
import { marked } from 'marked'
import { describe, expect, it } from 'vitest'
import { CONTACT_TOKEN, contactLinkHtml, fillContact } from './contact'
import { parseFrontMatter } from './front-matter'
import { supportConfig } from './support'

const LOCALES = ['nl', 'en', 'es', 'fr']
const DOCS = ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies']
const legal = (locale: string, doc: string) => parseFrontMatter(readFileSync(`content/legal/${locale}/${doc}.md`, 'utf8')).body

describe('contactLinkHtml', () => {
  it('links to the address from CONTACT_EMAIL', () => {
    expect(contactLinkHtml('contact@example.org', 'ons contactadres')).toBe('<a href="mailto:contact@example.org">contact@example.org</a>')
  })

  it('links to the contact page while there is no address', () => {
    expect(contactLinkHtml(null, 'ons contactadres')).toBe('<a href="/contact">ons contactadres</a>')
  })

  it('escapes what it puts in the page', () => {
    expect(contactLinkHtml('a"b<c@example.org', 'x')).toBe('<a href="mailto:a&quot;b&lt;c@example.org">a&quot;b&lt;c@example.org</a>')
    expect(contactLinkHtml(null, '<b>')).toBe('<a href="/contact">&lt;b&gt;</a>')
  })
})

describe('fillContact', () => {
  it('replaces every token', () => {
    expect(fillContact(`<p>${CONTACT_TOKEN} en ${CONTACT_TOKEN}</p>`, 'contact@example.org', 'x')).toBe(
      '<p><a href="mailto:contact@example.org">contact@example.org</a> en <a href="mailto:contact@example.org">contact@example.org</a></p>',
    )
  })

  it('takes the address from CONTACT_EMAIL, and only a valid one', () => {
    expect(supportConfig({ CONTACT_EMAIL: ' contact@example.org ' }).contactEmail).toBe('contact@example.org')
    expect(supportConfig({ CONTACT_EMAIL: 'not an address' }).contactEmail).toBeNull()
    expect(supportConfig({}).contactEmail).toBeNull()
  })

  // rondje.app belongs to another company: no legal text may send people there, with or without CONTACT_EMAIL.
  for (const email of ['contact@example.org', null]) {
    it(`fills in every legal text (${email ?? 'no CONTACT_EMAIL'})`, async () => {
      for (const locale of LOCALES) {
        for (const doc of DOCS) {
          const body = legal(locale, doc)
          expect(body, `${locale}/${doc}`).not.toMatch(/rondje\.app|@/)
          const html = fillContact(await marked.parse(body, { gfm: true }), email, 'ons contactadres')
          expect(html, `${locale}/${doc}`).not.toContain(CONTACT_TOKEN)
          expect(html, `${locale}/${doc}`).not.toContain('rondje.app')
          if (body.includes(CONTACT_TOKEN)) {
            expect(html, `${locale}/${doc}`).toContain(email ? `href="mailto:${email}"` : 'href="/contact"')
          }
        }
      }
    })
  }

  it('the texts that name a contact point use the token', () => {
    for (const locale of LOCALES) {
      for (const doc of ['terms', 'privacy', 'safety', 'shelters', 'cookies']) {
        expect(legal(locale, doc), `${locale}/${doc}`).toContain(CONTACT_TOKEN)
      }
    }
  })
})
