import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';

  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ChipsSDK',
        formats: ['es', 'cjs', 'umd'],
        fileName: (format) => {
          if (format === 'es') return 'index.esm.js';
          if (format === 'cjs') return 'index.js';
          return `index.${format}.js`;
        },
      },
      rollupOptions: {
        external: ['eventemitter3', 'js-yaml', 'jszip'],
        output: {
          globals: {
            eventemitter3: 'EventEmitter3',
            'js-yaml': 'jsyaml',
            jszip: 'JSZip',
          },
        },
        treeshake: {
          // Tree-shaking优化
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      // 优化配置
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug'],
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      // 目标大小警告
      chunkSizeWarningLimit: 1024, // 1MB
      reportCompressedSize: true,
      // 源码映射
      sourcemap: mode === 'production' ? false : true,
    },
    plugins: [
      dts({
        rollupTypes: true,
        exclude: ['**/*.test.ts', '**/*.bench.ts', 'benchmarks/**/*'],
      }),
      // Gzip压缩
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // 10KB以上才压缩
      }),
      // Brotli压缩
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
      }),
      // 包分析
      isAnalyze &&
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    // 优化配置
    optimizeDeps: {
      include: ['eventemitter3', 'js-yaml', 'jszip'],
    },
    // 定义全局常量
    define: {
      __DEV__: mode === 'development',
      __VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    },
  };
});
