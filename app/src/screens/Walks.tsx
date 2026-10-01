import { findDog } from '../data/dogs'
import { DogFace } from '../components/DogFace'
import { Icon } from '../components/Icon'
import { MoodChart } from '../components/MoodChart'
import { tileStyle } from '../lib/tile'
import { walkStats, weeklyLabel, type PlannedWalk, type WalkLog } from '../lib/walks'

interface Props {
  planned: PlannedWalk[]
  logs: WalkLog[]
  isExample: boolean
  onStart: (walk: PlannedWalk) => void
  onCancel: (id: string) => void
  onClearExamples: () => void
  onDiscover: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function Walks({ planned, logs, isExample, onStart, onCancel, onClearExamples, onDiscover }: Props) {
  const stats = walkStats(logs)
  const buddies = [...new Set(logs.map((l) => l.dogId))]
    .map((id) => ({ dog: findDog(id), count: logs.filter((l) => l.dogId === id).length }))
    .filter((b) => b.dog)

  return (
    <div className="screen">
      <header className="intro compact">
        <p className="eyebrow">Mijn rondjes</p>
        <h1>
          Buiten geweest, <mark>goed gedaan.</mark>
        </h1>
      </header>

      {isExample && (
        <div className="notice example" role="note">
          <p>
            <strong>Voorbeeld.</strong> Zo ziet dit scherm eruit na een paar weken wandelen.
          </p>
          <button type="button" className="link-button" onClick={onClearExamples}>
            Begin leeg
          </button>
        </div>
      )}

      <section aria-labelledby="planned-title" className="block">
        <h2 id="planned-title" className="section-title">
          Gepland
        </h2>
        {planned.length === 0 ? (
          <div className="empty">
            <p>Nog niets gepland. Kies een hond en maak kennis.</p>
            <button type="button" className="button secondary" onClick={onDiscover}>
              Bekijk honden in de buurt
            </button>
          </div>
        ) : (
          <ul className="planned-list">
            {planned.map((walk) => {
              const dog = findDog(walk.dogId)
              if (!dog) return null
              return (
                <li key={walk.id} className="planned">
                  <span className="dog-tile small" style={tileStyle(dog.tile)}>
                    <DogFace look={dog.look} size={56} />
                  </span>
                  <div className="planned-body">
                    <p className="planned-kind">
                      {walk.firstMeet ? 'Kennismaking' : walk.weekly ? 'Vast rondje' : 'Rondje'}
                    </p>
                    <p className="planned-title">
                      {dog.name} · {walk.weekly ? weeklyLabel(walk.slot) : walk.slot}
                    </p>
                    <p className="planned-where">
                      <Icon name="pin" size={14} />
                      {walk.firstMeet ? dog.meetPoint : dog.area}
                    </p>
                    <div className="planned-actions">
                      <button type="button" className="button primary small" onClick={() => onStart(walk)}>
                        <Icon name="play" size={16} />
                        Start rondje
                      </button>
                      <button type="button" className="link-button" onClick={() => onCancel(walk.id)}>
                        {walk.weekly ? 'Stoppen' : 'Afzeggen'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="stats-title" className="block">
        <h2 id="stats-title" className="section-title">
          Wat het oplevert
        </h2>
        <div className="tags">
          <div className="tag">
            <span className="tag-value">{stats.walks}</span>
            <span className="tag-label">rondjes</span>
          </div>
          <div className="tag">
            <span className="tag-value">{stats.minutes}</span>
            <span className="tag-label">minuten buiten</span>
          </div>
          <div className="tag">
            <span className="tag-value">{stats.dogs}</span>
            <span className="tag-label">{stats.dogs === 1 ? 'hond' : 'honden'} blij</span>
          </div>
        </div>

        {stats.moodShift !== null && stats.checkedIn >= 2 && (
          <div className="mood-card">
            <p className="mood-headline">
              Na een rondje voel je je gemiddeld{' '}
              <strong>
                {stats.moodShift > 0 ? '+' : ''}
                {stats.moodShift.toLocaleString('nl-NL')}
              </strong>{' '}
              {Math.abs(stats.moodShift) === 1 ? 'stap' : 'stappen'} {stats.moodShift >= 0 ? 'beter' : 'minder goed'}
            </p>
            <MoodChart logs={logs} />
            <p className="privacy-line">
              <Icon name="lock" size={14} />
              Je check-ins staan alleen op dit apparaat.
            </p>
          </div>
        )}
      </section>

      {buddies.length > 0 && (
        <section aria-labelledby="buddies-title" className="block">
          <h2 id="buddies-title" className="section-title">
            Je maatjes
          </h2>
          <ul className="buddies">
            {buddies.map(({ dog, count }) => (
              <li key={dog!.id}>
                <DogFace look={dog!.look} size={44} />
                <p>
                  <strong>{dog!.name}</strong> had {count} extra {count === 1 ? 'rondje' : 'rondjes'} dankzij jou.
                  {dog!.host.kind === 'buurt' && (
                    <span className="muted"> {dog!.host.name.split(',')[0]} ook.</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {logs.length > 0 && (
        <section aria-labelledby="log-title" className="block">
          <h2 id="log-title" className="section-title">
            Logboek
          </h2>
          <ol className="log">
            {[...logs].reverse().map((log) => {
              const dog = findDog(log.dogId)
              return (
                <li key={log.id}>
                  <span className="log-date">{formatDate(log.date)}</span>
                  <span className="log-dog">{dog?.name ?? 'Hond'}</span>
                  <span className="log-min">{log.minutes} min</span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
