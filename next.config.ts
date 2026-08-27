import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["127.0.0.1"],

  async headers() {
    // Build the connect-src value so browser-side Supabase calls are allowed.
    // NEXT_PUBLIC_SUPABASE_URL is a build-time env var baked into the bundle;
    // it is always available here. Falls back to 'self' if somehow absent.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    let connectSrc = "'self'"
    if (supabaseUrl) {
      try {
        const { host } = new URL(supabaseUrl)
        // Allow both the REST API (HTTPS) and the Realtime websocket (WSS).
        connectSrc += ` https://${host} wss://${host}`
      } catch {
        // Malformed URL — fall back to 'self' only.
      }
    }

    // Content-Security-Policy
    // script-src 'unsafe-inline': required by Next.js App Router (inline hydration
    //   scripts injected during streaming SSR cannot be nonced without custom middleware).
    // style-src 'unsafe-inline': required by Tailwind v4 JIT (generates <style> tags).
    // frame-ancestors 'self': consistent with X-Frame-Options: SAMEORIGIN below.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src ${connectSrc}`,
      "frame-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          // Mitigates XSS and data-injection attacks.
          { key: 'Content-Security-Policy', value: csp },
          // Forces HTTPS for one year on all subdomains. Applied at server level;
          // no effect on plain HTTP (localhost dev) but enforced on production.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Prevents this page from being framed by a cross-origin page (clickjacking).
          // Legacy header kept alongside frame-ancestors in CSP for older browser compat.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevents MIME-type sniffing (e.g. treating a JS file as HTML).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Strips the full URL from the Referer header on cross-origin navigations
          // so auth tokens or session IDs in URL params are not leaked.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disables all browser features not required by this app.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Prevents cross-origin window handles from leaking via window.opener.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Restricts cross-origin resource embedding to same-origin only.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
};

export default nextConfig;
