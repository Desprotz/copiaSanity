// Tienda pública «Telar Norte» (prueba). Muestra lo PUBLICADO en el CMS: el CMS escribe en KV la foto de cada
// compilación (pub:<sitio>:snapshot) y las imágenes (pub:<sitio>:img:<id>). Aquí solo se lee: nada de Neon ni borradores.

interface Env { FLAGS: KVNamespace; SITE_ID: string }

type Data = Record<string, unknown>;
interface Snapshot { builtAt: string; documents: { id: string; typeId: string; data: Data; publishedAt: string }[] }
interface Img { assetId: string; alt: string }

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const color = (v: unknown, fallback = '#3a3a3d') => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
const img = (v: unknown): Img | null => (v && typeof v === 'object' && typeof (v as Img).assetId === 'string' && /^img_[a-z0-9]{6,20}$/.test((v as Img).assetId) ? (v as Img) : null);
/** Texto con formato del editor: solo etiquetas permitidas y sin atributos. */
const rich = (html: unknown) => str(html).replace(/<(?!\/?(p|strong|em|ul|ol|li|br)\b)[^>]*>/gi, '').replace(/<(\/?)(p|strong|em|ul|ol|li|br)\b[^>]*>/gi, '<$1$2>');

/** Texto legible sobre un color de fondo (contraste suficiente sobre la muestra de tela). */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.55 ? '#141414' : '#ffffff';
}

const CSS = `
:root{--ink:#141414;--muted:#5c5c5c;--line:#e4e4e1;--bg:#ffffff;--soft:#f3f3f1;--accent:#2b3a67;--radius:4px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 "Archivo",system-ui,sans-serif;font-variant-numeric:tabular-nums}
::selection{background:var(--ink);color:#fff}
a{color:inherit;text-decoration:none}a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
img{display:block;max-width:100%}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px}
.notice{background:var(--ink);color:#fff;font-size:13px;letter-spacing:.04em;text-align:center;padding:9px 16px}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);z-index:5}
header.top .wrap{display:flex;align-items:center;gap:32px;min-height:68px;flex-wrap:wrap}
.brand{font-weight:800;font-stretch:125%;font-size:22px;letter-spacing:.14em;text-transform:uppercase}
nav.cols{display:flex;gap:22px;flex-wrap:wrap;margin-left:auto}
nav.cols a{font-weight:600;font-size:14px;letter-spacing:.03em;padding:6px 0;border-bottom:2px solid transparent;transition:border-color .2s}
nav.cols a:hover,nav.cols a[aria-current]{border-color:var(--ink)}
.hero{padding:72px 0 56px;display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:end}
.hero h1{font-weight:800;font-stretch:112%;font-size:clamp(44px,7.4vw,104px);line-height:.92;letter-spacing:-.035em;margin:0;text-wrap:balance}
.hero p{font-size:18px;color:var(--muted);max-width:38ch;margin:0 0 8px}
.hero .cta{display:inline-flex;margin-top:20px;background:var(--ink);color:#fff;font-weight:700;padding:14px 26px;border-radius:999px;letter-spacing:.02em;transition:transform .15s}
.hero .cta:hover{transform:translateY(-2px)}
.hero-img{grid-column:1/-1;aspect-ratio:21/8;object-fit:cover;width:100%;border-radius:var(--radius)}
.bands{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 72px}
.band{position:relative;min-height:220px;padding:22px;border-radius:var(--radius);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;transition:transform .25s}
.band:hover{transform:translateY(-4px)}
.band h2{font-weight:800;font-stretch:125%;font-size:26px;letter-spacing:.02em;text-transform:uppercase;margin:0}
.band p{margin:0;font-size:15px;opacity:.9;max-width:30ch}
.band .n{font-size:13px;font-weight:600;letter-spacing:.06em}
.weave{background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 1px,transparent 1px 4px)}
.sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;border-top:1px solid var(--ink);padding:16px 0 26px}
.sec-head h2{margin:0;font-weight:800;font-stretch:125%;font-size:15px;letter-spacing:.16em;text-transform:uppercase}
.sec-head span{color:var(--muted);font-size:14px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:28px 18px;margin-bottom:80px}
.card .pic{position:relative;aspect-ratio:3/4;border-radius:var(--radius);overflow:hidden;background:var(--soft)}
.card .pic img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.card:hover .pic img{transform:scale(1.04)}
.swatch{position:absolute;inset:0;display:grid;place-items:center;transition:transform .5s}
.card:hover .swatch{transform:scale(1.03)}
.swatch b{font-weight:800;font-stretch:125%;font-size:64px;opacity:.22;letter-spacing:.04em}
.tag{position:absolute;top:14px;right:14px;background:#fff;color:var(--ink);font-size:12px;font-weight:700;padding:6px 10px 6px 18px;border-radius:2px;box-shadow:0 2px 6px rgba(0,0,0,.12);transform:rotate(3deg);transform-origin:top right}
.tag::before{content:"";position:absolute;left:7px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--soft);box-shadow:inset 0 0 0 1px #bbb}
.sold{position:absolute;left:14px;bottom:14px;background:var(--ink);color:#fff;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px}
.card h3{font-size:15px;font-weight:600;margin:12px 0 2px}
.card .meta{color:var(--muted);font-size:14px}
.product{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;padding:40px 0 88px}
.product .pic{position:relative;aspect-ratio:4/5;border-radius:var(--radius);overflow:hidden;background:var(--soft)}
.product .pic img{width:100%;height:100%;object-fit:cover}
.crumb{font-size:13px;color:var(--muted);letter-spacing:.04em;margin-bottom:18px}.crumb a{text-decoration:underline;text-underline-offset:3px}
.product h1{font-weight:800;font-stretch:112%;font-size:clamp(32px,4vw,52px);line-height:1;letter-spacing:-.02em;margin:0 0 14px}
.price{font-size:24px;font-weight:700;margin-bottom:28px}
.label{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px}
.sizes{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}
.sizes span{min-width:46px;height:44px;display:grid;place-items:center;border:1px solid var(--ink);font-weight:600;font-size:14px;padding:0 12px}
.desc{color:#333;max-width:52ch}.desc p{margin:0 0 12px}
.stock{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;margin-bottom:20px}
.stock::before{content:"";width:8px;height:8px;border-radius:50%;background:#1f8a4c}.stock.out::before{background:#b42318}
.col-head{padding:56px 0 36px;display:grid;gap:10px}
.col-head h1{margin:0;font-weight:800;font-stretch:125%;font-size:clamp(36px,5.5vw,72px);text-transform:uppercase;letter-spacing:.01em;line-height:.95}
.col-head p{margin:0;color:var(--muted);font-size:18px;max-width:46ch}
.empty{padding:60px 0;color:var(--muted)}
footer{border-top:1px solid var(--line);padding:32px 0 48px;color:var(--muted);font-size:13px}
footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding:44px 0 36px;gap:20px}.bands{grid-template-columns:1fr}.band{min-height:150px}.grid{grid-template-columns:repeat(2,1fr)}.product{grid-template-columns:1fr;gap:28px;padding-top:20px}nav.cols{margin-left:0;gap:16px;width:100%;overflow-x:auto;padding-bottom:6px}header.top .wrap{gap:6px 24px;padding-top:12px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

function layout(title: string, body: string, opts: { notice?: string; nav: string; desc?: string; builtAt: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(opts.desc ?? 'Telar Norte, tienda de ropa de prueba.')}"><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${opts.notice ? `<div class="notice">${esc(opts.notice)}</div>` : ''}
<header class="top"><div class="wrap"><a class="brand" href="/">Telar Norte</a><nav class="cols" aria-label="Colecciones">${opts.nav}</nav></div></header>
<main>${body}</main>
<footer><div class="wrap"><span>Telar Norte · tienda de prueba con productos ficticios</span><span>Contenido publicado desde el CMS de MSE · actualizado ${esc(new Date(opts.builtAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }))}</span></div></footer>
</body></html>`;
}

function pic(p: { id: string; data: Data }, initial = true) {
  const photo = img(p.data.foto);
  if (photo) return `<img src="/img/${esc(photo.assetId)}" alt="${esc(photo.alt)}" loading="lazy">`;
  const c = color(p.data.color);
  return `<div class="swatch weave" style="background-color:${c};color:${inkOn(c)}" role="img" aria-label="Muestra de color de ${esc(p.data.nombre)}">${initial ? `<b>${esc(str(p.data.nombre).slice(0, 1))}</b>` : ''}</div>`;
}

function card(p: { id: string; data: Data }, colName: string) {
  return `<a class="card" href="/producto/${esc(p.id)}"><div class="pic">${pic(p)}<span class="tag">${esc(money.format(Number(p.data.precio) || 0))}</span>${p.data.agotado ? '<span class="sold">Agotado</span>' : ''}</div>
<h3>${esc(p.data.nombre)}</h3><div class="meta">${esc(colName)}</div></a>`;
}

async function render(url: URL, snap: Snapshot): Promise<{ status: number; html: string }> {
  const docs = snap.documents;
  const portada = docs.find((d) => d.typeId === 'portada')?.data ?? {};
  const cols = docs.filter((d) => d.typeId === 'coleccion');
  const prods = docs.filter((d) => d.typeId === 'producto');
  const colName = (id: unknown) => str(cols.find((c) => c.id === id)?.data.nombre);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const nav = (active?: string) => cols.map((c) => `<a href="/coleccion/${esc(c.id)}"${c.id === active ? ' aria-current="page"' : ''}>${esc(c.data.nombre)}</a>`).join('');
  const base = { notice: str(portada.aviso), builtAt: snap.builtAt };

  if (path === '/') {
    const featured = prods.filter((p) => p.data.destacado);
    const list = (featured.length ? featured : prods).slice(0, 8);
    const hero = img(portada.imagen);
    const body = `<section class="wrap hero"><div><h1>${esc(portada.titulo || 'Telar Norte')}</h1></div>
<div><p>${esc(portada.subtitulo)}</p>${cols[0] ? `<a class="cta" href="/coleccion/${esc(cols[0].id)}">Ver la colección</a>` : ''}</div>
${hero ? `<img class="hero-img" src="/img/${esc(hero.assetId)}" alt="${esc(hero.alt)}">` : ''}</section>
<section class="wrap"><div class="bands">${cols.map((c) => { const bg = color(c.data.color); const n = prods.filter((p) => p.data.coleccion === c.id).length;
  return `<a class="band weave" href="/coleccion/${esc(c.id)}" style="background-color:${bg};color:${inkOn(bg)}"><span class="n">${n} ${n === 1 ? 'prenda' : 'prendas'}</span><div><h2>${esc(c.data.nombre)}</h2><p>${esc(c.data.descripcion)}</p></div></a>`; }).join('')}</div>
<div class="sec-head"><h2>${featured.length ? 'Destacados' : 'Productos'}</h2><span>${prods.length} prendas en total</span></div>
${list.length ? `<div class="grid">${list.map((p) => card(p, colName(p.data.coleccion))).join('')}</div>` : '<p class="empty">Todavía no hay productos publicados.</p>'}</section>`;
    return { status: 200, html: layout(str(portada.titulo) || 'Telar Norte', body, { ...base, nav: nav(), desc: str(portada.subtitulo) }) };
  }

  const mc = path.match(/^\/coleccion\/([a-z0-9_]{1,80})$/);
  if (mc) {
    const c = cols.find((x) => x.id === mc[1]);
    if (c) {
      const items = prods.filter((p) => p.data.coleccion === c.id);
      const body = `<section class="wrap"><div class="col-head"><h1>${esc(c.data.nombre)}</h1><p>${esc(c.data.descripcion)}</p></div>
<div class="sec-head"><h2>Prendas</h2><span>${items.length}</span></div>
${items.length ? `<div class="grid">${items.map((p) => card(p, str(c.data.nombre))).join('')}</div>` : '<p class="empty">Esta colección todavía no tiene prendas publicadas.</p>'}</section>`;
      return { status: 200, html: layout(`${str(c.data.nombre)} · Telar Norte`, body, { ...base, nav: nav(c.id), desc: str(c.data.descripcion) }) };
    }
  }

  const mp = path.match(/^\/producto\/([a-z0-9_]{1,80})$/);
  if (mp) {
    const p = prods.find((x) => x.id === mp[1]);
    if (p) {
      const sizes = str(p.data.tallas).split(',').map((s) => s.trim()).filter(Boolean);
      const cname = colName(p.data.coleccion);
      const body = `<section class="wrap product"><div class="pic">${pic(p, false)}</div><div>
<div class="crumb"><a href="/">Inicio</a> / ${cname ? `<a href="/coleccion/${esc(p.data.coleccion)}">${esc(cname)}</a>` : 'Productos'}</div>
<h1>${esc(p.data.nombre)}</h1><div class="price">${esc(money.format(Number(p.data.precio) || 0))}</div>
<div class="stock${p.data.agotado ? ' out' : ''}">${p.data.agotado ? 'Agotado por ahora' : 'Disponible'}</div>
${sizes.length ? `<p class="label">Tallas</p><div class="sizes">${sizes.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
<p class="label">Descripción</p><div class="desc">${rich(p.data.descripcion) || '<p>Sin descripción todavía.</p>'}</div></div></section>`;
      return { status: 200, html: layout(`${str(p.data.nombre)} · Telar Norte`, body, { ...base, nav: nav(str(p.data.coleccion)), desc: `${str(p.data.nombre)} · ${money.format(Number(p.data.precio) || 0)}` }) };
    }
  }

  return { status: 404, html: layout('No encontrado · Telar Norte', `<section class="wrap col-head"><h1>No está aquí</h1><p>Esta página no existe o la prenda ya no se publica.</p><p><a class="crumb" href="/" style="text-decoration:underline">Volver al inicio</a></p></section>`, { ...base, nav: nav() }) };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método no permitido', { status: 405 });

    const mi = url.pathname.match(/^\/img\/(img_[a-z0-9]{6,20})$/);
    if (mi) {
      const { value, metadata } = await env.FLAGS.getWithMetadata<{ mime: string }>(`pub:${env.SITE_ID}:img:${mi[1]}`, 'arrayBuffer');
      if (!value) return new Response('No encontrada', { status: 404 });
      return new Response(value, { headers: { 'content-type': metadata?.mime ?? 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
    }

    const snap = await env.FLAGS.get<Snapshot>(`pub:${env.SITE_ID}:snapshot`, { type: 'json', cacheTtl: 60 });
    if (!snap) return new Response('La tienda todavía no se ha publicado desde el CMS.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '300' } });
    const { status, html } = await render(url, snap);
    return new Response(html, { status, headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin',
      'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; frame-ancestors 'none'",
    } });
  },
} satisfies ExportedHandler<Env>;
