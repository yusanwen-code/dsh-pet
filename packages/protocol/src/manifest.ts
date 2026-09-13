import {
  PET_ANIMATIONS,
  PET_STATES,
  type ManifestResult,
  type PetAsset,
  type PetCapabilityDeclaration,
  type PetManifest,
  type PetState,
} from './types.js'

const identifierPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const capabilityPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeAssetPath(value: string): boolean {
  if (!/\.(?:svg|png)$/i.test(value)) return false
  if (/^(?:[a-z]+:|\/|\\)/i.test(value)) return false
  return !value.split(/[\\/]/).some((part) => part === '..' || part === '')
}

function cloneAsset(input: Record<string, unknown>, path: string, errors: string[]): PetAsset | undefined {
  if (!isNonEmptyString(input.src) || !isSafeAssetPath(input.src)) {
    errors.push(`${path}.src must be a safe relative .svg or .png path`)
  }
  if (!isNonEmptyString(input.alt)) errors.push(`${path}.alt must be a non-empty string`)
  if (input.animation !== undefined && !PET_ANIMATIONS.includes(input.animation as never)) {
    errors.push(`${path}.animation is not supported`)
  }
  if (errors.some((error) => error.startsWith(path))) return undefined

  const asset: PetAsset = { src: input.src as string, alt: input.alt as string }
  if (input.animation !== undefined) asset.animation = input.animation as NonNullable<PetAsset['animation']>
  return asset
}

function cloneCapability(
  input: unknown,
  index: number,
  errors: string[],
): PetCapabilityDeclaration | undefined {
  const path = `capabilities.${index}`
  if (!isRecord(input)) {
    errors.push(`${path} must be an object`)
    return undefined
  }
  if (!isNonEmptyString(input.name) || !capabilityPattern.test(input.name)) {
    errors.push(`${path}.name must be a namespaced identifier`)
  }
  if (!isNonEmptyString(input.description)) errors.push(`${path}.description must be a non-empty string`)
  if (!isNonEmptyString(input.version)) errors.push(`${path}.version must be a non-empty string`)
  if (errors.some((error) => error.startsWith(path))) return undefined

  return {
    name: input.name as string,
    description: input.description as string,
    version: input.version as string,
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

export function validatePetManifest(input: unknown): ManifestResult {
  const errors: string[] = []
  if (!isRecord(input)) return { ok: false, errors: ['manifest must be an object'] }

  if (input.protocolVersion !== '0.1') errors.push('protocolVersion must be "0.1"')
  if (!isNonEmptyString(input.id) || !identifierPattern.test(input.id)) {
    errors.push('id must be a lowercase kebab-case identifier')
  }
  for (const key of ['name', 'description', 'author'] as const) {
    if (!isNonEmptyString(input[key])) errors.push(`${key} must be a non-empty string`)
  }

  const clonedAssets = {} as Record<PetState, PetAsset>
  if (!isRecord(input.assets)) {
    errors.push('assets must be an object')
  } else {
    for (const state of PET_STATES) {
      const asset = input.assets[state]
      if (!isRecord(asset)) {
        errors.push(`assets.${state} must be an object`)
        continue
      }
      const cloned = cloneAsset(asset, `assets.${state}`, errors)
      if (cloned) clonedAssets[state] = cloned
    }
  }

  let capabilities: PetCapabilityDeclaration[] | undefined
  if (input.capabilities !== undefined) {
    if (!Array.isArray(input.capabilities)) {
      errors.push('capabilities must be an array')
    } else {
      capabilities = input.capabilities.flatMap((item, index) => {
        const cloned = cloneCapability(item, index, errors)
        return cloned ? [cloned] : []
      })
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const manifest: PetManifest = {
    protocolVersion: '0.1',
    id: input.id as string,
    name: input.name as string,
    description: input.description as string,
    author: input.author as string,
    assets: clonedAssets,
    ...(capabilities === undefined ? {} : { capabilities }),
  }
  return { ok: true, value: deepFreeze(manifest) }
}
