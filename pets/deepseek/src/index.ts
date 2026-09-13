import { validatePetManifest, type PetManifest } from '@dsh-pet/protocol'
import manifestJson from '../pet.json' with { type: 'json' }

const result = validatePetManifest(manifestJson)
if (!result.ok) throw new Error(`Invalid bundled pet manifest: ${result.errors.join('; ')}`)

export const defaultPetManifest: Readonly<PetManifest> = result.value
