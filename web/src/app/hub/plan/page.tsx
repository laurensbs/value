import { HubIcon } from '@/components/hub/HubIcon'
import { TaskCard } from '@/components/hub/TaskCard'
import { MedalGrid } from '@/components/hub/bits'
import { PHASES } from '@/lib/hub/content'
import { milestoneViews, phaseProgress } from '@/lib/hub/game'
import { getHub } from '@/server/hub'

const PHASE_WORDS: Record<number, string> = { 5: 'Vijf', 6: 'Zes', 7: 'Zeven', 8: 'Acht' }

export const metadata = { title: 'Plan' }

/** The whole launch plan in six phases, and every milestone on the way. */
export default async function HubPlan() {
  const hub = await getHub()
  const { state } = hub
  const progress = phaseProgress(state)
  const firstOpen = progress.find((p) => !p.complete)?.id
  const milestones = milestoneViews(state, hub.counts)
  const appMilestones = milestones.filter((m) => m.group === 'app')
  const hubMilestones = milestones.filter((m) => m.group === 'hub')
  const doneCount = progress.reduce((n, p) => n + p.done, 0)
  const total = progress.reduce((n, p) => n + p.total, 0)

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Het plan</p>
        <h1>Van idee naar beweging</h1>
        <p className="lede">
          {PHASE_WORDS[PHASES.length] ?? PHASES.length} fases, {total} stappen. Je hebt er {doneCount} gedaan. Het werkt het best op volgorde, maar de dingen die wachten (een notaris, een
          antwoord) houden niets tegen: begin gerust alvast aan de volgende fase.
        </p>
      </div>

      {PHASES.map((phase, i) => {
        const p = progress[i]
        return (
          <details key={phase.id} className="hub-phase" open={phase.id === firstOpen}>
            <summary>
              <span className={`hub-phase-ring${p.complete ? ' is-complete' : ''}`} style={{ '--p': p.done / p.total } as React.CSSProperties}>
                {p.complete ? <HubIcon name="check" size={20} /> : `${p.done}/${p.total}`}
              </span>
              <span>
                <span className="eyebrow">Fase {i + 1}</span>
                <h2>{phase.title}</h2>
                <span className="muted small">{phase.why}</span>
              </span>
              <span className="hub-phase-chevron" aria-hidden="true">
                <HubIcon name="arrow" size={18} />
              </span>
            </summary>
            <ul className="hub-tasks">
              {phase.tasks.map((t) => (
                <TaskCard key={t.id} task={t} done={Boolean(state.tasks[t.id])} auto={Boolean(state.tasks[t.id]?.auto)} />
              ))}
            </ul>
          </details>
        )
      })}

      <section className="hub-section" id="mijlpalen">
        <header>
          <h2>Mijlpalen in de app</h2>
        </header>
        <p className="muted small">Deze komen vanzelf, uit wat er echt gebeurt in Rondje. Eenmaal gehaald blijven ze staan.</p>
        <MedalGrid items={appMilestones} />
      </section>

      <section className="hub-section">
        <header>
          <h2>Jouw mijlpalen</h2>
        </header>
        <MedalGrid items={hubMilestones} />
      </section>
    </div>
  )
}
