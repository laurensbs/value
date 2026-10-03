import { AddVideoIdea, VideoCard } from '@/components/hub/VideoCard'
import { Ring } from '@/components/hub/bits'
import { CONTENT_RULES, VIDEOS } from '@/lib/hub/content'
import { weekRhythm } from '@/lib/hub/game'
import { getHub } from '@/server/hub'

export const metadata = { title: 'Content' }

/** Video ideas from docs/GROWTH.md, from idea to posted, with the rules every video keeps. */
export default async function HubContent() {
  const { state } = await getHub()
  const week = weekRhythm(state, new Date())
  const own = Object.entries(state.content).filter(([id, c]) => c.title && !VIDEOS.some((v) => v.id === id))
  const posted = Object.values(state.content).filter((c) => c.postedAt).length
  const order = { gefilmd: 0, gepland: 1, idee: 2, gepost: 3 } as const
  const builtIn = [...VIDEOS].sort((a, b) => {
    const sa = state.content[a.id]?.status ?? 'idee'
    const sb = state.content[b.id]?.status ?? 'idee'
    return order[sa] - order[sb] || Number(Boolean(b.now)) - Number(Boolean(a.now))
  })

  return (
    <div className="hub-page">
      <div className="hub-head">
        <p className="eyebrow">Content</p>
        <h1>Video&rsquo;s die op zichzelf iets waard zijn</h1>
        <p className="lede">Van idee tot gepost. Een geposte video geeft de meeste punten. Begin met de ideeën die vandaag kunnen, zonder koppel of opvang.</p>
      </div>

      <div className="hub-rings">
        <Ring now={week.videos} goal={week.videosGoal} label="Deze week gepost" />
        <Ring now={posted} goal={10} label="Op weg naar 10" />
        <Ring now={Object.values(state.content).filter((c) => c.status === 'gefilmd').length} goal={0} label="Klaar om te posten" />
      </div>

      <section className="card flat stack-s">
        <h2>De regels</h2>
        <ul className="check-list">
          {CONTENT_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <ul className="hub-list">
        {builtIn.map((v) => {
          const c = state.content[v.id]
          return (
            <VideoCard
              key={v.id}
              id={v.id}
              title={v.title}
              hook={v.hook}
              why={v.why}
              effort={v.effort}
              now={v.now}
              own={false}
              status={c?.status ?? 'idee'}
              link={c?.link}
              note={c?.note}
            />
          )
        })}
        {own.map(([id, c]) => (
          <VideoCard key={id} id={id} title={c.title!} own status={c.status} link={c.link} note={c.note} />
        ))}
      </ul>

      <AddVideoIdea />
    </div>
  )
}
