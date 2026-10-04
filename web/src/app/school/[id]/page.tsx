import '../../school.css'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { LessonArt } from '@/components/school/LessonArt'
import { LessonPlayer } from '@/components/school/LessonPlayer'
import { SoftWall } from '@/components/school/SoftWall'
import { GUEST_LESSON, lessonById } from '@/lib/lessons'
import { APP_NAME, safeNext } from '@/lib/site'
import { lessonsDoneBy } from '@/server/lessons'
import { getViewer } from '@/server/session'

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const t = await getTranslations()
  const lesson = lessonById(id)
  const title = lesson ? t(`school.lessons.${lesson.id}.title`) : id === 'quiz' ? t('quiz.title') : t('school.title')
  // The path (/school) is the page for search engines; a lesson is a step inside it.
  return { title: `${title} · ${t('school.title')}`, robots: { index: false } }
}

/**
 * One lesson of the Hondenschool, full screen. Without an account only lesson 1 plays; the others,
 * and the quiz stop, show what an account adds. `back` brings someone who came from the quiz back to it.
 */
export default async function LessonPage({ params, searchParams }: Params) {
  const [{ id }, query, viewer] = await Promise.all([params, searchParams, getViewer()])
  if (viewer?.profile?.bannedAt) redirect('/banned')
  const signedIn = Boolean(viewer?.profile)
  const t = await getTranslations()

  if (id === 'quiz') {
    if (signedIn) redirect('/profile/quiz?next=%2Fschool')
    // With an account, walkers do the quiz right after signing up, and then come back to the path.
    return <GuestWall title={t('quiz.title')} next="/school" close={t('school.notNow')} art={{ kind: 'icon', icon: 'shield' }} />
  }

  const lesson = lessonById(id)
  if (!lesson) notFound()
  if (!viewer || !signedIn) {
    if (lesson.id !== GUEST_LESSON) {
      return <GuestWall title={t(`school.lessons.${lesson.id}.title`)} next={`/school/${lesson.id}`} close={t('school.notNow')} art={{ kind: 'icon', icon: lesson.icon }} />
    }
  }

  const back = safeNext(query.back, '/school')
  const done = viewer && signedIn ? await lessonsDoneBy(viewer.userId) : []
  return (
    <div className="narrow-page">
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        app={APP_NAME}
        signedIn={signedIn}
        serverDone={done}
        quizPassed={Boolean(viewer?.profile?.quizPassedAt)}
        back={back}
        fromQuiz={back.startsWith('/profile/quiz')}
      />
    </div>
  )
}

/** A lesson after lesson 1, or the quiz, without an account: the same calm wall as after lesson 1. */
function GuestWall({ title, next, close, art }: { title: string; next: string; close: string; art: Parameters<typeof LessonArt>[0]['art'] }) {
  return (
    <div className="narrow-page">
      <div className="lesson stack">
        <div className="lesson-top">
          <Link href="/school" className="lesson-close">
            <Icon name="close" size={20} /> {close}
          </Link>
        </div>
        <h1 className="lesson-name">{title}</h1>
        <div className="lesson-done stack">
          <span className="lesson-done-art">
            <LessonArt art={art} size={112} />
          </span>
          <SoftWall next={next} />
        </div>
      </div>
    </div>
  )
}
