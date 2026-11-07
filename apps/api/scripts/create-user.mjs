// Crea (o cambia la contraseña de) un usuario del CMS. La contraseña se escribe sin mostrarse y solo se guarda su hash.
// Uso: npm run user -w apps/api            → usuario dueño (ve todos los sitios)
//      npm run user -w apps/api -- --cliente → usuario sin sitios asignados (para clientes, más adelante)
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ITERATIONS = 100_000; // igual que src/auth.ts
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice(13).trim();
if (!url) { console.error('Falta DATABASE_URL en apps/api/.dev.vars'); process.exit(1); }

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else if (s !== '\r\n' && s !== '\n') rl.output.write('*'); };
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a); });
  });
}

const owner = !process.argv.includes('--cliente');
const username = (await ask('Usuario (minúsculas, sin espacios, ej. juan): ')).trim().toLowerCase();
if (!/^[a-z0-9._-]{3,40}$/.test(username)) { console.error('El usuario debe tener 3–40 caracteres: letras minúsculas, números, punto, guion.'); process.exit(1); }
const displayName = (await ask('Nombre para mostrar (ej. Juan): ')).trim() || username;
const p1 = await ask('Contraseña (mínimo 12 caracteres): ', true);
if (p1.length < 12) { console.error('Muy corta: usa al menos 12 caracteres. Una frase de varias palabras funciona bien.'); process.exit(1); }
const p2 = await ask('Repite la contraseña: ', true);
if (p1 !== p2) { console.error('Las contraseñas no coinciden. No se guardó nada.'); process.exit(1); }

const salt = randomBytes(16);
const hash = pbkdf2Sync(p1, salt, ITERATIONS, 32, 'sha256');
const stored = `pbkdf2-sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql`insert into cms.users (username, display_name, password_hash, is_owner) values (${username}, ${displayName}, ${stored}, ${owner})
    on conflict (username) do update set password_hash = excluded.password_hash, display_name = excluded.display_name, disabled_at = null`;
  // Cambiar la contraseña cierra las sesiones abiertas de ese usuario.
  await sql`delete from cms.sessions where user_id = (select id from cms.users where username = ${username})`;
  console.log(`Listo: usuario «${username}» ${owner ? '(dueño, ve todos los sitios)' : '(sin sitios asignados)'}. Ya puedes iniciar sesión en el editor.`);
} catch (e) {
  console.error('No se pudo guardar el usuario:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
