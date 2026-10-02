import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { QuizForm } from '@/components/QuizForm'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('quiz')
  return { title: t('title') }
}

export default async function QuizPage() {
  const viewer = await requireOnboarded('/profile/quiz')
  const t = await getTranslations()
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <Link href="/profile" className="link-button">
          ← {t('profile.title')}
        </Link>
        <h1>{t('quiz.title')}</h1>
        <p className="lede">{t('quiz.lede')}</p>
        {viewer.profile.quizPassedAt ? <p className="notice success">{t('quiz.alreadyPassed')}</p> : null}
      </header>
      <QuizForm />
    </div>
  )
}
