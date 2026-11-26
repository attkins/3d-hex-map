import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on Netlify as well as under any sub path.
  base: './',
  // The glTF models are loaded through `new URL(..., import.meta.url)`.
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    // three.js alone is about 600 kB minified, so the default limit of 500 kB would always warn.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
