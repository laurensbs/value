import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { logCare } from '@/server/walks'

/**
 * The walk report: { kind: 'pee' | 'poo' | 'water', delta: 1 | -1 } from the walker during an
 * active walk. Returns the new tally { pee, poo, water }; the owner reads it from the live feed.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as { kind?: unknown; delta?: unknown } | null
  const care = await logCare(id, viewer, body?.kind, body?.delta ?? 1)
  return care ? json(care) : fail('not-now', 403)
}
