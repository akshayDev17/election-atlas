/* Test helper: read a file of the atlas's data directory (repository data/, or
   ATLAS_DATA_DIR). The results/ and cabinet/ files are exported from D1, so CI
   copies the export into data/ before running the tests that read them. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.ATLAS_DATA_DIR ?? fileURLToPath(new URL('../../data/', import.meta.url));

export const readData = <T = unknown>(rel: string): T =>
  JSON.parse(readFileSync(join(root, rel), 'utf8')) as T;
