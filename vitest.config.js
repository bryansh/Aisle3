import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        // Ensure Svelte components work in test environment
        hydratable: true,
        css: 'injected'
      }
    })
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.js',
        '**/*.spec.js',
        '**/*.test.js'
      ]
    },
    // Force client-side rendering for Svelte 5
    server: {
      deps: {
        inline: ['svelte']
      }
    }
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
      '$app': '/src/app'
    }
  }
});