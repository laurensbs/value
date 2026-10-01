import type { PlannedWalk, WalkLog } from './walks'

function daysAgo(n: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Example state shown on a first visit, clearly marked in the UI. */
export function exampleState(today = new Date()) {
  const planned: PlannedWalk[] = [{ id: 'ex-plan', dogId: 'saar', slot: 'Morgen 09:00', firstMeet: false }]
  const logs: WalkLog[] = [
    { id: 'ex-1', dogId: 'saar', date: daysAgo(19, today), minutes: 32, before: 2, after: 3 },
    { id: 'ex-2', dogId: 'saar', date: daysAgo(15, today), minutes: 28, before: 3, after: 4 },
    { id: 'ex-3', dogId: 'pip', date: daysAgo(12, today), minutes: 21, before: 2, after: 4 },
    { id: 'ex-4', dogId: 'saar', date: daysAgo(8, today), minutes: 35, before: 3, after: 4 },
    { id: 'ex-5', dogId: 'pip', date: daysAgo(5, today), minutes: 19 },
    { id: 'ex-6', dogId: 'saar', date: daysAgo(1, today), minutes: 30, before: 3, after: 5 },
  ]
  return { planned, logs, met: ['saar', 'pip'] }
}
