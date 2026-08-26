import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseClient, makeQueryChain } from '../helpers/supabase-mock'
import { activeCompany, trackedRow } from '../helpers/fixtures'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/companies-house/client', () => ({
  fetchCompany: vi.fn(),
}))

vi.mock('@/lib/pdf', () => ({
  generateCompliancePDF: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { fetchCompany } from '@/lib/companies-house/client'
import { generateCompliancePDF } from '@/lib/pdf'
import { GET } from '@/app/api/report/[trackedId]/route'

const mockedCreateClient       = vi.mocked(createClient)
const mockedFetchCompany       = vi.mocked(fetchCompany)
const mockedGeneratePDF        = vi.mocked(generateCompliancePDF)

function makeRequest(trackedId = 'tracked-uuid-123'): [NextRequest, { params: Promise<{ trackedId: string }> }] {
  const req = new NextRequest(`http://localhost/api/report/${trackedId}`)
  return [req, { params: Promise.resolve({ trackedId }) }]
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/report/[trackedId]
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/report/[trackedId]', () => {
  let client: ReturnType<typeof makeSupabaseClient>

  beforeEach(() => {
    client = makeSupabaseClient()
    mockedCreateClient.mockResolvedValue(client as never)
  })

  it('returns 401 when not authenticated', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(...makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when tracked company not found or owned by another user', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: null }))
    const res = await GET(...makeRequest('nonexistent-id'))
    expect(res.status).toBe(403)
  })

  it('returns 503 when Companies House fetch fails', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    mockedFetchCompany.mockRejectedValue(new Error('Network error'))
    const res = await GET(...makeRequest())
    expect(res.status).toBe(503)
  })

  it('returns 500 when PDF generation fails', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    mockedFetchCompany.mockResolvedValue(activeCompany)
    mockedGeneratePDF.mockRejectedValue(new Error('PDF render error'))
    const res = await GET(...makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns a PDF with correct Content-Type and Content-Disposition headers', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    mockedFetchCompany.mockResolvedValue(activeCompany)
    mockedGeneratePDF.mockResolvedValue(new ArrayBuffer(8))
    const res = await GET(...makeRequest())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('12345678')
  })

  it('sets Cache-Control to private, no-store', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
    mockedFetchCompany.mockResolvedValue(activeCompany)
    mockedGeneratePDF.mockResolvedValue(new ArrayBuffer(8))
    const res = await GET(...makeRequest())
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })
})
