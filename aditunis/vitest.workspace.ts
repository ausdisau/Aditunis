import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'contracts',
      environment: 'node',
      include: ['packages/contracts/src/**/*.test.ts'],
    },
  },
]);
