import type { Context } from '@deepseek-ai/cordis'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { validatePetManifest, type PetEvent, type PetManifest, type PetState } from '@dsh-pet/protocol'
import { createPetStateMachine, PetCard } from '@dsh-pet/web'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
const enabledStorageKey = 'dsh-pet.enabled.v1'
const enabledChangeEvent = 'dsh-pet:enabled-change'

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(enabledStorageKey) !== 'false'
  } catch {
    return true
  }
}

function writeEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(enabledStorageKey, String(enabled))
  } catch {
    // DSH can still apply the preference until the current page is closed.
  }
  window.dispatchEvent(new CustomEvent<boolean>(enabledChangeEvent, { detail: enabled }))
}

function usePetEnabled(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readEnabled)

  useEffect(() => {
    const onChange = (event: Event) => setEnabled((event as CustomEvent<boolean>).detail)
    const onStorage = (event: StorageEvent) => {
      if (event.key === enabledStorageKey) setEnabled(event.newValue !== 'false')
    }
    window.addEventListener(enabledChangeEvent, onChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(enabledChangeEvent, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return [enabled, writeEnabled]
}

/** A first-class DSH Settings row; hiding is complete, not a visual minimise. */
export function PetSettingsRow() {
  const [enabled, setEnabled] = usePetEnabled()

  return (
    <section className="dsh-pet-settings-row">
      <div><strong>连接鲸</strong><span>在工作区显示 DeepSeek Harness 宠物</span></div>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)}>
        {enabled ? '关闭宠物' : '显示宠物'}
      </button>
    </section>
  )
}

export function PetOverlay({ sessionId, useProjection, useSession }: OverlayProps) {
  const [enabled] = usePetEnabled()
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

  if (!enabled) return null

  // The composer slot gives us the active session. Portal the visual to body so
  // it is not clipped by the composer and can receive pointer events anywhere.
  return createPortal(
    <div className="dsh-pet-native-overlay">
      <PetCard manifest={manifest} event={event} fallbackAsset={assetUrls.idle} persistPreferences />
    </div>,
    document.body,
  )
}

export const name = 'dsh-pet-client'
export const inject = ['slots'] as const

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshPet = '0.1'
    style.textContent = `${petStyles}\n.dsh-pet-native-overlay{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:visible}.dsh-pet-native-overlay>.dsh-pet{position:fixed;right:1.25rem;bottom:1.25rem;pointer-events:auto}.dsh-pet-settings-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 0;border-bottom:1px solid rgba(128,145,180,.18);color:inherit}.dsh-pet-settings-row>div{display:grid;gap:.2rem}.dsh-pet-settings-row strong{font-size:.88rem}.dsh-pet-settings-row span{color:#8c9ab8;font-size:.76rem}.dsh-pet-settings-row button{padding:.38rem .64rem;border:1px solid rgba(100,130,255,.42);border-radius:.5rem;background:rgba(70,100,245,.16);color:inherit;cursor:pointer;font:600 .75rem/1 system-ui,sans-serif}`
    document.head.append(style)
    return () => style.remove()
  })

  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'dsh-pet',
    order: 100,
  }, PetOverlay))

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-pet-settings',
    order: 100,
  }, PetSettingsRow))
}
