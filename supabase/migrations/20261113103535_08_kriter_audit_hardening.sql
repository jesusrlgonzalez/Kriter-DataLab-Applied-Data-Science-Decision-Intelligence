-- Correccion: una denegacion lanza excepcion y la transaccion se revierte, por
-- lo que el INSERT en security_audit se pierde. Se anade un registro en la
-- bitacora del servidor (raise log), que no se revierte, y un canal acotado
-- para que la aplicacion reporte la denegacion recibida.

alter table public.security_audit add column if not exists origen text not null default 'servidor'
  check (origen in ('servidor','cliente'));

create or replace function app.log_security_event(p_event text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise log 'kriter_seguridad evento=% usuario=% detalle=%',
    p_event, coalesce((select auth.uid())::text, 'anonimo'), coalesce(p_detail, '{}'::jsonb);
  insert into public.security_audit (user_id, event, detail, origen)
  values ((select auth.uid()), p_event, coalesce(p_detail, '{}'::jsonb), 'servidor');
end;
$$;

create or replace function public.kriter_log_event(p_event text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_n int; v_detail jsonb := coalesce(p_detail, '{}'::jsonb);
begin
  if p_event not in ('acceso_denegado','exportacion_denegada','escenario_denegado',
                     'sesion_iniciada','sesion_cerrada','sesion_expirada') then
    raise exception 'Evento no permitido' using errcode = '22023';
  end if;
  if length(v_detail::text) > 500 then v_detail := jsonb_build_object('truncado', true); end if;
  select count(*) into v_n from public.security_audit
   where occurred_at > now() - interval '1 hour'
     and user_id is not distinct from (select auth.uid())
     and origen = 'cliente';
  if v_n >= 50 then return; end if;
  insert into public.security_audit (user_id, event, detail, origen)
  values ((select auth.uid()), p_event, v_detail, 'cliente');
end;
$$;
revoke all on function public.kriter_log_event(text, jsonb) from public;
grant execute on function public.kriter_log_event(text, jsonb) to anon, authenticated;

comment on table public.security_audit is
  'Bitacora de seguridad. origen=servidor son eventos escritos por el servidor en transacciones que confirman; origen=cliente son denegaciones reportadas por la aplicacion. Las denegaciones que revierten la transaccion quedan ademas en el log de PostgreSQL (raise log).';
