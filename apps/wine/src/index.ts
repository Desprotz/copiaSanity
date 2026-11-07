// Web pública de «Viña Sotará» (bodega ficticia de prueba). Muestra lo PUBLICADO en el CMS, leído desde KV.
// Si un vino no tiene foto, su botella se dibuja aquí a partir de sus datos (tipo, cepa, cosecha, color de etiqueta).

interface Env { FLAGS: KVNamespace; SITE_ID: string }
type Data = Record<string, unknown>;
interface Doc { id: string; typeId: string; data: Data; publishedAt: string }
interface Snapshot { builtAt: string; documents: Doc[] }
interface Img { assetId: string; alt: string }

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const hex = (v: unknown, fb: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);
const img = (v: unknown): Img | null => (v && typeof v === 'object' && /^img_[a-z0-9]{6,20}$/.test(String((v as Img).assetId)) ? (v as Img) : null);
const rich = (html: unknown) => str(html).replace(/<(?!\/?(p|strong|em|ul|ol|li|br)\b)[^>]*>/gi, '').replace(/<(\/?)(p|strong|em|ul|ol|li|br)\b[^>]*>/gi, '<$1$2>');
const TIPOS = ['tinto', 'blanco', 'rosado', 'espumoso'] as const;
type Tipo = (typeof TIPOS)[number];
const tipo = (v: unknown): Tipo => { const t = str(v).toLowerCase().trim(); return (TIPOS as readonly string[]).includes(t) ? (t as Tipo) : 'tinto'; };

function inkOn(h: string) {
  const n = parseInt(h.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 > 0.55 ? '#1d1416' : '#f6f1ea';
}

// Vidrio y cápsula por tipo de vino.
const GLASS: Record<Tipo, [string, string, string]> = {
  tinto: ['#1d2a20', '#0d140f', '#5a1022'],
  blanco: ['#55672e', '#2f3c16', '#b8913c'],
  rosado: ['#f3cfc8', '#d99c92', '#c7747a'],
  espumoso: ['#23321f', '#111a0f', '#c9a54a'],
};

let uid = 0;
/** Botella ilustrada: Burdeos para tranquilos, champañera para espumosos. Texto de la etiqueta = datos del CMS. */
function bottle(d: Data, size: 'card' | 'big' = 'card') {
  const t = tipo(d.tipo);
  const [g1, g2, cap] = GLASS[t];
  const label = hex(d.etiqueta, '#e8dcc0');
  const ink = inkOn(label);
  const id = `b${++uid}`;
  const body = t === 'espumoso'
    ? 'M86 18 H114 V118 C114 186 160 196 160 262 V488 Q160 506 142 506 H58 Q40 506 40 488 V262 C40 196 86 186 86 118 Z'
    : 'M86 18 H114 V146 C114 176 154 186 154 218 V488 Q154 506 136 506 H64 Q46 506 46 488 V218 C46 186 86 176 86 146 Z';
  const capH = t === 'espumoso' ? 104 : 72;
  const name = str(d.nombre).toUpperCase();
  const cepa = str(d.cepa);
  return `<svg class="bottle ${size}" viewBox="0 0 200 520" role="img" aria-label="Botella de ${esc(d.nombre)} ${esc(cepa)} ${esc(d.cosecha)}">
<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${g2}"/><stop offset=".35" stop-color="${g1}"/><stop offset=".7" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient>
<linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="${cap}" stop-opacity=".75"/><stop offset=".45" stop-color="${cap}"/><stop offset="1" stop-color="${cap}" stop-opacity=".7"/></linearGradient></defs>
<ellipse cx="100" cy="510" rx="62" ry="7" fill="#000" opacity=".18"/>
<path d="${body}" fill="url(#${id}g)"/>
<rect x="84" y="14" width="32" height="${capH}" rx="3" fill="url(#${id}c)"/>
<rect x="84" y="${14 + capH - 8}" width="32" height="3" fill="#000" opacity=".18"/>
<rect x="${t === 'espumoso' ? 50 : 54}" y="296" width="${t === 'espumoso' ? 100 : 92}" height="150" rx="2" fill="${label}"/>
<rect x="${t === 'espumoso' ? 56 : 60}" y="302" width="${t === 'espumoso' ? 88 : 80}" height="138" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width=".8"/>
<text x="100" y="324" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="8.5" letter-spacing="2.4" fill="${ink}" opacity=".85">VIÑA SOTARÁ</text>
<text x="100" y="356" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="${name.length > 14 ? 10 : 12}" font-weight="700" letter-spacing=".6" fill="${ink}">${esc(name.slice(0, 22))}</text>
<line x1="80" x2="120" y1="368" y2="368" stroke="${ink}" stroke-opacity=".45" stroke-width=".8"/>
<text x="100" y="388" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-size="${cepa.length > 18 ? 6.5 : 8}" fill="${ink}" opacity=".9">${esc(cepa.slice(0, 28))}</text>
<text x="100" y="424" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="15" font-style="italic" fill="${ink}">${esc(d.cosecha)}</text>
<rect x="${t === 'espumoso' ? 60 : 62}" y="222" width="9" height="260" rx="4.5" fill="#fff" opacity="${t === 'rosado' ? '.35' : '.12'}"/>
</svg>`;
}

function visual(d: Data, size: 'card' | 'big' = 'card') {
  const p = img(d.foto);
  return p ? `<img class="photo ${size}" src="/img/${esc(p.assetId)}" alt="${esc(p.alt)}" loading="lazy">` : bottle(d, size);
}

const CSS = `
:root{--vino:#3b0d1a;--vino-2:#55142a;--oro:#c9a54a;--piedra:#ecebe6;--tinta:#1d1416;--gris:#5e5658;--linea:#d8d5cd;--blanco:#fbfaf8}
*{box-sizing:border-box}body{margin:0;background:var(--piedra);color:var(--tinta);font:400 16px/1.6 "Hanken Grotesk",system-ui,sans-serif;font-variant-numeric:tabular-nums}
::selection{background:var(--vino);color:#fff}a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid var(--oro);outline-offset:3px}
.wrap{max-width:1200px;margin:0 auto;padding-inline:24px}
.legal{background:#140609;color:#d9c9c0;font-size:12px;text-align:center;padding:8px 16px;letter-spacing:.02em}
.top{background:var(--vino);color:#f6f1ea}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:76px;flex-wrap:wrap}
.brand{font-family:"Bodoni Moda",serif;font-size:24px;letter-spacing:.22em;font-weight:600}
.brand small{display:block;font-family:"Hanken Grotesk";font-size:10px;letter-spacing:.32em;opacity:.7;font-weight:500;margin-top:2px}
.top nav{display:flex;gap:26px;flex-wrap:wrap}.top nav a{font-size:14px;letter-spacing:.06em;opacity:.85;padding:6px 0;border-bottom:1px solid transparent;transition:opacity .2s,border-color .2s}
.top nav a:hover,.top nav a[aria-current]{opacity:1;border-color:var(--oro)}
.hero{background:radial-gradient(120% 90% at 80% 10%,var(--vino-2),var(--vino) 60%);color:#f6f1ea;overflow:hidden}
.hero .wrap{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:end;padding-block:64px 0}
.hero h1{font-family:"Bodoni Moda",serif;font-weight:500;font-size:clamp(44px,6.2vw,88px);line-height:1;letter-spacing:-.01em;margin:0 0 22px;text-wrap:balance}
.hero p{font-size:18px;opacity:.85;max-width:40ch;margin:0 0 30px}
.hero .cta{display:inline-flex;gap:10px;align-items:center;border:1px solid var(--oro);color:#f6f1ea;padding:14px 26px;letter-spacing:.12em;font-size:13px;text-transform:uppercase;transition:background .25s,color .25s;margin-bottom:64px}
.hero .cta:hover{background:var(--oro);color:var(--tinta)}
.trio{display:flex;align-items:flex-end;justify-content:center;gap:0;height:440px}
.trio .bottle{height:400px;width:auto;filter:drop-shadow(0 20px 30px rgba(0,0,0,.35));transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.trio a:nth-child(1) .bottle{transform:translateY(24px) rotate(-6deg)}.trio a:nth-child(3) .bottle{transform:translateY(24px) rotate(6deg)}
.trio a:nth-child(2){z-index:1;margin-inline:-28px}.trio a:hover .bottle{transform:translateY(-10px) rotate(0)}
.sec{padding-block:72px 24px}
.sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
.sec-head h2{font-family:"Bodoni Moda",serif;font-weight:500;font-size:clamp(30px,3.4vw,44px);margin:0;line-height:1.05}
.sec-head p{margin:6px 0 0;color:var(--gris);max-width:52ch}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chips a{border:1px solid var(--linea);background:var(--blanco);padding:8px 16px;border-radius:999px;font-size:14px;font-weight:600;transition:border-color .2s}
.chips a:hover{border-color:var(--tinta)}.chips a[aria-current]{background:var(--tinta);color:#fff;border-color:var(--tinta)}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:56px}
.wine{background:var(--blanco);border:1px solid var(--linea);display:flex;flex-direction:column;transition:transform .3s,box-shadow .3s}
.wine:hover{transform:translateY(-4px);box-shadow:0 18px 36px -18px rgba(59,13,26,.45)}
.wine .stage{position:relative;height:300px;display:grid;place-items:end center;padding-top:22px;background:linear-gradient(180deg,#f4f2ee,#e4e1d9)}
.wine .stage .bottle,.wine .stage .photo{height:270px;width:auto;object-fit:contain;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.wine:hover .stage .bottle{transform:translateY(-6px) rotate(-2deg)}
.pill{position:absolute;top:12px;left:12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:4px 9px;background:var(--blanco);border:1px solid var(--linea)}
.out{position:absolute;top:12px;right:12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:4px 9px;background:var(--tinta);color:#fff}
.wine .info{padding:16px 18px 20px;display:grid;gap:2px}
.wine h3{font-family:"Bodoni Moda",serif;font-weight:600;font-size:19px;margin:0;line-height:1.2}
.wine .cepa{color:var(--gris);font-size:14px}.wine .price{font-weight:700;margin-top:8px}
.lines{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--linea);border:1px solid var(--linea);margin-bottom:80px}
.lines a{background:var(--blanco);padding:28px;display:grid;gap:8px;transition:background .25s}.lines a:hover{background:#fff}
.lines h3{font-family:"Bodoni Moda",serif;font-weight:500;font-size:28px;margin:0}.lines p{margin:0;color:var(--gris)}
.lines span{font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:var(--vino)}
.story{background:var(--vino);color:#f6f1ea}.story .wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:56px;padding-block:72px}
.story h2{font-family:"Bodoni Moda",serif;font-weight:500;font-size:clamp(34px,4vw,54px);margin:0;line-height:1.05}
.story .txt{opacity:.9;font-size:17px;max-width:60ch}.story .txt p{margin:0 0 14px}
.detail{display:grid;grid-template-columns:1fr 1fr;gap:56px;padding-block:48px 88px;align-items:start}
.detail .stage{background:radial-gradient(90% 70% at 50% 30%,var(--vino-2),var(--vino));display:grid;place-items:end center;padding:48px 0 32px;min-height:600px}
.detail .stage .bottle,.detail .stage .photo{height:520px;width:auto;object-fit:contain;filter:drop-shadow(0 24px 32px rgba(0,0,0,.4))}
.crumb{font-size:13px;color:var(--gris);margin-bottom:16px}.crumb a{text-decoration:underline;text-underline-offset:3px}
.detail h1{font-family:"Bodoni Moda",serif;font-weight:500;font-size:clamp(36px,4.4vw,58px);line-height:1;margin:0 0 6px}
.detail .sub{font-size:18px;color:var(--gris);margin-bottom:22px}
.detail .big-price{font-size:26px;font-weight:700;margin-bottom:6px}
.stock{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;margin-bottom:28px}.stock::before{content:"";width:8px;height:8px;border-radius:50%;background:#2f7d4a}.stock.no::before{background:#b42318}
.ficha{display:grid;grid-template-columns:auto 1fr;gap:10px 28px;border-block:1px solid var(--linea);padding-block:20px;margin-bottom:26px}
.ficha dt{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--gris);padding-top:2px}.ficha dd{margin:0}
.notes h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 8px}.notes p{margin:0 0 12px;max-width:56ch}
footer{background:#140609;color:#cbbab2;font-size:13px}footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-block:32px 44px}
.empty{color:var(--gris);padding-block:40px}
@media(max-width:960px){.hero .wrap,.story .wrap,.detail{grid-template-columns:1fr}.trio{height:320px}.trio .bottle{height:290px}.grid{grid-template-columns:repeat(2,1fr)}.lines{grid-template-columns:1fr}.detail .stage{min-height:420px}.detail .stage .bottle,.detail .stage .photo{height:360px}.hero .cta{margin-bottom:8px}}
@media(max-width:520px){.grid{gap:12px}.wine .stage{height:220px}.wine .stage .bottle,.wine .stage .photo{height:196px}.wine .info{padding:12px}.wine h3{font-size:16px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

function page(title: string, body: string, o: { nav: string; legal: string; builtAt: string; desc?: string }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(o.desc ?? 'Viña Sotará, bodega de prueba.')}"><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${o.legal ? `<div class="legal">${esc(o.legal)}</div>` : ''}
<header class="top"><div class="wrap"><a class="brand" href="/">VIÑA SOTARÁ<small>VALLE DE SOTARÁ · DESDE 1998</small></a><nav aria-label="Principal">${o.nav}</nav></div></header>
<main>${body}</main>
<footer><div class="wrap"><span>Viña Sotará · bodega ficticia de prueba · Prohíbase el expendio de bebidas embriagantes a menores de edad</span><span>Publicado desde el CMS de MSE · ${esc(new Date(o.builtAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }))}</span></div></footer>
</body></html>`;
}

function card(w: Doc) {
  return `<a class="wine" href="/vino/${esc(w.id)}"><div class="stage">${visual(w.data)}<span class="pill">${esc(tipo(w.data.tipo))}</span>${w.data.agotado ? '<span class="out">Agotado</span>' : ''}</div>
<div class="info"><h3>${esc(w.data.nombre)}</h3><span class="cepa">${esc(w.data.cepa)} · ${esc(w.data.cosecha)}</span><span class="price">${esc(money.format(Number(w.data.precio) || 0))}</span></div></a>`;
}

function render(url: URL, snap: Snapshot): { status: number; html: string } {
  uid = 0;
  const all = snap.documents;
  const portada = all.find((d) => d.typeId === 'portada')?.data ?? {};
  const lineas = all.filter((d) => d.typeId === 'linea');
  const vinos = all.filter((d) => d.typeId === 'vino');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const nav = (cur?: string) => [['/vinos', 'Vinos'], ...lineas.map((l) => [`/linea/${l.id}`, str(l.data.nombre)]), ['/bodega', 'La bodega']]
    .map(([h, t]) => `<a href="${esc(h)}"${h === cur ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('');
  const base = { legal: str(portada.aviso), builtAt: snap.builtAt };
  const lineName = (id: unknown) => str(lineas.find((l) => l.id === id)?.data.nombre);

  if (path === '/') {
    const dest = vinos.filter((w) => w.data.destacado);
    const trio = (dest.length >= 3 ? dest : vinos).slice(0, 3);
    const body = `<section class="hero"><div class="wrap"><div><h1>${esc(portada.titulo || 'Viña Sotará')}</h1><p>${esc(portada.subtitulo)}</p><a class="cta" href="/vinos">Ver los vinos →</a></div>
<div class="trio">${trio.map((w) => `<a href="/vino/${esc(w.id)}" aria-label="${esc(w.data.nombre)} ${esc(w.data.cepa)}">${visual(w.data, 'big')}</a>`).join('')}</div></div></section>
<section class="wrap sec"><div class="sec-head"><div><h2>Destacados de la bodega</h2><p>Lo que más estamos abriendo esta temporada.</p></div><div class="chips"><a href="/vinos">Ver los ${vinos.length} vinos</a></div></div>
<div class="grid">${(dest.length ? dest : vinos).slice(0, 4).map(card).join('')}</div>
<div class="sec-head"><div><h2>Nuestras líneas</h2></div></div>
<div class="lines">${lineas.map((l) => { const n = vinos.filter((w) => w.data.linea === l.id).length; return `<a href="/linea/${esc(l.id)}"><span>${n} ${n === 1 ? 'vino' : 'vinos'}</span><h3>${esc(l.data.nombre)}</h3><p>${esc(l.data.descripcion)}</p></a>`; }).join('')}</div></section>
${portada.historia ? `<section class="story"><div class="wrap"><h2>Una bodega entre la niebla</h2><div class="txt">${rich(portada.historia)}</div></div></section>` : ''}`;
    return { status: 200, html: page(str(portada.titulo) || 'Viña Sotará', body, { ...base, nav: nav(), desc: str(portada.subtitulo) }) };
  }

  if (path === '/vinos') {
    const t = url.searchParams.get('tipo');
    const sel = t && (TIPOS as readonly string[]).includes(t) ? (t as Tipo) : null;
    const list = sel ? vinos.filter((w) => tipo(w.data.tipo) === sel) : vinos;
    const chips = [['', 'Todos'], ...TIPOS.map((x) => [x, x[0].toUpperCase() + x.slice(1) + 's'])]
      .map(([v, l]) => `<a href="/vinos${v ? `?tipo=${v}` : ''}"${(sel ?? '') === v ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('');
    const body = `<section class="wrap sec"><div class="sec-head"><div><h2>Nuestros vinos</h2><p>${list.length} ${list.length === 1 ? 'vino' : 'vinos'}${sel ? ` ${sel}s` : ''} del valle de Sotará.</p></div><nav class="chips" aria-label="Filtrar por tipo">${chips}</nav></div>
${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p class="empty">No hay vinos de este tipo publicados.</p>'}</section>`;
    return { status: 200, html: page('Vinos · Viña Sotará', body, { ...base, nav: nav('/vinos') }) };
  }

  const ml = path.match(/^\/linea\/([a-z0-9_]{1,80})$/);
  const l = ml && lineas.find((x) => x.id === ml[1]);
  if (l) {
    const list = vinos.filter((w) => w.data.linea === l.id);
    const body = `<section class="wrap sec"><div class="sec-head"><div><h2>${esc(l.data.nombre)}</h2><p>${esc(l.data.descripcion)}</p></div></div>
${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<p class="empty">Esta línea todavía no tiene vinos publicados.</p>'}</section>`;
    return { status: 200, html: page(`${str(l.data.nombre)} · Viña Sotará`, body, { ...base, nav: nav(`/linea/${l.id}`), desc: str(l.data.descripcion) }) };
  }

  if (path === '/bodega') {
    const body = `<section class="story"><div class="wrap"><h2>La bodega</h2><div class="txt">${rich(portada.historia) || '<p>Pronto contaremos nuestra historia.</p>'}</div></div></section>`;
    return { status: 200, html: page('La bodega · Viña Sotará', body, { ...base, nav: nav('/bodega') }) };
  }

  const mv = path.match(/^\/vino\/([a-z0-9_]{1,80})$/);
  const w = mv && vinos.find((x) => x.id === mv[1]);
  if (w) {
    const d = w.data;
    const row = (k: string, v: unknown) => (str(v) ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '');
    const body = `<section class="wrap detail"><div class="stage">${visual(d, 'big')}</div><div>
<div class="crumb"><a href="/vinos">Vinos</a> / ${lineName(d.linea) ? `<a href="/linea/${esc(d.linea)}">${esc(lineName(d.linea))}</a>` : ''}</div>
<h1>${esc(d.nombre)}</h1><div class="sub">${esc(d.cepa)} · ${esc(d.cosecha)}</div>
<div class="big-price">${esc(money.format(Number(d.precio) || 0))} <span style="font-weight:400;color:var(--gris);font-size:15px">· botella 750 ml</span></div>
<div class="stock${d.agotado ? ' no' : ''}">${d.agotado ? 'Agotado por ahora' : 'Disponible'}</div>
<dl class="ficha">${row('Tipo', tipo(d.tipo))}${row('Cepa', d.cepa)}${row('Cosecha', d.cosecha)}${row('Grado', d.alcohol)}${row('Región', d.region)}${row('Línea', lineName(d.linea))}${row('Maridaje', d.maridaje)}</dl>
<div class="notes"><h2>Notas de cata</h2>${rich(d.notas) || '<p>Sin notas todavía.</p>'}</div></div></section>`;
    return { status: 200, html: page(`${str(d.nombre)} ${str(d.cepa)} ${str(d.cosecha)} · Viña Sotará`, body, { ...base, nav: nav('/vinos'), desc: `${str(d.cepa)} ${str(d.cosecha)} · ${money.format(Number(d.precio) || 0)}` }) };
  }

  return { status: 404, html: page('No encontrado · Viña Sotará', `<section class="wrap sec"><div class="sec-head"><div><h2>Esta botella no está en la cava</h2><p>La página no existe o el vino ya no se publica. <a href="/vinos" style="text-decoration:underline">Ver todos los vinos</a></p></div></div></section>`, { ...base, nav: nav() }) };
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
    if (!snap) return new Response('La bodega todavía no se ha publicado desde el CMS.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '300' } });
    const { status, html } = render(url, snap);
    return new Response(html, { status, headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60', 'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self'; frame-ancestors 'none'",
    } });
  },
} satisfies ExportedHandler<Env>;
