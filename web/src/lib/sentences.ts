/**
 * Ready sentences to tap: the ones still worth offering are not in the text yet, and are not in a
 * group with one that is (within a group only one sentence fits).
 */
export function blocksLeft<K extends string>(text: string, keys: readonly K[], sentences: Record<K, string>, groups: readonly (readonly K[])[] = []): K[] {
  const used = keys.filter((key) => text.includes(sentences[key]))
  return keys.filter((key) => !used.includes(key) && !groups.some((group) => group.includes(key) && group.some((other) => used.includes(other))))
}

/** Adds a sentence after what is already written, with one space between. */
export function addSentence(text: string, sentence: string): string {
  const before = text.trim()
  return before ? `${before} ${sentence}` : sentence
}
