import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { QUIZ } from '@/lib/quiz'
import { apiMember, fail, json } from '@/server/api'
import { submitQuiz } from '@/server/actions/profile'

/** The safety quiz in the caller's language. The right answers stay on the server. */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const t = await getTranslations('quiz')
  return json({
    title: t('title'),
    lede: t('lede'),
    passed: Boolean(viewer.profile.quizPassedAt),
    questions: QUIZ.map((q) => ({
      id: q.id,
      question: t(`q.${q.id}.q`),
      options: Array.from({ length: q.options }, (_, i) => t(`q.${q.id}.a${i}`)),
    })),
  })
}

export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { answers?: Record<string, unknown> } | null
  if (!body?.answers) return fail('invalid')
  const form = new FormData()
  for (const [id, value] of Object.entries(body.answers)) if (typeof value === 'number') form.set(`q-${id}`, String(value))
  const result = await submitQuiz({ ok: false }, form)
  return json({ passed: result.ok, wrong: result.wrong ?? [] })
}
