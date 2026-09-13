import { describe, expect, it } from 'vitest'

import type { PetManifest } from '@dsh-pet/protocol'
import { apply } from './plugin.js'

const manifest: PetManifest = {
  protocolVersion: '0.1',
  id: 'test-pet',
  name: 'Test Pet',
  description: 'A fixture pet.',
  author: 'Tests',
  assets: {
    idle: { src: 'idle.svg', alt: 'Idle' },
    thinking: { src: 'thinking.svg', alt: 'Thinking' },
    tool: { src: 'tool.svg', alt: 'Tool' },
    success: { src: 'success.svg', alt: 'Success' },
    error: { src: 'error.svg', alt: 'Error' },
  },
}

describe('Cordis plugin lifecycle', () => {
  it('publishes mapped events and clears the service on disposal', () => {
    const listeners = new Map<string, (...args: unknown[]) => void>()
    const cleanups: Array<() => void> = []
    let service: { subscribe(listener: (event: { state: string }) => void): () => void } | undefined
    const ctx = {
      on(name: string, listener: (...args: unknown[]) => void) {
        listeners.set(name, listener)
        return () => listeners.delete(name)
      },
      provide(_name: string, value: typeof service) {
        service = value
        return () => { service = undefined }
      },
      effect(factory: () => void | (() => void)) {
        const dispose = factory()
        if (dispose) cleanups.push(dispose)
      },
    }

    apply(ctx, { manifest, now: () => 99 })
    const states: string[] = []
    service?.subscribe((event) => states.push(event.state))
    listeners.get('session/event')?.({ id: 's1' }, { type: 'tool/call', data: { name: 'bash' } })
    expect(states).toEqual(['tool'])

    cleanups.reverse().forEach((cleanup) => cleanup())
    expect(service).toBeUndefined()
    expect(listeners.size).toBe(0)
  })
})
