import type { PetCapabilityDeclaration, PetEvent, PetManifest } from '@dsh-pet/protocol'

export type PetEventListener = (event: PetEvent) => void

export interface PetService {
  publish(event: PetEvent): void
  subscribe(listener: PetEventListener): () => void
  capabilities(): readonly Readonly<PetCapabilityDeclaration>[]
  dispose(): void
}

export function createPetService(manifest: PetManifest): PetService {
  const listeners = new Set<PetEventListener>()
  const declaredCapabilities = Object.freeze(
    (manifest.capabilities ?? []).map((capability) => Object.freeze({ ...capability })),
  )

  return {
    publish(event) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch {
          // Pet observers are cosmetic and may never break the Harness event path.
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        listeners.delete(listener)
      }
    },
    capabilities() {
      return declaredCapabilities
    },
    dispose() {
      listeners.clear()
    },
  }
}
