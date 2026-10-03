'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { Icon } from '@/components/Icon'
import { QrCode } from '@/components/QrCode'
import { cleanInviteCode } from '@/lib/invite'
import { qrPath } from '@/lib/qr'
import { campaignUrl, codeUrl, slug, SOURCES, suggestCode, type Source } from './campaign'
import { CopyButton } from './CopyButton'

const PAGES = [
  { key: 'home', path: '/' },
  { key: 'dogs', path: '/dogs' },
  { key: 'shelter', path: '/shelter' },
  { key: 'cities', path: '/cities' },
  { key: 'suggest', path: '/suggest' },
  { key: 'safety', path: '/safety' },
] as const

/** A QR code as a standalone SVG file, large enough to print. */
function qrSvg(value: string): string {
  const { size: n, d } = qrPath(value)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 ${n + 8} ${n + 8}" width="1024" height="1024" shape-rendering="crispEdges"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Campaign links: a page of the site with utm_source / utm_medium / utm_campaign, and a sign-up
 * link with a code of its own (/r/CODE) that counts sign-ups in the hub without any analytics.
 * Only builds text: nothing is stored, shared or sent.
 */
export function CampaignBuilder({ site, cities }: { site: string; cities: { slug: string; name: string }[] }) {
  const t = useTranslations('marketing.links')
  const id = useId()
  const [path, setPath] = useState('/')
  const [source, setSource] = useState<Source>('flyer')
  const [detail, setDetail] = useState('')
  const [campaign, setCampaign] = useState('start')
  const [ownCode, setOwnCode] = useState<string | null>(null)
  const [owner, setOwner] = useState(false)
  const [qrFor, setQrFor] = useState<'campaign' | 'code'>('campaign')

  const url = campaignUrl(site, { path, source, detail, campaign })
  const code = ownCode ?? suggestCode(source, detail, campaign)
  const signup = codeUrl(site, code, owner)
  const qrValue = qrFor === 'code' && signup ? signup : url
  const field = (name: string) => `${id}-${name}`

  return (
    <div className="stack">
      <div className="card stack mk-builder">
        <div className="mk-form-grid">
          <div className="field">
            <label htmlFor={field('page')}>{t('page')}</label>
            <select id={field('page')} className="select" value={path} onChange={(e) => setPath(e.target.value)}>
              {PAGES.map((p) => (
                <option key={p.key} value={p.path}>
                  {t(`pages.${p.key}`)} ({p.path})
                </option>
              ))}
              {cities.length ? (
                <optgroup label={t('cityGroup')}>
                  {cities.map((c) => (
                    <option key={c.slug} value={`/cities/${c.slug}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
          <div className="field">
            <label htmlFor={field('source')}>{t('source')}</label>
            <select id={field('source')} className="select" value={source} onChange={(e) => setSource(e.target.value as Source)}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(`sources.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={field('detail')}>{t('detail')}</label>
            <input
              id={field('detail')}
              className="input"
              value={detail}
              maxLength={60}
              onChange={(e) => setDetail(e.target.value)}
              autoComplete="off"
              aria-describedby={field('detail-hint')}
            />
            <small id={field('detail-hint')} className="hint">
              {t('detailHint')}
            </small>
          </div>
          <div className="field">
            <label htmlFor={field('campaign')}>{t('campaign')}</label>
            <input
              id={field('campaign')}
              className="input"
              value={campaign}
              maxLength={60}
              onChange={(e) => setCampaign(e.target.value)}
              autoComplete="off"
              aria-describedby={field('campaign-hint')}
            />
            <small id={field('campaign-hint')} className="hint">
              {t('campaignHint')}
            </small>
          </div>
        </div>

        <div className="mk-result">
          <span className="eyebrow">{t('result')}</span>
          <output className="mk-url" htmlFor={`${field('page')} ${field('source')} ${field('detail')} ${field('campaign')}`}>
            {url}
          </output>
          <div className="row">
            <CopyButton text={url} label={t('copy')} done={t('copied')} className="button primary small" />
          </div>
        </div>
        <p className="muted small">{t('utmNote')}</p>
      </div>

      <div className="card stack mk-builder">
        <div className="stack-s">
          <h3>{t('codeTitle')}</h3>
          <p className="small">{t('codeText')}</p>
        </div>
        <div className="mk-form-grid">
          <div className="field">
            <label htmlFor={field('code')}>{t('code')}</label>
            <input
              id={field('code')}
              className="input"
              value={code}
              maxLength={12}
              autoComplete="off"
              aria-describedby={field('code-hint')}
              onChange={(e) => setOwnCode(cleanInviteCode(e.target.value))}
            />
            <small id={field('code-hint')} className="hint">
              {t('codeHint')}
            </small>
          </div>
          <label className="mk-check">
            <input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} /> {t('owner')}
          </label>
        </div>
        {signup ? (
          <div className="mk-result">
            <span className="eyebrow">{t('codeLink')}</span>
            <output className="mk-url">
              {signup}
            </output>
            <div className="row">
              <CopyButton text={signup} label={t('copy')} done={t('copied')} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="card mk-qr">
        <QrCode value={qrValue} label={t('qrLabel', { url: qrValue })} size={176} />
        <div className="stack-s">
          <span className="eyebrow">{t('qrFor')}</span>
          <div className="mk-langs" role="group" aria-label={t('qrFor')}>
            <button type="button" aria-pressed={qrFor === 'campaign'} onClick={() => setQrFor('campaign')}>
              {t('qrCampaign')}
            </button>
            <button type="button" aria-pressed={qrFor === 'code'} onClick={() => setQrFor('code')} disabled={!signup}>
              {t('qrCode')}
            </button>
          </div>
          <div>
            <button
              type="button"
              className="button secondary small"
              onClick={() => download(`qr-${slug(`${source}-${detail}`) || 'link'}-${qrFor}.svg`, qrSvg(qrValue), 'image/svg+xml')}
            >
              <Icon name="download" size={16} /> {t('downloadQr')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
