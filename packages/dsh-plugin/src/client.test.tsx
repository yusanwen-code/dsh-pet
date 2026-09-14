import '@testing-library/jest-dom/vitest'

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'

import { PetOverlay, PetSettingsRow } from './client.js'
import type { PetSettings } from './settings-contract.js'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

describe('native pet overlay', () => {
  function createSettingsScope(initialEnabled = true): SettingsScope<PetSettings> {
    let snapshot = {
      status: 'ready' as const,
      value: { enabled: initialEnabled },
      base: {},
      user: {},
      revision: 1,
      writable: true,
      mode: 'host' as const,
    }
    const listeners = new Set<() => void>()
    return {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      set: async (field, value) => {
        if (field !== 'enabled' || typeof value !== 'boolean') throw new Error('invalid pet setting')
        snapshot = { ...snapshot, value: { enabled: value }, revision: snapshot.revision + 1 }
        listeners.forEach((listener) => listener())
      },
      unset: async () => undefined,
      mutate: async () => undefined,
    }
  }

  it('returns a successful session to idle after its presentation window', () => {
    vi.useFakeTimers()
    const props = {
      sessionId: 's1',
      useProjection: () => ({ state: 'success', timestamp: 1 }),
      useSession: (selector: (snapshot: Record<string, unknown>) => unknown) => selector({
        running: false,
        lastAgentError: null,
      }),
      petSettings: createSettingsScope(),
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
      petSettings: createSettingsScope(),
    } as unknown as Parameters<typeof PetOverlay>[0]

    render(<><PetSettingsRow petSettings={props.petSettings} /><PetOverlay {...props} /></>)
    expect(screen.getByTestId('pet-art')).toBeVisible()

    await user.click(screen.getByRole('switch', { name: '关闭宠物' }))
    expect(screen.queryByTestId('pet-art')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: '显示宠物' })).toHaveAttribute('aria-checked', 'false')

    await user.click(screen.getByRole('switch', { name: '显示宠物' }))
    expect(screen.getByTestId('pet-art')).toBeVisible()
  })
})
