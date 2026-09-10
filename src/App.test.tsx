import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { STORAGE_KEY } from './domain/storage'

beforeEach(() => localStorage.clear())

async function completeOnboarding() {
  const user = userEvent.setup()
  for (const checkbox of screen.getAllByRole('checkbox')) await user.click(checkbox)
  await user.click(screen.getByRole('button', { name: /enter the learning space/i }))
  return user
}

async function acknowledgeGameSession(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: /no-money educational simulation/i }))
  await user.click(screen.getByRole('button', { name: /start \d+-minute learning session/i }))
}

describe('G.A.M.E. safety journey', () => {
  it('guards the simulations behind four acknowledgments', async () => {
    render(<App />)
    const enter = screen.getByRole('button', { name: /enter the learning space/i })
    expect(enter).toBeDisabled()
    await completeOnboarding()
    expect(screen.getByRole('heading', { name: /notice the design/i })).toBeInTheDocument()
  })

  it('interrupts a fake purchase without displaying financial credential inputs', async () => {
    render(<App />)
    const user = await completeOnboarding()
    await user.click(screen.getByRole('button', { name: /fictional wallet/i }))
    await user.click(screen.getAllByRole('button', { name: /simulate checkout/i })[0])
    expect(screen.getByRole('dialog')).toHaveTextContent('Step outside the moment')
    expect(screen.queryByLabelText(/card number|cvv|bank account/i)).not.toBeInTheDocument()
  })

  it('keeps calming alternatives and local reports directly accessible', async () => {
    render(<App />)
    const user = await completeOnboarding()
    await user.click(screen.getByRole('button', { name: 'Calm' }))
    expect(screen.getByRole('heading', { name: /choose a quieter next step/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Report' }))
    expect(screen.getByRole('heading', { name: /counselor conversation report/i })).toBeInTheDocument()
    expect(screen.getByText(/nothing is uploaded/i)).toBeInTheDocument()
  })

  it('requires a fresh safety acknowledgment before every game session', async () => {
    render(<App />)
    const user = await completeOnboarding()
    for (const name of ['Roulette', 'Color Game', 'Blackjack', 'Poker', 'Tong-its']) {
      const card = screen.getByRole('heading', { name }).closest('article')
      await user.click(within(card!).getByRole('button', { name: 'Open lesson' }))
      expect(screen.getByRole('heading', { name: /start a bounded learning session/i })).toBeInTheDocument()
      await acknowledgeGameSession(user)
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
      expect(screen.getByText('Learning-session boundary')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /back/i }))
    }
  })

  it('interrupts rapid repeated roulette wagers', async () => {
    render(<App />)
    const user = await completeOnboarding()
    const card = screen.getByRole('heading', { name: 'Roulette' }).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Open lesson' }))
    await acknowledgeGameSession(user)
    const spin = screen.getByRole('button', { name: /spin once/i })
    await user.click(spin)
    await user.click(spin)
    await user.click(spin)
    expect(screen.getByRole('dialog')).toHaveTextContent('Step outside the moment')
  })

  it('deals a poker hand without crashing before five cards are available', async () => {
    render(<App />)
    const user = await completeOnboarding()
    const card = screen.getByRole('heading', { name: 'Poker' }).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Open lesson' }))
    await acknowledgeGameSession(user)

    const dealButton = screen.getByRole('button', { name: 'Deal one hand' })
    dealButton.focus()
    expect(dealButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('heading', { name: 'Poker' })).toBeInTheDocument()
    expect(screen.getByLabelText('Community board')).toHaveTextContent('Preflop')
    expect(screen.getByRole('group', { name: 'Your action' })).toBeInTheDocument()
  })
})

function themeFromStorage(): string | undefined {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return undefined
  return (JSON.parse(raw) as { settings?: { theme?: string } }).settings?.theme
}

describe('G.A.M.E. dark/light theme', () => {
  it('defaults to theme-dark with the Light theme checkbox unchecked', async () => {
    const { container } = render(<App />)
    const user = await completeOnboarding()

    const shell = container.querySelector('.app-shell')!
    expect(shell).toHaveClass('theme-dark')
    expect(shell).not.toHaveClass('theme-light')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('checkbox', { name: /light theme/i })).not.toBeChecked()
  })

  it('switches the shell to theme-light when the Light theme control is toggled', async () => {
    const { container } = render(<App />)
    const user = await completeOnboarding()
    await user.click(screen.getByRole('button', { name: 'Settings' }))

    const toggle = screen.getByRole('checkbox', { name: /light theme/i })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)

    const shell = container.querySelector('.app-shell')!
    expect(shell).toHaveClass('theme-light')
    expect(shell).not.toHaveClass('theme-dark')
    expect(toggle).toBeChecked()
  })

  it('persists the light theme across a fresh App mount (local-only)', async () => {
    const first = render(<App />)
    const user = await completeOnboarding()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('checkbox', { name: /light theme/i }))

    // Wait for the persistence effect to actually commit theme='light' to
    // localStorage before unmounting, avoiding a false positive from an
    // in-flight React effect.
    await waitFor(() => expect(themeFromStorage()).toBe('light'))

    first.unmount()

    // A fresh App instance must restore the persisted theme from localStorage.
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.app-shell')).toHaveClass('theme-light'))
    expect(container.querySelector('.app-shell')).not.toHaveClass('theme-dark')

    // Navigate to Settings on the fresh mount and confirm the restored state.
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('checkbox', { name: /light theme/i })).toBeChecked()
  })
})
