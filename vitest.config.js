import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        hydratable: true,
        css: 'injected'
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/tests/playwright/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.js',
        '**/*.spec.js',
        '**/*.test.js'
      ]
    },
    // Ensure proper client-side rendering for Svelte 5
    server: {
      deps: {
        inline: ['svelte', '@sveltejs/kit', '@testing-library/svelte']
      }
    },
    // Force browser environment
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
      '$app': '/src/app'
    },
    conditions: ['browser']
  },
  define: {
    // Force browser mode for Svelte components
    'process.env.NODE_ENV': '"test"',
    'global': 'globalThis'
  },
  esbuild: {
    target: 'node14'
  }
});