import { NextResponse } from 'next/server'
import { apiMember, json } from '@/server/api'
import { progressFor } from '@/server/progress'
import { progressJson } from '@/server/progress-json'

/** Points, level, badges, the week and the first steps. Private: only for the person themselves. */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  return json(await progressJson(await progressFor(viewer)))
}
