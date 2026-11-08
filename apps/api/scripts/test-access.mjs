import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = await mkdtemp(join(tmpdir(), 'cms-access-tests-'));
try {
  const outfile = join(dir, 'access.test.mjs');
  await build({ entryPoints: [fileURLToPath(new URL('../tests/access.test.mjs', import.meta.url))], outfile, bundle: true, platform: 'node', format: 'esm',
    plugins: [{ name: 'isolated-sql', setup(b) {
      b.onResolve({ filter: /^postgres$/ }, () => ({ path: 'postgres', namespace: 'isolated-sql' }));
      b.onLoad({ filter: /.*/, namespace: 'isolated-sql' }, () => ({ contents: 'export default function () { if (!globalThis.__accessTestSql) throw new Error("No test database"); return globalThis.__accessTestSql; }' }));
    } }],
  });
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, { recursive: true, force: true }); }
