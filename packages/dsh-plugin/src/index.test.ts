import { describe, expect, it } from 'vitest'

import * as plugin from './index.js'

describe('native DSH plugin surface', () => {
  it('exports a Cordis plugin that waits for the projection registry', () => {
    expect(plugin.name).toBe('dsh-pet')
    expect(plugin.inject).toContain('sessionProjections')
    expect(typeof plugin.apply).toBe('function')
  })
})
