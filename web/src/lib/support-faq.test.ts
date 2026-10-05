import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { campaign } from './support'

// /support, the question about giving once (support.faq.once): the same as terms art. 8. A one-off gift
// via Whydonate, no monthly contribution now, the share for good causes from content/crowdfunding.json,
// never tax-deductible, and nobody has to give anything to use Rondje Mee.

const MESSAGES = { nl, en, es, fr }
const crowdfunding = JSON.parse(readFileSync(path.join(process.cwd(), 'content', 'crowdfunding.json'), 'utf8'))
const { shareToCausesPercent } = campaign(crowdfunding)

/** Per language: no monthly contribution, not deductible, and no gift needed. */
const SAYS: Record<keyof typeof MESSAGES, RegExp[]> = {
  nl: [/^Nee, een vaste maandelijkse bijdrage is er nu niet\./, /niet fiscaal aftrekbaar/, /je hoeft niets te geven om Rondje Mee te gebruiken/],
  en: [/^No, there is no fixed monthly contribution at the moment\./, /not tax-deductible/, /you do not need to give anything to use Rondje Mee/],
  es: [/^No, ahora no hay una aportación mensual fija\./, /no desgrava/, /no tienes que dar nada para usar Rondje Mee/],
  fr: [/^Non, il n’y a pas de contribution mensuelle fixe pour l’instant\./, /n’est pas déductible des impôts/, /vous n’avez rien à donner pour utiliser Rondje Mee/],
}

describe('/support: the question about giving once', () => {
  it.each(Object.keys(MESSAGES) as (keyof typeof MESSAGES)[])('%s: a one-off gift, the share for good causes, not deductible, not needed', (locale) => {
    const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'support.faq' })
    const args = { app: 'Rondje Mee', operator: 'Laurens Bos', platform: 'Whydonate', apps: 'both' }
    const answer = t('once.a', { ...args, percent: String(shareToCausesPercent ?? 'none') })
    expect(answer).toContain('Whydonate')
    expect(answer).toContain('Laurens Bos')
    for (const pattern of SAYS[locale]) expect(answer).toMatch(pattern)
    expect(shareToCausesPercent).not.toBeNull()
    expect(answer).toMatch(new RegExp(`(?<![\\d.,])${shareToCausesPercent}[\\s\\u00a0]?%`))
    // Without a share for good causes, that sentence is simply not there.
    const without = t('once.a', { ...args, percent: 'none' })
    expect(without).not.toMatch(/%/)
    expect(without).not.toMatch(/\s{2}|\.\./)
    // Nothing in it compares with a monthly contribution that is not there.
    expect(t('once.q', { app: 'Rondje Mee' })).not.toMatch(/crowdfunding|financement/i)
  })
})
