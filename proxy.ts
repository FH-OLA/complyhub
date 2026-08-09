import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Inject the current pathname as a request header so server layouts
  // can read it via headers() and build a ?next= redirect param.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // Start with a pass-through response carrying the updated request headers.
  // setAll may replace this if the Supabase session token is refreshed.
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens back onto the outgoing request
          // so downstream server components see the updated session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild the response so the browser also receives the new cookies.
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Calling getUser() validates the JWT server-side and triggers a token
  // refresh when the access token is near expiry. getSession() must NOT
  // be used here — it trusts the local cookie value without server validation.
  await supabase.auth.getUser()

  return response
}
