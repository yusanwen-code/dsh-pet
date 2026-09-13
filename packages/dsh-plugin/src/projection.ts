import type { PetState } from '@dsh-pet/protocol'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { z } from 'zod'

export interface PetProjection {
  state: PetState
  timestamp: number
  toolName?: string | undefined
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    dshPet: PetProjection
  }

  interface SessionProjectionStateMap {
    dshPet: PetProjection
  }
}

const petProjectionSchema: z.ZodType<PetProjection> = z.object({
  state: z.enum(['idle', 'thinking', 'tool', 'success', 'error']),
  timestamp: z.number(),
  toolName: z.string().optional(),
})

export function initialPetProjection(): PetProjection {
  return { state: 'idle', timestamp: 0 }
}

type EventLike = Pick<SessionEvent, 'type' | 'data' | 'time'> | {
  type: string
  data: Record<string, unknown>
  time: number
}

function turnEndKind(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const reason = (data as Record<string, unknown>).reason
  if (typeof reason !== 'object' || reason === null) return undefined
  const kind = (reason as Record<string, unknown>).kind
  return typeof kind === 'string' ? kind : undefined
}

export function reducePetProjection(state: PetProjection, event: EventLike): PetProjection {
  if (event.type === 'turn/start' || event.type === 'step/start') {
    return { state: 'thinking', timestamp: event.time }
  }

  if (event.type === 'tool/call') {
    const data = event.data as Record<string, unknown>
    return {
      state: 'tool',
      timestamp: event.time,
      ...(typeof data.name === 'string' ? { toolName: data.name } : {}),
    }
  }

  if (event.type === 'tool/result' || event.type === 'step/end') {
    return { state: 'thinking', timestamp: event.time }
  }

  if (event.type === 'turn/end') {
    const kind = turnEndKind(event.data)
    const failed = ['cancelled', 'failed', 'interrupted', 'error'].includes(kind ?? '')
    return { state: failed ? 'error' : 'success', timestamp: event.time }
  }

  return state
}

export const petProjectionDefinition: ProjectionDefinition<'dshPet'> & {
  wire: NonNullable<ProjectionDefinition<'dshPet'>['wire']>
} = {
  key: 'dshPet',
  stateSchema: petProjectionSchema,
  stateVersion: 1,
  init: initialPetProjection,
  apply: reducePetProjection,
  wire: {
    viewSchema: petProjectionSchema,
    view: (state) => state,
  },
}
