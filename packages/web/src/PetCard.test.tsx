import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'
import { clampPetPosition, PetCard } from './PetCard.js'

afterEach(cleanup)

const manifest: PetManifest = {
  protocolVersion: '0.1',
  id: 'test-pet',
  name: '连接鲸',
  description: '把工作状态变成动作。',
  author: 'Tests',
  assets: {
    idle: { src: '/idle.svg', alt: '待机中的连接鲸', animation: 'breathe' },
    thinking: { src: '/thinking.svg', alt: '思考中的连接鲸', animation: 'bob' },
    tool: { src: '/tool.svg', alt: '使用工具的连接鲸', animation: 'pulse' },
    success: { src: '/success.svg', alt: '完成任务的连接鲸', animation: 'celebrate' },
    error: { src: '/error.svg', alt: '遇到错误的连接鲸', animation: 'shake' },
  },
  capabilities: [{ name: 'pet.wave', description: '向用户挥手。', version: '0.1' }],
}

function event(state: PetState, toolName?: string): PetEvent {
  return {
    version: '0.1',
    state,
    sessionId: 's1',
    timestamp: 1,
    ...(toolName ? { toolName } : {}),
  }
}

describe('PetCard', () => {
  it('keeps a restored or dragged pet reachable within the viewport', () => {
    expect(clampPetPosition(
      { x: 400, y: -700 },
      { x: 0, y: 0 },
      { left: 700, top: 600, width: 92, height: 160 },
      { innerWidth: 800, innerHeight: 760 },
    )).toEqual({ x: 0, y: -592 })
  })

  it('shows the current tool without an unnecessary info control', () => {
    render(<PetCard manifest={manifest} event={event('tool', 'bash')} fallbackAsset="/fallback.svg" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('正在使用 bash')
    expect(screen.queryByRole('button', { name: '查看宠物详情' })).not.toBeInTheDocument()
  })

  it('keeps the full whale visible without a minimise control', () => {
    render(<PetCard manifest={manifest} event={event('idle')} fallbackAsset="/fallback.svg" />)

    expect(screen.getByTestId('pet-art')).toBeVisible()
    expect(screen.queryByRole('button', { name: '关闭宠物' })).not.toBeInTheDocument()
  })

  it('falls back once when the active asset fails', () => {
    render(<PetCard manifest={manifest} event={event('error')} fallbackAsset="/fallback.svg" />)
    const image = screen.getByTestId('pet-art')

    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/fallback.svg')
    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/fallback.svg')
  })

  it('normalizes a future state to idle', () => {
    render(<PetCard manifest={manifest} event={{ ...event('idle'), state: 'future' } as PetEvent} fallbackAsset="/fallback.svg" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('待命中')
    expect(screen.getByTestId('pet-art')).toHaveAttribute('data-state', 'idle')
  })

  it('moves the transparent pet shell when the whale is dragged', () => {
    render(<PetCard manifest={manifest} event={event('idle')} fallbackAsset="/fallback.svg" />)
    const stage = screen.getByRole('button', { name: '拖动或与连接鲸互动' })

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 20, clientY: 30 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 74, clientY: 86 })
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 74, clientY: 86 })

    expect(stage.closest('[data-state]')).toHaveStyle({ transform: 'translate3d(54px, 56px, 0)' })
  })
})
