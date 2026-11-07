-- Diseño PostgreSQL (versión 17 o 18, la que ofrezca Neon al crear el proyecto).
-- NO ejecutado. No es una migración aprobada para producción.
-- Revisión 2026-11-07: base alojada en Neon Free (1 GB por proyecto).
-- Identidad: Cloudflare Access. cms.users.issuer = dominio del equipo de Access;
--   subject = claim sub del JWT verificado por el API.
-- cms.sessions no se usa en M1 (Access gestiona la sesión); se conserva por si
--   se vuelve a un proveedor propio. collab_snapshots/collab_updates pasan a M5.
-- Autorización obligatoria en el API; no hay RLS en este borrador.
-- Prohibido exponer la conexión de BD al navegador: solo el Worker (vía Hyperdrive)
--   y GitHub Actions (copias) tienen credenciales. Ver architecture.md.
BEGIN;
CREATE SCHEMA cms;

CREATE TABLE cms.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  issuer text NOT NULL,
  subject text NOT NULL,
  display_name text NOT NULL,
  disabled_at timestamptz,
  UNIQUE (issuer, subject)
);


CREATE TABLE cms.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  CONSTRAINT organizations_fk1 FOREIGN KEY (owner_user_id) REFERENCES cms.users (id) ON DELETE RESTRICT
);
CREATE INDEX organizations_fk1_idx ON cms.organizations (owner_user_id);


CREATE TABLE cms.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  UNIQUE (org_id, id),
  UNIQUE (org_id, slug),
  CONSTRAINT projects_fk1 FOREIGN KEY (org_id) REFERENCES cms.organizations (id) ON DELETE RESTRICT
);
CREATE INDEX projects_fk1_idx ON cms.projects (org_id);


CREATE TABLE cms.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  generation bigint NOT NULL DEFAULT 0 CHECK (generation >= 0),
  UNIQUE (org_id, id),
  UNIQUE (org_id, project_id, name),
  CONSTRAINT datasets_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX datasets_fk1_idx ON cms.datasets (org_id, project_id);


CREATE TABLE cms.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL,
  rules jsonb NOT NULL CHECK (jsonb_typeof(rules) = 'object'),
  UNIQUE (org_id, project_id, id),
  UNIQUE (org_id, project_id, name),
  CONSTRAINT roles_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX roles_fk1_idx ON cms.roles (org_id, project_id);


CREATE TABLE cms.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  UNIQUE (org_id, project_id, user_id),
  CONSTRAINT memberships_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT,
  CONSTRAINT memberships_fk2 FOREIGN KEY (user_id) REFERENCES cms.users (id) ON DELETE RESTRICT,
  CONSTRAINT memberships_fk3 FOREIGN KEY (org_id, project_id, role_id) REFERENCES cms.roles (org_id, project_id, id) ON DELETE RESTRICT
);
CREATE INDEX memberships_fk1_idx ON cms.memberships (org_id, project_id);
CREATE INDEX memberships_fk2_idx ON cms.memberships (user_id);
CREATE INDEX memberships_fk3_idx ON cms.memberships (org_id, project_id, role_id);


CREATE TABLE cms.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT sessions_fk1 FOREIGN KEY (user_id) REFERENCES cms.users (id) ON DELETE CASCADE
);
CREATE INDEX sessions_fk1_idx ON cms.sessions (user_id);
CREATE INDEX sessions_expiry_idx ON cms.sessions (expires_at);

CREATE TABLE cms.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_by uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  role_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT api_tokens_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT,
  CONSTRAINT api_tokens_fk2 FOREIGN KEY (created_by) REFERENCES cms.users (id) ON DELETE RESTRICT,
  CONSTRAINT api_tokens_fk3 FOREIGN KEY (org_id, project_id, role_id) REFERENCES cms.roles (org_id, project_id, id) ON DELETE RESTRICT
);
CREATE INDEX api_tokens_fk1_idx ON cms.api_tokens (org_id, project_id);
CREATE INDEX api_tokens_fk2_idx ON cms.api_tokens (created_by);
CREATE INDEX api_tokens_fk3_idx ON cms.api_tokens (org_id, project_id, role_id);


CREATE TABLE cms.cors_origins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  origin text NOT NULL,
  allow_credentials boolean NOT NULL DEFAULT false,
  UNIQUE (org_id, project_id, origin),
  CONSTRAINT cors_origins_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE CASCADE
);
CREATE INDEX cors_origins_fk1_idx ON cms.cors_origins (org_id, project_id);


CREATE TABLE cms.schema_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  type_name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  UNIQUE (org_id, dataset_id, id),
  UNIQUE (org_id, dataset_id, type_name, version),
  CONSTRAINT schema_versions_fk1 FOREIGN KEY (org_id, dataset_id) REFERENCES cms.datasets (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX schema_versions_fk1_idx ON cms.schema_versions (org_id, dataset_id);


CREATE TABLE cms.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  type_name text NOT NULL,
  external_id text NOT NULL,
  deleted_at timestamptz,
  UNIQUE (org_id, dataset_id, id),
  UNIQUE (org_id, dataset_id, external_id),
  CONSTRAINT documents_fk1 FOREIGN KEY (org_id, dataset_id) REFERENCES cms.datasets (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX documents_fk1_idx ON cms.documents (org_id, dataset_id);
CREATE INDEX documents_type_idx ON cms.documents (org_id, dataset_id, type_name, created_at, id);

CREATE TABLE cms.revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  document_id uuid NOT NULL,
  schema_version_id uuid NOT NULL,
  sequence bigint NOT NULL CHECK (sequence > 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  author_user_id uuid,
  UNIQUE (org_id, dataset_id, id),
  UNIQUE (org_id, dataset_id, document_id, id),
  UNIQUE (org_id, dataset_id, document_id, sequence),
  CONSTRAINT revisions_fk1 FOREIGN KEY (org_id, dataset_id, document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT revisions_fk2 FOREIGN KEY (org_id, dataset_id, schema_version_id) REFERENCES cms.schema_versions (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT revisions_fk3 FOREIGN KEY (author_user_id) REFERENCES cms.users (id) ON DELETE RESTRICT
);
CREATE INDEX revisions_fk1_idx ON cms.revisions (org_id, dataset_id, document_id);
CREATE INDEX revisions_fk2_idx ON cms.revisions (org_id, dataset_id, schema_version_id);
CREATE INDEX revisions_fk3_idx ON cms.revisions (author_user_id);


CREATE TABLE cms.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','cancelled','failed','reverted')),
  run_at timestamptz,
  UNIQUE (org_id, dataset_id, id),
  CONSTRAINT releases_fk1 FOREIGN KEY (org_id, dataset_id) REFERENCES cms.datasets (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX releases_fk1_idx ON cms.releases (org_id, dataset_id);


CREATE TABLE cms.heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  document_id uuid NOT NULL,
  branch text NOT NULL CHECK (branch IN ('draft','published','release')),
  release_id uuid,
  revision_id uuid NOT NULL,
  lock_version bigint NOT NULL DEFAULT 1 CHECK (lock_version > 0),
  CHECK ((branch = 'release') = (release_id IS NOT NULL)),
  UNIQUE (org_id, dataset_id, id),
  UNIQUE NULLS NOT DISTINCT (org_id, dataset_id, document_id, branch, release_id),
  CONSTRAINT heads_fk1 FOREIGN KEY (org_id, dataset_id, document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT heads_fk2 FOREIGN KEY (org_id, dataset_id, document_id, revision_id) REFERENCES cms.revisions (org_id, dataset_id, document_id, id) ON DELETE RESTRICT,
  CONSTRAINT heads_fk3 FOREIGN KEY (org_id, dataset_id, release_id) REFERENCES cms.releases (org_id, dataset_id, id) ON DELETE RESTRICT
);
CREATE INDEX heads_fk1_idx ON cms.heads (org_id, dataset_id, document_id);
CREATE INDEX heads_fk2_idx ON cms.heads (org_id, dataset_id, document_id, revision_id);
CREATE INDEX heads_fk3_idx ON cms.heads (org_id, dataset_id, release_id);


CREATE TABLE cms.reference_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  source_revision_id uuid NOT NULL,
  path text NOT NULL,
  strong boolean NOT NULL,
  target_document_id uuid,
  weak_target_external_id text,
  CHECK ((strong AND target_document_id IS NOT NULL AND weak_target_external_id IS NULL) OR (NOT strong AND target_document_id IS NULL AND weak_target_external_id IS NOT NULL)),
  UNIQUE (org_id, dataset_id, source_revision_id, path),
  CONSTRAINT reference_edges_fk1 FOREIGN KEY (org_id, dataset_id, source_revision_id) REFERENCES cms.revisions (org_id, dataset_id, id) ON DELETE CASCADE,
  CONSTRAINT reference_edges_fk2 FOREIGN KEY (org_id, dataset_id, target_document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT
);
CREATE INDEX reference_edges_fk1_idx ON cms.reference_edges (org_id, dataset_id, source_revision_id);
CREATE INDEX reference_edges_fk2_idx ON cms.reference_edges (org_id, dataset_id, target_document_id);


CREATE TABLE cms.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  object_key text NOT NULL,
  sha256 text NOT NULL,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  status text NOT NULL CHECK (status IN ('pending','ready','rejected','deleted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (org_id, id),
  UNIQUE (org_id, project_id, object_key),
  CONSTRAINT assets_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX assets_fk1_idx ON cms.assets (org_id, project_id);


CREATE TABLE cms.document_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  revision_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  path text NOT NULL,
  UNIQUE (org_id, dataset_id, revision_id, path),
  CONSTRAINT document_assets_fk1 FOREIGN KEY (org_id, dataset_id, revision_id) REFERENCES cms.revisions (org_id, dataset_id, id) ON DELETE CASCADE,
  CONSTRAINT document_assets_fk2 FOREIGN KEY (org_id, asset_id) REFERENCES cms.assets (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX document_assets_fk1_idx ON cms.document_assets (org_id, dataset_id, revision_id);
CREATE INDEX document_assets_fk2_idx ON cms.document_assets (org_id, asset_id);


CREATE TABLE cms.release_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  release_id uuid NOT NULL,
  document_id uuid NOT NULL,
  target_revision_id uuid,
  previous_revision_id uuid,
  expected_published_revision_id uuid,
  action text NOT NULL CHECK (action IN ('publish','unpublish')),
  CHECK ((action = 'publish') = (target_revision_id IS NOT NULL)),
  UNIQUE (org_id, dataset_id, release_id, document_id),
  CONSTRAINT release_entries_fk1 FOREIGN KEY (org_id, dataset_id, release_id) REFERENCES cms.releases (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT release_entries_fk2 FOREIGN KEY (org_id, dataset_id, document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT release_entries_fk3 FOREIGN KEY (org_id, dataset_id, document_id, target_revision_id) REFERENCES cms.revisions (org_id, dataset_id, document_id, id) ON DELETE RESTRICT,
  CONSTRAINT release_entries_fk4 FOREIGN KEY (org_id, dataset_id, document_id, previous_revision_id) REFERENCES cms.revisions (org_id, dataset_id, document_id, id) ON DELETE RESTRICT,
  CONSTRAINT release_entries_fk5 FOREIGN KEY (org_id, dataset_id, document_id, expected_published_revision_id) REFERENCES cms.revisions (org_id, dataset_id, document_id, id) ON DELETE RESTRICT
);
CREATE INDEX release_entries_fk1_idx ON cms.release_entries (org_id, dataset_id, release_id);
CREATE INDEX release_entries_fk2_idx ON cms.release_entries (org_id, dataset_id, document_id);
CREATE INDEX release_entries_fk3_idx ON cms.release_entries (org_id, dataset_id, document_id, target_revision_id);
CREATE INDEX release_entries_fk4_idx ON cms.release_entries (org_id, dataset_id, document_id, previous_revision_id);
CREATE INDEX release_entries_fk5_idx ON cms.release_entries (org_id, dataset_id, document_id, expected_published_revision_id);


CREATE TABLE cms.scheduled_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  release_id uuid NOT NULL,
  run_at timestamptz NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed','cancelled')),
  UNIQUE (org_id, dataset_id, release_id),
  CONSTRAINT scheduled_actions_fk1 FOREIGN KEY (org_id, dataset_id, release_id) REFERENCES cms.releases (org_id, dataset_id, id) ON DELETE RESTRICT
);
CREATE INDEX scheduled_actions_fk1_idx ON cms.scheduled_actions (org_id, dataset_id, release_id);
CREATE INDEX scheduled_due_idx ON cms.scheduled_actions (run_at) WHERE status = 'pending';

CREATE TABLE cms.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  document_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  field_path text,
  body text NOT NULL,
  resolved_at timestamptz,
  CONSTRAINT comments_fk1 FOREIGN KEY (org_id, dataset_id, document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT comments_fk2 FOREIGN KEY (author_user_id) REFERENCES cms.users (id) ON DELETE RESTRICT
);
CREATE INDEX comments_fk1_idx ON cms.comments (org_id, dataset_id, document_id);
CREATE INDEX comments_fk2_idx ON cms.comments (author_user_id);


CREATE TABLE cms.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  document_id uuid NOT NULL,
  assignee_user_id uuid,
  status text NOT NULL CHECK (status IN ('todo','in_progress','done')),
  title text NOT NULL,
  due_at timestamptz,
  CONSTRAINT tasks_fk1 FOREIGN KEY (org_id, dataset_id, document_id) REFERENCES cms.documents (org_id, dataset_id, id) ON DELETE RESTRICT,
  CONSTRAINT tasks_fk2 FOREIGN KEY (assignee_user_id) REFERENCES cms.users (id) ON DELETE SET NULL
);
CREATE INDEX tasks_fk1_idx ON cms.tasks (org_id, dataset_id, document_id);
CREATE INDEX tasks_fk2_idx ON cms.tasks (assignee_user_id);


CREATE TABLE cms.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  url text NOT NULL,
  secret_ciphertext bytea NOT NULL,
  filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (org_id, id),
  CONSTRAINT webhook_endpoints_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX webhook_endpoints_fk1_idx ON cms.webhook_endpoints (org_id, project_id);


CREATE TABLE cms.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  event_type text NOT NULL,
  generation bigint NOT NULL,
  payload jsonb NOT NULL,
  dispatched_at timestamptz,
  UNIQUE (org_id, id),
  CONSTRAINT outbox_events_fk1 FOREIGN KEY (org_id, dataset_id) REFERENCES cms.datasets (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX outbox_events_fk1_idx ON cms.outbox_events (org_id, dataset_id);
CREATE INDEX outbox_pending_idx ON cms.outbox_events (created_at, id) WHERE dispatched_at IS NULL;

CREATE TABLE cms.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  endpoint_id uuid NOT NULL,
  event_id uuid NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  status text NOT NULL CHECK (status IN ('pending','running','done','dead')),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  UNIQUE (org_id, endpoint_id, event_id),
  CONSTRAINT webhook_deliveries_fk1 FOREIGN KEY (org_id, endpoint_id) REFERENCES cms.webhook_endpoints (org_id, id) ON DELETE RESTRICT,
  CONSTRAINT webhook_deliveries_fk2 FOREIGN KEY (org_id, event_id) REFERENCES cms.outbox_events (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX webhook_deliveries_fk1_idx ON cms.webhook_deliveries (org_id, endpoint_id);
CREATE INDEX webhook_deliveries_fk2_idx ON cms.webhook_deliveries (org_id, event_id);
CREATE INDEX webhook_due_idx ON cms.webhook_deliveries (next_attempt_at) WHERE status IN ('pending','running');

CREATE TABLE cms.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','dead','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  run_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  result jsonb,
  UNIQUE (org_id, project_id, kind, dedupe_key),
  CONSTRAINT jobs_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX jobs_fk1_idx ON cms.jobs (org_id, project_id);
CREATE INDEX jobs_due_idx ON cms.jobs (run_at) WHERE status IN ('pending','running');

CREATE TABLE cms.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  resource_id uuid,
  request_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_events_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT,
  CONSTRAINT audit_events_fk2 FOREIGN KEY (actor_user_id) REFERENCES cms.users (id) ON DELETE RESTRICT
);
CREATE INDEX audit_events_fk1_idx ON cms.audit_events (org_id, project_id);
CREATE INDEX audit_events_fk2_idx ON cms.audit_events (actor_user_id);
CREATE INDEX audit_time_idx ON cms.audit_events (org_id, project_id, created_at, id);

CREATE TABLE cms.usage_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  metric text NOT NULL,
  quantity bigint NOT NULL CHECK (quantity >= 0),
  UNIQUE (org_id, project_id, period_start, metric),
  CONSTRAINT usage_buckets_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX usage_buckets_fk1_idx ON cms.usage_buckets (org_id, project_id);


CREATE TABLE cms.spending_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  threshold_minor bigint NOT NULL CHECK (threshold_minor > 0),
  currency char(3) NOT NULL,
  last_notified_period date,
  UNIQUE (org_id, project_id, threshold_minor, currency),
  CONSTRAINT spending_alerts_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX spending_alerts_fk1_idx ON cms.spending_alerts (org_id, project_id);


CREATE TABLE cms.collab_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  head_id uuid NOT NULL,
  epoch bigint NOT NULL CHECK (epoch > 0),
  state bytea NOT NULL,
  last_sequence bigint NOT NULL DEFAULT 0,
  UNIQUE (org_id, dataset_id, head_id),
  CONSTRAINT collab_snapshots_fk1 FOREIGN KEY (org_id, dataset_id, head_id) REFERENCES cms.heads (org_id, dataset_id, id) ON DELETE RESTRICT
);
CREATE INDEX collab_snapshots_fk1_idx ON cms.collab_snapshots (org_id, dataset_id, head_id);


CREATE TABLE cms.collab_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  dataset_id uuid NOT NULL,
  head_id uuid NOT NULL,
  epoch bigint NOT NULL,
  sequence bigint NOT NULL,
  client_update_id uuid NOT NULL,
  update_bytes bytea NOT NULL,
  UNIQUE (org_id, dataset_id, head_id, epoch, sequence),
  UNIQUE (org_id, dataset_id, head_id, epoch, client_update_id),
  CONSTRAINT collab_updates_fk1 FOREIGN KEY (org_id, dataset_id, head_id) REFERENCES cms.heads (org_id, dataset_id, id) ON DELETE RESTRICT
);
CREATE INDEX collab_updates_fk1_idx ON cms.collab_updates (org_id, dataset_id, head_id);


CREATE TABLE cms.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  org_id uuid NOT NULL,
  project_id uuid NOT NULL,
  principal_key text NOT NULL,
  operation text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE (org_id, project_id, principal_key, operation, key),
  CONSTRAINT idempotency_keys_fk1 FOREIGN KEY (org_id, project_id) REFERENCES cms.projects (org_id, id) ON DELETE RESTRICT
);
CREATE INDEX idempotency_keys_fk1_idx ON cms.idempotency_keys (org_id, project_id);
CREATE INDEX idempotency_expiry_idx ON cms.idempotency_keys (expires_at);

CREATE FUNCTION cms.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE FUNCTION cms.reject_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable record: append a new version'; END;
$$;
CREATE TRIGGER users_update BEFORE UPDATE ON cms.users FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER organizations_update BEFORE UPDATE ON cms.organizations FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER projects_update BEFORE UPDATE ON cms.projects FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER datasets_update BEFORE UPDATE ON cms.datasets FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER roles_update BEFORE UPDATE ON cms.roles FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER memberships_update BEFORE UPDATE ON cms.memberships FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER sessions_update BEFORE UPDATE ON cms.sessions FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER api_tokens_update BEFORE UPDATE ON cms.api_tokens FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER cors_origins_update BEFORE UPDATE ON cms.cors_origins FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER schema_versions_update BEFORE UPDATE ON cms.schema_versions FOR EACH ROW EXECUTE FUNCTION cms.reject_update();
CREATE TRIGGER documents_update BEFORE UPDATE ON cms.documents FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER revisions_update BEFORE UPDATE ON cms.revisions FOR EACH ROW EXECUTE FUNCTION cms.reject_update();
CREATE TRIGGER releases_update BEFORE UPDATE ON cms.releases FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER heads_update BEFORE UPDATE ON cms.heads FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER reference_edges_update BEFORE UPDATE ON cms.reference_edges FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER assets_update BEFORE UPDATE ON cms.assets FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER document_assets_update BEFORE UPDATE ON cms.document_assets FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER release_entries_update BEFORE UPDATE ON cms.release_entries FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER scheduled_actions_update BEFORE UPDATE ON cms.scheduled_actions FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER comments_update BEFORE UPDATE ON cms.comments FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER tasks_update BEFORE UPDATE ON cms.tasks FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER webhook_endpoints_update BEFORE UPDATE ON cms.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER outbox_events_update BEFORE UPDATE ON cms.outbox_events FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER webhook_deliveries_update BEFORE UPDATE ON cms.webhook_deliveries FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER jobs_update BEFORE UPDATE ON cms.jobs FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER audit_events_update BEFORE UPDATE ON cms.audit_events FOR EACH ROW EXECUTE FUNCTION cms.reject_update();
CREATE TRIGGER usage_buckets_update BEFORE UPDATE ON cms.usage_buckets FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER spending_alerts_update BEFORE UPDATE ON cms.spending_alerts FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER collab_snapshots_update BEFORE UPDATE ON cms.collab_snapshots FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();
CREATE TRIGGER collab_updates_update BEFORE UPDATE ON cms.collab_updates FOR EACH ROW EXECUTE FUNCTION cms.reject_update();
CREATE TRIGGER idempotency_keys_update BEFORE UPDATE ON cms.idempotency_keys FOR EACH ROW EXECUTE FUNCTION cms.touch_updated_at();

-- RESTRICT obliga a purga explícita y ordenada. El rol runtime no tendrá DELETE
-- sobre revisiones/esquemas/auditoría; purga con rol separado y política de retención.
-- Reglas entre filas (autorizar miembros, tipo de esquema, activo y referencias
-- publicables, fase del lanzamiento) se validan en servicio bajo transacción.
-- Referencias fuertes históricas retienen destinos físicos; tombstones conservan
-- identidad. Las débiles no tienen FK al destino y pueden quedar sin resolver.
COMMIT;
