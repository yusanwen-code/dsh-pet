import '@testing-library/jest-dom/vitest'

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PetOverlay } from './client.js'

afterEach(() => {
  cleanup()
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
})
