// Ready-made words for the moments people usually get stuck on: what to say in a new chat, and
// what to talk about when meeting. Keys only; the texts live in messages/*.json, so the website
// and the iPhone app (through /api/v1) offer the same ones.

/** The walker, or the person who looks after the dog: its owner or the shelter's staff. */
export type ChatSide = 'walker' | 'host'

/** Where an appointment stands, from the viewer's point of view in time. */
export type ChatMoment = 'pending' | 'planned' | 'soon' | 'walking' | 'done'

/** "Soon" starts two hours before the appointment and ends an hour after it should have finished. */
export const SOON_BEFORE_MS = 2 * 3_600_000
export const SOON_AFTER_MS = 3_600_000

export function chatMoment(
  request: { status: string; startsAt: Date; durationMin: number },
  now: Date,
  walking = false,
): ChatMoment | null {
  if (request.status === 'pending') return 'pending'
  if (request.status === 'completed') return 'done'
  if (request.status !== 'accepted') return null
  if (walking) return 'walking'
  const start = request.startsAt.getTime()
  const end = start + request.durationMin * 60_000
  return now.getTime() >= start - SOON_BEFORE_MS && now.getTime() <= end + SOON_AFTER_MS ? 'soon' : 'planned'
}

interface Situation {
  kind: string
  /** A shelter dog: nobody is "at home" to ring the bell for. */
  shelter: boolean
  /** A fixed weekly walk already repeats, so nobody needs to ask for one. */
  weekly: boolean
  /** The owner already lets this walker go alone, so there is nothing left to ask after meeting. */
  soloAllowed?: boolean
}

/**
 * Message keys under chatQuick.<side>, in the order they are offered: at most three. During a
 * first meeting the owner walks along, so nobody needs a message then.
 */
export function suggestionKeys(side: ChatSide, moment: ChatMoment, { kind, shelter, weekly, soloAllowed = false }: Situation): string[] {
  const meet = kind === 'meet'
  if (side === 'walker') {
    switch (moment) {
      case 'pending':
        return meet ? ['helloMeet', 'where', 'watchOut'] : ['helloSolo', 'handover', 'watchOut']
      case 'planned':
        return meet ? ['excited', 'bring', 'treat'] : ['excited', 'handover', 'treat']
      case 'soon':
        return ['tenMinutes', 'here', 'late']
      case 'walking':
        return meet ? [] : ['allGood', 'sniffing', 'almostBack']
      case 'done':
        if (meet) return shelter || soloAllowed ? ['thanksMeet'] : ['thanksMeet', 'soloNext']
        return weekly ? ['thanks'] : ['thanks', 'again']
    }
  }
  const home = shelter ? [] : ['home']
  switch (moment) {
    case 'pending':
      return meet ? ['helloMeet', 'otherTime', 'experience'] : ['helloSolo', 'otherTime']
    case 'planned':
      return meet ? ['seeYouThen', ...home, 'nothingToBring'] : ['ready', ...home, 'tellMe']
    case 'soon':
      return shelter ? ['seeYou', 'excitedDog'] : ['seeYou', 'excitedDog', 'lateHome']
    case 'walking':
      return meet ? [] : ['howIsIt', 'takeYourTime']
    case 'done':
      return meet ? ['thanksMeet', 'againMeet'] : weekly ? ['thanks'] : ['thanks', 'weekly']
  }
}

/** What to talk about when meeting, keys under meetCheck.<side>. The host also checks the walker's ID. */
export function meetChecklistKeys(side: ChatSide): string[] {
  return side === 'walker' ? ['leash', 'rules', 'stuff', 'emergency', 'together'] : ['leash', 'rules', 'stuff', 'id', 'together']
}

/** Sentences that build a request message with a few taps, keys under request.blocks. */
export function requestBlockKeys(kind: string): string[] {
  return kind === 'meet' ? ['helloMeet', 'nearby', 'experience', 'flexible', 'outdoors'] : ['helloSolo', 'flexible']
}
