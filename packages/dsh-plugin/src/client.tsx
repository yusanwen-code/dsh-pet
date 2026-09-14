import type { Context } from '@deepseek-ai/cordis'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import { validatePetManifest, type PetEvent, type PetManifest, type PetState } from '@dsh-pet/protocol'
import { createPetStateMachine, PetCard } from '@dsh-pet/web'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { assetUrls, fallbackManifest, manifestInput, validationErrors } from 'dsh-pet:pack'

import petStyles from '../../web/src/pet-card.css'
import nativeStyles from './client.css'
import { PET_ENABLED_FIELD, PET_SETTINGS_NAMESPACE, type PetSettings } from './settings-contract.js'

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

interface PetSettingsInjected {
  petSettings: SettingsScope<PetSettings>
}

type OverlayProps = PropsRuntime<'conversation.input.overlay'> & InjectFace<PetSettingsInjected>
type SettingsRowProps = PropsRuntime<'settings.general.item'> & InjectFace<PetSettingsInjected>

function usePetEnabled(scope: SettingsScope<PetSettings>) {
  const snapshot = useSyncExternalStore(
    (listener) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const enabled = snapshot.value?.enabled ?? true
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const setEnabled = (next: boolean) => {
    setSaving(true)
    setSaveError(null)
    void scope.set(PET_ENABLED_FIELD, next).catch(() => {
      setSaveError('无法保存设置')
    }).finally(() => {
      setSaving(false)
    })
  }

  return { enabled, setEnabled, saving, saveError, writable: snapshot.writable && snapshot.status === 'ready' }
}

/** A first-class DSH Settings row; hiding is complete, not a visual minimise. */
export function PetSettingsRow({ petSettings }: SettingsRowProps) {
  const { enabled, saveError, saving, setEnabled, writable } = usePetEnabled(petSettings)

  return (
    <section className="dsh-pet-settings-row">
      <div><strong>连接鲸</strong><span>{saveError ?? '在工作区显示 DeepSeek Harness 宠物'}</span></div>
      <button type="button" role="switch" aria-checked={enabled} disabled={!writable || saving} onClick={() => setEnabled(!enabled)}>
        {enabled ? '关闭宠物' : '显示宠物'}
      </button>
    </section>
  )
}

export function PetOverlay({ sessionId, useProjection, useSession, petSettings }: OverlayProps) {
  const { enabled } = usePetEnabled(petSettings)
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

  // The composer slot gives us the active session. Portal only the pet itself
  // to body: a full-screen transparent wrapper could intercept DSH controls.
  return createPortal(
    <PetCard
      className="dsh-pet--native-overlay"
      manifest={manifest}
      event={event}
      fallbackAsset={assetUrls.idle}
      persistPreferences
    />,
    document.body,
  )
}

export const name = 'dsh-pet-client'
export const inject = ['slots', 'settingsScope'] as const

export function apply(ctx: Context): void {
  const petSettings = ctx.settingsScope.bind<PetSettings>({ namespace: PET_SETTINGS_NAMESPACE })
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshPet = '0.1'
    style.textContent = `${petStyles}\n${nativeStyles}`
    document.head.append(style)
    return () => style.remove()
  })

  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
    name: 'conversation.input.overlay',
    id: 'dsh-pet',
    order: 100,
    inject: () => ({ petSettings }),
  }, PetOverlay))

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-pet-settings',
    order: 100,
    inject: () => ({ petSettings }),
  }, PetSettingsRow))
}
