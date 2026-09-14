import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'

import { petProjectionDefinition } from './projection.js'
import { PET_SETTINGS_NAMESPACE } from './settings-contract.js'
import { PetSettingsSchema } from './settings.js'

export { petProjectionDefinition } from './projection.js'
export type { PetProjection } from './projection.js'
export { PET_ENABLED_FIELD, PET_SETTINGS_NAMESPACE } from './settings-contract.js'
export type { PetSettings } from './settings-contract.js'

export const name = 'dsh-pet'
export const inject = ['sessionProjections'] as const

export function apply(ctx: Context): void {
  ctx.sessionProjections.register(petProjectionDefinition)
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(PET_SETTINGS_NAMESPACE, PetSettingsSchema)
  })
}
