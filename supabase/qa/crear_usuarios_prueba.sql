-- Kriter DataLab - Identidades de prueba (QA). OPCIONAL y solo para entornos
-- de demostracion con datos sinteticos. Sustituye las contrasenas antes de usar.
-- Se crean en el servidor para no depender del envio de correo del plan gratuito.
-- Para un entorno con datos reales, crea los usuarios desde el panel de Supabase
-- y elimina estas cuentas: SELECT auth.uid() debe corresponder a personas reales.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_users jsonb := :'qa_users'::jsonb;  -- [{"email":...,"password":...,"name":...}]
  v_u     jsonb;
  v_id    uuid;
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
