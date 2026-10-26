import { defineConfig } from 'vite';

export default defineConfig({
  // relative base: the built site works from any sub-path
  base: './',
  server: { port: 5173, strictPort: false, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
});
