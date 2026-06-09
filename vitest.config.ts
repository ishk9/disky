import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Cover the testable domain layer; exclude the Ink TUI (rendered/manual)
      // and shell-driven scanners that need real macOS I/O.
      include: ['src/core/**', 'src/strategies/**', 'src/commands/**', 'src/renderers/**'],
      exclude: ['src/tui/**', 'src/**/*.d.ts'],
      thresholds: {
        // Floor only — set just below current coverage. Ratchet up as the suite
        // grows. Keeps CI honest without blocking the foundation phase.
        statements: 38,
        branches: 38,
        functions: 50,
        lines: 38,
      },
    },
  },
});
