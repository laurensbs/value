'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isCountry } from '@/lib/countries'
import { directoryEntry } from '@/lib/directory'
import { ALL_TASKS, PARTNER_STATUSES, PARTNER_TARGETS, PARTNER_TYPES, VIDEO_STATUSES, VIDEOS, type PartnerType } from '@/lib/hub/content'
import { followedUp, moveContent, movePartner, type HubState } from '@/lib/hub/game'
import { deleteEntry, deleteLaunchContact, loadHubState, putEntry, putLaunchTask } from '../hub'
import { getViewer } from '../session'

// Everything here changes only the founder's own notes: hub_entry, and the checklist and contacts
// of the former launch hub (launch_task, outreach_contact). Nothing is ever sent.

async function admin() {
  const viewer = await getViewer()
  if (!viewer?.isAdmin) throw new Error('not-allowed')
  return viewer
}

// Always the latest notes, never a copy cached for the page render.
function current(): Promise<HubState> {
  return loadHubState()
}

function done() {
  revalidatePath('/hub', 'layout')
}

export interface HubResult {
  ok: boolean
  /** Points earned by this step (0 when none). */
  xp?: number
  error?: string
}

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || z.email().safeParse(v).success)
  .default('')
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || z.url({ protocol: /^https?$/ }).safeParse(v).success)
  .default('')

const taskId = z.string().refine((id) => ALL_TASKS.some((t) => t.id === id))

export async function setTask(id: string, isDone: boolean): Promise<HubResult> {
  await admin()
  const parsed = taskId.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const task = ALL_TASKS.find((t) => t.id === id)!
  const state = await current()
  const now = new Date()
  // A step that ticked itself off stays done for as long as its check holds.
  if (state.tasks[id]?.auto) return { ok: true, xp: 0 }
  if (!isDone) {
    if (task.launchKey) await putLaunchTask(task.launchKey, false, now)
    else await deleteEntry('task', id)
    done()
    return { ok: true, xp: 0 }
  }
  if (state.tasks[id]) return { ok: true, xp: 0 }
  if (task.launchKey) await putLaunchTask(task.launchKey, true, now)
  else await putEntry('task', id, { doneAt: now.toISOString() })
  let xp = task.xp
  // A step that is a mail to a partner moves that partner along too.
  if (task.partner && (state.partners[task.partner]?.status ?? 'doel') === 'doel') {
    const moved = movePartner(state.partners[task.partner], 'gemaild', now)
    await putEntry('partner', task.partner, moved)
    xp += moved.xp
  }
  done()
  return { ok: true, xp }
}

const statusSchema = z.enum(PARTNER_STATUSES)
const partnerKey = z.string().regex(/^[a-z0-9-]{2,80}$/)

export async function setPartnerStatus(id: string, status: string): Promise<HubResult> {
  await admin()
  const key = partnerKey.safeParse(id)
  const st = statusSchema.safeParse(status)
  if (!key.success || !st.success) return { ok: false, error: 'invalid' }
  const state = await current()
  const prev = state.partners[id]
  if (!prev && !PARTNER_TARGETS.some((t) => t.id === id)) return { ok: false, error: 'unknown' }
  const moved = movePartner(prev, st.data, new Date())
  await putEntry('partner', id, moved)
  done()
  return { ok: true, xp: moved.xp - (prev?.xp ?? 0) }
}

export async function markFollowedUp(id: string): Promise<HubResult> {
  await admin()
  if (!partnerKey.safeParse(id).success) return { ok: false, error: 'invalid' }
  const prev = (await current()).partners[id]
  if (!prev) return { ok: false, error: 'unknown' }
  await putEntry('partner', id, followedUp(prev, new Date()))
  done()
  return { ok: true, xp: 0 }
}

const detailsSchema = z.object({
  contact: z.string().trim().max(120).default(''),
  email: optionalEmail,
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === '' || /^[+\d][\d\s().-]{5,}$/.test(v))
    .default(''),
  note: z.string().trim().max(2000).default(''),
})

export async function savePartnerDetails(id: string, form: FormData): Promise<HubResult> {
  await admin()
  if (!partnerKey.safeParse(id).success) return { ok: false, error: 'invalid' }
  const parsed = detailsSchema.safeParse({
    contact: form.get('contact') ?? '',
    email: form.get('email') ?? '',
    phone: form.get('phone') ?? '',
    note: form.get('note') ?? '',
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path[0] === 'phone' ? 'phone' : 'email' }
  const state = await current()
  const prev = state.partners[id]
  if (!prev && !PARTNER_TARGETS.some((t) => t.id === id)) return { ok: false, error: 'unknown' }
  const now = new Date().toISOString()
  await putEntry('partner', id, { ...(prev ?? { status: 'doel', xp: 0 }), ...parsed.data, updatedAt: now })
  done()
  return { ok: true }
}

const newPartnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().refine((t): t is PartnerType => Object.hasOwn(PARTNER_TYPES, t)),
  city: z.string().trim().max(80).default(''),
  email: optionalEmail,
  website: z.string().trim().max(200).default(''),
})

function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** A partner you thought of yourself. Starts as a goal: nobody has agreed to anything yet. */
export async function addPartner(form: FormData): Promise<HubResult> {
  await admin()
  const parsed = newPartnerSchema.safeParse({
    name: form.get('name'),
    type: form.get('type'),
    city: form.get('city') ?? '',
    email: form.get('email') ?? '',
    website: form.get('website') ?? '',
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const state = await current()
  const base = `eigen-${slug(parsed.data.name) || 'partner'}`
  let id = base
  for (let i = 2; state.partners[id] || PARTNER_TARGETS.some((t) => t.id === id); i++) id = `${base}-${i}`
  const now = new Date().toISOString()
  await putEntry('partner', id, {
    status: 'doel',
    xp: 0,
    name: parsed.data.name,
    type: parsed.data.type,
    city: parsed.data.city || undefined,
    email: parsed.data.email || undefined,
    website: parsed.data.website || undefined,
    updatedAt: now,
  })
  done()
  return { ok: true }
}

/** Puts a shelter from the public list (content/shelters.json) on your list of goals. */
export async function addShelterTarget(directoryId: string): Promise<HubResult> {
  await admin()
  const entry = directoryEntry(directoryId)
  if (!entry || !isCountry(entry.country)) return { ok: false, error: 'unknown' }
  const id = `opvang-${slug(entry.id)}`
  const state = await current()
  if (state.partners[id]) return { ok: true }
  await putEntry('partner', id, {
    status: 'doel',
    xp: 0,
    name: entry.name,
    type: 'opvang',
    city: entry.city ?? undefined,
    region: entry.region ?? undefined,
    country: entry.country,
    website: entry.website ?? undefined,
    note: entry.walkingProgram === 'yes' ? 'Heeft al een wandelprogramma.' : undefined,
    updatedAt: new Date().toISOString(),
  })
  done()
  return { ok: true }
}

export async function removePartner(id: string): Promise<HubResult> {
  await admin()
  if (!partnerKey.safeParse(id).success) return { ok: false, error: 'invalid' }
  // Built-in targets stay on the list; only your own can go.
  if (PARTNER_TARGETS.some((t) => t.id === id)) return { ok: false, error: 'built-in' }
  await deleteEntry('partner', id)
  if (id.startsWith('contact-')) await deleteLaunchContact(id.slice('contact-'.length))
  done()
  return { ok: true }
}

const videoStatus = z.enum(VIDEO_STATUSES)
const contentKey = z.string().regex(/^[a-z0-9-]{2,60}$/)

export async function setVideoStatus(id: string, status: string): Promise<HubResult> {
  await admin()
  const key = contentKey.safeParse(id)
  const st = videoStatus.safeParse(status)
  if (!key.success || !st.success) return { ok: false, error: 'invalid' }
  const state = await current()
  const prev = state.content[id]
  if (!prev && !VIDEOS.some((v) => v.id === id)) return { ok: false, error: 'unknown' }
  const moved = moveContent(prev, st.data, new Date())
  await putEntry('content', id, moved)
  done()
  return { ok: true, xp: moved.xp - (prev?.xp ?? 0) }
}

const videoDetails = z.object({
  link: optionalUrl,
  note: z.string().trim().max(1000).default(''),
})

export async function saveVideoDetails(id: string, form: FormData): Promise<HubResult> {
  await admin()
  if (!contentKey.safeParse(id).success) return { ok: false, error: 'invalid' }
  const parsed = videoDetails.safeParse({ link: form.get('link') ?? '', note: form.get('note') ?? '' })
  if (!parsed.success) return { ok: false, error: 'link' }
  const state = await current()
  const prev = state.content[id]
  if (!prev && !VIDEOS.some((v) => v.id === id)) return { ok: false, error: 'unknown' }
  const now = new Date().toISOString()
  await putEntry('content', id, { ...(prev ?? { status: 'idee', xp: 0 }), ...parsed.data, updatedAt: now })
  done()
  return { ok: true }
}

export async function addVideoIdea(form: FormData): Promise<HubResult> {
  await admin()
  const title = z.string().trim().min(3).max(140).safeParse(form.get('title'))
  if (!title.success) return { ok: false, error: 'invalid' }
  const state = await current()
  const base = `eigen-${slug(title.data) || 'video'}`
  let id = base
  for (let i = 2; state.content[id] || VIDEOS.some((v) => v.id === id); i++) id = `${base}-${i}`
  await putEntry('content', id, { status: 'idee', xp: 0, title: title.data, updatedAt: new Date().toISOString() })
  done()
  return { ok: true }
}

export async function removeVideoIdea(id: string): Promise<HubResult> {
  await admin()
  if (!contentKey.safeParse(id).success || VIDEOS.some((v) => v.id === id)) return { ok: false, error: 'invalid' }
  await deleteEntry('content', id)
  done()
  return { ok: true }
}

const settingsSchema = z.object({
  jouwNaam: z.string().trim().min(1).max(80),
  telefoon: z.string().trim().max(30).default(''),
  email: optionalEmail,
  website: z.string().trim().max(120).default(''),
  stad: z.string().trim().max(80).default(''),
  wijk: z.string().trim().max(80).default(''),
  mailsPerWeek: z.coerce.number().int().min(0).max(30),
  videosPerWeek: z.coerce.number().int().min(0).max(14),
})

export async function saveSettings(_prev: HubResult | null, form: FormData): Promise<HubResult> {
  await admin()
  const parsed = settingsSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.path.join('.') ?? 'invalid' }
  await putEntry('settings', 'me', parsed.data)
  done()
  return { ok: true }
}

const costLine = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  label: z.string().trim().min(1).max(80),
  amount: z.coerce.number().min(0).max(100_000),
  period: z.enum(['maand', 'jaar', 'eenmalig']),
  note: z.string().trim().max(300).default(''),
  active: z.boolean(),
})

export async function saveCosts(lines: unknown): Promise<HubResult> {
  await admin()
  const parsed = z.array(costLine).max(60).safeParse(lines)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  await putEntry('costs', 'all', { lines: parsed.data })
  done()
  return { ok: true }
}

const incomeSchema = z.object({
  members: z.coerce.number().int().min(0).max(1_000_000),
  averageGift: z.coerce.number().min(0).max(10_000),
  otherPerMonth: z.coerce.number().min(0).max(1_000_000),
})

export async function saveIncome(_prev: HubResult | null, form: FormData): Promise<HubResult> {
  await admin()
  const parsed = incomeSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: 'invalid' }
  await putEntry('income', 'me', parsed.data)
  done()
  return { ok: true }
}
