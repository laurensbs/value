import Link from 'next/link'
import { FollowUpButton } from '@/components/hub/FollowUpButton'
import { HubIcon } from '@/components/hub/HubIcon'
import { InstallTip } from '@/components/hub/InstallTip'
import { TaskCard } from '@/components/hub/TaskCard'
import { fmt, MedalGrid, Ring, SectionHead, Tile } from '@/components/hub/bits'
import { localParts } from '@/lib/progress'
import { daysSince, followUpsDue, milestoneViews, moneyPicture, nextMilestone, nextTasks, partnerList, phaseProgress, waitingTasks, weekRhythm, euro } from '@/lib/hub/game'
import { getHub, hubStats } from '@/server/hub'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'

export const metadata = { title: 'Vandaag' }

function greeting(hour: number): string {
  if (hour < 6) return 'Goedenacht'
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export default async function HubToday() {
  const now = new Date()
  const viewer = await getViewer()
  const [hub, stats, native] = await Promise.all([getHub(), hubStats(viewer?.profile?.referralCode ?? null, now), isNativeRequest()])
  const { state, level, xp } = hub
  const waiting = waitingTasks()
  const waitingOpen = waiting.filter((t) => !state.tasks[t.id]).length
  const partners = partnerList(state, now)
  const due = followUpsDue(partners, now)
  const steps = nextTasks(state, 3)
  const week = weekRhythm(state, now)
  const phases = phaseProgress(state)
  const current = phases.find((p) => !p.complete)
  const milestones = milestoneViews(state, hub.counts)
  const reached = milestones.filter((m) => m.reachedAt).sort((a, b) => (b.reachedAt ?? '').localeCompare(a.reachedAt ?? ''))
  const upNext = nextMilestone(milestones)
  const money = moneyPicture(state.costs, state.income, stats.walks.month, stats.walks.walkersMonth)
  const toGo = level.next !== null ? level.next - xp.total : 0
  const pipeline = {
    mailed: partners.filter((p) => p.state.status !== 'doel').length,
    talking: partners.filter((p) => p.state.status === 'reactie' || p.state.status === 'gesprek').length,
    yes: partners.filter((p) => p.state.status === 'partner').length,
  }

  return (
    <div className="hub-page">
      <section className="hub-hero" aria-label="Jouw niveau">
        <span className="level-badge" style={{ '--p': level.progress } as React.CSSProperties} aria-hidden="true">
          {level.level}
        </span>
        <div>
          <p className="small">
            {greeting(localParts(now).hour)} {state.settings.jouwNaam}
          </p>
          <h1>
            Niveau {level.level}: {level.name}
          </h1>
          <p className="small">
            {level.next !== null ? `${fmt(xp.total)} punten. Nog ${fmt(toGo)} tot ${level.nextName}.` : `${fmt(xp.total)} punten. Het hoogste niveau.`}
          </p>
          <span className="level-progress" aria-hidden="true">
            <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
          </span>
          <div className="hub-xp-parts">
            <span>Stappen {xp.tasks}</span>
            <span>Partners {xp.partners}</span>
            <span>Content {xp.content}</span>
            <span>Mijlpalen {xp.milestones}</span>
          </div>
        </div>
      </section>

      <InstallTip />

      <section className="hub-section hub-waiting" aria-labelledby="hub-waiting-title">
        <header>
          <h2 id="hub-waiting-title">Wacht op jou</h2>
          <span className="pill">{waitingOpen ? `${waitingOpen} van ${waiting.length} open` : 'Alles gedaan'}</span>
        </header>
        <p className="muted small">
          {waitingOpen ? 'Hier wacht de rest op. Alleen jij kunt ze doen: ze kosten geld, staan op jouw naam, of het is jouw keuze.' : 'Alles wat op jou wachtte is gedaan.'}
        </p>
        <ul className="hub-tasks" aria-label="Wacht op jou">
          {waiting.map((t) => (
            <TaskCard key={t.id} task={t} done={Boolean(state.tasks[t.id])} auto={Boolean(state.tasks[t.id]?.auto)} />
          ))}
        </ul>
      </section>

      <section className="hub-section">
        <SectionHead title="Jouw volgende stappen" href="/hub/plan" linkLabel="Heel het plan" />
        {current ? (
          <p className="muted small">
            Je zit in fase <b>{current.title}</b>: {current.done} van {current.total} stappen gedaan.
          </p>
        ) : null}
        {steps.length ? (
          <ul className="hub-tasks">
            {steps.map((t) => (
              <TaskCard key={t.id} task={t} done={Boolean(state.tasks[t.id])} auto={Boolean(state.tasks[t.id]?.auto)} />
            ))}
          </ul>
        ) : (
          <p className="hub-empty">Alle stappen van het plan zijn gedaan. Tijd voor een feestje, en een nieuw plan.</p>
        )}
      </section>

      {due.length ? (
        <section className="hub-section">
          <SectionHead title="Even opvolgen" href="/hub/partners" linkLabel="Partners" />
          <p className="muted small">Een week geen antwoord. Een vriendelijk mailtje helpt vaak; na twee keer laat de hub het los.</p>
          <ul className="hub-list">
            {due.map((p) => (
              <li key={p.id} className="hub-item">
                <div className="hub-item-head">
                  <div>
                    <h3>{p.name}</h3>
                    <p className="muted small">Gemaild {daysSince(p.state.lastContactAt ?? p.state.mailedAt, now)} dagen geleden</p>
                  </div>
                  <span className="pill warn">Opvolgen</span>
                </div>
                <div className="hub-actions">
                  <Link href={`/hub/mails?t=opvolgen&p=${p.id}`} className="button primary small">
                    <HubIcon name="mail" size={16} /> Opvolgmail
                  </Link>
                  <FollowUpButton id={p.id} name={p.name} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="hub-section">
        <SectionHead title="Deze week" />
        <div className="hub-rings">
          <Ring now={week.mails} goal={week.mailsGoal} label="Mails" />
          <Ring now={week.videos} goal={week.videosGoal} label="Video’s" />
          <Ring now={week.tasks} goal={0} label="Stappen gezet" />
        </div>
        <p className="hub-note">Geen reeksen: een week zonder mails is gewoon een week. Je weekdoel pas je aan bij Jij.</p>
      </section>

      <section className="hub-section">
        <SectionHead title="Rondje in cijfers" href="/hub/cijfers" linkLabel="Alle cijfers" />
        <div className="hub-tiles">
          <Tile value={fmt(stats.walks.week)} label="Rondjes deze week" trend={{ now: stats.walks.week, before: stats.walks.lastWeek }} accent href="/hub/cijfers" />
          <Tile value={fmt(stats.people.newWeek)} label="Nieuwe mensen" trend={{ now: stats.people.newWeek, before: stats.people.newLastWeek }} href="/hub/cijfers" />
          <Tile value={fmt(stats.dogs.total)} label="Honden online" sub={`${stats.dogs.owner} van eigenaren, ${stats.dogs.shelter} uit opvangen`} href="/hub/cijfers" />
          <Tile value={fmt(stats.steady.pairs)} label="Vaste koppels" sub="3+ rondjes samen in 8 weken" href="/hub/cijfers" />
        </div>
      </section>

      <section className="hub-section">
        <SectionHead title={native ? 'Partners' : 'Partners en geld'} />
        <div className="hub-tiles">
          <Tile value={`${pipeline.mailed}/${partners.length}`} label="Partners gemaild" href="/hub/partners" />
          <Tile value={fmt(pipeline.talking)} label="In gesprek" href="/hub/partners" />
          <Tile value={fmt(pipeline.yes)} label="Doen mee" sub={pipeline.yes ? undefined : 'Nog niemand: alles is nog een doel'} href="/hub/partners" />
          {/* The app shells never show anything about money (App Store and Play rules). */}
          {native ? null : (
            <Tile value={euro(money.costPerMonth)} label="Kosten per maand" sub={money.costPerMonth > 0 ? `${money.membersNeeded} leden nodig om dit te dekken` : undefined} href="/hub/kosten" />
          )}
        </div>
      </section>

      <section className="hub-section">
        <SectionHead title="Mijlpalen" href="/hub/plan#mijlpalen" linkLabel="Allemaal" />
        {upNext ? (
          <p className="muted small">
            Volgende: <b>{upNext.title}</b> ({fmt(upNext.now)} van {fmt(upNext.goal)}).
          </p>
        ) : null}
        <MedalGrid items={[...reached.slice(0, 3), ...(upNext ? [upNext] : [])]} />
      </section>
    </div>
  )
}
