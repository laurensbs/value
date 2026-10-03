import { notFound } from 'next/navigation'
import { CostEditor, IncomeForm } from '@/components/hub/CostEditor'
import { Tile } from '@/components/hub/bits'
import { euro, moneyPicture } from '@/lib/hub/game'
import { getHub, hubStats } from '@/server/hub'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'

export const metadata = { title: 'Kosten' }

/** What Rondje costs, what comes in, and what that means per walk. */
export default async function HubCosts() {
  // The app shells never show anything about money (App Store and Play rules).
  if (await isNativeRequest()) notFound()
  const viewer = await getViewer()
  const [{ state }, stats] = await Promise.all([getHub(), hubStats(viewer?.profile?.referralCode ?? null)])
  const money = moneyPicture(state.costs, state.income, stats.walks.month, stats.walks.walkersMonth)
  const coveredPct = Math.round(money.covered * 100)

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Kosten</p>
        <h1>Wat kost Rondje?</h1>
        <p className="lede">
          Altijd gratis en zonder advertenties betekent: giften dragen de kosten. Hier zie je hoeveel er nodig is, en wat een rondje kost.
        </p>
      </div>

      <div className="hub-tiles">
        <Tile value={euro(money.costPerMonth, 2)} label="Kosten per maand" accent />
        <Tile value={euro(money.incomePerMonth, 2)} label="Giften per maand" sub={money.costPerMonth > 0 ? `${coveredPct}% van de kosten gedekt` : undefined} />
        <Tile value={money.perWalk === null ? '–' : euro(money.perWalk, 2)} label="Per rondje" sub={`${stats.walks.month} rondjes de laatste 30 dagen`} />
        <Tile value={money.perActiveWalker === null ? '–' : euro(money.perActiveWalker, 2)} label="Per actieve wandelaar" sub="per maand" />
        <Tile
          value={String(money.membersNeeded)}
          label="Leden nodig"
          sub={`van ${euro(state.income.averageGift)} per maand om alles te dekken`}
          wide
        />
      </div>

      <p className="notice">
        Giften pas na de stichting en de ANBI-status, en alleen via de website: in de iPhone-app staat geen geldknop. De bedragen hieronder zijn schattingen; leg
        ze naast je facturen van Vercel, Neon en Apple.
      </p>

      <section className="hub-section">
        <header>
          <h2>Kostenposten</h2>
        </header>
        <p className="muted small">Zet een post uit als hij nog niet geldt (Vercel Pro wordt pas nodig zodra je om giften vraagt).</p>
        <CostEditor initial={state.costs} />
      </section>

      <section className="hub-section">
        <header>
          <h2>Inkomsten</h2>
        </header>
        <IncomeForm initial={state.income} />
      </section>
    </div>
  )
}
