-- 14 · Reduccion de la superficie del canal de bitacora
-- Kriter DataLab · Jesus R.L. Gonzalez · 2026
--
-- Motivo: el analizador de Supabase advierte que public.kriter_log_event es
-- SECURITY DEFINER y estaba disponible para el rol anon. Se conserva el
-- SECURITY DEFINER por diseno (la alternativa seria conceder INSERT sobre
-- public.security_audit, que permitiria escribir filas arbitrarias), pero se
-- reduce lo expuesto: solo identidades verificadas, lista cerrada de eventos,
-- fecha fijada por el servidor, detalle truncado y limite por hora.

revoke execute on function public.kriter_log_event(text, jsonb) from anon;

create or replace function public.kriter_log_event(p_event text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_n int; v_uid uuid := (select auth.uid()); v_detail jsonb := coalesce(p_detail, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Se requiere una sesion iniciada para reportar eventos' using errcode = '42501';
  end if;
  if p_event not in ('acceso_denegado','exportacion_denegada','escenario_denegado',
                     'sesion_iniciada','sesion_cerrada','sesion_expirada') then
    raise exception 'Evento no permitido' using errcode = '22023';
  end if;
  if length(v_detail::text) > 500 then v_detail := jsonb_build_object('truncado', true); end if;
  select count(*) into v_n from public.security_audit
   where occurred_at > now() - interval '1 hour' and user_id = v_uid and origen = 'cliente';
  if v_n >= 50 then return; end if;
  insert into public.security_audit (occurred_at, user_id, event, detail, origen)
  values (now(), v_uid, p_event, v_detail, 'cliente');
end;
$$;

comment on function public.kriter_log_event(text, jsonb) is
'Canal acotado para que la aplicacion reporte denegaciones recibidas. SECURITY DEFINER por diseno: la alternativa (conceder INSERT sobre security_audit) permitiria escribir filas arbitrarias. Solo identidades verificadas, lista cerrada de eventos, fecha fijada por el servidor y limite de 50 apuntes por usuario y hora. Riesgo aceptado y documentado en docs/MODELO_SEGURIDAD_RLS.md.';
