import { useEffect, useMemo, useState } from 'react'

import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'

export interface PetCardProps {
  manifest: PetManifest
  event: PetEvent
  fallbackAsset: string
  className?: string
}

const stateLabels: Record<PetState, string> = {
  idle: '待命中',
  thinking: '正在思考',
  tool: '正在使用工具',
  success: '任务完成',
  error: '遇到问题',
}

function statusLabel(event: PetEvent): string {
  if (event.state === 'tool' && event.toolName) return `正在使用 ${event.toolName}`
  return stateLabels[event.state]
}

export function PetCard({ manifest, event, fallbackAsset, className = '' }: PetCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [reaction, setReaction] = useState(0)
  const [assetFailed, setAssetFailed] = useState(false)
  const asset = manifest.assets[event.state] ?? manifest.assets.idle
  const label = statusLabel(event)

  useEffect(() => setAssetFailed(false), [asset.src])
  const imageSrc = assetFailed ? fallbackAsset : asset.src
  const classes = useMemo(
    () => ['dsh-pet', `dsh-pet--${event.state}`, reaction % 2 ? 'dsh-pet--hello' : '', className]
      .filter(Boolean)
      .join(' '),
    [className, event.state, reaction],
  )

  if (collapsed) {
    return (
      <button className="dsh-pet__dock" type="button" aria-label="展开宠物" onClick={() => setCollapsed(false)}>
        <span aria-hidden="true">◉</span>
        <span>{manifest.name}</span>
      </button>
    )
  }

  return (
    <aside className={classes} data-state={event.state}>
      <div className="dsh-pet__cable" aria-hidden="true"><span /></div>
      <header className="dsh-pet__topbar">
        <span className="dsh-pet__protocol">PET / 0.1</span>
        <button type="button" aria-label="收起宠物" onClick={() => setCollapsed(true)}>−</button>
      </header>

      <button
        className="dsh-pet__stage"
        type="button"
        aria-label={`与${manifest.name}互动`}
        onClick={() => setReaction((value) => value + 1)}
      >
        <span className="dsh-pet__halo" aria-hidden="true" />
        <img
          data-testid="pet-art"
          data-state={event.state}
          className={`dsh-pet__art dsh-pet__art--${asset.animation ?? 'breathe'}`}
          src={imageSrc}
          alt={asset.alt}
          onError={() => { if (!assetFailed) setAssetFailed(true) }}
        />
      </button>

      <div className="dsh-pet__readout">
        <span className="dsh-pet__signal" aria-hidden="true" />
        <div>
          <strong>{manifest.name}</strong>
          <span role="status" aria-label={label}>{label}</span>
        </div>
        <button
          className="dsh-pet__details-toggle"
          type="button"
          aria-label={detailsOpen ? '关闭宠物详情' : '查看宠物详情'}
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((value) => !value)}
        >
          {detailsOpen ? '×' : 'i'}
        </button>
      </div>

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
