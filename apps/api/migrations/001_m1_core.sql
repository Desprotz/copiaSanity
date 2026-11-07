-- M1: núcleo publicable. Versión recortada del diseño de replica/schema.sql (31 tablas).
-- Recorte deliberado para un solo editor: sin organizaciones, datasets, roles ni tokens todavía
-- (llegan en M4–M6). Se conservan las ideas clave: borrador separado de lo publicado, revisión
-- para control optimista, historial inmutable, recursos aparte del documento y compilación agrupada.

create schema if not exists cms;

create table cms.content_types (
  id           text primary key check (id ~ '^[a-z0-9_]{1,64}$'),
  name         text not null check (length(name) between 1 and 80),
  plural       text not null check (length(plural) between 1 and 80),
  color        text not null check (color in ('red','blue','green','amber','violet')),
  title_field  text not null,
  fields       jsonb not null check (jsonb_typeof(fields) = 'array'),
  version      integer not null default 1 check (version > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table cms.documents (
  id            text primary key check (id ~ '^[a-z0-9_]{1,80}$'),
  type_id       text not null references cms.content_types(id) on delete restrict,
  draft         jsonb check (draft is null or jsonb_typeof(draft) = 'object'),
  published     jsonb check (published is null or jsonb_typeof(published) = 'object'),
  rev           integer not null default 1 check (rev > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  constraint documents_published_at check ((published is null) = (published_at is null))
);
create index documents_type_updated_idx on cms.documents (type_id, updated_at desc);

-- Historial inmutable: cada guardado, publicación o retirada agrega una fila; nunca se actualiza.
create table cms.revisions (
  id           bigint generated always as identity primary key,
  document_id  text not null references cms.documents(id) on delete cascade,
  rev          integer not null,
  action       text not null check (action in ('create','save','publish','discard','unpublish','duplicate')),
  data         jsonb,
  created_at   timestamptz not null default now(),
  unique (document_id, rev)
);
create index revisions_document_idx on cms.revisions (document_id, rev desc);

-- Recursos (imágenes). Los bytes viven en asset_blobs mientras no exista R2; luego solo quedará la fila de metadatos.
create table cms.assets (
  id             text primary key check (id ~ '^img_[a-z0-9]{6,20}$'),
  width          integer not null check (width between 1 and 10000),
  height         integer not null check (height between 1 and 10000),
  bytes          integer not null check (bytes between 1 and 5242880),
  mime           text not null check (mime in ('image/webp','image/jpeg','image/png')),
  original_name  text not null default '' check (length(original_name) <= 200),
  created_at     timestamptz not null default now()
);
create table cms.asset_blobs (
  asset_id  text primary key references cms.assets(id) on delete cascade,
  content   bytea not null
);

-- Estado del sitio público: una sola fila. change_seq sube con cada escritura (los editores la consultan para refrescar).
create table cms.site_state (
  id             smallint primary key default 1 check (id = 1),
  pending        integer not null default 0 check (pending >= 0),
  building       boolean not null default false,
  last_built_at  timestamptz,
  next_build_at  timestamptz,
  change_seq     bigint not null default 0
);
insert into cms.site_state (id) values (1);

-- Fotos de cada compilación. El sitio público solo lee la última.
create table cms.site_builds (
  id        bigint generated always as identity primary key,
  built_at  timestamptz not null default now(),
  snapshot  jsonb not null
);

create table cms.audit_events (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       text not null,
  action      text not null,
  target      text,
  detail      jsonb
);
create index audit_events_at_idx on cms.audit_events (at desc);
