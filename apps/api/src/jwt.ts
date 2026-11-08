// JWT HS256 con WebCrypto (sin dependencias). Firmar y verificar un HMAC cuesta microsegundos de CPU.
// Se exige alg=HS256 en la cabecera: un token con alg "none" u otro algoritmo se rechaza siempre.

export const ISSUER = 'mse-cms';
export const AUDIENCE = 'mse-cms-api';

/**
 * Contenido del token. `kind` deja lugar para el futuro: hoy solo existen tokens de proyecto ('project');
 * cuando el editor use JWT llevará kind 'user' con sus propios alcances.
 */
export interface Claims {
  iss: string;
  aud: string;
  /** Id del token en cms.api_tokens (tok_...). */
  sub: string;
  kind: 'project';
  site: string;
  scope: string[];
  iat: number;
  exp?: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (ch) => ch.charCodeAt(0));
}

const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string) {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    keyCache.set(secret, k);
  }
  return k;
}

export function assertSecret(secret: string | undefined): asserts secret is string {
  // 32 caracteres mínimo: con menos, un HMAC-SHA256 se puede atacar por fuerza bruta sin conexión.
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET falta o tiene menos de 32 caracteres.');
}

export async function sign(claims: Claims, secret: string): Promise<string> {
  assertSecret(secret);
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}

/** Devuelve las claims si la firma, el emisor, la audiencia y la caducidad son válidos; si no, null. */
export async function verify(token: string, secret: string): Promise<Claims | null> {
  assertSecret(secret);
  if (token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  try {
    const h = JSON.parse(dec.decode(fromB64url(head)));
    if (h?.alg !== 'HS256') return null;
    // crypto.subtle.verify compara en tiempo constante.
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(`${head}.${body}`));
    if (!ok) return null;
    const c = JSON.parse(dec.decode(fromB64url(body))) as Claims;
    const now = Math.floor(Date.now() / 1000);
    if (c.iss !== ISSUER || c.aud !== AUDIENCE) return null;
    if (typeof c.sub !== 'string' || typeof c.site !== 'string' || !Array.isArray(c.scope)) return null;
    if (c.exp !== undefined && (typeof c.exp !== 'number' || c.exp <= now)) return null;
    return c;
  } catch {
    return null;
  }
}
