import Link from 'next/link'
import { AddPartner, AddShelterButton } from '@/components/hub/AddPartner'
import { HubIcon } from '@/components/hub/HubIcon'
import { PartnerCard } from '@/components/hub/PartnerCard'
import { COUNTRY_NAMES } from '@/components/hub/countries'
import { DIRECTORY } from '@/lib/directory'
import { PARTNER_STATUSES, PARTNER_TYPES, STATUS_LABELS, type PartnerType } from '@/lib/hub/content'
import { daysSince, followUpsDue, partnerList } from '@/lib/hub/game'
import { getHub } from '@/server/hub'

export const metadata = { title: 'Partners' }

function contactLine(mailedAt: string | undefined, last: string | undefined, followUps: number | undefined, now: Date): string | null {
  if (!mailedAt) return null
  const first = daysSince(mailedAt, now) ?? 0
  const since = daysSince(last ?? mailedAt, now) ?? 0
  const when = (d: number) => (d === 0 ? 'vandaag' : d === 1 ? 'gisteren' : `${d} dagen geleden`)
  const parts = [`Eerste mail ${when(first)}`]
  if (followUps) parts.push(`${followUps} keer opgevolgd, laatst ${when(since)}`)
  return parts.join(' · ')
}

/**
 * Everyone you want to work with. Nobody has said yes yet: everything is a goal until you set it to
 * "Doet mee" yourself.
 */
export default async function HubPartners({ searchParams }: { searchParams: Promise<{ type?: string; land?: string }> }) {
  const sp = await searchParams
  const now = new Date()
  const { state } = await getHub()
  const all = partnerList(state, now)
  const type = sp.type && Object.hasOwn(PARTNER_TYPES, sp.type) ? (sp.type as PartnerType) : null
  const shown = type ? all.filter((p) => p.type === type) : all
  const due = new Set(followUpsDue(all, now).map((p) => p.id))
  const counts = Object.fromEntries(PARTNER_STATUSES.map((s) => [s, all.filter((p) => p.state.status === s).length]))
  const typesInUse = [...new Set(all.map((p) => p.type))]

  // Shelters from the public list that are not on your list yet.
  const onList = new Set(all.map((p) => p.name.toLowerCase()))
  const land = sp.land === 'BE' || sp.land === 'ES' ? sp.land : 'NL'
  const directory = DIRECTORY.filter((d) => d.country === land && !onList.has(d.name.toLowerCase())).sort((a, b) =>
    a.walkingProgram === b.walkingProgram ? a.name.localeCompare(b.name) : a.walkingProgram === 'yes' ? -1 : 1,
  )

  // Open conversations first, then goals, then the ones that said no.
  const order = { gesprek: 0, reactie: 1, gemaild: 2, doel: 3, partner: 4, nee: 5 } as const
  const sorted = [...shown].sort((a, b) => Number(due.has(b.id)) - Number(due.has(a.id)) || order[a.state.status] - order[b.state.status])

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Partners</p>
        <h1>Met wie wil je samenwerken?</h1>
        <p className="lede">Elke stap vooruit geeft punten, ook een nee: je vroeg het tenminste. De hub verstuurt zelf niets; jij mailt, en zet hier de stand.</p>
      </div>

      <p className="notice">Nog niemand heeft ja gezegd. Alles hieronder is een doel totdat jij het op &lsquo;Doet mee&rsquo; zet. Noem ze nergens als partner voordat dat zo is.</p>

      <div className="hub-pipeline" aria-label="Stand van zaken">
        {PARTNER_STATUSES.map((s) => (
          <div key={s}>
            <strong>{counts[s]}</strong>
            <span>{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <nav className="hub-filter" aria-label="Soort partner">
        <Link href="/hub/partners" className={`chip${type ? '' : ' on'}`} aria-current={type ? undefined : 'page'}>
          Alles ({all.length})
        </Link>
        {typesInUse.map((t) => (
          <Link key={t} href={`/hub/partners?type=${t}`} className={`chip${type === t ? ' on' : ''}`} aria-current={type === t ? 'page' : undefined}>
            {PARTNER_TYPES[t]}
          </Link>
        ))}
      </nav>

      <ul className="hub-list">
        {sorted.map((p) => (
          <PartnerCard
            key={p.id}
            partner={p}
            lastContact={contactLine(p.state.mailedAt, p.state.lastContactAt, p.state.followUps, now)}
            followUpDue={due.has(p.id)}
          />
        ))}
        {sorted.length === 0 ? <li className="hub-empty">Nog niemand van deze soort op je lijst.</li> : null}
      </ul>

      <details className="hub-section hub-dir card" id="opvangen" open={Boolean(sp.land)}>
        <summary>
          <span>
            <h2>Opvangen uit de lijst</h2>
            <span className="muted small">{DIRECTORY.length} opvangen in Nederland, België en Spanje</span>
          </span>
          <span className="hub-phase-chevron" aria-hidden="true">
            <HubIcon name="arrow" size={18} />
          </span>
        </summary>
        <p className="muted small">
          {DIRECTORY.length} opvangen uit openbare bronnen. Zet er een op je lijst; je krijgt dan de mail in de goede taal (Frans voor Wallonië en Brussel,
          Spaans voor Spanje). Opvangen met een wandelprogramma staan bovenaan.
        </p>
        <nav className="hub-filter" aria-label="Land">
          {(['NL', 'BE', 'ES'] as const).map((c) => (
            <Link key={c} href={`/hub/partners?land=${c}${type ? `&type=${type}` : ''}#opvangen`} className={`chip${land === c ? ' on' : ''}`} aria-current={land === c ? 'page' : undefined}>
              {COUNTRY_NAMES[c]}
            </Link>
          ))}
        </nav>
        <ul className="hub-list">
          {directory.map((d) => (
            <li key={d.id} className="hub-item">
              <div className="hub-item-head">
                <div>
                  <h3>{d.name}</h3>
                  <p className="muted small">
                    {[d.city, d.region].filter(Boolean).join(', ')}
                    {d.walkingProgram === 'yes' ? ' · heeft al een wandelprogramma' : ''}
                  </p>
                </div>
                <AddShelterButton id={d.id} name={d.name} />
              </div>
              {d.website ? (
                <a href={d.website} target="_blank" rel="noopener noreferrer" className="small">
                  {d.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              ) : null}
            </li>
          ))}
          {directory.length === 0 ? <li className="hub-empty">Alle opvangen uit {COUNTRY_NAMES[land]} staan al op je lijst.</li> : null}
        </ul>
      </details>

      <AddPartner />
    </div>
  )
}
