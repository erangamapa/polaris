import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime-types'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const publicDir = path.join(rootDir, 'public')
const landingDir = path.join(rootDir, 'landing')

// Vite's publicDir watcher can miss newly-added folders on Windows, so
// /games/* and /img/games/* fall through to the SPA shell. Serve those
// paths from disk before the SPA fallback.
function servePublicGames() {
  return {
    name: 'serve-public-games',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const urlPath = decodeURIComponent((req.url || '').split('?')[0])
        if (!urlPath.startsWith('/games/') && !urlPath.startsWith('/img/games/')) return next()

        const filePath = path.normalize(path.join(publicDir, urlPath.slice(1)))
        if (!filePath.startsWith(publicDir + path.sep)) return next()
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next()

        const type = mime.lookup(filePath) || 'application/octet-stream'
        res.statusCode = 200
        res.setHeader('Content-Type', type)
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

// In production the site root is the static landing page, not the app: the
// build moves the SPA shell to /app.html and Vercel serves dist/index.html
// (the landing) at `/` (see scripts/build-landing.mjs, vercel.json). Vite's
// dev server knows nothing about that, so without this plugin `/` would show
// the app locally and the marketing page would only ever exist in a
// production build - the classic "worked in dev" trap. Mirrors the routing
// here so local and deployed agree: the app lives under /casino, /sports and
// /predictions in both.
const LANDING_FILES = new Set([
  '/',
  '/index.html',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.svg',
  // lobby-preview.png is no longer used by the landing page itself (see the
  // LEGACY VISUAL CLEANUP PASS) but stays served here because the SPA app
  // shell's own og:image/twitter:image (the repo-root index.html) still
  // points at it, and dist/lobby-preview.png only exists via this
  // landing-copy step. Fixing the app shell's stale preview image is out of
  // scope for a landing-only pass — do not delete this file without also
  // updating that og:image/twitter:image pair.
  '/lobby-preview.png',
])

function serveLanding() {
  return {
    name: 'serve-landing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        const urlPath = decodeURIComponent((req.url || '').split('?')[0])
        const isLandingAsset = urlPath.startsWith('/css/') || urlPath.startsWith('/js/')
        if (!isLandingAsset && !LANDING_FILES.has(urlPath)) return next()

        const filePath = path.normalize(path.join(landingDir, urlPath === '/' ? 'index.html' : urlPath.slice(1)))
        if (!filePath.startsWith(landingDir + path.sep)) return next()
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next()

        res.statusCode = 200
        res.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream')
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [serveLanding(), servePublicGames(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./packages/shared', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  test: {
    // e2e/** holds Playwright specs (npx playwright test), a separate
    // runner from vitest — without this, vitest's default include glob
    // picks up *.spec.js too and fails trying to run test.describe().
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
