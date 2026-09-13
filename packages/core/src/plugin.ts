import type { PetManifest } from '@dsh-pet/protocol'

import { mapHarnessEvent } from './adapter.js'
import { createPetService, type PetService } from './service.js'

type Disposer = () => void

export interface PetPluginContext {
  on(name: string, listener: (...args: any[]) => void): Disposer
  provide(name: string, value: PetService): Disposer
  effect(factory: () => void | Disposer): unknown
}

export interface PetPluginConfig {
  manifest: PetManifest
  now?: () => number
}

export const name = 'dsh-pet-core'
export const inject = ['agents', 'sessions'] as const

function sessionIdOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.id === 'string') return record.id
  if (typeof record.sessionId === 'string') return record.sessionId
  if (typeof record.agent === 'object' && record.agent !== null) {
    const agent = record.agent as Record<string, unknown>
    if (typeof agent.sessionId === 'string') return agent.sessionId
  }
  return undefined
}

export function apply(ctx: PetPluginContext, config: PetPluginConfig): void {
  const service = createPetService(config.manifest)
  const now = config.now ?? Date.now
  const disposers: Disposer[] = []

  disposers.push(ctx.provide('pet', service))
  disposers.push(ctx.on('session/event', (session: unknown, event: unknown) => {
    const sessionId = sessionIdOf(session)
    if (!sessionId) return
    const mapped = mapHarnessEvent(sessionId, event, now())
    if (mapped) service.publish(mapped)
  }))
  disposers.push(ctx.on('agent/assistant-stream', (payload: unknown) => {
    const sessionId = sessionIdOf(payload)
    if (!sessionId || typeof payload !== 'object' || payload === null) return
    const record = payload as Record<string, unknown>
    const mapped = mapHarnessEvent(sessionId, { type: 'agent/assistant-stream', frame: record.frame }, now())
    if (mapped) service.publish(mapped)
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers.reverse()) dispose()
    service.dispose()
  })
}
