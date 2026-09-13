import { describe, expect, it } from 'vitest'

import type { PetEvent, PetManifest } from '@dsh-pet/protocol'
import { createPetService } from './service.js'

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
  capabilities: [{ name: 'pet.wave', description: 'Wave.', version: '0.1' }],
}

const event: PetEvent = {
  version: '0.1',
  state: 'thinking',
  sessionId: 'session-1',
  timestamp: 42,
}

describe('createPetService', () => {
  it('continues notifying when one subscriber throws', () => {
    const seen: string[] = []
    const service = createPetService(manifest)
    service.subscribe(() => { throw new Error('broken pet') })
    service.subscribe((next) => seen.push(next.state))

    service.publish(event)

    expect(seen).toEqual(['thinking'])
  })

  it('unsubscribes idempotently and disposes every listener', () => {
    const seen: string[] = []
    const service = createPetService(manifest)
    const unsubscribe = service.subscribe((next) => seen.push(next.state))
    unsubscribe()
    unsubscribe()
    service.publish(event)
    service.subscribe((next) => seen.push(next.state))
    service.dispose()
    service.publish(event)

    expect(seen).toEqual([])
  })

  it('returns an immutable defensive capability list', () => {
    const service = createPetService(manifest)
    const capabilities = service.capabilities()

    expect(capabilities).toEqual(manifest.capabilities)
    expect(capabilities).not.toBe(manifest.capabilities)
    expect(Object.isFrozen(capabilities)).toBe(true)
    expect(Object.isFrozen(capabilities[0])).toBe(true)
  })
})
