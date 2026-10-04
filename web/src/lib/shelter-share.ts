/**
 * What a shelter's message for volunteers can offer: its dogs, else a group walk that is still to
 * come. Null while the link would show nothing: before the shelter is checked, or when its only
 * walk has already started (the dashboard keeps that one for ticking off who came).
 */
export function shareOffer(status: string, activeDogs: number, walkStarts: Date[], now = new Date()): 'dog' | 'walk' | null {
  if (status !== 'verified') return null
  if (activeDogs > 0) return 'dog'
  return walkStarts.some((start) => start > now) ? 'walk' : null
}
