'use client'

/* eslint-disable @next/next/no-img-element -- the share images are generated PNGs of this site (admin only), not photos to optimise */
import { useTranslations } from 'next-intl'
import { useOptimistic, useState, useTransition } from 'react'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'
import { setPostDone } from '@/server/marketing-actions'
import { CopyButton } from './CopyButton'
import { LangSwitch } from './LangSwitch'
import type { Channel, Day } from './posts'

export interface PostJson {
  id: string
  week: number
  day: Day
  channel: Channel
  link: string
  fillIn: boolean
  /** In the admin's language. */
  goal: string
  visual: string
  /** Per language: what goes on the image and in the post. */
  texts: Record<Locale, { title: string; caption: string }>
}

interface Totals {
  members: number
  dogs: number
  walks: number
}

/** Instagram and TikTok do not make links in a caption clickable: the link goes in the bio. */
const BIO_LINK: readonly Channel[] = ['instagram', 'tiktok']

/**
 * The post planner: 12 posts for six weeks. Copy the text, download the image, post it yourself,
 * then tick "Gepost" (stored as post:<id> in launch_task). Nothing is ever posted from here.
 */
export function PostPlanner({ posts, posted, totals, initial }: { posts: PostJson[]; posted: string[]; totals: Totals; initial: Locale }) {
  const t = useTranslations('marketing.posts')
  const [lang, setLang] = useState<Locale>(initial)
  const [done, setDone] = useOptimistic(new Set(posted), (state, change: { id: string; done: boolean }) => {
    const next = new Set(state)
    if (change.done) next.add(change.id)
    else next.delete(change.id)
    return next
  })
  const [, start] = useTransition()

  function toggle(id: string) {
    const next = !done.has(id)
    start(async () => {
      setDone({ id, done: next })
      await setPostDone(id, next)
    })
  }

  return (
    <div className="stack">
      <div className="mk-planner-bar">
        <LangSwitch value={lang} onChange={setLang} label={t('language')} />
        <span className="pill">{t('progress', { posted: done.size, total: posts.length })}</span>
      </div>
      <ol className="mk-posts">
        {posts.map((post) => {
          const text = post.texts[lang]
          const isDone = done.has(post.id)
          const image = `/admin/marketing/card/${post.id}?lang=${lang}`
          return (
            <li key={post.id} className={`mk-post card${isDone ? ' done' : ''}`}>
              <div className="mk-post-head">
                <span className="mk-post-when">
                  {t('week', { week: post.week })} · {t(`days.${post.day}`)}
                </span>
                <span className={`mk-channel c-${post.channel}`}>{t(`channels.${post.channel}`)}</span>
                <button
                  type="button"
                  className="mk-posted"
                  aria-pressed={isDone}
                  aria-label={isDone ? t('markOpen', { title: text.title }) : t('markPosted', { title: text.title })}
                  onClick={() => toggle(post.id)}
                >
                  <Icon name="check" size={16} /> {t('posted')}
                </button>
              </div>

              <div className="mk-post-body">
                <a href={image} target="_blank" rel="noopener" className="mk-post-image">
                  <img src={image} alt={t('imageAlt', { title: text.title })} width={1080} height={1350} loading="lazy" decoding="async" />
                </a>
                <div className="stack-s mk-post-text">
                  <h3 lang={lang}>{text.title}</h3>
                  <p className="small">
                    <strong>{t('goal')}:</strong> {post.goal}
                  </p>
                  <p className="small muted">
                    <strong>{t('visual')}:</strong> {post.visual}
                  </p>
                </div>
              </div>

              {post.fillIn ? (
                <p className="notice warn small">{t('fillIn', { ...totals })}</p>
              ) : null}

              <details className="mk-caption" lang={lang}>
                <summary>
                  <span className="eyebrow">{t('caption')}</span>
                  <span className="mk-caption-first">{text.caption.split('\n')[0]}</span>
                </summary>
                <p>{text.caption}</p>
              </details>

              <p className="mk-post-link small">
                <strong>{t('link')}:</strong> <span className="mk-url">{post.link}</span>
                {BIO_LINK.includes(post.channel) ? <span className="muted"> {t('linkBio')}</span> : null}
              </p>

              <div className="mk-post-actions">
                <CopyButton text={text.caption} label={t('copy')} done={t('copied')} className="button primary small" />
                <a href={`${image}&download=1`} download className="button secondary small">
                  <Icon name="download" size={16} /> {t('download')}
                </a>
                <CopyButton text={post.link} label={t('copyLink')} done={t('copied')} className="button ghost small" />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
