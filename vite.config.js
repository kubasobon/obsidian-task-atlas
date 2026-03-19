import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Output main.js in the root directory (where Obsidian expects it)
    outDir: '.',
    emptyOutDir: false,
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
      external: ['obsidian', 'obsidian-daily-notes-interface'],
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
