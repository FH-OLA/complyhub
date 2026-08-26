import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseClient, makeQueryChain } from '../helpers/supabase-mock'
import { trackedRow } from '../helpers/fixtures'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/track/route'

const mockedCreateClient = vi.mocked(createClient)

function makeRequest(method: 'GET' | 'POST', options?: {
  searchParams?: Record<string, string>
  body?: Record<string, unknown>
}): NextRequest {
  const url = new URL('http://localhost/api/track')
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v)
    }
  }
  if (method === 'GET') {
    return new NextRequest(url)
  }
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.body ?? {}),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/track
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/track', () => {
  let client: ReturnType<typeof makeSupabaseClient>

  beforeEach(() => {
    client = makeSupabaseClient()
    mockedCreateClient.mockResolvedValue(client as never)
  })

  it('returns 401 when not authenticated', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(makeRequest('GET', { searchParams: { company_number: '12345678' } }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when company_number is missing', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(400)
  })

  it('returns { tracked: true } when company is tracked', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: { id: trackedRow.id } }))
    const res = await GET(makeRequest('GET', { searchParams: { company_number: '12345678' } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tracked).toBe(true)
  })

  it('returns { tracked: false } when company is not tracked', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    const res = await GET(makeRequest('GET', { searchParams: { company_number: '99999999' } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.tracked).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/track
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/track', () => {
  let client: ReturnType<typeof makeSupabaseClient>

  beforeEach(() => {
    client = makeSupabaseClient()
    mockedCreateClient.mockResolvedValue(client as never)
  })

  it('returns 401 when not authenticated', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(makeRequest('POST', { body: { company_number: '12345678', company_name: 'Acme Ltd' } }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const res = await POST(makeRequest('POST', { body: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 403 when RPC returns limit_reached', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.rpc.mockResolvedValue({ data: { error: 'limit_reached' }, error: null })
    const res = await POST(makeRequest('POST', { body: { company_number: '12345678', company_name: 'Acme Ltd' } }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when RPC returns already_tracked', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.rpc.mockResolvedValue({ data: { error: 'already_tracked' }, error: null })
    const res = await POST(makeRequest('POST', { body: { company_number: '12345678', company_name: 'Acme Ltd' } }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { success: true } on successful track', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.rpc.mockResolvedValue({ data: { success: true }, error: null })
    const res = await POST(makeRequest('POST', { body: { company_number: '12345678', company_name: 'Acme Ltd' } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 500 when RPC errors', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.rpc.mockResolvedValue({ data: null, error: { message: 'db error' } })
    const res = await POST(makeRequest('POST', { body: { company_number: '12345678', company_name: 'Acme Ltd' } }))
    expect(res.status).toBe(500)
  })
})
