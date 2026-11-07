// Aplica en orden las migraciones de ../migrations que aún no se han aplicado.
// Uso: npm run migrate -w apps/api   (lee DATABASE_URL de apps/api/.dev.vars o del entorno)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
    const v = line?.slice('DATABASE_URL='.length).trim();
    if (v) return v;
  } catch { /* sin archivo */ }
  console.error('Falta DATABASE_URL. Pégala en apps/api/.dev.vars (ver .dev.vars.example).');
  process.exit(1);
}

const sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
try {
  await sql`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from public.schema_migrations`).map((r) => r.name));
  const files = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const text = readFileSync(join(root, 'migrations', f), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into public.schema_migrations (name) values (${f})`;
    });
    console.log(`aplicada ${f}`);
    applied++;
  }
  console.log(applied ? `${applied} migración(es) aplicadas.` : 'La base ya estaba al día.');
} catch (e) {
  console.error('La migración falló y se revirtió:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
