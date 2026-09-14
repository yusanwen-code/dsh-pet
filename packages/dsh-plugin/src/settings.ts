import z from '@deepseek-ai/schemastery'

import { PET_ENABLED_FIELD, type PetSettings } from './settings-contract.js'

export const PetSettingsSchema: z<PetSettings> = z.object({
  [PET_ENABLED_FIELD]: z.boolean().default(true),
})
