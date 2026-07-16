import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime-types'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const publicDir = path.join(rootDir, 'public')

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

export default defineConfig({
  plugins: [servePublicGames(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./packages/shared', import.meta.url)),
    },
  },
})
