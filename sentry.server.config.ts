import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from '@/lib/monitoring'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // The Node SDK defaults `serverName` to `os.hostname()` — an ephemeral Vercel
  // container id with no debugging value here. Documented option; does not
  // affect stack traces, symbolication, or issue grouping.
  includeServerName: false,

  dataCollection: {
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: false,
  },

  beforeSend(event) {
    return scrubEvent(event)
  },
})
