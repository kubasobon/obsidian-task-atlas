import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'bin',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TaskAtlas',
      fileName: () => 'main.js',
      formats: ['cjs'],
    },
    rollupOptions: {
      // Mark obsidian as external so it's not bundled
      // (Obsidian provides this at runtime)
      external: ['obsidian'],
    },
  },
  // Dev server settings
  server: {
    watch: {
      // Watch src directory for changes
      include: ['src/**'],
    },
  },
});
