import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ChatThread } from '@/components/ChatThread'
import { DogPortrait } from '@/components/DogPortrait'
import { ReportButton } from '@/components/ReportButton'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { CHAT_MAX_LENGTH, chatAccess, chatMessages, markChatRead } from '@/server/chat'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('chat')
  return { title: t('label') }
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/chat/${id}`)
  const access = await chatAccess(id, viewer)
  if (!access) notFound()
  const { dog, request } = access
  const t = await getTranslations('chat')

  // Who the viewer is talking to: the walker, or the owner, or the shelter.
  const db = await getDb()
  const shelter = access.isWalker && dog.orgId ? dog.orgId : null
  const otherId = shelter ? null : access.isWalker ? dog.ownerId : request.walkerId
  let other = ''
  if (shelter) {
    const [org] = await db.select({ name: s.organization.name }).from(s.organization).where(eq(s.organization.id, shelter))
    other = org?.name ?? ''
  } else if (otherId) {
    const [p] = await db.select({ name: s.profile.firstName }).from(s.profile).where(eq(s.profile.userId, otherId))
    other = p?.name ?? ''
  }
  const messages = await chatMessages(id)
  await markChatRead(id, viewer.userId)

  return (
    <div className="narrow-page chat-page">
      <header className="chat-head">
        <Link href={`/dogs/${dog.id}`} aria-label={dog.name}>
          <DogPortrait dog={dog} size={48} />
        </Link>
        <div className="grow">
          <h1 className="chat-title">{t('title', { dogName: dog.name })}</h1>
          {other ? <p className="muted small">{access.isWalker ? t('withOwner', { name: other }) : t('withWalker', { name: other })}</p> : null}
        </div>
        <Link href="/requests" className="link-button small">
          {t('back')}
        </Link>
      </header>
      <ChatThread
        requestId={id}
        viewerId={viewer.userId}
        dogName={dog.name}
        initial={messages}
        canSend={access.canSend}
        maxLength={CHAT_MAX_LENGTH}
      />
      <ReportButton subjectUserId={otherId} dogId={dog.id} orgId={shelter} />
    </div>
  )
}
