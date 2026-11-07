-- Las contraseñas se verifican dentro de Postgres (bcrypt de pgcrypto): el plan gratuito de Workers solo da 10 ms de CPU.
create extension if not exists pgcrypto;
-- Los hashes PBKDF2 anteriores ya no sirven: cada persona vuelve a crear su contraseña con npm run user.
delete from cms.sessions;
update cms.users set password_hash = '!' || password_hash where password_hash like 'pbkdf2%';
