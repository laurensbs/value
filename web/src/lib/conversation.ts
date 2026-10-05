// Ready-made words for the moments people usually get stuck on: what to say in a new chat, and
// what to talk about when meeting. Keys only; the texts live in messages/*.json, so the website
// and the iPhone app (through /api/v1) offer the same ones.

import { isInPerson } from './rules'

/** The walker, or the person who looks after the dog: its owner or the shelter's staff. */
export type ChatSide = 'walker' | 'host'

/** Where an appointment stands, from the viewer's point of view in time. */
export type ChatMoment = 'pending' | 'planned' | 'soon' | 'walking' | 'done'

/** "Soon" starts two hours before the appointment and ends an hour after it should have finished. */
export const SOON_BEFORE_MS = 2 * 3_600_000
export const SOON_AFTER_MS = 3_600_000

/** A first meeting by phone or video: nobody walks, and it never counts as meeting in person. */
export function isRemoteMeeting(request: { kind?: string; meetVia?: string }): boolean {
  return request.kind === 'meet' && request.meetVia != null && !isInPerson(request.meetVia)
}

export function chatMoment(
  request: { status: string; startsAt: Date; durationMin: number; kind?: string; meetVia?: string },
  now: Date,
  walking = false,
): ChatMoment | null {
  if (request.status === 'pending') return 'pending'
  if (request.status === 'completed') return 'done'
  if (request.status !== 'accepted') return null
  if (walking) return 'walking'
  const start = request.startsAt.getTime()
  const end = start + request.durationMin * 60_000
  if (now.getTime() >= start - SOON_BEFORE_MS && now.getTime() <= end + SOON_AFTER_MS) return 'soon'
  // A call is over once its time has passed: nothing else (like the end of a walk) marks it done.
  return isRemoteMeeting(request) && now.getTime() > end + SOON_AFTER_MS ? 'done' : 'planned'
}

interface Situation {
  kind: string
  /** A shelter dog: nobody is "at home" to ring the bell for. */
  shelter: boolean
  /** A fixed weekly walk already repeats, so nobody needs to ask for one. */
  weekly: boolean
  /** The owner already lets this walker go alone, so there is nothing left to ask after meeting. */
  soloAllowed?: boolean
  /** How a first meeting happens: after a call, the next step is meeting in person. */
  meetVia?: string
}

/** Ready messages around a first call: how to call, and after it, meeting in person. */
function remoteKeys(side: ChatSide, moment: ChatMoment, meetVia: string): string[] {
  const how = meetVia === 'video' ? 'videoHow' : 'whoCalls'
  switch (moment) {
    case 'pending':
      return side === 'walker' ? ['helloMeet', how, 'watchOut'] : ['helloMeet', 'otherTime', 'experience']
    case 'planned':
      return side === 'walker' ? ['excited', how] : ['seeYouThen', how]
    case 'soon':
      return ['readyCall']
    case 'walking':
      return []
    case 'done':
      return ['thanksCall', 'meetNext']
  }
}

/**
 * Message keys under chatQuick.<side>, in the order they are offered: at most three. During a
 * first meeting the owner walks along, so nobody needs a message then.
 */
export function suggestionKeys(side: ChatSide, moment: ChatMoment, { kind, shelter, weekly, soloAllowed = false, meetVia }: Situation): string[] {
  if (isRemoteMeeting({ kind, meetVia })) return remoteKeys(side, moment, meetVia!)
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

/**
 * What to talk about when meeting, keys under meetCheck.<side>. In person, the host also checks the
 * walker's ID; a call ends with planning to meet in person, where that check happens.
 */
export function meetChecklistKeys(side: ChatSide, meetVia = 'walk'): string[] {
  if (!isInPerson(meetVia)) return side === 'walker' ? ['leash', 'rules', 'emergency', 'inPerson'] : ['callAbout', 'rules', 'inPerson']
  return side === 'walker' ? ['leash', 'rules', 'stuff', 'emergency', 'together'] : ['leash', 'rules', 'stuff', 'id', 'together']
}

/** Sentences that build a request message with a few taps, keys under request.blocks. */
export function requestBlockKeys(kind: string): string[] {
  return kind === 'meet' ? ['helloMeet', 'nearby', 'experience', 'flexible', 'outdoors'] : ['helloSolo', 'flexible']
}
