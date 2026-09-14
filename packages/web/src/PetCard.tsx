import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'

export interface PetCardProps {
  manifest: PetManifest
  event: PetEvent
  fallbackAsset: string
  className?: string
  /** Keep placement and visibility between DSH restarts. */
  persistPreferences?: boolean
}

const stateLabels: Record<PetState, string> = {
  idle: '待命中',
  thinking: '正在思考',
  tool: '正在使用工具',
  success: '任务完成',
  error: '遇到问题',
}

interface DragStart {
  pointerId: number
  x: number
  y: number
  originX: number
  originY: number
}

const positionStorageKey = 'dsh-pet.position.v1'
const visibilityStorageKey = 'dsh-pet.collapsed.v1'
const initialPosition = { x: 0, y: 0 }

function readPosition(): typeof initialPosition {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(positionStorageKey) ?? 'null')
    if (
      typeof value === 'object' && value !== null
      && Number.isFinite((value as { x?: unknown }).x)
      && Number.isFinite((value as { y?: unknown }).y)
    ) {
      return { x: (value as { x: number }).x, y: (value as { y: number }).y }
    }
  } catch {
    // Local storage is optional (for example, in a private DSH profile).
  }
  return initialPosition
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(visibilityStorageKey) === 'true'
  } catch {
    return false
  }
}

function statusLabel(event: PetEvent): string {
  if (event.state === 'tool' && event.toolName) return `正在使用 ${event.toolName}`
  return stateLabels[event.state]
}

export function PetCard({ manifest, event, fallbackAsset, className = '', persistPreferences = false }: PetCardProps) {
  const [collapsed, setCollapsed] = useState(() => persistPreferences && readCollapsed())
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reaction, setReaction] = useState(0)
  const [assetFailed, setAssetFailed] = useState(false)
  const [position, setPosition] = useState(() => persistPreferences ? readPosition() : initialPosition)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<DragStart | null>(null)
  const didDrag = useRef(false)
  const normalizedState: PetState = Object.hasOwn(manifest.assets, event.state) ? event.state : 'idle'
  const normalizedEvent = normalizedState === event.state ? event : { ...event, state: normalizedState }
  const asset = manifest.assets[normalizedState]
  const label = statusLabel(normalizedEvent)

  useEffect(() => setAssetFailed(false), [asset.src])
  useEffect(() => {
    if (!persistPreferences) return
    try {
      window.localStorage.setItem(positionStorageKey, JSON.stringify(position))
    } catch {
      // The pet remains movable even when its host does not allow persistence.
    }
  }, [persistPreferences, position])
  useEffect(() => {
    if (!persistPreferences) return
    try {
      window.localStorage.setItem(visibilityStorageKey, String(collapsed))
    } catch {
      // The in-memory preference still works for this DSH session.
    }
  }, [collapsed, persistPreferences])
  const imageSrc = assetFailed ? fallbackAsset : asset.src
  const classes = useMemo(
    () => ['dsh-pet', `dsh-pet--${normalizedState}`, dragging ? 'dsh-pet--dragging' : '', reaction % 2 ? 'dsh-pet--hello' : '', className]
      .filter(Boolean)
      .join(' '),
    [className, dragging, normalizedState, reaction],
  )

  const beginDrag = (pointer: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = {
      pointerId: pointer.pointerId,
      x: pointer.clientX,
      y: pointer.clientY,
      originX: position.x,
      originY: position.y,
    }
    didDrag.current = false
    pointer.currentTarget.setPointerCapture?.(pointer.pointerId)
  }

  const moveDrag = (pointer: ReactPointerEvent<HTMLButtonElement>) => {
    const active = drag.current
    if (!active || active.pointerId !== pointer.pointerId) return
    const x = active.originX + pointer.clientX - active.x
    const y = active.originY + pointer.clientY - active.y
    if (Math.abs(x - active.originX) > 3 || Math.abs(y - active.originY) > 3) didDrag.current = true
    setDragging(didDrag.current)
    setPosition({ x, y })
  }

  const endDrag = (pointer: ReactPointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== pointer.pointerId) return
    drag.current = null
    setDragging(false)
    pointer.currentTarget.releasePointerCapture?.(pointer.pointerId)
  }

  if (collapsed) {
    return (
      <button className="dsh-pet dsh-pet__dock" type="button" aria-label="开启宠物" onClick={() => setCollapsed(false)}>
        <img src={imageSrc} alt="" aria-hidden="true" />
      </button>
    )
  }

  return (
    <aside
      className={classes}
      data-state={normalizedState}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` } as CSSProperties}
    >
      <div className="dsh-pet__bubble">
        <div className="dsh-pet__bubble-meta"><span>PET / 0.1</span><span className="dsh-pet__signal" aria-hidden="true" /></div>
        <div className="dsh-pet__bubble-main">
          <div><strong>{manifest.name}</strong><span role="status" aria-label={label}>{label}</span></div>
          <button
            className="dsh-pet__details-toggle"
            type="button"
            aria-label={detailsOpen ? '关闭宠物详情' : '查看宠物详情'}
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? '×' : 'i'}
          </button>
          <button className="dsh-pet__collapse" type="button" aria-label="关闭宠物" onClick={() => setCollapsed(true)}>−</button>
        </div>
      </div>
      <div className="dsh-pet__signal-line" aria-hidden="true" />

      <button
        className="dsh-pet__stage"
        type="button"
        aria-label={`拖动或与${manifest.name}互动`}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (didDrag.current) {
            didDrag.current = false
            return
          }
          setReaction((value) => value + 1)
        }}
      >
        <span className="dsh-pet__halo" aria-hidden="true" />
        <img
          data-testid="pet-art"
          data-state={normalizedState}
          className={`dsh-pet__art dsh-pet__art--${asset.animation ?? 'breathe'}`}
          src={imageSrc}
          alt={asset.alt}
          onError={() => { if (!assetFailed) setAssetFailed(true) }}
        />
      </button>

      {detailsOpen && (
        <section className="dsh-pet__details">
          <p>{manifest.description}</p>
          <div><span>协议 0.1</span><span>作者 {manifest.author}</span></div>
          {(manifest.capabilities?.length ?? 0) > 0 && (
            <ul aria-label="未来能力">
              {manifest.capabilities?.map((capability) => (
                <li key={capability.name}>
                  <code>{capability.name}</code>
                  <span>仅声明</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </aside>
  )
}
