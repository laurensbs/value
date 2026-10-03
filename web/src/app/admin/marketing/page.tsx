import './marketing.css'
import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { CampaignBuilder } from '@/components/marketing-hub/CampaignBuilder'
import { InterviewSets, type InterviewSetsJson } from '@/components/marketing-hub/InterviewSets'
import { INTERVIEW_AUDIENCES, questionKeys } from '@/components/marketing-hub/interviews'
import { Material } from '@/components/marketing-hub/Material'
import { PostPlanner, type PostJson } from '@/components/marketing-hub/PostPlanner'
import { nextPost, postLink, POSTS } from '@/components/marketing-hub/posts'
import { Questions, ThisWeek } from '@/components/marketing-hub/Questions'
import { Icon } from '@/components/Icon'
import { isLocale, LOCALES, type Locale } from '@/i18n/config'
import { APP_NAME, siteUrl } from '@/lib/site'
import { marketingData } from '@/server/marketing'
import { requireAdmin } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing')
  return { title: t('title'), robots: { index: false } }
}

/**
 * The marketing hub: what to do this week (the best growth questions, answered from real data),
 * interview questions, a six-week post planner with share images, campaign links and the material
 * that is ready. Admin only. Nothing is ever posted, published or sent from here.
 */
export default async function MarketingPage() {
  await requireAdmin() // integrator: requireAdmin('/admin/marketing')
  const [t, locale, data] = await Promise.all([getTranslations('marketing'), getLocale(), marketingData()])
  const ui: Locale = isLocale(locale) ? locale : 'nl'
  const site = siteUrl()
  const byLang = await Promise.all(LOCALES.map((l) => getTranslations({ locale: l, namespace: 'marketing' })))
  const tl = Object.fromEntries(LOCALES.map((l, i) => [l, byLang[i]])) as Record<Locale, (typeof byLang)[number]>

  const posts: PostJson[] = POSTS.map((post) => {
    const link = postLink(site, post)
    return {
      id: post.id,
      week: post.week,
      day: post.day,
      channel: post.channel,
      link,
      fillIn: Boolean(post.fillIn),
      goal: t(`posts.${post.id}.goal`),
      visual: t(`posts.${post.id}.visual`),
      texts: Object.fromEntries(
        LOCALES.map((l) => [l, { title: tl[l](`posts.${post.id}.title`, { app: APP_NAME }), caption: tl[l](`posts.${post.id}.caption`, { app: APP_NAME, link }) }]),
      ) as PostJson['texts'],
    }
  })

  const interviews = Object.fromEntries(
    LOCALES.map((l) => [
      l,
      {
        listen: tl[l]('interviews.listen'),
        sets: Object.fromEntries(
          INTERVIEW_AUDIENCES.map((a) => [
            a,
            {
              title: tl[l](`interviews.${a}.title`),
              who: tl[l](`interviews.${a}.who`),
              goal: tl[l](`interviews.${a}.goal`, { app: APP_NAME }),
              questions: questionKeys(a).map((q) => tl[l](`interviews.${a}.${q}`)),
              listen: tl[l](`interviews.${a}.listen`),
            },
          ]),
        ),
      },
    ]),
  ) as InterviewSetsJson

  const upcoming = nextPost(new Set(data.posted))
  // A short card title ("Week 1") says little on its own: then the line under it comes along.
  const upcomingTitle = upcoming ? t(`posts.${upcoming.id}.title`, { app: APP_NAME }) : ''
  const nextPostLine = upcoming
    ? t('week.nextPost', {
        title: upcomingTitle.length < 16 ? `${upcomingTitle}: ${t(`posts.${upcoming.id}.sub`, { app: APP_NAME })}` : upcomingTitle,
        week: upcoming.week,
        channel: t(`posts.channels.${upcoming.channel}`),
      })
    : t('week.allPosted')
  const demand = data.answers.find((a) => a.id === 'demand')
  const topCities = (demand?.rows ?? []).filter((r) => r.href).map((r) => ({ label: r.label, href: r.href! }))

  return (
    <div className="mk stack-l">
      <header className="stack-s">
        <h1>{t('title')}</h1>
        <p className="lede">{t('lede')}</p>
      </header>

      <nav className="mk-tabs" aria-label={t('nav.label')}>
        <a href="#vragen">
          <Icon name="sparkle" size={17} /> <span>{t('nav.questions')}</span>
        </a>
        <a href="#gesprekken">
          <Icon name="chat" size={17} /> <span>{t('nav.interviews')}</span>
        </a>
        <a href="#posts">
          <Icon name="calendar" size={17} /> <span>{t('nav.posts')}</span>
        </a>
        <a href="#links">
          <Icon name="share" size={17} /> <span>{t('nav.links')}</span>
        </a>
        <a href="#materiaal">
          <Icon name="list" size={17} /> <span>{t('nav.material')}</span>
        </a>
      </nav>

      <ThisWeek answers={data.thisWeek} nextPost={nextPostLine} />

      <section id="vragen" className="stack mk-anchor" aria-labelledby="mk-questions-title">
        <div className="stack-s">
          <h2 id="mk-questions-title">{t('questions.title')}</h2>
          <p className="muted small">{t('questions.lede')}</p>
        </div>
        <Questions answers={data.answers} />
      </section>

      <section id="gesprekken" className="stack mk-anchor" aria-labelledby="mk-interviews-title">
        <div className="stack-s">
          <h2 id="mk-interviews-title">{t('interviews.title')}</h2>
          <p className="muted small">{t('interviews.lede')}</p>
          <p className="notice small">{t('interviews.rules', { app: APP_NAME })}</p>
        </div>
        <InterviewSets texts={interviews} initial={ui} />
      </section>

      <section id="posts" className="stack mk-anchor" aria-labelledby="mk-posts-title">
        <div className="stack-s">
          <h2 id="mk-posts-title">{t('posts.title')}</h2>
          <p className="muted small">{t('posts.lede')}</p>
          <p className="notice small">{t('posts.honest', { app: APP_NAME })}</p>
        </div>
        <PostPlanner posts={posts} posted={data.posted} totals={data.totals} initial={ui} />
      </section>

      <section id="links" className="stack mk-anchor" aria-labelledby="mk-links-title">
        <div className="stack-s">
          <h2 id="mk-links-title">{t('links.title')}</h2>
          <p className="muted small">{t('links.lede')}</p>
        </div>
        <CampaignBuilder site={site} cities={data.cities.map((c) => ({ slug: c.slug, name: c.name }))} />
      </section>

      <section id="materiaal" className="stack mk-anchor" aria-labelledby="mk-material-title">
        <div className="stack-s">
          <h2 id="mk-material-title">{t('material.title')}</h2>
          <p className="muted small">{t('material.lede')}</p>
        </div>
        <Material topCities={topCities} shelters={data.shelters} />
      </section>
    </div>
  )
}
