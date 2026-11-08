// Crea (o cambia la contraseña de) un usuario del CMS. La contraseña se escribe sin mostrarse y Postgres guarda solo su hash bcrypt.
// Herramienta de recuperación de confianza: acceso directo a la base. No se expone a Admins.
// Uso: npm run user -w apps/api            → Super Admin (ve todos los sitios)
//      npm run user -w apps/api -- --cliente → usuario sin sitios asignados (para clientes, más adelante)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice(13).trim();
if (!url) { console.error('Falta DATABASE_URL en apps/api/.dev.vars'); process.exit(1); }

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (a) => { rl.close(); resolve(a); });
  });
}

/** Lee una contraseña tecla a tecla en modo crudo: no se muestra nada en pantalla, ni siquiera asteriscos. */
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) { reject(new Error('Ejecuta este comando en una terminal interactiva.')); return; }
    process.stdout.write(question + '(no se verá lo que escribes) ');
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') { done(); return; }
        if (ch === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u0008' || ch === '\u007f') value = value.slice(0, -1);
        else if (ch >= ' ') value += ch;
      }
    };
    const done = () => { stdin.removeListener('data', onData); stdin.setRawMode(false); stdin.pause(); process.stdout.write('\n'); resolve(value); };
    stdin.on('data', onData);
  });
}

const owner = !process.argv.includes('--cliente');
const username = (await ask('Usuario (minúsculas, sin espacios, ej. juan): ')).trim().toLowerCase();
if (!/^[a-z0-9._-]{3,40}$/.test(username)) { console.error('El usuario debe tener 3–40 caracteres: letras minúsculas, números, punto, guion.'); process.exit(1); }
const displayName = (await ask('Nombre para mostrar (ej. Juan): ')).trim() || username;
const p1 = await askHidden('Contraseña, mínimo 10 caracteres ');
if (p1.length < 10 || Buffer.byteLength(p1, 'utf8') > 72) { console.error('Usa al menos 10 caracteres y como máximo 72 bytes UTF-8.'); process.exit(1); }
const p2 = await askHidden('Repite la contraseña ');
if (p1 !== p2) { console.error('Las contraseñas no coinciden. No se guardó nada.'); process.exit(1); }

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql`insert into cms.users (username, display_name, password_hash, is_owner, role) values (${username}, ${displayName}, crypt(${p1}, gen_salt('bf', 12)), ${owner}, ${owner ? 'super_admin' : 'site_owner'})
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
