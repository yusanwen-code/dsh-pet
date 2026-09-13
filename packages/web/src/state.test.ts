import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PetEvent, PetState } from '@dsh-pet/protocol'
import { createPetStateMachine } from './state.js'

function event(state: PetState): PetEvent {
  return { version: '0.1', sessionId: 's1', timestamp: 1, state }
}

afterEach(() => vi.useRealTimers())

describe('createPetStateMachine', () => {
  it('keeps an error above lower-priority activity then restores it', () => {
    vi.useFakeTimers()
    const machine = createPetStateMachine({ successMs: 1500, errorMs: 3000 })
    machine.send(event('thinking'))
    machine.send(event('error'))
    machine.send(event('tool'))

    expect(machine.current().state).toBe('error')
    vi.advanceTimersByTime(3000)
    expect(machine.current().state).toBe('tool')
  })

  it('replaces the terminal timer when the terminal event repeats', () => {
    vi.useFakeTimers()
    const machine = createPetStateMachine({ successMs: 1500, errorMs: 3000 })
    machine.send(event('success'))
    vi.advanceTimersByTime(1000)
    machine.send(event('success'))
    vi.advanceTimersByTime(1000)

    expect(machine.current().state).toBe('success')
    vi.advanceTimersByTime(500)
    expect(machine.current().state).toBe('idle')
  })

  it('stops timers and notifications after disposal', () => {
    vi.useFakeTimers()
    const seen: PetState[] = []
    const machine = createPetStateMachine({ successMs: 1500, errorMs: 3000 })
    machine.subscribe((value) => seen.push(value.state))
    machine.send(event('success'))
    machine.dispose()
    vi.advanceTimersByTime(1500)
    machine.send(event('thinking'))

    expect(seen).toEqual(['success'])
  })
})
