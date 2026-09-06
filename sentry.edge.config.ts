import * as Sentry from '@sentry/nextjs'
import { scrubEvent } from '@/lib/monitoring'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

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
