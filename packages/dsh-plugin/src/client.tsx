import type { Context } from '@deepseek-ai/cordis'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { validatePetManifest, type PetEvent, type PetManifest, type PetState } from '@dsh-pet/protocol'
import { createPetStateMachine, PetCard } from '@dsh-pet/web'
import { useEffect, useMemo, useRef, useState } from 'react'
import { assetUrls, fallbackManifest, manifestInput, validationErrors } from 'dsh-pet:pack'

import petStyles from '../../web/src/pet-card.css'

const validated = validatePetManifest(manifestInput)
const baseManifest = validated.ok ? validated.value : fallbackManifest
const manifest: PetManifest = {
  ...baseManifest,
  description: validationErrors.length > 0
    ? `${baseManifest.description} 自定义宠物包无效，已回退默认外观：${validationErrors.join('；')}`
    : baseManifest.description,
  assets: Object.fromEntries(Object.entries(baseManifest.assets).map(([state, asset]) => [
    state,
    { ...asset, src: assetUrls[state as PetState] },
  ])) as PetManifest['assets'],
}

type OverlayProps = PropsRuntime<'conversation.input.overlay'>

export function PetOverlay({ sessionId, useProjection, useSession }: OverlayProps) {
  const projection = useProjection('dshPet')
  const running = useSession((snapshot: SessionSnapshot) => snapshot.running)
  const lastAgentError = useSession((snapshot: SessionSnapshot) => snapshot.lastAgentError)
  const fallbackState: PetState = lastAgentError ? 'error' : running ? 'thinking' : 'idle'
  const state = projection?.state ?? fallbackState
  const sourceEvent = useMemo<PetEvent>(() => ({
    version: '0.1',
    state,
    sessionId,
    timestamp: projection?.timestamp ?? 0,
    ...(projection?.toolName ? { toolName: projection.toolName } : {}),
    ...(lastAgentError ? { message: lastAgentError } : {}),
  }), [lastAgentError, projection?.timestamp, projection?.toolName, sessionId, state])
  const machineRef = useRef<ReturnType<typeof createPetStateMachine> | null>(null)
  const [event, setEvent] = useState<PetEvent>(sourceEvent)

  useEffect(() => {
    const machine = createPetStateMachine({ initialSessionId: sessionId })
    machineRef.current = machine
    setEvent(machine.current())
    const unsubscribe = machine.subscribe(setEvent)
    return () => {
      unsubscribe()
      machine.dispose()
      if (machineRef.current === machine) machineRef.current = null
    }
  }, [sessionId])

  useEffect(() => {
    const machine = machineRef.current
    if (!machine) return
    if (sourceEvent.state === 'success' || sourceEvent.state === 'error') {
      machine.send({
        version: '0.1',
        state: 'idle',
        sessionId: sourceEvent.sessionId,
        timestamp: sourceEvent.timestamp,
      })
    }
    machine.send(sourceEvent)
  }, [sourceEvent])

  return (
    <div className="dsh-pet-native-overlay">
      <PetCard manifest={manifest} event={event} fallbackAsset={assetUrls.idle} />
    </div>
  )
}

export const name = 'dsh-pet-client'
export const inject = ['slots'] as const

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshPet = '0.1'
    style.textContent = `${petStyles}\n.dsh-pet-native-overlay{position:fixed;right:1.25rem;bottom:1.25rem;z-index:20;pointer-events:auto}`
    document.head.append(style)
    return () => style.remove()
  })

  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'dsh-pet',
    order: 100,
  }, PetOverlay))
}
