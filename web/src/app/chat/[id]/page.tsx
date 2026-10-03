import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ChatThread } from '@/components/ChatThread'
import { DogPortrait } from '@/components/DogPortrait'
import { ReportButton } from '@/components/ReportButton'
import { CHAT_MAX_LENGTH, chatAccess, chatMessages, chatSuggestions, markChatRead, partnerOf } from '@/server/chat'
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
  const { dog } = access
  const t = await getTranslations('chat')

  // Who the viewer is talking to: the walker, or the owner, or the shelter.
  const { name: other, userId: otherId, orgId: shelter } = await partnerOf(access)
  const messages = await chatMessages(id)
  const suggestions = await chatSuggestions(access, messages, viewer.userId)
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
        suggestions={suggestions}
      />
      <ReportButton subjectUserId={otherId} dogId={dog.id} orgId={shelter} />
    </div>
  )
}
