import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import type { PetEvent, PetManifest, PetState } from '@dsh-pet/protocol'
import { PetCard } from './PetCard.js'

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
  it('shows the current tool and expands pet details', async () => {
    const user = userEvent.setup()
    render(<PetCard manifest={manifest} event={event('tool', 'bash')} fallbackAsset="/fallback.svg" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('正在使用 bash')
    await user.click(screen.getByRole('button', { name: '查看宠物详情' }))
    expect(screen.getByText('协议 0.1')).toBeVisible()
    expect(screen.getByText('pet.wave')).toBeVisible()
  })

  it('collapses to a compact control and can reopen', async () => {
    const user = userEvent.setup()
    render(<PetCard manifest={manifest} event={event('idle')} fallbackAsset="/fallback.svg" />)

    await user.click(screen.getByRole('button', { name: '收起宠物' }))
    expect(screen.getByRole('button', { name: '展开宠物' })).toBeVisible()
    expect(screen.queryByTestId('pet-art')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '展开宠物' }))
    expect(screen.getByTestId('pet-art')).toBeVisible()
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
})
