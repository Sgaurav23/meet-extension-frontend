import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({
      jsAssetsFilterFunction: (outputChunk) => {
        return !outputChunk.fileName.includes('background');
      }
    }),
  ],
  base: './',
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
      output: {
        // Disables file hashing so files are easily read by Manifest V3
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
