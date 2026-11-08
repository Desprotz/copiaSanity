-- Tokens de API (JWT) para que cada proyecto consulte el contenido sin usuario ni contraseña.
-- El JWT se firma con JWT_SECRET (secreto del Worker) y nunca se guarda: aquí solo quedan sus metadatos,
-- para poder revocarlo, darle caducidad y ver cuándo se usó por última vez.
-- Por ahora cada token pertenece a un sitio y solo lee ('read'). Más adelante el mismo esquema servirá
-- para el editor (otros alcances, p. ej. 'write' o 'admin'), agregando valores al check de scopes.

create table cms.api_tokens (
  id            text primary key check (id ~ '^tok_[a-z0-9]{16,32}$'),
  site_id       text not null references cms.sites(id) on delete cascade,
  name          text not null check (length(name) between 1 and 80),
  scopes        text[] not null default '{read}' check (cardinality(scopes) > 0 and scopes <@ array['read']),
  created_by    text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  last_used_at  timestamptz
);
create index api_tokens_site_idx on cms.api_tokens (site_id, created_at desc);
