import { describe, expect, it, vi } from 'vitest'

import * as plugin from './index.js'

describe('native DSH plugin surface', () => {
  it('exports a Cordis plugin that waits for the projection registry', () => {
    expect(plugin.name).toBe('dsh-pet')
    expect(plugin.inject).toContain('sessionProjections')
    expect(typeof plugin.apply).toBe('function')
  })

  it('registers the dshPet projection through the native service', () => {
    const register = vi.fn(() => () => undefined)
    const registerSettings = vi.fn(() => () => undefined)
    plugin.apply({
      sessionProjections: { register },
      inject: (_dependencies: string[], callback: (ctx: { settings: { register: typeof registerSettings } }) => void) => {
        callback({ settings: { register: registerSettings } })
      },
    } as never)

    expect(register).toHaveBeenCalledOnce()
    expect(register.mock.calls[0]?.[0]).toMatchObject({ key: 'dshPet', stateVersion: 1 })
    expect(registerSettings).toHaveBeenCalledOnce()
  })
})
