-- El antiguo dueño global conserva su acceso como Super Admin.
alter table cms.users add column role text not null default 'site_owner'
  check (role in ('super_admin', 'admin', 'site_owner'));
update cms.users set role = 'super_admin' where is_owner;
alter table cms.users add column created_by bigint references cms.users(id);
-- Compatibilidad con herramientas anteriores: is_owner solo significa Super Admin.
alter table cms.users add constraint users_role_owner_consistent
  check (is_owner = (role = 'super_admin'));
create index site_members_user_idx on cms.site_members(user_id);
