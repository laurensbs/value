import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

function nav() {
  return within(screen.getByRole('navigation', { name: 'Hoofdmenu' }))
}

describe('Ontdekken', () => {
  it('shows example dogs and filters them', async () => {
    const user = userEvent.setup()
    render(<App />)
    const list = screen.getByRole('list', { name: 'Honden' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(8)

    await user.click(screen.getByRole('button', { name: 'Energiek' }))
    const energetic = within(list).getAllByRole('listitem')
    expect(energetic).toHaveLength(1)
    expect(energetic[0]).toHaveTextContent('Luna')

    await user.click(screen.getByRole('button', { name: 'Uit de opvang' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })
})

describe('Kennismaking plannen', () => {
  it('asks for the safety agreements before the first meeting', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Mo/ }))
    await user.click(screen.getByRole('button', { name: 'Maak kennis met Mo' }))

    const dialog = screen.getByRole('dialog')
    const join = within(dialog).getByRole('button', { name: 'Ik doe mee' })
    expect(join).toBeDisabled()

    await user.click(within(dialog).getByLabelText('Ja'))
    expect(join).toBeDisabled()
    for (const box of within(dialog).getAllByRole('checkbox')) await user.click(box)
    expect(join).toBeEnabled()

    await user.click(join)
    expect(within(dialog).getByRole('heading', { name: 'Kennismaken met Mo' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Verstuur aanvraag' }))
    expect(within(dialog).getByRole('heading', { name: 'Aanvraag verstuurd' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Naar mijn rondjes' }))
    expect(screen.getByText(/Mo · Vandaag 16:30/)).toBeInTheDocument()
    expect(screen.getByText('Kennismaking')).toBeInTheDocument()
  })

  it('points people under 18 to help instead of the agreements', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Kees/ }))
    await user.click(screen.getByRole('button', { name: 'Maak kennis met Kees' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText('Nee'))
    expect(within(dialog).getByText(/vanaf 18 jaar/)).toBeInTheDocument()
    expect(within(dialog).getByText('0800-0432')).toBeInTheDocument()
    expect(within(dialog).queryAllByRole('checkbox')).toHaveLength(0)
    expect(within(dialog).getByRole('button', { name: 'Ik doe mee' })).toBeDisabled()
  })

  it('skips the agreements once they are accepted', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Saar/ }))
    await user.click(screen.getByRole('button', { name: 'Plan rondje met Saar' }))
    let dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByLabelText('Ja'))
    for (const box of within(dialog).getAllByRole('checkbox')) await user.click(box)
    await user.click(within(dialog).getByRole('button', { name: 'Ik doe mee' }))
    await user.click(within(dialog).getByRole('button', { name: 'Sluiten' }))

    await user.click(screen.getByRole('button', { name: 'Plan rondje met Saar' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText('Ben je 18 jaar of ouder?')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Rondje met Saar' })).toBeInTheDocument()
  })
})

describe('Rondje lopen', () => {
  it('logs a walk with mood check-ins and updates the totals', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(nav().getByRole('button', { name: /Rondjes/ }))
    expect(screen.getByText('6').closest('.tag')).toHaveTextContent('rondjes')

    await user.click(screen.getByRole('button', { name: /Start rondje/ }))
    await user.click(screen.getByRole('radio', { name: /Matig/ }))
    expect(screen.getByText('Opdrachtje, als je zin hebt')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rondje klaar' }))
    await user.click(screen.getByRole('radio', { name: /Goed/ }))
    expect(screen.getByText(/de wereld besnuffeld/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bewaar in mijn rondjes' }))

    expect(screen.getByText('7').closest('.tag')).toHaveTextContent('rondjes')
    expect(screen.getByText(/Nog niets gepland/)).toBeInTheDocument()
  })

  it('offers help when someone feels bad after a walk', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(nav().getByRole('button', { name: /Rondjes/ }))
    await user.click(screen.getByRole('button', { name: /Start rondje/ }))
    await user.click(screen.getByRole('button', { name: 'Overslaan en beginnen' }))
    await user.click(screen.getByRole('button', { name: 'Rondje klaar' }))
    await user.click(screen.getByRole('radio', { name: /Zwaar/ }))
    await user.click(screen.getByRole('button', { name: /wie je kunt bellen/ }))
    expect(screen.getByRole('heading', { name: 'Even niet oké?' })).toBeInTheDocument()
    expect(screen.getByText('0800-0113')).toBeInTheDocument()
  })

  it('clears the example data on request', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(nav().getByRole('button', { name: /Rondjes/ }))
    await user.click(screen.getByRole('button', { name: 'Begin leeg' }))
    expect(screen.queryByText(/Voorbeeld\./)).not.toBeInTheDocument()
    expect(screen.getByText('rondjes').closest('.tag')).toHaveTextContent('0')
  })
})

describe('Hulp', () => {
  it('lists the help lines and accepts a dog sign-up', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Even niet oké?' }))
    for (const name of ['113 Zelfmoordpreventie', 'MIND Hulplijn', 'In je bol', 'De Kindertelefoon']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    await user.type(screen.getByLabelText('Naam van de hond'), 'Bobbie')
    await user.type(screen.getByLabelText('Wijk of postcode'), '3581')
    await user.click(screen.getByLabelText('Voor iemand anders'))
    await user.click(screen.getByRole('button', { name: 'Meld aan' }))
    expect(screen.getByRole('status')).toHaveTextContent('Bedankt')
  })
})
