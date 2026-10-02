export type NotificationData = {
  walkId?: string
  dogId?: string
  dogName?: string
  walkerName?: string
  senderName?: string
  requestId?: string
  orgId?: string
  orgName?: string
}

/** Where a notification leads: in the app and in the email about it. */
export function notificationHref(kind: string, data: NotificationData): string {
  if (kind.startsWith('request-')) return '/requests'
  if (kind === 'chat-message' && data.requestId) return `/chat/${data.requestId}`
  if (kind === 'walk-started' || kind === 'walk-overdue' || kind === 'walk-ended' || kind === 'walk-photo') return data.walkId ? `/walk/${data.walkId}` : '/requests'
  if (kind === 'trust-granted' && data.dogId) return `/dogs/${data.dogId}`
  if (kind === 'org-verified' && data.orgId) return `/shelter/${data.orgId}`
  if (kind === 'group-signup') return '/shelter'
  if (kind === 'org-pending') return '/admin'
  if ((kind === 'shelter-joined' || kind === 'group-walk-new') && data.orgId) return `/dogs?org=${data.orgId}`
  return '/requests'
}

/** Notifications that are also sent by email: someone is waiting for an answer, or it is about safety. */
export const EMAIL_KINDS = ['request-new', 'request-accepted', 'walk-overdue', 'org-verified', 'org-pending', 'shelter-joined', 'chat-message'] as const
