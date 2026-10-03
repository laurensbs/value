import { NextResponse } from 'next/server'
import { dbMode, isDemoMode, ready } from '@/db'
import { enabledSocialProviders } from '@/lib/auth'

export async function GET() {
  await ready()
  return NextResponse.json({
    ok: true,
    database: dbMode(),
    demoMode: isDemoMode(),
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    socialLogin: enabledSocialProviders,
    // Where this function runs (also in Vercel's x-vercel-id header): to check it sits next to the database.
    region: process.env.VERCEL_REGION ?? null,
  })
}
