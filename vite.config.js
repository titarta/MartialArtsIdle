import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs   from 'node:fs'
import path from 'node:path'

// Dev-only plugin: receives edited NODE_POS / CUSTOM_CP from the in-browser
// tree editor and writes them back into EternalTreeScreen.jsx so Vite
// hot-reloads the changes without manual copy-paste.
function treeEditorPlugin() {
  return {
    name: 'tree-editor-save',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST') return next();

        // ── Tree editor ──────────────────────────────────────────────────
        if (req.url === '/__tree-save') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => {
            try {
              const { nodePosBlock, customCPBlock } = JSON.parse(body);
              const filePath = path.resolve('src/components/EternalTreeScreen.jsx');
              let src = fs.readFileSync(filePath, 'utf-8');
              src = src.replace(/const NODE_POS = \{[\s\S]*?\n\};/, nodePosBlock);
              src = src.replace(/const CUSTOM_CP = \{[\s\S]*?\n\};/, customCPBlock);
              fs.writeFileSync(filePath, src, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        // ── Particle path editor ─────────────────────────────────────────
        // Receives { paths: { A:[x0,y0,cx1,cy1,cx2,cy2,x1,y1], … } } and
        // regex-replaces every .home-qi-particle-pathX rule in App.css so
        // Vite hot-reloads the animation immediately.
        if (req.url === '/__particle-save') {
          let body = '';
          req.on('data', c => { body += c; });
          req.on('end', () => {
            try {
              const { paths } = JSON.parse(body);
              const cssPath = path.resolve('src/App.css');
              let src = fs.readFileSync(cssPath, 'utf-8');
              const pad = (n, w = 4) => String(n).padStart(w);
              for (const [name, p] of Object.entries(paths)) {
                const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = p;
                const replacement =
                  `.home-qi-particle-path${name} { offset-path: path('M ${pad(x0)} ${pad(y0)} C ${pad(cx1)} ${pad(cy1)}, ${pad(cx2)} ${pad(cy2)}, ${pad(x1)} ${pad(y1)}'); }`;
                src = src.replace(
                  new RegExp(`\\.home-qi-particle-path${name}\\s*\\{[^}]+\\}`),
                  replacement
                );
              }
              fs.writeFileSync(cssPath, src, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isNative   = mode === 'native';
  const isSteam    = mode === 'steam';
  const isDemo     = mode === 'demo';
  const isDesigner = mode === 'designer';
  const isProd     = command === 'build';

  // Capacitor and Steam load from file:// or a local server — base must be '/'.
  // GitHub Pages browser build needs the repo sub-path.
  // Local dev/preview always uses '/' so it works without a prefix.
  // Designer mode: same base as GH Pages in production (the `main` branch
  // ships the designer to the dev Pages URL), '/' in dev server.
  const base = (isNative || isDemo) ? '/'
             : isSteam ? './'
             : isDesigner ? (isProd ? '/MartialArtsIdle/' : '/')
             : (isProd ? '/MartialArtsIdle/' : '/');

  // PWA service worker is only useful in browser/local builds.
  // Inside a Capacitor WebView or Electron/Tauri it can conflict with the native bridge.
  // Designer mode DOES include the PWA — the designer panel is PAT-gated so regular
  // visitors are unaffected, and the SW is required for Android install + iOS cache busting.
  const enablePWA = !isNative && !isSteam;

  return {
    base,
    plugins: [
      treeEditorPlugin(),
      react(),
      enablePWA && VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          navigateFallback: 'index.html',
          // Precache SFX (small) but not BGM (4-5 MB each — too large for precache).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', 'audio/sfx/*.{ogg,mp3,wav}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB for SFX
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // BGM streams and any audio not in precache — network first, cache on fetch.
              urlPattern: /\/audio\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: {
          name: 'The Long Road to Heaven',
          short_name: 'Long Road',
          description: 'Train. Fight. Ascend.',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/MartialArtsIdle/',
          scope: '/MartialArtsIdle/',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
    ].filter(Boolean),
  }
})
