// Dogs carry no language field: an owner writes the story in their own language. To keep a
// Spanish story from leading the Dutch list (and to label it), we guess the language from a
// handful of very common words. Only words that belong to one of our four languages count;
// words shared between them ("de", "en", "la", "que", "is") are left out on purpose.

export type StoryLanguage = 'nl' | 'en' | 'es' | 'fr'

const WORDS: Record<StoryLanguage, ReadonlySet<string>> = {
  nl: new Set(
    'het een van niet met naar hij zij ze maar voor ook nog bij zijn haar wat er dat die meer heeft wordt door uit om als kan mee graag lukt geen weer wel alleen hem ik op zo houdt loopt elke wandelen wandeling rondje rondjes hond buiten'.split(' '),
  ),
  en: new Set('the and to with he she his her it for loves but not very can this that walk walks walking dog likes who has'.split(' ')),
  es: new Set(
    'el los las una y es con por para su sus ya ahora puede del muy pero lo como más fue son perro perra paseo paseos tranquilos mismo grupo gusta está'.split(' '),
  ),
  fr: new Set('les une et est du des il elle avec pour pas sur ne au aux qui sa ses très mais chien chienne aime promenade balade adore'.split(' ')),
}

/** The language a short text is most likely written in, or null when it is too short to tell. */
export function storyLanguage(text: string | null | undefined): StoryLanguage | null {
  if (!text) return null
  const words = text.toLowerCase().normalize('NFC').match(/\p{L}+/gu) ?? []
  const score: Record<StoryLanguage, number> = { nl: 0, en: 0, es: 0, fr: 0 }
  for (const word of words) {
    for (const lang of Object.keys(WORDS) as StoryLanguage[]) if (WORDS[lang].has(word)) score[lang]++
  }
  const ranked = (Object.entries(score) as [StoryLanguage, number][]).sort((a, b) => b[1] - a[1])
  const [best, second] = ranked
  if (best[1] < 2 || best[1] === second[1]) return null
  return best[0]
}

/** True when a story is (most likely) in another language than the one the page is shown in. */
export function isForeignStory(text: string | null | undefined, locale: string): boolean {
  const lang = storyLanguage(text)
  return lang !== null && lang !== locale
}

/**
 * Stories in the reader's language (or too short to tell) first, the rest after them.
 * The sort is stable, so the order within each group (distance, newest) stays as it was.
 */
export function readableFirst<T>(items: T[], story: (item: T) => string | null | undefined, locale: string): T[] {
  return items
    .map((item, index) => ({ item, index, foreign: isForeignStory(story(item), locale) }))
    .sort((a, b) => Number(a.foreign) - Number(b.foreign) || a.index - b.index)
    .map((x) => x.item)
}
