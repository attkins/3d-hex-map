import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The game logic is plain TypeScript without any browser or three.js dependency.
      environment: 'node',
      include: ['src/**/*.spec.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/game/**/*.ts', 'src/world/**/*.ts'],
        exclude: ['src/**/*.spec.ts'],
      },
    },
  })
);
