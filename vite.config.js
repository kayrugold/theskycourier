import { defineConfig } from 'vite';
export default defineConfig({
  server: { watch: process.env.WSL_DISTRO_NAME ? { usePolling: true, interval: 750 } : undefined },
  optimizeDeps: { noDiscovery: true, include: [] },
  build: { rollupOptions: { output: { manualChunks: { engine: ['three'] } } } },
});
