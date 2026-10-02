/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import '../../progress.css'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { DogFace } from '@/components/DogFace'
import { ProgressIcon, type ProgressIconName } from '@/components/progress/ProgressIcon'
import { lookFor, tileFor } from '@/lib/avatar'
import { formatWalkDistance } from '@/lib/geo'
import { bondFor } from '@/lib/progress'
import { requireOnboarded } from '@/server/session'
import { dogFriendsOf } from './dog-friends'

export async function generateMetadata() {
  const t = await getTranslations('friends')
  return { title: t('title'), robots: { index: false } }
}

const BOND_ICONS: Record<ReturnType<typeof bondFor>, ProgressIconName> = {
  met: 'wave',
  buddies: 'walker',
  good: 'heart',
  best: 'star',
}

/** "Hondenvriendenboek": every dog you walked with, like pages in a friendship book. */
export default async function FriendsPage() {
  const viewer = await requireOnboarded('/profile/friends')
  const friends = await dogFriendsOf(viewer.userId)
  const t = await getTranslations()
  const format = await getFormatter()
  const locale = await getLocale()
  const walks = friends.reduce((n, f) => n + f.walks, 0)
  const meters = friends.reduce((n, f) => n + f.meters, 0)

  return (
    <div className="narrow-page stack-l friends-page">
      <header className="stack-s">
        <Link href="/profile" className="link-button">
          ← {t('profile.title')}
        </Link>
        <h1>{t('friends.title')}</h1>
        <p className="lede">{t('friends.lede')}</p>
      </header>

      {friends.length === 0 ? (
        <section className="card friends-empty stack">
          <span className="friends-empty-icon" aria-hidden="true">
            <ProgressIcon name="book" size={34} />
          </span>
          <h2>{t('friends.emptyTitle')}</h2>
          <p className="muted">{t('friends.emptyText')}</p>
          <div>
            <Link href="/dogs" className="button primary">
              <ProgressIcon name="paw" size={18} /> {t('friends.emptyCta')}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <dl className="stat-tiles">
            <div>
              <dt>{t('friends.statFriends', { n: friends.length })}</dt>
              <dd>{friends.length}</dd>
            </div>
            <div>
              <dt>{t('friends.statWalks', { n: walks })}</dt>
              <dd>{walks}</dd>
            </div>
            <div>
              <dt>{t('friends.statDistance')}</dt>
              <dd>{formatWalkDistance(meters, locale)}</dd>
            </div>
          </dl>
          <ul className="friend-grid">
            {friends.map((f) => {
              const bond = bondFor(f.walks)
              return (
                <li key={f.dog.id}>
                  <Link href={`/dogs/${f.dog.id}`} className="friend-card">
                    <span className="friend-photo" style={{ '--tile': tileFor(f.dog.id) } as CSSProperties}>
                      {f.dog.photos[0] ? <img src={f.dog.photos[0]} alt="" /> : <DogFace look={lookFor(f.dog)} size={112} />}
                      <span className="friend-times">{t('friends.times', { n: f.walks })}</span>
                    </span>
                    <strong className="friend-name">{f.dog.name}</strong>
                    <span className="friend-bond">
                      <ProgressIcon name={BOND_ICONS[bond]} size={14} /> {t(`progress.friends.bond.${bond}`)}
                    </span>
                    <span className="muted small">{t('progress.friends.walks', { n: f.walks })}</span>
                    {f.lastAt ? (
                      <span className="muted small">{t('friends.last', { date: format.dateTime(f.lastAt, { day: 'numeric', month: 'long' }) })}</span>
                    ) : null}
                    {f.firstAt ? (
                      <span className="muted small">{t('friends.since', { date: format.dateTime(f.firstAt, { month: 'long', year: 'numeric' }) })}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <p className="muted small private-note">
        <ProgressIcon name="lock" size={15} /> {t('friends.private')}
      </p>
    </div>
  )
}
