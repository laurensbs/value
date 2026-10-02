import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import type { upcomingGroupWalks } from '@/server/queries'
import { Icon } from '../Icon'

type GroupWalks = Awaited<ReturnType<typeof upcomingGroupWalks>>

/** Upcoming group walks at shelters, side by side like in the app. A calm way to start. */
export async function GroupWalkRow({ walks }: { walks: GroupWalks }) {
  if (!walks.length) return null
  const t = await getTranslations()
  const format = await getFormatter()
  return (
    <section className="gw-section" aria-labelledby="gw-title">
      <div className="section-head">
        <div>
          <h2 id="gw-title">{t('nav.groupWalks')}</h2>
          <p className="muted small">{t('discover.groupWalksText')}</p>
        </div>
        <Link href="/group-walks" className="link-button small">
          {t('discover.allGroupWalks')}
        </Link>
      </div>
      <ul className="gw-scroll">
        {walks.slice(0, 6).map((gw) => {
          const left = Math.max(0, gw.capacity - gw.booked)
          return (
            <li key={gw.id}>
              <Link href={`/dogs?org=${gw.orgId}`} className="gw-card">
                <span className="gw-org">
                  <Icon name="users" size={18} />
                  <span>{gw.orgName}</span>
                </span>
                <strong>{format.dateTime(gw.startsAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                <span className="muted small gw-place">{gw.meetingPoint}</span>
                <span className="gw-foot">
                  <span className={`pill ${left === 0 ? 'danger' : 'green'}`}>{t('groupWalks.spots', { left })}</span>
                  {gw.isDemo ? <span className="dcard-tag">{t('common.example')}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
