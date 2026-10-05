'use server'

import { revalidatePath } from 'next/cache'
import { actionViewer } from '../session'
import { acceptCurrentTerms } from '../terms'
import type { FormState } from './profile'

/** "Akkoord" under the changed terms: records the yes to `version`, the version that was shown (server/terms.ts). */
export async function acceptTerms(version: string): Promise<FormState> {
  let viewer
  try {
    viewer = await actionViewer()
  } catch (error) {
    if (error instanceof Error && (error.message === 'not-signed-in' || error.message === 'banned')) return { ok: false, error: error.message }
    throw error
  }
  const result = await acceptCurrentTerms(viewer.userId, viewer.profile, version)
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath('/', 'layout')
  return { ok: true }
}
