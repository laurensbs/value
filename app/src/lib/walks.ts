export type Mood = 1 | 2 | 3 | 4 | 5

export const MOODS: { value: Mood; label: string }[] = [
  { value: 1, label: 'Zwaar' },
  { value: 2, label: 'Matig' },
  { value: 3, label: 'Oké' },
  { value: 4, label: 'Goed' },
  { value: 5, label: 'Top' },
]

export interface PlannedWalk {
  id: string
  dogId: string
  slot: string
  /** First meeting happens with the owner or shelter present. */
  firstMeet: boolean
  /** A fixed weekly walk: it stays planned after each walk. */
  weekly?: boolean
}

export interface WalkLog {
  id: string
  dogId: string
  date: string
  minutes: number
  before?: Mood
  after?: Mood
}

export interface WalkStats {
  walks: number
  minutes: number
  dogs: number
  /** Average change in mood over walks that have both check-ins, or null. */
  moodShift: number | null
  checkedIn: number
}

export function walkStats(logs: WalkLog[]): WalkStats {
  const withBoth = logs.filter((l) => l.before !== undefined && l.after !== undefined)
  const shift =
    withBoth.length === 0
      ? null
      : withBoth.reduce((sum, l) => sum + (l.after! - l.before!), 0) / withBoth.length
  return {
    walks: logs.length,
    minutes: logs.reduce((sum, l) => sum + l.minutes, 0),
    dogs: new Set(logs.map((l) => l.dogId)).size,
    moodShift: shift === null ? null : Math.round(shift * 10) / 10,
    checkedIn: withBoth.length,
  }
}

export function moodLabel(mood: Mood | undefined): string {
  return MOODS.find((m) => m.value === mood)?.label ?? 'Niet ingevuld'
}

/** Elapsed seconds formatted as m:ss or h:mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Minutes logged for a walk: at least one, rounded to whole minutes. */
export function minutesFromSeconds(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}

// Kleine opdrachtjes tijdens het wandelen, gebaseerd op grounding (5-4-3-2-1)
// en aandacht voor de omgeving. Bewust optioneel en zonder score.
export const WALK_PROMPTS: string[] = [
  'Noem in je hoofd drie dingen die je ziet en die geel zijn.',
  'Wat ruikt de hond nu? Blijf even staan en laat hem rustig snuffelen.',
  'Luister tien tellen alleen maar. Welke geluiden hoor je?',
  'Voel je voeten op de grond. Loop een stukje iets langzamer.',
  'Zoek een boom die je nog nooit bewust hebt bekeken.',
  'Adem vier tellen in, houd vier tellen vast, en adem zes tellen uit.',
]

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Text for safety agreement 2: tell someone you trust where you walk and when you're back. */
export function walkMessage(dog: { name: string; area: string; walkMinutes: number }, now = new Date()): string {
  const back = new Date(now.getTime() + dog.walkMinutes * 60_000)
  const time = back.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `Ik ga een rondje lopen met ${dog.name} in ${dog.area}. Rond ${time} ben ik terug.`
}

const WEEKDAYS: Record<string, string> = {
  ma: 'maandag',
  di: 'dinsdag',
  wo: 'woensdag',
  do: 'donderdag',
  vr: 'vrijdag',
  za: 'zaterdag',
  zo: 'zondag',
}

/** "Do 14:00" → "Elke donderdag 14:00". "Vandaag" and "Morgen" resolve against `today`. */
export function weeklyLabel(slot: string, today = new Date()): string {
  const [first, ...rest] = slot.split(' ')
  const time = rest.join(' ')
  const key = first.toLowerCase()
  let day = WEEKDAYS[key]
  if (!day && (key === 'vandaag' || key === 'morgen')) {
    const d = new Date(today)
    if (key === 'morgen') d.setDate(d.getDate() + 1)
    day = d.toLocaleDateString('nl-NL', { weekday: 'long' })
  }
  return day ? `Elke ${day} ${time}`.trim() : `Elke week, ${slot}`
}
