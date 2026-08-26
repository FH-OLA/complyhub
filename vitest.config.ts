import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    // Prevent any real network requests from unit or API integration tests.
    // All external I/O must be mocked. Only Playwright may reach real services.
    server: {
      deps: {
        // Inline Next.js server exports so NextRequest/NextResponse resolve
        // correctly in the Node.js Vitest environment.
        inline: ['next'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Scope to the files that have corresponding tests.
      // Untested routes (alerts, events, feedback, etc.) are added as each
      // sprint introduces dedicated test coverage.
      include: [
        'lib/compliance.ts',
        'lib/health-score.ts',
        'lib/report.ts',
        'lib/ai/advisor.ts',
        'app/api/track/route.ts',
        'app/api/stripe/webhook/route.ts',
        'app/api/advisor/\\[trackedId\\]/route.ts',
        'app/api/report/\\[trackedId\\]/route.ts',
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
})
