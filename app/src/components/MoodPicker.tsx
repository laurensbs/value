import { MOODS, type Mood } from '../lib/walks'

// Mouth curves from a frown (1) to a wide smile (5).
const MOUTHS: Record<Mood, string> = {
  1: 'M14 26 q6 -6 12 0',
  2: 'M14 25 q6 -3 12 0',
  3: 'M14 24 h12',
  4: 'M14 23 q6 4 12 0',
  5: 'M13 22 q7 8 14 0',
}

interface Props {
  name: string
  value: Mood | undefined
  onChange: (mood: Mood) => void
}

export function MoodPicker({ name, value, onChange }: Props) {
  return (
    <div className="mood-picker" role="radiogroup" aria-label="Hoe voel je je?">
      {MOODS.map((m) => (
        <button
          key={m.value}
          id={`${name}-mood-${m.value}`}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          className={`mood mood-${m.value}`}
          onClick={() => onChange(m.value)}
        >
          <svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true">
            <circle cx="20" cy="20" r="18" className="mood-face" />
            <circle cx="14.5" cy="16" r="2" className="mood-eye" />
            <circle cx="25.5" cy="16" r="2" className="mood-eye" />
            <path d={MOUTHS[m.value]} className="mood-mouth" />
          </svg>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}
