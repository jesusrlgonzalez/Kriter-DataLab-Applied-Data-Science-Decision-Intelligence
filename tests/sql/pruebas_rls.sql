-- Kriter DataLab - Banco de pruebas de aislamiento en SQL.
-- Se ejecuta con un rol capaz de SET ROLE (postgres). Crea dos funciones de
-- apoyo en el esquema app y devuelve una observacion por perfil.
-- Requiere los usuarios de QA creados con supabase/qa/crear_usuarios_prueba.sql.

create or replace function app.become(p_email text) returns void
language plpgsql as $$
declare v_id uuid;
begin
  perform set_config('role', 'none', true);
  if p_email is null then
    perform set_config('request.jwt.claims', '', true);
    perform set_config('role', 'anon', true);
  else
    select id into v_id from auth.users where email = p_email;
    if v_id is null then raise exception 'usuario de prueba inexistente: %', p_email; end if;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_id::text, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end;
$$;

-- No puede ser SECURITY DEFINER: PostgreSQL prohibe cambiar de rol dentro de
-- una funcion con definidor, y sin cambiar de rol la RLS no se evaluaria.
create or replace function app.observe(p_email text, p_forbidden text) returns jsonb
language plpgsql as $$
declare o jsonb := '{}'::jsonb; n bigint; v numeric; t text; fid smallint;
begin
  select id into fid from public.regions where name = p_forbidden;

  perform app.become(p_email);
  select count(*), coalesce(sum(value),0) into n, v from public.sales;
  o := o || jsonb_build_object('filas', n, 'valor', round(v,2));

  perform app.become(p_email);
  select coalesce(string_agg(name, ', ' order by name), '') into t from public.regions;
  o := o || jsonb_build_object('areas', t);

  perform app.become(p_email);
  begin o := o || jsonb_build_object('dashboard_total', (public.kriter_dashboard()->'kpi'->>'sales'));
  exception when others then o := o || jsonb_build_object('dashboard_total', 'ERROR:' || sqlstate); end;

  perform app.become(p_email);
  begin perform public.kriter_dashboard(p_forbidden);
    o := o || jsonb_build_object('area_ajena_rpc', 'PERMITIDO');
  exception when others then o := o || jsonb_build_object('area_ajena_rpc', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  select count(*) into n from public.sales where region_id = fid;
  o := o || jsonb_build_object('filas_area_ajena_directa', n);

  perform app.become(p_email);
  begin
    insert into public.user_roles (user_id, role_id)
      select u.id, r.id from auth.users u, public.roles r
      where u.email = coalesce(p_email, 'qa-sinacceso@example.com') and r.code = 'administrador';
    o := o || jsonb_build_object('escalamiento_rol', 'PERMITIDO');
  exception when others then o := o || jsonb_build_object('escalamiento_rol', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  begin
    insert into public.user_regions (user_id, region_id)
      select u.id, fid from auth.users u where u.email = coalesce(p_email, 'qa-sinacceso@example.com');
    o := o || jsonb_build_object('autoasignar_area', 'PERMITIDO');
  exception when others then o := o || jsonb_build_object('autoasignar_area', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  begin select jsonb_array_length(public.kriter_export_products()) into n;
    o := o || jsonb_build_object('export', n::text);
  exception when others then o := o || jsonb_build_object('export', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  begin o := o || jsonb_build_object('escenario', (public.kriter_scenario()->>'base'));
  exception when others then o := o || jsonb_build_object('escenario', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  begin select count(*) into n from public.security_audit;
    o := o || jsonb_build_object('bitacora_filas', n::text);
  exception when others then o := o || jsonb_build_object('bitacora_filas', 'DENEGADO:' || sqlstate); end;

  perform app.become(p_email);
  select count(*) into n from public.profiles;
  o := o || jsonb_build_object('perfiles_visibles', n);

  perform set_config('role', 'none', true);
  return o;
end;
$$;

select 'anon'          as perfil, app.observe(null, 'Sureste') as observacion
union all select 'sin autorizacion', app.observe('qa-sinacceso@example.com', 'Sureste')
union all select 'regional',        app.observe('qa-regional@example.com', 'Sureste')
union all select 'analista',        app.observe('qa-analista@example.com', 'Metropolitana')
union all select 'auditor',         app.observe('qa-auditor@example.com', 'Sureste')
union all select 'administrador',   app.observe('qa-administrador@example.com', 'Sureste');

-- Resultado esperado (12-nov-2026, datos sinteticos de demostracion):
--   anon y sin autorizacion : 3,360 filas  · solo Norte · export, escenario y bitacora DENEGADOS
--   regional                : 6,720 filas  · Metropolitana y Norte · escenario permitido
--   analista                : 6,720 filas  · Norte y Sureste        · escenario permitido
--   auditor                 : 10,080 filas · Bajio, Centro y Norte  · escenario DENEGADO, bitacora permitida
--   administrador           : 20,160 filas · seis areas
-- En todos los perfiles: escalamiento_rol y autoasignar_area DENEGADO:42501
--                        filas_area_ajena_directa = 0 (salvo administrador).
