-- Inicio de sesión propio (decisión del usuario 2026-11-07: sin Cloudflare Access para no registrar tarjeta).
-- Contraseñas con PBKDF2-SHA256; sesiones guardadas solo como hash; intentos fallidos para bloquear ataques.

create table cms.users (
  id             bigint generated always as identity primary key,
  username       text not null unique check (username ~ '^[a-z0-9._-]{3,40}$'),
  display_name   text not null check (length(display_name) between 1 and 80),
  password_hash  text not null,
  is_owner       boolean not null default false,
  disabled_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Qué sitios puede tocar cada persona. El dueño ve todos; los clientes, solo los suyos (roles completos en M6).
create table cms.site_members (
  site_id  text not null references cms.sites(id) on delete cascade,
  user_id  bigint not null references cms.users(id) on delete cascade,
  role     text not null default 'editor' check (role in ('editor','viewer')),
  primary key (site_id, user_id)
);

create table cms.sessions (
  token_hash    text primary key,
  user_id       bigint not null references cms.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index sessions_user_idx on cms.sessions (user_id);

create table cms.login_attempts (
  id        bigint generated always as identity primary key,
  username  text not null,
  ip        text not null,
  ok        boolean not null,
  at        timestamptz not null default now()
);
create index login_attempts_recent_idx on cms.login_attempts (at desc);
