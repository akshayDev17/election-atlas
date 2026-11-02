import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The atlas's public path. Every page, chunk and data URL sits under it.
const basePath = '/elections/india';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the tracing root so a stray lockfile in a parent directory is ignored.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  devIndicators: false,

  // Static export, served by the election-atlas Worker (backend/) from
  // dist/elections/india/ (backend/build_site.py copies out/ there). Chunks stay
  // under /elections/india/_next/, content-hashed, so a cached chunk is never
  // stale; the HTML and data are revalidated on every load.
  output: 'export',
  basePath,
  // `state/index.html`, not `state.html`: the atlas's links have always been
  // directory URLs with a query (state/?s=IN-UP&y=2024).
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },

  // `npm run build:check` builds into .next-build so it never collides with a
  // running dev server's .next (same as the sibling frontends).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
