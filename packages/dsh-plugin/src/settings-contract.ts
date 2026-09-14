/** Durable Settings namespace and client-safe shape for pet preferences. */
export const PET_SETTINGS_NAMESPACE = 'dsh-pet'
export const PET_ENABLED_FIELD = 'enabled'

export interface PetSettings {
  enabled: boolean
}
