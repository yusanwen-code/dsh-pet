export const PET_STATES = ['idle', 'thinking', 'tool', 'success', 'error'] as const

export type PetState = (typeof PET_STATES)[number]

export const PET_ANIMATIONS = ['breathe', 'bob', 'pulse', 'shake', 'celebrate'] as const

export type PetAnimation = (typeof PET_ANIMATIONS)[number]

export interface PetEvent {
  version: '0.1'
  state: PetState
  sessionId: string
  timestamp: number
  message?: string
  toolName?: string
  data?: Readonly<Record<string, unknown>>
}

export interface PetAsset {
  src: string
  alt: string
  animation?: PetAnimation
}

export interface PetCapabilityDeclaration {
  name: string
  description: string
  version: string
}

export interface PetManifest {
  protocolVersion: '0.1'
  id: string
  name: string
  description: string
  author: string
  assets: Record<PetState, PetAsset>
  capabilities?: readonly PetCapabilityDeclaration[]
}

export type ManifestResult =
  | { ok: true; value: Readonly<PetManifest> }
  | { ok: false; errors: string[] }
