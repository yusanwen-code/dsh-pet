import { describe, expect, it } from 'vitest'
import packageJson from '../package.json'

describe('protocol package metadata', () => {
  it('publishes the protocol package as ESM', () => {
    expect(packageJson.name).toBe('@dsh-pet/protocol')
    expect(packageJson.type).toBe('module')
  })
})
