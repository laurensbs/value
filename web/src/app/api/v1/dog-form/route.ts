import { getTranslations } from 'next-intl/server'
import { MAX_TRAITS, STORY_BLOCKS, STORY_GROUPS, TRAIT_CHIPS, WALK_MINUTES } from '@/lib/dog-options'
import { json } from '@/server/api'

/**
 * Ready choices for adding or editing a dog, in the caller's language, the same ones the website
 * offers: walk lengths in minutes, traits to tap (saved as plain text in `traits`, at most
 * `maxTraits`), and sentences for the story with the dog's name filled in (`?name=Bello`; without a
 * name there are none). Within each of `storyGroups` only one sentence fits a dog, so once one is in
 * the story the others should no longer be offered; neither should a sentence that is already in it.
 */
export async function GET(request: Request) {
  const t = await getTranslations('myDogs')
  const name = (new URL(request.url).searchParams.get('name') ?? '').trim().slice(0, 60)
  return json({
    walkMinutes: [...WALK_MINUTES],
    maxTraits: MAX_TRAITS,
    traits: TRAIT_CHIPS.map((key) => ({ key, text: t(`traitChips.${key}`) })),
    storyBlocks: name ? STORY_BLOCKS.map((key) => ({ key, text: t(`storyBlocks.${key}`, { name }) })) : [],
    storyGroups: STORY_GROUPS,
  })
}
