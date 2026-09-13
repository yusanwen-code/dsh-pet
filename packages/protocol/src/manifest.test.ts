import { describe, expect, it } from 'vitest'

import { validatePetManifest } from './manifest.js'

const assets = {
  idle: { src: 'assets/idle.svg', alt: 'Idle whale', animation: 'breathe' },
  thinking: { src: 'assets/thinking.svg', alt: 'Thinking whale', animation: 'bob' },
  tool: { src: 'assets/tool.svg', alt: 'Working whale', animation: 'pulse' },
  success: { src: 'assets/success.svg', alt: 'Happy whale', animation: 'celebrate' },
  error: { src: 'assets/error.png', alt: 'Confused whale', animation: 'shake' },
} as const

const validManifest = {
  protocolVersion: '0.1',
  id: 'deepseek-whale',
  name: 'DeepSea Connector',
  description: 'A whale that makes Harness activity visible.',
  author: 'dsh-pet contributors',
  assets,
  capabilities: [{ name: 'pet.wave', description: 'Wave at the user.', version: '0.1' }],
} as const

describe('validatePetManifest', () => {
  it('accepts a complete 0.1 manifest', () => {
    const result = validatePetManifest(validManifest)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual(validManifest)
    }
  })

  it.each(['https://host/pet.svg', '/tmp/pet.svg', '../pet.svg', 'pet.webp', '%2e%2e/%2e%2e/secret.svg'])(
    'rejects unsafe asset path %s',
    (src) => {
      const result = validatePetManifest({
        ...validManifest,
        assets: { ...assets, idle: { ...assets.idle, src } },
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors[0]).toContain('assets.idle.src')
    },
  )

  it('rejects missing states and unsupported protocol versions', () => {
    const { error: _error, ...missingError } = assets
    const result = validatePetManifest({
      ...validManifest,
      protocolVersion: '1.0',
      assets: missingError,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContain('protocolVersion must be "0.1"')
      expect(result.errors).toContain('assets.error must be an object')
    }
  })

  it('returns deeply frozen capability declarations', () => {
    const result = validatePetManifest(validManifest)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true)
      expect(Object.isFrozen(result.value.capabilities)).toBe(true)
      expect(Object.isFrozen(result.value.capabilities?.[0])).toBe(true)
    }
  })
})
