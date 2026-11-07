// Arranca el API en local (wrangler dev).
// wrangler.jsonc declara el binding HYPERDRIVE y Wrangler se niega a arrancar sin una conexión local para emularlo.
// Aquí se le pasa la misma DATABASE_URL de .dev.vars, así la cadena vive en un solo archivo (fuera de git).
// Uso: npm run dev -w apps/api   (los argumentos extra se pasan a wrangler)
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
    return line?.slice('DATABASE_URL='.length).trim() || undefined;
  } catch { return undefined; }
}

const env = { ...process.env };
if (!env[KEY]) {
  const url = databaseUrl();
  if (!url) {
    console.error('Falta DATABASE_URL. Copia apps/api/.dev.vars.example como apps/api/.dev.vars y pega la cadena de conexión de Neon.');
    process.exit(1);
  }
  env[KEY] = url;
}

// El Worker también sirve el editor compilado (assets → ../editor/dist) y Wrangler falla si la carpeta no existe.
// En desarrollo el editor lo sirve Vite (npm run dev), así que basta con que exista, aunque esté vacía.
mkdirSync(join(root, '..', 'editor', 'dist'), { recursive: true });

// En Windows wrangler es un .cmd y necesita shell: se pasa como una sola línea con los argumentos entre comillas.
const args = ['dev', '--port', '8787', ...process.argv.slice(2)].map((a) => (/^[\w./:=-]+$/.test(a) ? a : JSON.stringify(a)));
const child = spawn(`wrangler ${args.join(' ')}`, { cwd: root, env, stdio: 'inherit', shell: true });
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s));
