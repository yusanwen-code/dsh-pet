import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { App } from './App.js'

afterEach(cleanup)

describe('protocol workbench', () => {
  it.each(['idle', 'thinking', 'tool', 'success', 'error'] as const)(
    'previews the %s state',
    async (state) => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: state }))

      expect(screen.getByTestId('pet-art')).toHaveAttribute('data-state', state)
      expect(screen.getByTestId('event-json')).toHaveTextContent(`"state": "${state}"`)
    },
  )
})
