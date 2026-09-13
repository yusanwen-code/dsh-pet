import type { PetEvent } from '@dsh-pet/protocol'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function eventBase(sessionId: string, timestamp: number): Pick<PetEvent, 'version' | 'sessionId' | 'timestamp'> {
  return { version: '0.1', sessionId, timestamp }
}

export function mapHarnessEvent(
  sessionId: string,
  input: unknown,
  timestamp = Date.now(),
): PetEvent | undefined {
  if (!sessionId || !isRecord(input) || typeof input.type !== 'string') return undefined

  const base = eventBase(sessionId, timestamp)
  if (input.type === 'agent/assistant-stream') {
    if (!isRecord(input.frame) || !['start', 'chunk'].includes(String(input.frame.type))) return undefined
    return { ...base, state: 'thinking' }
  }
  if (input.type === 'tool/call') {
    const toolName = isRecord(input.data) && typeof input.data.name === 'string' ? input.data.name : undefined
    return { ...base, state: 'tool', ...(toolName ? { toolName } : {}) }
  }
  if (input.type === 'tool/result') return { ...base, state: 'thinking' }
  if (input.type === 'turn/end') {
    const reason = isRecord(input.data) && isRecord(input.data.reason) ? input.data.reason.kind : undefined
    return reason === 'completed' ? { ...base, state: 'success' } : { ...base, state: 'error' }
  }
  return undefined
}
