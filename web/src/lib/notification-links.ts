export type NotificationData = {
  walkId?: string
  dogId?: string
  dogName?: string
  walkerName?: string
  senderName?: string
  requestId?: string
  /** How a first meeting happens (walk, home, phone, video); left out for regular walks. */
  meetVia?: string
  orgId?: string
  orgName?: string
  groupWalkId?: string
  // Reminders (lib/nudges.ts)
  step?: string
  role?: string
  city?: string
  goal?: number
  left?: number
  mine?: number
  variant?: string
  tip?: string
  // Appointment reminders (server/reminders.ts): "today" or "tomorrow", the local time, and the start.
  day?: string
  time?: string
  at?: string
}

/** Where each first-step reminder leads: the same pages as the first steps on the Today screen. */
const STEP_HREFS: Record<string, string> = { about: '/profile/edit', dog: '/my-dogs/new', quiz: '/profile/quiz', meet: '/dogs' }

/** Where a notification leads: in the app and in the email about it. */
export function notificationHref(kind: string, data: NotificationData): string {
  if (kind.startsWith('request-')) return '/requests'
  if (kind === 'chat-message' && data.requestId) return `/chat/${data.requestId}`
  if (kind === 'walk-started' || kind === 'walk-overdue' || kind === 'walk-ended' || kind === 'walk-photo') return data.walkId ? `/walk/${data.walkId}` : '/requests'
  if (kind === 'trust-granted' && data.dogId) return `/dogs/${data.dogId}`
  if (kind === 'org-verified' && data.orgId) return `/shelter/${data.orgId}`
  if (kind === 'group-signup') return '/shelter'
  if (kind === 'group-walk-reminder') return '/group-walks'
  if (kind === 'org-pending') return '/admin'
  if ((kind === 'shelter-joined' || kind === 'group-walk-new') && data.orgId) return `/dogs?org=${data.orgId}`
  if (kind === 'nudge-step') return STEP_HREFS[data.step ?? ''] ?? '/'
  if (kind === 'nudge-week') return '/'
  if (kind === 'nudge-challenge' || kind === 'challenge-done') return '/progress#challenge'
  if (kind === 'nudge-back' || kind === 'nudge-new-dog') return data.dogId ? `/dogs/${data.dogId}` : '/dogs'
  if (kind === 'nudge-owner') return !data.dogId ? '/my-dogs' : data.tip === 'share' ? `/dogs/${data.dogId}` : `/my-dogs/${data.dogId}/edit`
  return '/requests'
}

/** The values notification texts may use. Counts stay numbers for plurals; a missing choice falls back to "other". */
export function notificationValues(data: NotificationData): Record<string, string | number> {
  return {
    dogName: data.dogName ?? '',
    walkerName: data.walkerName ?? '',
    orgName: data.orgName ?? '',
    senderName: data.senderName ?? '',
    city: data.city ?? '',
    goal: Number(data.goal ?? 0),
    left: Number(data.left ?? 0),
    mine: Number(data.mine ?? 0),
    step: data.step ?? 'other',
    role: data.role ?? 'other',
    variant: data.variant ?? 'other',
    tip: data.tip ?? 'other',
    day: data.day ?? 'other',
    time: data.time ?? '',
    via: data.meetVia ?? 'other',
  }
}

/** Notifications that are also sent by email: someone is waiting for an answer, or it is about safety. */
export const EMAIL_KINDS = ['request-new', 'request-accepted', 'walk-overdue', 'org-verified', 'org-pending', 'shelter-joined', 'chat-message'] as const

/** A heads-up about an appointment (server/reminders.ts): sent once, as a push or else by email. */
export const REMINDER_KINDS = ['request-reminder', 'group-walk-reminder'] as const
export type ReminderKind = (typeof REMINDER_KINDS)[number]
