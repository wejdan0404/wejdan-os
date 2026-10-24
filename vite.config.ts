/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Preload the two faces the first screen paints with (body Arabic 400, display
 * El Messiri 700) so they download alongside the JS instead of after it — the
 * title is the largest paint. Build only; hashed names come from the bundle.
 */
function preloadFirstPaintFonts(): Plugin {
  let base = '/'
  const wanted = [/ibm-plex-sans-arabic-arabic-400-normal-[\w-]+\.woff2$/, /el-messiri-arabic-700-normal-[\w-]+\.woff2$/]
  return {
    name: 'wejdan-preload-first-paint-fonts',
    apply: 'build',
    configResolved(c) {
      base = c.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle ?? {})
        const tags = wanted.flatMap((re) => {
          const f = files.find((n) => re.test(n))
          return f
            ? [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: base + f, crossorigin: '' }, injectTo: 'head' as const }]
            : []
        })
        return { html, tags }
      },
    },
  }
}

export default defineConfig({
  base: '/wejdan-os/',
  plugins: [
    react(),
    preloadFirstPaintFonts(),
    VitePWA({
      // Updates wait for her: the app shows «فيه تحديث جديد — حدّثي» (src/pwa).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'favicon-48.png', 'brand/*.svg'],
      manifest: {
        id: '/wejdan-os/',
        name: 'وجدان',
        short_name: 'وجدان',
        description: 'مساحتك الشخصية لتنظيم يومك',
        lang: 'ar',
        dir: 'rtl',
        // Hash routing: the app root redirects to #/today.
        start_url: '/wejdan-os/',
        scope: '/wejdan-os/',
        display: 'standalone',
        display_override: ['standalone'],
        orientation: 'portrait',
        background_color: '#F2F7FE',
        theme_color: '#FFFFFF',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Full offline after the first load: app shell, all route chunks, CSS,
        // brand images and the Arabic/Latin fonts.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json,webmanifest}'],
        globIgnores: [
          'splash/**', // iOS reads startup images only when adding to Home Screen
          '**/*-cyrillic-*',
          '**/*-greek-*',
          '**/*-vietnamese-*',
          // The action library (~450 KB) is only read on first run or a library-version
          // bump, so it isn't re-downloaded on every install/update: cached on first use.
          '**/actions-*.js',
          '**/actions_ar-*.js',
          // Legacy Flutter shims (see public/): fetched from the network only.
          'flutter_service_worker.js',
          'flutter_bootstrap.js',
          'flutter.js',
          'main.dart.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/actions(?:_ar)?-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'wejdan-action-library', expiration: { maxEntries: 6 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/wejdan-os/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // UI tests wait up to 5 s for lazy screens (tests/setup.ts); give each test room for that
    testTimeout: 20000,
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
