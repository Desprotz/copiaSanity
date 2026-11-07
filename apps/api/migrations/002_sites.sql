-- Varios sitios (C043, adelantado desde M4): cada web es un sitio con sus propios tipos,
-- documentos, imágenes y compilaciones. Solo había datos ficticios, así que se recrean las tablas.
-- Todas las claves incluyen site_id: una consulta de un sitio no puede tocar filas de otro.

drop table if exists cms.audit_events, cms.site_builds, cms.site_state, cms.asset_blobs, cms.assets,
  cms.revisions, cms.documents, cms.content_types cascade;

create table cms.sites (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name        text not null check (length(name) between 1 and 80),
  created_at  timestamptz not null default now()
);

create table cms.content_types (
  site_id      text not null references cms.sites(id) on delete cascade,
  id           text not null check (id ~ '^[a-z0-9_]{1,64}$'),
  name         text not null check (length(name) between 1 and 80),
  plural       text not null check (length(plural) between 1 and 80),
  color        text not null check (color in ('red','blue','green','amber','violet')),
  title_field  text not null,
  fields       jsonb not null check (jsonb_typeof(fields) = 'array'),
  version      integer not null default 1 check (version > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (site_id, id)
);

create table cms.documents (
  site_id       text not null references cms.sites(id) on delete cascade,
  id            text not null check (id ~ '^[a-z0-9_]{1,80}$'),
  type_id       text not null,
  draft         jsonb check (draft is null or jsonb_typeof(draft) = 'object'),
  published     jsonb check (published is null or jsonb_typeof(published) = 'object'),
  rev           integer not null default 1 check (rev > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  primary key (site_id, id),
  foreign key (site_id, type_id) references cms.content_types(site_id, id) on delete restrict,
  constraint documents_published_at check ((published is null) = (published_at is null))
);
create index documents_type_updated_idx on cms.documents (site_id, type_id, updated_at desc);

create table cms.revisions (
  id           bigint generated always as identity primary key,
  site_id      text not null,
  document_id  text not null,
  rev          integer not null,
  action       text not null check (action in ('create','save','publish','discard','unpublish','duplicate')),
  data         jsonb,
  created_at   timestamptz not null default now(),
  foreign key (site_id, document_id) references cms.documents(site_id, id) on delete cascade,
  unique (site_id, document_id, rev)
);

create table cms.assets (
  site_id        text not null references cms.sites(id) on delete cascade,
  id             text not null check (id ~ '^img_[a-z0-9]{6,20}$'),
  width          integer not null check (width between 1 and 10000),
  height         integer not null check (height between 1 and 10000),
  bytes          integer not null check (bytes between 1 and 5242880),
  mime           text not null check (mime in ('image/webp','image/jpeg','image/png')),
  original_name  text not null default '' check (length(original_name) <= 200),
  created_at     timestamptz not null default now(),
  primary key (site_id, id)
);
create table cms.asset_blobs (
  site_id   text not null,
  asset_id  text not null,
  content   bytea not null,
  primary key (site_id, asset_id),
  foreign key (site_id, asset_id) references cms.assets(site_id, id) on delete cascade
);

create table cms.site_state (
  site_id        text primary key references cms.sites(id) on delete cascade,
  pending        integer not null default 0 check (pending >= 0),
  building       boolean not null default false,
  last_built_at  timestamptz,
  next_build_at  timestamptz,
  change_seq     bigint not null default 0
);

create table cms.site_builds (
  id        bigint generated always as identity primary key,
  site_id   text not null references cms.sites(id) on delete cascade,
  built_at  timestamptz not null default now(),
  snapshot  jsonb not null
);
create index site_builds_site_idx on cms.site_builds (site_id, id desc);

create table cms.audit_events (
  id       bigint generated always as identity primary key,
  site_id  text references cms.sites(id) on delete set null,
  at       timestamptz not null default now(),
  actor    text not null,
  action   text not null,
  target   text,
  detail   jsonb
);
create index audit_events_at_idx on cms.audit_events (at desc);
