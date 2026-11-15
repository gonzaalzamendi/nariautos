-- Base: extensiones y verificación del servidor.
-- El servidor de Next.js se identifica con un secreto (cabecera x-nari-server) cuyo hash
-- SHA-256 se guarda en private.config. Las políticas RLS solo abren las tablas a ese servidor.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
create table if not exists private.config (clave text primary key, valor text not null);
-- Cargar el hash una sola vez (no versionar el valor real):
--   insert into private.config values ('server_secret_sha256', '<sha256 del secreto>');

create or replace function private.es_servidor() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    encode(extensions.digest(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-nari-server', ''), 'sha256'), 'hex')
      = (select valor from private.config where clave = 'server_secret_sha256'),
    false);
$$;
grant usage on schema private to anon;
revoke all on function private.es_servidor() from public;
grant execute on function private.es_servidor() to anon;
