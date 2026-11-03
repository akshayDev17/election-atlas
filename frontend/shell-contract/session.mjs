// `wrangler dev` sessions over the assembled site, in local workerd (no
// Cloudflare account): the atlas Worker (backend/wrangler.jsonc, which serves
// ../dist) alone or together with a site-shell. Used by contract.test.mjs and,
// when SITE_THEMES_DIR is set, by smoke.test.mjs.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontend = join(here, '..');
const backend = join(frontend, '../backend');
const wrangler = join(frontend, 'node_modules/.bin/wrangler');

/** The atlas Worker as deployed: the assembled site in dist/, the SHELL binding. */
export const APP = join(backend, 'wrangler.jsonc');
/** Test only: a site-shell whose compose() always rejects. */
export const THROWING_SHELL = join(here, 'throwing-shell.jsonc');
/** The checkout of akshayDev17/site-themes named by SITE_THEMES_DIR, if any. */
export const siteThemes = process.env.SITE_THEMES_DIR ? resolve(process.env.SITE_THEMES_DIR) : null;
export const SHELL = siteThemes && join(siteThemes, 'shell/wrangler.jsonc');
/** The assembled site the atlas Worker serves (backend/build_site.py --out dist). */
export const DIST = join(frontend, '../dist');

const scratch = mkdtempSync(join(tmpdir(), 'atlas-shell-'));
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));

/** A port nothing on this machine is listening on right now. */
function freePort() {
  return new Promise((done, fail) => {
    const probe = createServer().once('error', fail);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });
}

/** Drops // and /* *\/ comments outside strings, and trailing commas. */
function stripJsonc(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (text.startsWith('//', i)) {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
    } else if (text.startsWith('/*', i)) {
      i = text.indexOf('*/', i) + 2;
    } else {
      out += text[i++];
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Where the site-shell under test links its shared files from composed pages:
 * its ASSET_BASE var, else compose's own default, as the atlas passes none.
 */
export function shellAssetBase() {
  return JSON.parse(stripJsonc(readFileSync(SHELL, 'utf8'))).vars?.ASSET_BASE ?? '/_site/';
}

/**
 * The deployed config minus its SHELL binding, written to a scratch file (its
 * relative paths made absolute), so the unbound case can never drift from it.
 */
export function unboundConfig() {
  const config = JSON.parse(stripJsonc(readFileSync(APP, 'utf8')));
  delete config.services;
  config.main = resolve(backend, config.main);
  config.assets.directory = resolve(backend, config.assets.directory);
  for (const db of config.d1_databases ?? []) db.migrations_dir = resolve(backend, db.migrations_dir);
  const path = join(scratch, 'unbound.json');
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
}

/**
 * Starts one `wrangler dev` over `configs` (the first is the Worker that
 * answers) and returns its origin, its log so far, and a stop function. The dev
 * registry is private to this run: a site-shell left running by any other
 * `wrangler dev` on the machine would otherwise answer this session's binding.
 */
export async function startSession(configs) {
  const [port, inspector] = [await freePort(), await freePort()];
  const args = ['dev', ...configs.flatMap((c) => ['-c', c]), '--ip', '127.0.0.1', '--port', String(port),
    '--inspector-port', String(inspector), '--persist-to', join(scratch, 'state'), '--log-level', 'info'];
  const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_REGISTRY_PATH: join(scratch, 'registry') };
  const child = spawn(wrangler, args, { cwd: backend, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const exited = new Promise((r) => child.on('exit', r));
  const stop = () => {
    child.kill('SIGTERM');
    return exited;
  };
  for (let i = 0; i < 120 && !/Ready on/.test(log); i++) await new Promise((r) => setTimeout(r, 500));
  if (!/Ready on/.test(log)) {
    await stop();
    throw new Error(`wrangler dev did not start:\n${log}`);
  }
  return { origin: `http://127.0.0.1:${port}`, log: () => log, stop };
}

/** Worker console output reaches wrangler's stdout a moment after the response. */
export async function logMatching(session, re) {
  for (let i = 0; i < 40 && !re.test(session.log()); i++) await new Promise((r) => setTimeout(r, 100));
  return session.log();
}
