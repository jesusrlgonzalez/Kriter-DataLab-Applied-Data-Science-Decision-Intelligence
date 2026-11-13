-- Kriter DataLab - Identidades de prueba (QA). OPCIONAL y solo para entornos de
-- demostracion con datos sinteticos.
--
-- Se crean en el servidor porque el plan gratuito limita el envio de correos de
-- confirmacion. SUSTITUYE las contrasenas antes de ejecutarlo y no las publiques.
-- Para un entorno con datos reales: crea los usuarios desde el panel de Supabase
-- y elimina estas cuentas.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_users jsonb := '[
    {"email":"qa-administrador@example.com","password":"CAMBIA_ESTA_CONTRASENA_1","name":"QA Administrador"},
    {"email":"qa-regional@example.com","password":"CAMBIA_ESTA_CONTRASENA_2","name":"QA Gerente regional"},
    {"email":"qa-analista@example.com","password":"CAMBIA_ESTA_CONTRASENA_3","name":"QA Analista"},
    {"email":"qa-auditor@example.com","password":"CAMBIA_ESTA_CONTRASENA_4","name":"QA Auditor"},
    {"email":"qa-sinacceso@example.com","password":"CAMBIA_ESTA_CONTRASENA_5","name":"QA Sin autorizacion"}
  ]'::jsonb;
  v_u jsonb; v_id uuid;
begin
  for v_u in select * from jsonb_array_elements(v_users) loop
    select id into v_id from auth.users where email = v_u->>'email';
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        v_u->>'email', extensions.crypt(v_u->>'password', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_u->>'name'), now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, identity_data, provider, provider_id,
                                   last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_id,
              jsonb_build_object('sub', v_id::text, 'email', v_u->>'email', 'email_verified', true),
              'email', v_id::text, now(), now(), now());
    end if;
  end loop;
end $$;

-- Asignacion de roles y areas (el trigger ya creo los perfiles).
with m(email, role_code) as (values
  ('qa-administrador@example.com','administrador'),
  ('qa-regional@example.com','regional'),
  ('qa-analista@example.com','analista'),
  ('qa-auditor@example.com','auditor'))
insert into public.user_roles (user_id, role_id)
select u.id, r.id from m join auth.users u on u.email = m.email
                         join public.roles r on r.code = m.role_code
on conflict do nothing;

with m(email, region_name) as (values
  ('qa-regional@example.com','Metropolitana'),
  ('qa-analista@example.com','Sureste'),
  ('qa-auditor@example.com','Centro'),
  ('qa-auditor@example.com','Bajío'))
insert into public.user_regions (user_id, region_id)
select u.id, g.id from m join auth.users u on u.email = m.email
                         join public.regions g on g.name = m.region_name
on conflict do nothing;
