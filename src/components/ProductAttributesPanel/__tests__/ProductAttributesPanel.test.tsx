/* eslint-disable */
// @ts-nocheck

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { ProductAttributesPanel } from '..'
import '@testing-library/jest-dom'

const mockAttributes = [
  {
    id: '1',
    group: 'Identification',
    name: 'Make',
    type: 'Text',
    locale: 'es',
    channel: 'e-commerce',
    value: 'Toyota'
  }
]

const server = setupServer(
  rest.get('/api/products/:id/attributes', (_req, res, ctx) => {
    return res(ctx.json({ attributes: mockAttributes }))
  }),
  rest.patch('/api/attributes/:id', (req, res, ctx) => {
    return res(ctx.json({ ...mockAttributes[0], value: (req.body as any).value }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPanel() {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <ProductAttributesPanel productId='123' locale='es' channel='e-commerce' />
    </QueryClientProvider>
  )
}

test('loads and displays attribute', async () => {
  renderPanel()
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('Make')).toBeInTheDocument())
})

test('inline edit triggers patch', async () => {
  renderPanel()
  await waitFor(() => screen.getByText('Toyota'))
  fireEvent.click(screen.getByText('Toyota'))
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'Honda' } })
  fireEvent.click(screen.getByLabelText(/save/i))
  await waitFor(() => expect(screen.getByText('Honda')).toBeInTheDocument())
}) 