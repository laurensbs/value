import type { Locale } from '@/i18n/config'
import data from '../../../content/impact.json'

export const TOPICS = ['people', 'outside', 'dogs'] as const
export type Topic = (typeof TOPICS)[number]
export const SCOPES = ['NL', 'BE', 'ES', 'EU', 'WORLD', 'STUDY'] as const
export type Scope = (typeof SCOPES)[number]

export type Localized = Record<Locale, string>

/** One checked number, with where it comes from. Only figures that were seen on the source page are listed. */
export interface Fact {
  id: string
  topic: Topic
  /** Where the number is about: a country, the EU, the world, or a research study. */
  scope: Scope
  /** Shown on the home page (three or four at most). */
  featured?: boolean
  /** The number as shown, per language ("10,9%", "10.9%"). */
  value: Localized
  /** What the number means, in one calm sentence. */
  label: Localized
  /** The year the data is about; for a research study, the year it was published. */
  year: number
  source: { name: string; url: string }
  /** Where the number is on the source page and what exactly it measures, so anyone can check it. */
  check: string
}

export interface ImpactData {
  /** When the figures were last checked on the sources (YYYY-MM-DD). */
  checked: string
  facts: Fact[]
}

export const impact = data as ImpactData

export const text = (value: Localized, locale: string): string => value[locale as Locale] ?? value.nl

export const featuredFacts = (): Fact[] => impact.facts.filter((f) => f.featured).slice(0, 4)

export const factsFor = (topic: Topic): Fact[] => impact.facts.filter((f) => f.topic === topic)

/** "cbs.nl" for a tiny source link. */
export const sourceHost = (url: string): string => new URL(url).hostname.replace(/^www\./, '')
