// Post-build step: fold the static landing page into the SPA's dist/ output so
// one Vercel deployment serves both.
//
// The site root is the marketing page, not the app. Vercel resolves `/` to
// dist/index.html off the filesystem BEFORE any rewrite runs, so whoever owns
// dist/index.html owns `/`. Vite always builds the app shell to that name, so
// this step moves the shell aside to dist/app.html and drops the landing page
// in its place. vercel.json's catch-all rewrite then sends every non-file path
// (/casino/lobby and friends) to app.html, where the SPA router reads the
// original URL and renders normally.
//
// landing/ is the source of truth for tribet.gg's root page — it is not
// generated from anything, and nothing regenerates it. Do not edit files there
// to work around a build problem; fix it here.
import { cp, rename, access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const landing = path.join(root, 'landing');

const APP_SHELL = 'app.html';

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// A silent failure here ships a site whose root is the app (or a 404), which is
// exactly the regression this script exists to prevent — so every precondition
// is checked and throws.
if (!(await exists(dist))) {
  throw new Error(`No dist/ at ${dist} — run \`vite build\` before this script.`);
}
if (!(await exists(path.join(dist, 'index.html')))) {
  throw new Error('dist/index.html is missing — the Vite build did not produce an app shell.');
}
if (!(await exists(path.join(landing, 'index.html')))) {
  throw new Error(`landing/index.html is missing at ${landing} — the landing page is not in the repo.`);
}

// Guard against a re-run over an already-assembled dist/. At that point
// dist/index.html is the LANDING page, and renaming it would overwrite the app
// shell with a copy of the marketing page — a site with no app at all. Vite
// empties dist/ on every build so this cannot happen in the normal flow, but a
// bare `node scripts/build-landing.mjs` must fail loudly rather than corrupt
// the output.
const shellHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!shellHtml.includes('id="root"')) {
  throw new Error(
    'dist/index.html is not the Vite app shell (no #root) — dist/ looks already assembled. ' +
      'Run `npm run build`, which rebuilds dist/ from scratch, rather than this script alone.',
  );
}

await rename(path.join(dist, 'index.html'), path.join(dist, APP_SHELL));

// Copies landing/* over dist/*, index.html included. The landing's asset paths
// (/css, /js, /favicon.svg) and its SEO files (/robots.txt, /sitemap.xml) are
// root-absolute, so they have to land at the root of the output, alongside
// Vite's /assets and public/'s /games. lobby-preview.png also still lives
// here and gets copied the same way, but only for the app shell's own
// og:image/twitter:image (see vite.config.js's LANDING_FILES comment) — the
// landing page itself no longer references it.
await cp(landing, dist, { recursive: true });

const copied = (await readdir(landing)).sort().join(', ');
console.log(`landing -> dist: app shell moved to /${APP_SHELL}; copied ${copied}`);
