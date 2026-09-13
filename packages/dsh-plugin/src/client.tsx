import type { Context } from '@deepseek-ai/cordis'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'
import { createPetStateMachine, PetCard } from '@dsh-pet/web'
import { useEffect, useMemo, useRef, useState } from 'react'

import errorAsset from '../../../pets/deepseek/assets/error.svg'
import idleAsset from '../../../pets/deepseek/assets/idle.svg'
import successAsset from '../../../pets/deepseek/assets/success.svg'
import thinkingAsset from '../../../pets/deepseek/assets/thinking.svg'
import toolAsset from '../../../pets/deepseek/assets/tool.svg'
import petStyles from '../../web/src/pet-card.css'

const assets: Record<PetState, { src: string; alt: string; animation: 'breathe' | 'bob' | 'pulse' | 'shake' | 'celebrate' }> = {
  idle: { src: idleAsset, alt: '安静待命的连接鲸', animation: 'breathe' },
  thinking: { src: thinkingAsset, alt: '追逐思绪的连接鲸', animation: 'bob' },
  tool: { src: toolAsset, alt: '连接工具的连接鲸', animation: 'pulse' },
  success: { src: successAsset, alt: '庆祝任务完成的连接鲸', animation: 'celebrate' },
  error: { src: errorAsset, alt: '检查故障的连接鲸', animation: 'shake' },
}

const manifest: PetManifest = {
  protocolVersion: '0.1',
  id: 'deepsea-connector',
  name: '连接鲸',
  description: '把 DeepSeek Harness 的工作节奏变成看得见的陪伴。',
  author: 'dsh-pet contributors',
  assets,
  capabilities: [
    {
      name: 'pet.wave',
      description: '向用户挥鳍问候。此能力在 0.1 中只声明、不执行。',
      version: '0.1',
    },
  ],
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
      <PetCard manifest={manifest} event={event} fallbackAsset={idleAsset} />
    </div>
  )
}

export const name = 'dsh-pet-client'
export const inject = ['slots'] as const

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshPet = '0.1'
    style.textContent = `${petStyles}\n.dsh-pet-native-overlay{position:absolute;right:1rem;bottom:calc(100% + 1rem);z-index:20;pointer-events:auto}`
    document.head.append(style)
    return () => style.remove()
  })

  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'dsh-pet',
    order: 100,
  }, PetOverlay))
}
