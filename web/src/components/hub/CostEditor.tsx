'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import type { CostLine, CostPeriod, HubIncome } from '@/lib/hub/content'
import { costSummary, euro } from '@/lib/hub/game'
import { saveCosts, saveIncome } from '@/server/actions/hub'
import { HubIcon } from './HubIcon'
import { toast } from './HubToasts'

const PERIODS: { value: CostPeriod; label: string }[] = [
  { value: 'maand', label: 'per maand' },
  { value: 'jaar', label: 'per jaar' },
  { value: 'eenmalig', label: 'eenmalig' },
]

/** Your running costs, line by line. Totals update while you type; nothing is saved until you press Opslaan. */
export function CostEditor({ initial }: { initial: CostLine[] }) {
  const [lines, setLines] = useState(initial)
  const [pending, start] = useTransition()
  const [dirty, setDirty] = useState(false)
  const sum = useMemo(() => costSummary(lines), [lines])

  function update(id: string, patch: Partial<CostLine>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    setDirty(true)
  }

  function add() {
    const id = `eigen-${Date.now().toString(36)}`
    setLines((ls) => [...ls, { id, label: '', amount: 0, period: 'maand', note: '', active: true }])
    setDirty(true)
  }

  function save() {
    start(async () => {
      const clean = lines.map((l) => ({ ...l, label: l.label.trim() || 'Zonder naam', amount: Number.isFinite(l.amount) ? l.amount : 0 }))
      const r = await saveCosts(clean)
      if (r.ok) {
        setDirty(false)
        toast('Kosten opgeslagen')
      } else toast('Opslaan lukte niet. Kijk de bedragen na.')
    })
  }

  return (
    <div className="stack">
      <ul className="hub-list">
        {lines.map((l) => (
          <li key={l.id} className={`hub-cost${l.active ? '' : ' is-off'}`}>
            <button
              type="button"
              role="switch"
              className="hub-switch"
              aria-checked={l.active}
              aria-label={`${l.label || 'Kostenpost'} meetellen`}
              onClick={() => update(l.id, { active: !l.active })}
            />
            <div className="hub-cost-fields">
              <input className="input" aria-label="Omschrijving" value={l.label} onChange={(e) => update(l.id, { label: e.target.value })} placeholder="Omschrijving" maxLength={80} />
              <label className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                <span aria-hidden="true">€</span>
                <input
                  className="input"
                  aria-label="Bedrag in euro"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={Number.isFinite(l.amount) ? l.amount : ''}
                  onChange={(e) => update(l.id, { amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                />
              </label>
              <select className="select" aria-label="Hoe vaak" value={l.period} onChange={(e) => update(l.id, { period: e.target.value as CostPeriod })}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button ghost small"
                aria-label={`${l.label || 'Kostenpost'} weghalen`}
                onClick={() => {
                  setLines((ls) => ls.filter((x) => x.id !== l.id))
                  setDirty(true)
                }}
              >
                <HubIcon name="trash" size={15} />
              </button>
            </div>
            {l.note ? <span className="note">{l.note}</span> : null}
          </li>
        ))}
      </ul>
      <div>
        <button type="button" className="button secondary small" onClick={add}>
          <HubIcon name="plus" size={16} /> Kostenpost toevoegen
        </button>
      </div>
      <div className="hub-sticky-save">
        <span>
          <strong>{euro(sum.perMonth, 2)}</strong> per maand · {euro(sum.perYear, 0)} per jaar
          {sum.oneOff ? ` · ${euro(sum.oneOff, 0)} eenmalig` : ''}
        </span>
        <button type="button" className="button ball small" onClick={save} disabled={pending || !dirty}>
          {dirty ? 'Opslaan' : 'Opgeslagen'}
        </button>
      </div>
    </div>
  )
}

/** What comes in: monthly members, their average gift, and other money (funds, one-off gifts). */
export function IncomeForm({ initial }: { initial: HubIncome }) {
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveIncome>> | null, form: FormData) => {
    const r = await saveIncome(prev, form)
    toast(r.ok ? 'Inkomsten opgeslagen' : 'Kijk de bedragen na.')
    return r
  }, null)
  return (
    <form className="form card" action={action}>
      <div className="grid-2">
        <label className="field">
          <span>Leden die elke maand geven</span>
          <input className="input" name="members" type="number" min={0} step={1} defaultValue={initial.members} />
        </label>
        <label className="field">
          <span>Gemiddelde gift per maand (€)</span>
          <input className="input" name="averageGift" type="number" min={0} step="0.5" defaultValue={initial.averageGift} />
        </label>
      </div>
      <label className="field">
        <span>
          Overige inkomsten per maand (€) <span className="hint">Fondsen, eenmalige giften, sponsors: gemiddeld per maand.</span>
        </span>
        <input className="input" name="otherPerMonth" type="number" min={0} step="1" defaultValue={initial.otherPerMonth} />
      </label>
      {state && !state.ok ? <p className="notice danger small">Kijk de bedragen na.</p> : null}
      <button className="button primary" disabled={pending}>
        Opslaan
      </button>
    </form>
  )
}
