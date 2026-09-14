import '@testing-library/jest-dom/vitest'

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PetOverlay, PetSettingsRow } from './client.js'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('native pet overlay', () => {
  it('returns a successful session to idle after its presentation window', () => {
    vi.useFakeTimers()
    const props = {
      sessionId: 's1',
      useProjection: () => ({ state: 'success', timestamp: 1 }),
      useSession: (selector: (snapshot: Record<string, unknown>) => unknown) => selector({
        running: false,
        lastAgentError: null,
      }),
    } as unknown as Parameters<typeof PetOverlay>[0]

    render(<PetOverlay {...props} />)
    expect(screen.getByRole('status')).toHaveAccessibleName('任务完成')

    act(() => vi.advanceTimersByTime(1500))
    expect(screen.getByRole('status')).toHaveAccessibleName('待命中')
  })

  it('hides the pet completely from the DSH Settings switch and restores it', async () => {
    const user = userEvent.setup()
    const props = {
      sessionId: 's1',
      useProjection: () => ({ state: 'idle', timestamp: 1 }),
      useSession: (selector: (snapshot: Record<string, unknown>) => unknown) => selector({ running: false, lastAgentError: null }),
    } as unknown as Parameters<typeof PetOverlay>[0]

    render(<><PetSettingsRow /><PetOverlay {...props} /></>)
    expect(screen.getByTestId('pet-art')).toBeVisible()

    await user.click(screen.getByRole('switch', { name: '关闭宠物' }))
    expect(screen.queryByTestId('pet-art')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '显示宠物' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('switch', { name: '显示宠物' }))
    expect(screen.getByTestId('pet-art')).toBeVisible()
  })
})
