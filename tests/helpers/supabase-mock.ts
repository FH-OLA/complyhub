import { vi } from 'vitest'

/**
 * Supabase mock factory for API integration tests.
 *
 * makeQueryChain(result) returns a Proxy that:
 *   - Is chainable: any method call (select, eq, gte, …) returns itself
 *   - Is awaitable: `await chain` resolves to `result`
 *   - Has explicit terminal methods: maybeSingle() and single() → Promise<result>
 *
 * Usage:
 *   supabase.from.mockReturnValueOnce(makeQueryChain({ data: { id: '1' } }))
 *   supabase.from.mockReturnValueOnce(makeQueryChain({ error: { code: '23505' } }))
 */

type QueryResult = {
  data?: unknown
  error?: { message: string; code?: string; details?: string } | null
  count?: number | null
}

export function makeQueryChain(result: QueryResult = {}) {
  const resolved: Required<QueryResult> = {
    data:  result.data  ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  }

  const chain: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        // Awaitable — resolve to the configured result
        if (prop === 'then') {
          return (resolve: (v: typeof resolved) => unknown) =>
            Promise.resolve(resolved).then(resolve)
        }
        if (prop === 'catch') {
          return (reject: (e: unknown) => unknown) =>
            Promise.resolve(resolved).catch(reject)
        }
        if (prop === 'finally') {
          return (cb: () => unknown) =>
            Promise.resolve(resolved).finally(cb)
        }
        // Explicit terminal methods
        if (prop === 'maybeSingle' || prop === 'single') {
          return () => Promise.resolve(resolved)
        }
        // All chaining methods return the same chain
        return () => chain
      },
    },
  )

  return chain
}

/**
 * Creates a lightweight mock of the Supabase user-facing client.
 * Configure individual calls with mockReturnValueOnce on `from` or `rpc`.
 *
 * Example:
 *   const client = makeSupabaseClient()
 *   client.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
 *   client.from.mockReturnValueOnce(makeQueryChain({ data: trackedRow }))
 *   vi.mocked(createClient).mockResolvedValue(client as any)
 */
export function makeSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc:  vi.fn(),
  }
}

/**
 * Creates a lightweight mock of the Supabase admin (service-role) client.
 * The admin client is synchronous (no await on createAdminClient).
 */
export function makeAdminClient() {
  return {
    auth: {
      admin: {
        listUsers:   vi.fn(),
        getUserById: vi.fn(),
      },
    },
    from: vi.fn(),
  }
}
