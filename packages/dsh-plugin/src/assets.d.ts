declare module '*.svg' {
  const url: string
  export default url
}

declare module '*.css' {
  const css: string
  export default css
}

declare module 'dsh-pet:pack' {
  import type { PetManifest, PetState } from '@dsh-pet/protocol'

  export const manifestInput: unknown
  export const assetUrls: Record<PetState, string>
  export const validationErrors: readonly string[]
  export const fallbackManifest: PetManifest
}
