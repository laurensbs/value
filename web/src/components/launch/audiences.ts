// Shared by the outreach server actions and the launch hub's client components.

/** Who a message or contact is for. Stored in outreach_contact.audience: never rename. */
export const AUDIENCES = ['shelter', 'vet', 'student', 'neighbourhood', 'press'] as const
export type Audience = (typeof AUDIENCES)[number]

/** te sturen → verstuurd → antwoord → afspraak. Only ever changed by the admin's own click. */
export const CONTACT_STATUSES = ['todo', 'sent', 'replied', 'meeting'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

/** A contact as the client components get it (dates as ISO strings). */
export interface ContactJson {
  id: string
  audience: Audience
  name: string
  organisation: string
  email: string | null
  phone: string | null
  city: string
  status: ContactStatus
  lastContactAt: string | null
  note: string
  createdAt: string
}

export function isAudience(value: unknown): value is Audience {
  return typeof value === 'string' && (AUDIENCES as readonly string[]).includes(value)
}

export function isContactStatus(value: unknown): value is ContactStatus {
  return typeof value === 'string' && (CONTACT_STATUSES as readonly string[]).includes(value)
}
