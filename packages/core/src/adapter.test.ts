import { describe, expect, it } from 'vitest'

import { mapHarnessEvent } from './adapter.js'

describe('mapHarnessEvent', () => {
  it.each([
    [{ type: 'agent/assistant-stream', frame: { type: 'start' } }, 'thinking'],
    [{ type: 'agent/assistant-stream', frame: { type: 'chunk' } }, 'thinking'],
    [{ type: 'tool/result' }, 'thinking'],
    [{ type: 'turn/end', data: { status: 'success' } }, 'success'],
    [{ type: 'assistant/attempt', data: { status: 'failed' } }, 'error'],
    [{ type: 'assistant/attempt', data: { status: 'cancelled' } }, 'error'],
  ] as const)('maps %o to %s', (input, state) => {
    expect(mapHarnessEvent('session-7', input, 1234)).toMatchObject({
      version: '0.1',
      sessionId: 'session-7',
      timestamp: 1234,
      state,
    })
  })

  it('includes a tool name from a tool call', () => {
    expect(mapHarnessEvent('session-7', { type: 'tool/call', data: { name: 'bash' } }, 1234)).toEqual({
      version: '0.1',
      sessionId: 'session-7',
      timestamp: 1234,
      state: 'tool',
      toolName: 'bash',
    })
  })

  it('ignores unknown and malformed events', () => {
    expect(mapHarnessEvent('session-7', { type: 'future/event' }, 1234)).toBeUndefined()
    expect(mapHarnessEvent('session-7', null, 1234)).toBeUndefined()
  })
})
