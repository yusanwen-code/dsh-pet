import { describe, expect, it } from 'vitest'

import { initialPetProjection, reducePetProjection } from './projection.js'

function event(type: string, data: Record<string, unknown> = {}, time = 42) {
  return { type, data, time, seq: 0 }
}

describe('pet session projection', () => {
  it('starts idle and exposes tool activity', () => {
    const initial = initialPetProjection()
    const thinking = reducePetProjection(initial, event('turn/start'))
    const usingTool = reducePetProjection(thinking, event('tool/call', { name: 'read_file' }, 43))

    expect(initial).toEqual({ state: 'idle', timestamp: 0 })
    expect(thinking).toEqual({ state: 'thinking', timestamp: 42 })
    expect(usingTool).toEqual({ state: 'tool', toolName: 'read_file', timestamp: 43 })
  })

  it('maps successful and failed turn endings', () => {
    const active = reducePetProjection(initialPetProjection(), event('step/start'))

    expect(reducePetProjection(active, event('turn/end', { reason: { kind: 'completed' } }))).toMatchObject({ state: 'success' })
    expect(reducePetProjection(active, event('turn/end', { reason: { kind: 'error' } }))).toMatchObject({ state: 'error' })
  })

  it('returns the same reference for unrelated events', () => {
    const current = initialPetProjection()
    expect(reducePetProjection(current, event('user/message'))).toBe(current)
  })
})
