'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { BIO_BLOCKS, BIO_MAX, BIO_SHOWN, bioBlocksLeft, type BioBlock, type BioFacts } from '@/lib/bio'
import { addSentence } from '@/lib/sentences'
import { Icon } from './Icon'

/**
 * "About you": someone's own words, with ready sentences that fit them to tap in (their name and
 * town, their experience with dogs, walker or owner). Each sentence can still be changed.
 */
export function BioField({ initial, facts }: { initial: string; facts: BioFacts }) {
  const t = useTranslations('onboarding')
  const [bio, setBio] = useState(initial)
  const values = { name: facts.name.trim(), city: facts.city.trim() }
  const sentences = Object.fromEntries(BIO_BLOCKS.map((key) => [key, t(`bioBlocks.${key}`, values)])) as Record<BioBlock, string>
  // A few at a time, so the field stays calm; a sentence that would not fit any more is left out.
  const left = bioBlocksLeft(bio, facts, sentences)
    .filter((key) => addSentence(bio, sentences[key]).length <= BIO_MAX)
    .slice(0, BIO_SHOWN)

  return (
    <div className="field">
      <label htmlFor="bio">{t('bio')}</label>
      <textarea id="bio" className="textarea" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={BIO_MAX} placeholder={t('bioHint')} />
      {left.length ? (
        <div className="chip-row sentences" role="group" aria-label={t('bioBlocksLabel')}>
          {left.map((key) => (
            <button key={key} type="button" className="chip" onClick={() => setBio((text) => addSentence(text, sentences[key]))}>
              <Icon name="plus" size={14} /> {sentences[key]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
