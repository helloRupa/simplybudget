import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

const asyncConfig = createJestConfig(config);

export default async (): Promise<Config> => {
  const resolved = await asyncConfig();
  resolved.transformIgnorePatterns = [
    'node_modules/(?!(uuid|date-fns)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return resolved;
};
