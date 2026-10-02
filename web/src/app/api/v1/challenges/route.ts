import { NextResponse } from 'next/server'
import { apiMember, json } from '@/server/api'
import { challengesFor } from '@/server/challenges'
import { challengesJson } from '@/server/progress-json'

/** This month's challenge for the person's town and for everyone: totals only, never who walked. */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  return json(await challengesJson(await challengesFor(viewer)))
}
