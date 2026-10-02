'use client'

import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { Icon } from './Icon'

interface Props {
  emergency: string
  animal?: { name: string; phone?: string }
  contactName: string
  contactPhone: string | null
  vetInfo?: string | null
  /** Where to report a lost dog in this country. */
  registry: string
}

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`

/** One tap away during every walk: emergency number, the owner, and what to do. */
export function SosSheet({ emergency, animal, contactName, contactPhone, vetInfo, registry }: Props) {
  const t = useTranslations('walk')
  const tc = useTranslations('common')
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button type="button" className="button sos" onClick={() => dialog.current?.showModal()}>
        <Icon name="alert" size={18} /> {t('sos')}
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby="sos-title">
        <div className="stack">
          <div className="spread">
            <h2 id="sos-title">{t('sosTitle')}</h2>
            <button type="button" className="icon-link" onClick={() => dialog.current?.close()} aria-label={tc('close')}>
              <Icon name="close" />
            </button>
          </div>
          <a className="button sos wide big" href={tel(emergency)}>
            <Icon name="phone" size={20} /> {t('sosEmergency', { number: emergency })}
          </a>
          {contactPhone ? (
            <a className="button secondary wide" href={tel(contactPhone)}>
              <Icon name="phone" size={18} /> {t('sosOwner')}: {contactName} · {contactPhone}
            </a>
          ) : null}
          {animal?.phone ? (
            <a className="button ghost wide" href={tel(animal.phone)}>
              {t('sosAnimal', { name: animal.name })}
            </a>
          ) : null}
          {vetInfo ? (
            <p className="small">
              <strong>{t('sosVet')}:</strong> {vetInfo}
            </p>
          ) : null}
          <details className="sos-step" open>
            <summary>{t('sosEscaped')}</summary>
            <p className="small">{t('sosEscapedSteps', { registry })}</p>
          </details>
          <details className="sos-step">
            <summary>{t('sosBite')}</summary>
            <p className="small">{t('sosBiteSteps', { number: emergency })}</p>
          </details>
        </div>
      </dialog>
    </>
  )
}
