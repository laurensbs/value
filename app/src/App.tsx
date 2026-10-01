import { useCallback, useEffect, useRef, useState } from 'react'
import './app.css'
import { findDog } from './data/dogs'
import { ConceptPanel } from './components/ConceptPanel'
import { Icon, type IconName } from './components/Icon'
import { Logo } from './components/Logo'
import { exampleState } from './lib/examples'
import { usePersistent } from './lib/usePersistent'
import { uid, type PlannedWalk, type WalkLog } from './lib/walks'
import { Discover } from './screens/Discover'
import { DogDetail } from './screens/DogDetail'
import { Help } from './screens/Help'
import { PlanSheet } from './screens/PlanSheet'
import { SignupSheet } from './screens/SignupSheet'
import { WalkMode } from './screens/WalkMode'
import { Walks } from './screens/Walks'

type Tab = 'honden' | 'rondjes' | 'hulp'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'honden', label: 'Honden', icon: 'paw' },
  { id: 'rondjes', label: 'Rondjes', icon: 'route' },
  { id: 'hulp', label: 'Hulp', icon: 'help' },
]

/** Remembers which control opened a layer, so focus can go back there when it closes. */
function useFocusReturn() {
  const trigger = useRef<HTMLElement | null>(null)
  const remember = useCallback(() => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [])
  const restore = useCallback(() => {
    const el = trigger.current
    window.requestAnimationFrame(() => {
      if (el?.isConnected) el.focus()
    })
  }, [])
  return { remember, restore }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('honden')
  const [openDogId, setOpenDogId] = useState<string | null>(null)
  const [plan, setPlan] = useState<{ dogId: string; slot: string } | null>(null)
  const [walking, setWalking] = useState<PlannedWalk | null>(null)
  const [signup, setSignup] = useState(false)

  const [isExample, setIsExample] = usePersistent('example', true)
  const [planned, setPlanned] = usePersistent<PlannedWalk[]>('planned', () => exampleState().planned)
  const [logs, setLogs] = usePersistent<WalkLog[]>('logs', () => exampleState().logs)
  const [met, setMet] = usePersistent<string[]>('met', () => exampleState().met)
  const [safetyAccepted, setSafetyAccepted] = usePersistent('safety', false)

  const viewportRef = useRef<HTMLElement>(null)
  const dogFocus = useFocusReturn()
  const layerFocus = useFocusReturn()

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0
  }, [tab])

  const goTo = useCallback((next: Tab) => {
    setOpenDogId(null)
    setTab(next)
  }, [])

  const openDog = openDogId ? findDog(openDogId) : undefined
  const planDog = plan ? findDog(plan.dogId) : undefined
  const walkDog = walking ? findDog(walking.dogId) : undefined

  // While a layer is open, everything underneath is inert: no focus, no clicks, hidden from screen readers.
  const layerOpen = Boolean(plan || walking || signup)
  const baseInert = Boolean(openDog) || layerOpen

  const clearExamples = () => {
    setPlanned([])
    setLogs([])
    setMet([])
    setIsExample(false)
  }

  const openSignup = () => {
    layerFocus.remember()
    setSignup(true)
  }

  return (
    <div className="stage">
      <ConceptPanel />

      <div className="phone">
        <header className="topbar" inert={baseInert}>
          <button type="button" className="brand" onClick={() => goTo('honden')} aria-label="Rondje, naar honden">
            <Logo />
            <span>Rondje</span>
          </button>
          <button type="button" className="help-pill" onClick={() => goTo('hulp')}>
            Even niet oké?
          </button>
        </header>

        <main className="viewport" ref={viewportRef} inert={baseInert}>
          {tab === 'honden' && (
            <Discover
              onOpenDog={(id) => {
                dogFocus.remember()
                setOpenDogId(id)
              }}
              onSignup={openSignup}
            />
          )}
          {tab === 'rondjes' && (
            <Walks
              planned={planned}
              logs={logs}
              isExample={isExample}
              onStart={(walk) => {
                layerFocus.remember()
                setWalking(walk)
              }}
              onCancel={(id) => setPlanned(planned.filter((p) => p.id !== id))}
              onClearExamples={clearExamples}
              onDiscover={() => goTo('honden')}
            />
          )}
          {tab === 'hulp' && <Help onSignup={openSignup} />}
        </main>

        <nav className="tabbar" aria-label="Hoofdmenu" inert={baseInert}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => goTo(t.id)}
            >
              <Icon name={t.icon} size={24} />
              <span>{t.label}</span>
              {t.id === 'rondjes' && planned.length > 0 && (
                <span className="tab-count" aria-label={`${planned.length} gepland`}>
                  {planned.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {openDog && (
          <div className="overlay" inert={layerOpen}>
            <DogDetail
              key={openDog.id}
              dog={openDog}
              hasMet={met.includes(openDog.id)}
              onBack={() => {
                setOpenDogId(null)
                dogFocus.restore()
              }}
              onPlan={(slot) => {
                layerFocus.remember()
                setPlan({ dogId: openDog.id, slot })
              }}
            />
          </div>
        )}

        {plan && planDog && (
          <PlanSheet
            dog={planDog}
            slot={plan.slot}
            firstMeet={!met.includes(planDog.id)}
            safetyAccepted={safetyAccepted}
            onAcceptSafety={() => setSafetyAccepted(true)}
            onConfirm={() =>
              setPlanned([
                ...planned,
                { id: uid(), dogId: planDog.id, slot: plan.slot, firstMeet: !met.includes(planDog.id) },
              ])
            }
            onClose={() => {
              setPlan(null)
              layerFocus.restore()
            }}
            onDone={() => {
              setPlan(null)
              goTo('rondjes')
            }}
          />
        )}

        {signup && (
          <SignupSheet
            onClose={() => {
              setSignup(false)
              layerFocus.restore()
            }}
          />
        )}

        {walking && walkDog && (
          <WalkMode
            dog={walkDog}
            onClose={() => {
              setWalking(null)
              layerFocus.restore()
            }}
            onHelp={() => {
              setWalking(null)
              goTo('hulp')
            }}
            onFinish={({ minutes, before, after }) => {
              setLogs([
                ...logs,
                { id: uid(), dogId: walkDog.id, date: new Date().toISOString().slice(0, 10), minutes, before, after },
              ])
              setPlanned(planned.filter((p) => p.id !== walking.id))
              if (!met.includes(walkDog.id)) setMet([...met, walkDog.id])
              setWalking(null)
              goTo('rondjes')
            }}
          />
        )}
      </div>
    </div>
  )
}
