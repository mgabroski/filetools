// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,ico,json,txt,woff2}'],
        globIgnores: ['**/*.wasm', '**/*.onnx', '**/models/**', '**/ort/**'],

        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\.(wasm|onnx)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ml-assets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'FileTools',
        short_name: 'FileTools',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
