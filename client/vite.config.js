import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../node_modules/monaco-editor/min/vs/**/*',
          dest: 'monaco/vs',
          rename: { stripBase: 5 },
        },
      ],
    }),
  ],
  server: { port: 5173, proxy: { '/api': `http://127.0.0.1:${process.env.API_PORT || 3001}` } },
  build: { outDir: '../dist', emptyOutDir: true },
});
