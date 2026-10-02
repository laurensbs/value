import { getTranslations } from 'next-intl/server'
import { BIO_GROUPS, BIO_MAX, bioBlocksFor, type BioFacts } from '@/lib/bio'
import { json } from '@/server/api'

const EXPERIENCE = ['none', 'some', 'lots'] as const

/**
 * Ready sentences for "About you", in the caller's language, the same ones the website offers:
 * `?name=Fleur&city=Utrecht&walker=1&owner=0&experience=some` (experience none, some or lots).
 * Within each of `bioGroups` only one sentence fits a person, so once one is in the text the
 * others should no longer be offered; neither should a sentence that is already in it.
 */
export async function GET(request: Request) {
  const t = await getTranslations('onboarding')
  const q = new URL(request.url).searchParams
  const experience = q.get('experience')
  const facts: BioFacts = {
    name: (q.get('name') ?? '').trim().slice(0, 40),
    city: (q.get('city') ?? '').trim().slice(0, 60),
    walker: q.get('walker') === '1',
    owner: q.get('owner') === '1',
    experience: (EXPERIENCE as readonly string[]).includes(experience ?? '') ? (experience as BioFacts['experience']) : null,
  }
  return json({
    bioMax: BIO_MAX,
    bioBlocks: bioBlocksFor(facts).map((key) => ({ key, text: t(`bioBlocks.${key}`, { name: facts.name, city: facts.city }) })),
    bioGroups: BIO_GROUPS,
  })
}
