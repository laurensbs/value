import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { QuizForm } from '@/components/QuizForm'
import { safeNext } from '@/lib/site'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('quiz')
  return { title: t('title') }
}

/**
 * The safety quiz. Right after signing up, and from a dog's page, it comes with `next`: where to go
 * once it is done (the dogs, or back to that dog), and a way to do it later.
 */
export default async function QuizPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: asked } = await searchParams
  const viewer = await requireOnboarded('/profile/quiz')
  const t = await getTranslations()
  const next = asked ? safeNext(asked, '/dogs') : null
  const passed = Boolean(viewer.profile.quizPassedAt)
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        {next ? null : (
          <Link href="/profile" className="link-button">
            ← {t('profile.title')}
          </Link>
        )}
        <h1>{t('quiz.title')}</h1>
        <p className="lede">{t('quiz.lede')}</p>
        {passed ? <p className="notice success">{t('quiz.alreadyPassed')}</p> : null}
      </header>
      <QuizForm next={next ?? '/dogs'} />
      {next && !passed ? (
        <p className="muted small">
          <Link href={next}>{t('quiz.later')}</Link> · {t('quiz.laterHint')}
        </p>
      ) : null}
    </div>
  )
}
