import Link from 'next/link'
import { HubIcon } from '@/components/hub/HubIcon'
import { InstallTip } from '@/components/hub/InstallTip'
import { SettingsForm } from '@/components/hub/SettingsForm'
import { FOUNDER_LEVELS, STATUS_LABELS, STATUS_XP } from '@/lib/hub/content'
import { VIDEO_XP } from '@/lib/hub/game'
import { getHub } from '@/server/hub'

export const metadata = { title: 'Jij' }

export default async function HubYou() {
  const { state, level, xp } = await getHub()
  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Jij</p>
        <h1>Jouw gegevens en ritme</h1>
        <p className="lede">Eén keer invullen, dan staan ze in elke mail.</p>
      </div>

      <InstallTip />
      <SettingsForm initial={state.settings} />

      <section className="card stack">
        <h2>Zo werken de punten</h2>
        <ul className="check-list">
          <li>Een stap uit het plan afvinken: de punten die erbij staan.</li>
          <li>
            Partners: {Object.entries(STATUS_XP)
              .filter(([, n]) => n > 0)
              .map(([s, n]) => `${STATUS_LABELS[s as keyof typeof STATUS_LABELS].toLowerCase()} ${n}`)
              .join(', ')}
            . Een nee telt ook: je vroeg het.
          </li>
          <li>Video&rsquo;s: gepland {VIDEO_XP.gepland}, gefilmd {VIDEO_XP.gefilmd}, gepost {VIDEO_XP.gepost}.</li>
          <li>Mijlpalen in de app en voor jezelf geven een bonus.</li>
          <li>Punten gaan nooit omlaag als iets tegenvalt, en er zijn geen reeksen om te breken.</li>
        </ul>
        <p className="small muted">
          Je staat op niveau {level.level} ({level.name}) met {xp.total} punten. De niveaus:{' '}
          {FOUNDER_LEVELS.map((l) => `${l.name} (${l.min})`).join(', ')}.
        </p>
      </section>

      <section className="card stack-s">
        <h2>Handig</h2>
        <div className="hub-actions">
          <Link href="/flyer" className="button secondary small">
            <HubIcon name="download" size={16} /> Flyer met jouw link
          </Link>
          <Link href="/admin" className="button secondary small">
            <HubIcon name="shield" size={16} /> Beheer
          </Link>
          <Link href="/" className="button ghost small">
            Naar de app
          </Link>
        </div>
        <p className="small muted">De hub is alleen zichtbaar voor beheerders. Hij verstuurt zelf niets en bewaart alleen jouw eigen notities.</p>
      </section>
    </div>
  )
}
