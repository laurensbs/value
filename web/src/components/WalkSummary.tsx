import '@/app/progress.css'
import { and, count, eq, lte } from 'drizzle-orm'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { formatWalkDistance } from '@/lib/geo'
import { bondFor } from '@/lib/progress'
import { progressFor } from '@/server/progress'
import { progressJson } from '@/server/progress-json'
import type { OnboardedViewer } from '@/server/session'
import { walkPhotos, type Walk } from '@/server/walks'
import { DogPortrait } from './DogPortrait'
import { Icon } from './Icon'
import { Map } from './map'
import { LevelUp, type Celebration as LevelMoment } from './progress/LevelUp'
import { ProgressIcon } from './progress/ProgressIcon'
import { WalkDone } from './progress/WalkDone'
import { ReportButton } from './ReportButton'
import { MoodCheck, WalkFeedback } from './WalkFeedback'
import { WalkCareTally } from './WalkCare'
import { WalkPhotoStrip } from './WalkPhotos'

interface Props {
  walk: Walk
  dog: { id: string; name: string; photos: string[]; avatar: unknown; ownerId: string | null; orgId: string | null }
  route: { lat: number; lng: number }[]
  role: 'walker' | 'owner'
  viewer: OnboardedViewer
  otherUserId: string | null
  fallbackCenter: { lat: number; lng: number }
  /** Right after the walker ended the walk: "Goed rondje!" with a private mood check, like the iPhone app. */
  justEnded?: { points: number | null; celebration: LevelMoment | null } | null
}

/**
 * After a walk: what it earned and how the friendship with the dog grows, the route, private
 * feedback from both sides, (for walkers) a mood check, and the obvious next step: the next walk.
 */
export async function WalkSummary({ walk, dog, route, role, viewer, otherUserId, fallbackCenter, justEnded }: Props) {
  const t = await getTranslations()
  const locale = await getLocale()
  const db = await getDb()
  const viewerId = viewer.userId
  const [[given], progress, [together]] = await Promise.all([
    db
      .select({ id: s.feedback.id })
      .from(s.feedback)
      .where(and(eq(s.feedback.walkId, walk.id), eq(s.feedback.fromUserId, viewerId))),
    progressFor(viewer),
    // Walks this walker and this dog did together, up to and including this one.
    db
      .select({ n: count() })
      .from(s.walk)
      .where(and(eq(s.walk.walkerId, walk.walkerId), eq(s.walk.dogId, walk.dogId), eq(s.walk.status, 'ended'), lte(s.walk.startedAt, walk.startedAt))),
  ])
  const json = await progressJson(progress)
  const photos = (await walkPhotos(walk.id)).map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() }))
  const minutes = Math.max(1, Math.round(((walk.endedAt ?? new Date()).getTime() - walk.startedAt.getTime()) / 60_000))
  const earned = progress.byWalk[walk.id] ?? 0
  const walksTogether = together?.n ?? 0
  const bond = bondFor(walksTogether)
  const newBond = walksTogether > 1 && bondFor(walksTogether - 1) !== bond
  const celebrate = progress.levelUp || progress.newAwards.length > 0
  const week = progress.weeklyGoal != null && role === 'walker'
  const distance = formatWalkDistance(walk.distanceM ?? 0, locale)
  // "Goed rondje!" right after ending. A new level or badge comes after it, once the walker moves on
  // (WalkDone shows it then), never on top of it. One party after a walk: LevelUp, with paws, like the app.
  const done = role === 'walker' && justEnded ? justEnded : null
  const moment: LevelMoment | null = celebrate
    ? {
        level: json.level.number,
        name: json.level.name,
        levelUp: progress.levelUp,
        awards: json.newAwards.map((a) => ({ key: a.key, title: a.title, color: a.color })),
      }
    : null

  return (
    <div className="narrow-page stack-l">
      {done ? (
        <WalkDone
          walkId={walk.id}
          dogName={dog.name}
          distance={(walk.distanceM ?? 0) < SHORT_WALK_M ? null : distance}
          points={null}
          feedbackGiven={Boolean(given)}
          celebration={done.celebration ?? moment}
        />
      ) : (
        // Right after the walk "Goed rondje!" tells the moment, so this head (saying the same) is only
        // for coming back to the walk later.
        <header className="summary-head">
          <DogPortrait dog={dog} size={88} />
          <div className="stack-s">
            <p className="eyebrow">{t('walk.ended')}</p>
            <h1>{t('walk.with', { name: dog.name })}</h1>
            <p className="lede">
              {t('walk.endedText', { name: dog.name, distance, minutes })}
            </p>
          </div>
        </header>
      )}
      {earned > 0 ? (
        <section className="points-card" aria-labelledby="points-title">
          <span className="points-burst" aria-hidden="true">
            +{earned}
          </span>
          <div className="stack-s">
            <p id="points-title">
              <strong>{t('progress.walkPoints', { n: earned })}</strong>{' '}
              {role === 'walker' ? t('progress.walkPointsText') : t('progress.walkPointsOwner', { dog: dog.name })}
            </p>
            <Link href="/progress" className="level-line">
              <span className="level-badge" style={{ '--p': json.level.progress } as React.CSSProperties}>
                {json.level.number}
              </span>
              <span className="small">
                <strong>{json.level.name}</strong>
                <span className="muted">
                  {' · '}
                  {json.level.next != null && json.level.nextName
                    ? t('progress.toNext', { n: json.level.next - json.points, name: json.level.nextName })
                    : t('progress.top')}
                </span>
              </span>
            </Link>
          </div>
        </section>
      ) : null}
      {role === 'walker' ? (
        <div className="summary-facts">
          <p className={`bond-line${newBond ? ' new' : ''}`}>
            <Icon name="heart" size={18} />
            <span>
              {newBond
                ? t('progress.friends.newBond', { dog: dog.name, bond: lowerFirst(t(`progress.friends.bond.${bond}`), locale) })
                : `${t('progress.friends.withDog', { dog: dog.name })}: ${t(`progress.friends.bond.${bond}`)}`}
              <span className="muted"> · {t('progress.friends.walks', { n: walksTogether })}</span>
            </span>
          </p>
          {week ? (
            <p className="bond-line">
              <Icon name="calendar" size={18} />
              <span>
                {progress.walksThisWeek >= (progress.weeklyGoal ?? 0)
                  ? t('progress.weekDone')
                  : t('progress.weekLeft', { n: (progress.weeklyGoal ?? 0) - progress.walksThisWeek })}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {route.length > 1 ? (
        <Map
          center={route[0] ?? fallbackCenter}
          route={route}
          markers={[
            { id: 'start', ...route[0], label: t('walk.startPoint'), kind: 'pin' },
            { id: 'end', ...route[route.length - 1], label: t('walk.endPoint'), kind: 'walker' },
          ]}
          fitToRoute
          className="map"
          ariaLabel={t('walk.mapLabel')}
        />
      ) : null}
      <WalkCareTally care={{ pee: walk.pee, poo: walk.poo, water: walk.water }} hideEmpty />
      <WalkPhotoStrip photos={photos} dogName={dog.name} />
      {role === 'walker' && !done ? <MoodCheck walkId={walk.id} /> : null}
      <div id="feedback" className="feedback-anchor">
        {given ? (
          <p className="notice success">{t('walk.thanks')}</p>
        ) : (
          <WalkFeedback walkId={walk.id} role={role} dogName={dog.name} />
        )}
      </div>
      {role === 'walker' && !done ? (
        <Link href={`/breathe?next=${encodeURIComponent(`/walk/${walk.id}`)}`} className="walk-done-breathe">
          <ProgressIcon name="breathe" size={18} /> {t('walkDone.breathe')}
        </Link>
      ) : null}
      <div className="row">
        {role === 'walker' ? (
          <Link href={`/dogs/${dog.id}#plan`} className="button primary">
            <Icon name="calendar" size={18} />
            {t('walk.again', { name: dog.name })}
          </Link>
        ) : null}
        <Link href="/" className="button secondary">
          {t('nav.today')}
        </Link>
      </div>
      <ReportButton walkId={walk.id} subjectUserId={otherUserId} dogId={dog.id} />
      {moment && !done ? <LevelUp celebration={moment} /> : null}
    </div>
  )
}

/** Under this, "Goed rondje!" thanks without a distance: "0 m" reads like the walk didn't count. */
const SHORT_WALK_M = 50

/** "Wandelmaatjes" as a label, "wandelmaatjes" in the middle of a sentence. */
function lowerFirst(text: string, locale: string): string {
  return text.charAt(0).toLocaleLowerCase(locale) + text.slice(1)
}
