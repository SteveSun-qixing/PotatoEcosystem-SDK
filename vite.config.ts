import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ChipsSDK',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'esm.' : ''}js`,
    },
    rollupOptions: {
      external: ['@chips/core', 'eventemitter3', 'jszip', 'js-yaml'],
      output: {
        globals: {
          '@chips/core': 'ChipsCore',
          'eventemitter3': 'EventEmitter3',
          'jszip': 'JSZip',
          'js-yaml': 'jsyaml',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/',
      ],
    },
  },
});
