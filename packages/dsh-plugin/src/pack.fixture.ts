import type { PetManifest, PetState } from '@dsh-pet/protocol'

export const assetUrls: Record<PetState, string> = {
  idle: '/idle.svg',
  thinking: '/thinking.svg',
  tool: '/tool.svg',
  success: '/success.svg',
  error: '/error.svg',
}

export const fallbackManifest: PetManifest = {
  protocolVersion: '0.1',
  id: 'test-pet',
  name: '测试宠物',
  description: '测试原生宠物。',
  author: 'Tests',
  assets: Object.fromEntries(Object.entries(assetUrls).map(([state, src]) => [
    state,
    { src: `assets/${state}.svg`, alt: state },
  ])) as PetManifest['assets'],
}

export const manifestInput: unknown = fallbackManifest
export const validationErrors: readonly string[] = []
