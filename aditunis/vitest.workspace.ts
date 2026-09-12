import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'contracts',
      environment: 'node',
      include: ['packages/contracts/src/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'accessibility-runtime',
      environment: 'node',
      include: ['packages/accessibility-runtime/src/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'call-core',
      environment: 'node',
      include: ['packages/call-core/src/**/*.test.ts'],
    },
  },
]);
