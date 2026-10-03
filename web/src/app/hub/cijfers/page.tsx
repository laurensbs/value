import Link from 'next/link'
import { HubIcon } from '@/components/hub/HubIcon'
import { Bars, fmt, Funnel, Tile } from '@/components/hub/bits'
import { COUNTRY_NAMES } from '@/components/hub/countries'
import { pct } from '@/lib/hub/game'
import { getHub, hubStats } from '@/server/hub'
import { getViewer } from '@/server/session'

export const metadata = { title: 'Cijfers' }

const DEVICE_LABELS: Record<string, string> = { web: 'Browser', apns: 'iPhone-app' }

/**
 * Everything the app's database can tell, as totals only: no names, no messages, no routes.
 * Demo accounts never count. Website visits live in Vercel Web Analytics, not here.
 */
export default async function HubNumbers() {
  const viewer = await getViewer()
  const [s, hub] = await Promise.all([hubStats(viewer?.profile?.referralCode ?? null), getHub()])
  const analyticsOn = Boolean(hub.state.tasks.analytics)
  const platformTotal = s.platform.app + s.platform.mobileWeb + s.platform.desktopWeb
  const decided = s.requests.accepted + s.requests.declined

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Cijfers</p>
        <h1>Hoe gaat het met Rondje?</h1>
        <p className="lede">Alleen totalen, rechtstreeks uit de database. Voorbeeldaccounts tellen niet mee.</p>
      </div>

      <section className="hub-section">
        <header>
          <h2>Mensen en honden</h2>
        </header>
        <div className="hub-tiles">
          <Tile value={fmt(s.people.accounts)} label="Accounts" sub={`${fmt(s.people.profiles)} met een profiel`} />
          <Tile value={fmt(s.people.walkers)} label="Willen wandelen" sub={`${fmt(s.people.quizPassed)} haalden de quiz`} />
          <Tile value={fmt(s.people.owners)} label="Hebben een hond" />
          <Tile value={fmt(s.people.newWeek)} label="Nieuw deze week" trend={{ now: s.people.newWeek, before: s.people.newLastWeek }} accent />
          <Tile value={fmt(s.dogs.total)} label="Honden online" sub={`${s.dogs.owner} eigenaren · ${s.dogs.shelter} opvang`} />
          <Tile value={fmt(s.shelters.live)} label="Opvangen live" sub={s.shelters.pending ? `${s.shelters.pending} wachten op controle` : `${s.shelters.directory} in de lijst`} />
          <Tile value={fmt(s.steady.pairs)} label="Vaste koppels" sub={`${s.steady.walksWeek} rondjes deze week`} />
          <Tile value={fmt(s.people.viaInvite)} label="Via een uitnodiging" sub={`${s.people.viaYourLink} via jouw link of flyer`} />
        </div>
      </section>

      <section className="hub-section">
        <header>
          <h2>Rondjes</h2>
        </header>
        <div className="hub-tiles">
          <Tile value={fmt(s.walks.week)} label="Deze week" trend={{ now: s.walks.week, before: s.walks.lastWeek }} accent />
          <Tile value={fmt(s.walks.total)} label="Totaal" />
          <Tile value={`${fmt(s.walks.km)} km`} label="Samen gelopen" />
          <Tile value={fmt(s.walks.walkersMonth)} label="Actieve wandelaars" sub="liepen de laatste 30 dagen" />
        </div>
      </section>

      <div className="hub-two">
        <section className="card stack-s">
          <h3>Nieuwe mensen per week</h3>
          <Bars data={s.series.map((w) => ({ week: w.week, value: w.signups }))} label="Nieuwe mensen per week" alt />
        </section>
        <section className="card stack-s">
          <h3>Rondjes per week</h3>
          <Bars data={s.series.map((w) => ({ week: w.week, value: w.walks }))} label="Rondjes per week" />
        </section>
      </div>

      <section className="hub-section">
        <header>
          <h2>Gemiddeld</h2>
        </header>
        <div className="hub-tiles">
          <Tile value={s.walks.avgKm === null ? '–' : `${fmt(s.walks.avgKm)} km`} label="Per rondje" />
          <Tile value={s.walks.avgMin === null ? '–' : `${fmt(s.walks.avgMin)} min`} label="Duur van een rondje" />
          <Tile value={fmt(s.walks.perWalkerMonth)} label="Rondjes per wandelaar" sub="per maand, wie liep" />
          <Tile value={s.walks.daysToFirstWalk === null ? '–' : `${fmt(s.walks.daysToFirstWalk)} d`} label="Tot het eerste rondje" sub="vanaf aanmelden" />
          <Tile value={s.requests.hoursToDecide === null ? '–' : `${fmt(s.requests.hoursToDecide)} u`} label="Tot een antwoord" sub="op een verzoek" />
          <Tile value={pct(s.requests.accepted, decided) === null ? '–' : `${pct(s.requests.accepted, decided)}%`} label="Verzoeken geaccepteerd" sub={`${s.requests.open} wachten nog`} />
          <Tile value={pct(s.walks.withPhoto, s.walks.total) === null ? '–' : `${pct(s.walks.withPhoto, s.walks.total)}%`} label="Rondjes met foto" />
          <Tile value={pct(s.walks.withReport, s.walks.total) === null ? '–' : `${pct(s.walks.withReport, s.walks.total)}%`} label="Met plas-en-poepverslag" />
        </div>
      </section>

      <div className="hub-two">
        <section className="card stack">
          <div className="stack-s">
            <h3>Van aanmelden naar vast rondje</h3>
            <p className="muted small">Wandelaars per stap, met het deel dat de vorige stap haalde. Waar het hardst daalt, zit je volgende verbetering.</p>
          </div>
          <Funnel steps={s.walkerFunnel} />
        </section>
        <section className="card stack">
          <div className="stack-s">
            <h3>Eigenaren</h3>
            <p className="muted small">Van &lsquo;ik heb een hond&rsquo; tot een hond die echt een rondje liep.</p>
          </div>
          <Funnel steps={s.ownerFunnel} />
        </section>
      </div>

      <div className="hub-two">
        <section className="card stack">
          <h3>App of website</h3>
          <p className="muted small">Wie de laatste 30 dagen ingelogd was, en waarmee. Iedereen telt één keer: wie de app gebruikte, telt als app.</p>
          <Funnel
            steps={[
              { label: 'Alle actieve mensen', n: platformTotal },
              { label: 'iPhone-app', n: s.platform.app },
              { label: 'Website op telefoon', n: s.platform.mobileWeb },
              { label: 'Website op computer', n: s.platform.desktopWeb },
            ]}
          />
          <div className="stack-s">
            <strong className="small">Meldingen aan</strong>
            <div className="row">
              {Object.keys(s.devices).length ? (
                Object.entries(s.devices).map(([kind, n]) => (
                  <span key={kind} className="pill blue">
                    {DEVICE_LABELS[kind] ?? kind}: {n}
                  </span>
                ))
              ) : (
                <span className="muted small">Nog niemand.</span>
              )}
            </div>
          </div>
        </section>
        <section className="card stack">
          <h3>Bezoekers van de website</h3>
          <p className="small">
            De site telt bezoekers zonder cookies met Vercel Web Analytics. Beheer, deze hub en de iPhone-app tellen niet mee. De cijfers staan in Vercel
            onder <b>Analytics</b>.
          </p>
          {analyticsOn ? null : (
            <p className="small muted">
              Staat het nog niet aan? Vercel-dashboard, project rondje, Analytics, Enable. Vink daarna de stap af in je <Link href="/hub/plan">plan</Link>.
            </p>
          )}
          <a className="button ghost small" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ justifySelf: 'start' }}>
            Open Vercel <HubIcon name="arrow" size={14} />
          </a>
          <div className="stack-s">
            <strong className="small">Verzoeken en chat</strong>
            <p className="small muted">
              {fmt(s.requests.total)} verzoeken ({fmt(s.requests.week)} deze week) · {fmt(s.chat.messages)} chatberichten ({fmt(s.chat.week)} deze week)
              {s.chat.flagged ? ` · ${s.chat.flagged} met een waarschuwing over geld of links` : ''}
            </p>
            <p className="small muted">
              Groepswandelingen: {fmt(s.groups.signupsWeek)} aanmeldingen deze week
              {s.groups.fill !== null ? `, ${s.groups.fill}% van de plekken gevuld` : ''}.
            </p>
          </div>
        </section>
      </div>

      <section className="hub-section">
        <header>
          <h2>Waar zitten ze?</h2>
        </header>
        {s.cities.length ? (
          <div className="hub-scroll card">
            <table className="hub-table">
              <thead>
                <tr>
                  <th>Plaats</th>
                  <th className="num">Mensen</th>
                  <th className="num">Honden</th>
                </tr>
              </thead>
              <tbody>
                {s.cities.map((c) => (
                  <tr key={`${c.country}:${c.city}`}>
                    <td>
                      {c.city} <span className="muted small">{COUNTRY_NAMES[c.country] ?? c.country}</span>
                    </td>
                    <td className="num">{fmt(c.people)}</td>
                    <td className="num">{fmt(c.dogs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hub-empty">Nog niemand aangemeld. De eerste flyers maken het verschil.</p>
        )}
      </section>

      <p className="hub-note">
        Database: {s.db.mode === 'neon' ? 'Neon' : s.db.mode === 'postgres' ? 'Postgres' : 'lokaal (PGlite)'}
        {s.db.sizeMb !== null ? `, ${fmt(s.db.sizeMb)} MB` : ''}. Wil je per persoon iets nakijken? Dat kan in <Link href="/admin">Beheer</Link>.
      </p>
    </div>
  )
}
