import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseClient, makeAdminClient, makeQueryChain } from '../helpers/supabase-mock'
import { activeCompany, dissolvedCompany, trackedRow } from '../helpers/fixtures'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/companies-house/client', () => ({
  fetchCompany: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn(() => ({
      messages: { create: mockCreate },
    })),
  }
})

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCompany } from '@/lib/companies-house/client'
import Anthropic from '@anthropic-ai/sdk'
import { POST } from '@/app/api/filing-assistant/[trackedId]/route'

const mockedCreateClient = vi.mocked(createClient)
const mockedCreateAdmin  = vi.mocked(createAdminClient)
const mockedFetchCompany = vi.mocked(fetchCompany)

function getAnthropicCreate() {
  const instance = new (Anthropic as unknown as new () => { messages: { create: ReturnType<typeof vi.fn> } })()
  return instance.messages.create
}

function makeRequest(
  trackedId = 'tracked-uuid-123',
  body: Record<string, unknown> = { filingType: 'confirmation_statement' },
): [NextRequest, { params: Promise<{ trackedId: string }> }] {
  const req = new NextRequest(`http://localhost/api/filing-assistant/${trackedId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  return [req, { params: Promise.resolve({ trackedId }) }]
}

const proSubscription = { plan: 'pro', status: 'active' }

// Helpers that set up the standard happy-path chain up to (not including) AI call
function setupHappyPathToAi(
  client: ReturnType<typeof makeSupabaseClient>,
  adminClient: ReturnType<typeof makeAdminClient>,
  company = activeCompany,
) {
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
  client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
  adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 })) // burst
  adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 })) // monthly
  mockedFetchCompany.mockResolvedValue(company)
  adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null })) // question insert
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/filing-assistant/[trackedId]
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/filing-assistant/[trackedId]', () => {
  let client:      ReturnType<typeof makeSupabaseClient>
  let adminClient: ReturnType<typeof makeAdminClient>

  beforeEach(() => {
    client      = makeSupabaseClient()
    adminClient = makeAdminClient()
    mockedCreateClient.mockResolvedValue(client as never)
    mockedCreateAdmin.mockReturnValue(adminClient as never)
    process.env.AI_MONTHLY_LIMIT_PRO      = '100'
    process.env.AI_BURST_LIMIT_PER_MINUTE = '5'
  })

  // ── Gate 1: Auth ───────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(...makeRequest())
    expect(res.status).toBe(401)
  })

  // ── Gate 2: Ownership ─────────────────────────────────────────────────────

  it('returns 403 when tracked company is not found', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    const res = await POST(...makeRequest('bad-id'))
    expect(res.status).toBe(403)
  })

  it('returns 500 when tracked_companies DB query errors', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'db error' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  // ── Gate 3: Pro subscription ──────────────────────────────────────────────

  it('returns 403 when user does not have a Pro subscription', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: { plan: 'free', status: 'active' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns 500 when user_subscriptions DB query errors', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'db error' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  // ── Gate 4: filingType validation ─────────────────────────────────────────

  it('returns 400 when request body is not valid JSON', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    const req = new NextRequest('http://localhost/api/filing-assistant/tracked-uuid-123', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    'not json {{{',
    })
    const res = await POST(req, { params: Promise.resolve({ trackedId: 'tracked-uuid-123' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 when filingType is missing', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    const res = await POST(...makeRequest('tracked-uuid-123', {}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when filingType is not a supported value', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    const res = await POST(...makeRequest('tracked-uuid-123', { filingType: 'tax_return' }))
    expect(res.status).toBe(400)
  })

  // ── Gate 6: Burst rate limit ──────────────────────────────────────────────

  it('returns 429 when burst rate limit is hit', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 5 }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(429)
  })

  it('returns 500 when burst count DB query errors', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'db error' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  // ── Gate 7: Monthly quota ─────────────────────────────────────────────────

  it('returns 429 when monthly quota is exhausted', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))   // burst: ok
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 100 })) // monthly: at limit
    const res = await POST(...makeRequest())
    expect(res.status).toBe(429)
  })

  it('returns 500 when monthly count DB query errors', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'db error' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  // ── Gate 8: Companies House fetch ─────────────────────────────────────────

  it('returns 503 when Companies House fetch fails', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    mockedFetchCompany.mockRejectedValue(new Error('timeout'))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(503)
  })

  // ── Gate 9: Dissolved company ─────────────────────────────────────────────

  it('returns 422 when company is dissolved', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    mockedFetchCompany.mockResolvedValue(dissolvedCompany)
    const res = await POST(...makeRequest())
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/dissolved/i)
  })

  // ── Gate 11: Usage event insert ───────────────────────────────────────────

  it('returns 500 when usage event insert fails before AI call', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    client.from.mockReturnValueOnce(makeQueryChain({ data: proSubscription }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, count: 0 }))
    mockedFetchCompany.mockResolvedValue(activeCompany)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'DB write error' } }))
    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  // ── AI call and response ──────────────────────────────────────────────────

  it('returns 200 with guide when AI responds successfully', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null })) // outcome insert

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Your CS01 preparation guide.' }],
    })

    const res  = await POST(...makeRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.guide).toBe('Your CS01 preparation guide.')
  })

  it('returns 200 when accounts filingType is used', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Your accounts preparation guide.' }],
    })

    const res  = await POST(...makeRequest('tracked-uuid-123', { filingType: 'accounts' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.guide).toBe('Your accounts preparation guide.')
  })

  it('system prompt sent to AI contains guidance URL from the filing guidance layer', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Guide.' }],
    })

    await POST(...makeRequest())

    const callArgs = anthropicCreate.mock.calls[0][0] as { system: string }
    expect(callArgs.system).toContain('ewf.companieshouse.gov.uk')
  })

  it('system prompt sent to AI contains lastReviewed from filing guidance metadata', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null }))

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Guide.' }],
    })

    await POST(...makeRequest())

    const callArgs = anthropicCreate.mock.calls[0][0] as { system: string }
    expect(callArgs.system).toContain('2026-08-27')
  })

  it('returns 500 when AI returns a non-text content block', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null })) // outcome insert

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'fn', input: {} }],
    })

    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns 500 when AI provider throws a non-timeout error', async () => {
    setupHappyPathToAi(client, adminClient)
    adminClient.from.mockReturnValueOnce(makeQueryChain({ data: null, error: null })) // outcome insert

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockRejectedValue(new Error('API connection error'))

    const res = await POST(...makeRequest())
    expect(res.status).toBe(500)
  })

  it('still returns 200 when outcome event insert fails (non-fatal log path)', async () => {
    setupHappyPathToAi(client, adminClient)
    // Outcome insert fails — non-fatal
    adminClient.from.mockReturnValueOnce(makeQueryChain({ error: { message: 'write timeout' } }))

    const anthropicCreate = getAnthropicCreate()
    anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Guide despite outcome insert failure.' }],
    })

    const res  = await POST(...makeRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.guide).toBe('Guide despite outcome insert failure.')
  })
})
