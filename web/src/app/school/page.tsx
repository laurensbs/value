import '../school.css'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { SchoolIcon } from '@/components/school/LessonArt'
import { LessonPath } from '@/components/school/LessonPath'
import { pageMetadata } from '@/lib/seo'
import { lessonsDoneBy } from '@/server/lessons'
import { getViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('school')
  return pageMetadata({ path: '/school', title: t('title'), description: t('metaDescription') })
}

/**
 * The Hondenschool: five short lessons about walking safely, the same as in the iPhone app, and the
 * safety quiz as the last stop. Open to everyone; lesson 1 works without an account.
 */
export default async function SchoolPage() {
  const viewer = await getViewer()
  if (viewer?.profile?.bannedAt) redirect('/banned')
  const signedIn = Boolean(viewer?.profile)
  const [t, done] = await Promise.all([getTranslations('school'), viewer && signedIn ? lessonsDoneBy(viewer.userId) : []])

  return (
    <div className="narrow-page stack-l school-page">
      <header className="stack-s">
        <span className="school-mark" aria-hidden="true">
          <SchoolIcon name="school" size={28} />
        </span>
        <h1>{t('title')}</h1>
        <p className="lede">{t('lede')}</p>
        {signedIn ? null : <p className="muted">{t('guest')}</p>}
      </header>
      <LessonPath serverDone={done} signedIn={signedIn} quizPassed={Boolean(viewer?.profile?.quizPassedAt)} />
    </div>
  )
}
