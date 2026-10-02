import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiMember, fail, json } from '@/server/api'
import { cancelRequest, respondToRequest, setTrust } from '@/server/actions/requests'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['accept', 'decline', 'cancel']) }),
  z.object({ action: z.literal('trust'), dogId: z.string().min(1), walkerId: z.string().min(1), idSeen: z.boolean(), soloAllowed: z.boolean() }),
])

/** Accept, decline or cancel an appointment, or (after meeting) record ID seen and allow solo walks. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('invalid')
  const b = parsed.data
  const result =
    b.action === 'cancel'
      ? await cancelRequest(id)
      : b.action === 'trust'
        ? await setTrust(b.dogId, b.walkerId, { idSeen: b.idSeen, soloAllowed: b.soloAllowed })
        : await respondToRequest(id, b.action)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid', result.error === 'forbidden' ? 403 : 400)
}
