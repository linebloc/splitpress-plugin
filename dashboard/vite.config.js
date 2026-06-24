import { resolve } from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    // Output to plugin/assets — JS lands in js/, CSS in css/
    outDir: resolve(__dirname, '../assets'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.jsx'),
      output: {
        entryFileNames: 'js/dashboard.js',
        chunkFileNames: 'js/dashboard-[name].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) {
            return 'css/dashboard.css';
          }

          return 'js/[name][extname]';
        },
        inlineDynamicImports: true,
      },
    },
  },
});
