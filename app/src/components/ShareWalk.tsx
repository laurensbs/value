import { useState } from 'react'
import type { Dog } from '../data/dogs'
import { Icon } from './Icon'
import { walkMessage } from '../lib/walks'

type State = 'idle' | 'shared' | 'copied' | 'manual'

/** Makes safety agreement 2 one tap: tell someone you trust where you walk. */
export function ShareWalk({ dog }: { dog: Dog }) {
  const [state, setState] = useState<State>('idle')
  const [text, setText] = useState('')

  const copy = (message: string) =>
    navigator.clipboard
      ? navigator.clipboard.writeText(message).then(
          () => setState('copied'),
          () => setState('manual'),
        )
      : Promise.resolve(setState('manual'))

  const share = () => {
    const message = walkMessage(dog)
    setText(message)
    if (navigator.share) {
      navigator.share({ text: message }).then(
        () => setState('shared'),
        () => copy(message),
      )
    } else {
      void copy(message)
    }
  }

  return (
    <div className="share-walk">
      <button type="button" className="button ghost small" onClick={share}>
        <Icon name="chat" size={16} />
        Laat iemand weten dat je gaat
      </button>
      {state === 'shared' && <p role="status">Verstuurd. Fijn rondje!</p>}
      {state === 'copied' && <p role="status">Bericht gekopieerd. Plak het in een appje.</p>}
      {state === 'manual' && (
        <p role="status">
          Stuur dit naar iemand: <span className="selectable">{text}</span>
        </p>
      )}
    </div>
  )
}
