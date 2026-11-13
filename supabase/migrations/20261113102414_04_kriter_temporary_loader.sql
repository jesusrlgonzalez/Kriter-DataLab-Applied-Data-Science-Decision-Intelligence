-- TEMPORAL: canal de carga del dataset sintetico autorizado.
-- Protegido por token de un solo uso; se elimina en la migracion 06.

create table if not exists app.stage_sales (
  semana text, fecha date, anio smallint, region text, item_code text,
  producto text, segmento text, marca text,
  ventas_valor numeric(14,4), ventas_unidades integer
);

create table if not exists app.load_tokens (
  token text primary key,
  created_at timestamptz not null default now(),
  closed boolean not null default false
);

create or replace function public.kriter_stage_rows(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted integer;
begin
  if not exists (select 1 from app.load_tokens t where t.token = p_token and not t.closed) then
    perform app.log_security_event('carga_rechazada', jsonb_build_object('motivo', 'token invalido o cerrado'));
    raise exception 'Token de carga invalido o cerrado' using errcode = '28000';
  end if;
  insert into app.stage_sales (semana, fecha, anio, region, item_code, producto, segmento, marca, ventas_valor, ventas_unidades)
  select r."SEMANA", r."FECHA"::date, r."ANIO"::smallint, r."REGION", r."ITEM_CODE",
         r."PRODUCTO", r."SEGMENTO", r."MARCA", r."VENTAS_VALOR"::numeric, r."VENTAS_UNIDADES"::integer
  from jsonb_to_recordset(p_rows) as r(
    "SEMANA" text, "FECHA" text, "ANIO" text, "REGION" text, "ITEM_CODE" text,
    "PRODUCTO" text, "SEGMENTO" text, "MARCA" text, "VENTAS_VALOR" text, "VENTAS_UNIDADES" text);
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.kriter_stage_rows(text, jsonb) from public;
grant execute on function public.kriter_stage_rows(text, jsonb) to anon, authenticated;
