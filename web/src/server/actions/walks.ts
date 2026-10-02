'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { feedbackNeedsReview, type OwnerFeedback, type WalkerFeedback } from '@/lib/rules'
import { audit } from '../notify'
import { actionViewer } from '../session'
import { beginWalk, finishWalk, walkAccess } from '../walks'
import type { FormState } from './profile'

export async function startWalk(requestId: string): Promise<FormState> {
  const result = await beginWalk(requestId, await actionViewer())
  if (!result.ok) return result
  redirect(`/walk/${result.walkId}`)
}

export async function endWalk(walkId: string): Promise<FormState> {
  const result = await finishWalk(walkId, await actionViewer())
  if (!result.ok) return result
  revalidatePath('/requests')
  redirect(result.message === 'already-ended' ? `/walk/${walkId}` : `/walk/${walkId}?ended=1`)
}

export async function submitFeedback(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const walkId = String(form.get('walkId') ?? '')
  const access = await walkAccess(walkId, viewer)
  if (!access) return { ok: false, error: 'forbidden' }
  const role = access.isWalker ? 'walker' : 'owner'

  let answers: OwnerFeedback | WalkerFeedback
  if (role === 'owner') {
    const dogCondition = String(form.get('dogCondition'))
    if (!['happy', 'normal', 'stressed', 'injured'].includes(dogCondition)) return { ok: false, error: 'invalid' }
    answers = {
      dogCondition: dogCondition as OwnerFeedback['dogCondition'],
      onTime: form.get('onTime') === 'yes',
      wouldAgain: form.get('wouldAgain') === 'yes',
    }
  } else {
    const dogBehaviour = String(form.get('dogBehaviour'))
    if (!['easy', 'pulled', 'reactive', 'aggressive'].includes(dogBehaviour)) return { ok: false, error: 'invalid' }
    answers = {
      dogBehaviour: dogBehaviour as WalkerFeedback['dogBehaviour'],
      handoverOk: form.get('handoverOk') === 'yes',
      feltSafe: form.get('feltSafe') === 'yes',
    }
  }
  const note = String(form.get('note') ?? '').trim().slice(0, 1000)
  const flagged = feedbackNeedsReview(role, answers)
  const db = await getDb()
  await db
    .insert(s.feedback)
    .values({ id: crypto.randomUUID(), walkId, fromUserId: viewer.userId, role, answers, note, flagged })
    .onConflictDoNothing()
  if (flagged) await audit(db, viewer.userId, 'feedback.flagged', 'walk', walkId, { role })
  return { ok: true, message: 'thanks' }
}
