import type { Context } from '@deepseek-ai/cordis'

import { petProjectionDefinition } from './projection.js'

export { petProjectionDefinition } from './projection.js'
export type { PetProjection } from './projection.js'

export const name = 'dsh-pet'
export const inject = ['sessionProjections'] as const

export function apply(ctx: Context): void {
  ctx.sessionProjections.register(petProjectionDefinition)
}
