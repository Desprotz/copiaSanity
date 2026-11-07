-- Dirección pública de cada web (la tienda, el portal...). El editor la usa en «Ver el sitio».
alter table cms.sites add column public_url text check (public_url is null or public_url ~ '^https://[a-z0-9.-]+(/.*)?$');
