import type { PetEvent, PetState } from '@dsh-pet/protocol'

export interface PetViewState extends PetEvent {}

export interface PetStateMachineOptions {
  successMs?: number
  errorMs?: number
  initialSessionId?: string
}

export interface PetStateMachine {
  current(): PetViewState
  send(event: PetEvent): void
  subscribe(listener: (state: PetViewState) => void): () => void
  dispose(): void
}

const TERMINAL_STATES = new Set<PetState>(['success', 'error'])
const priority: Record<PetState, number> = { idle: 0, thinking: 1, tool: 2, success: 3, error: 4 }

function idleEvent(sessionId: string): PetEvent {
  return { version: '0.1', state: 'idle', sessionId, timestamp: Date.now() }
}

export function createPetStateMachine(options: PetStateMachineOptions = {}): PetStateMachine {
  const successMs = options.successMs ?? 1500
  const errorMs = options.errorMs ?? 3000
  let state = idleEvent(options.initialSessionId ?? 'local')
  let lowerState = state
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  const listeners = new Set<(next: PetViewState) => void>()

  const notify = () => {
    for (const listener of listeners) listener(state)
  }
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  return {
    current: () => state,
    send(event) {
      if (disposed) return
      const incomingTerminal = TERMINAL_STATES.has(event.state)
      const currentTerminal = TERMINAL_STATES.has(state.state)

      if (!incomingTerminal && currentTerminal) {
        lowerState = event
        return
      }
      if (incomingTerminal && currentTerminal && priority[event.state] < priority[state.state]) return

      if (!incomingTerminal) {
        lowerState = event
        clearTimer()
        state = event
        notify()
        return
      }

      clearTimer()
      state = event
      notify()
      timer = setTimeout(() => {
        if (disposed) return
        state = lowerState.state === 'idle'
          ? { ...lowerState, sessionId: event.sessionId, timestamp: Date.now() }
          : lowerState
        timer = undefined
        notify()
      }, event.state === 'success' ? successMs : errorMs)
    },
    subscribe(listener) {
      if (disposed) return () => undefined
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose() {
      disposed = true
      clearTimer()
      listeners.clear()
    },
  }
}
