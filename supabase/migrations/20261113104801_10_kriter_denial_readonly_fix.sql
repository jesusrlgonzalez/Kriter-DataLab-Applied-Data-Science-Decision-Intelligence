-- Las funciones analiticas son STABLE y PostgREST las ejecuta en una
-- transaccion de solo lectura. Un INSERT en la bitacora falla antes de la
-- denegacion y devuelve 405/25006 en lugar de 403/42501. En esas rutas se
-- registra solo en el log del servidor, que no escribe tablas.

create or replace function app.note_denial(p_event text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise log 'kriter_seguridad evento=% usuario=% detalle=%',
    p_event, coalesce((select auth.uid())::text, 'anonimo'), coalesce(p_detail, '{}'::jsonb);
end;
$$;
revoke all on function app.note_denial(text, jsonb) from public;
grant execute on function app.note_denial(text, jsonb) to anon, authenticated;

create or replace function app.resolve_region(p_region text) returns smallint
language plpgsql stable as $$
declare v_id smallint;
begin
  if p_region is null or p_region = '' then return null; end if;
  select id into v_id from public.regions where name = p_region;
  if v_id is null then
    perform app.note_denial('area_no_autorizada', jsonb_build_object('area_solicitada', p_region));
    raise exception 'El area solicitada no esta autorizada para tu perfil' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

create or replace function public.kriter_scenario(
  p_region text default null, p_year int default null, p_segment text default null,
  p_brand text default null, p_from date default null, p_to date default null,
  p_window int default 8, p_horizon int default 4, p_pct numeric default 0.18) returns jsonb
language plpgsql stable as $$
declare v_region smallint; v_base numeric; v_weeks int;
        v_w int := least(greatest(coalesce(p_window, 8), 1), 80);
        v_h int := least(greatest(coalesce(p_horizon, 4), 1), 52);
        v_p numeric := least(greatest(coalesce(p_pct, 0.18), 0), 1);
begin
  if not app.has_capability('scenarios') then
    perform app.note_denial('escenario_denegado', jsonb_build_object('area_solicitada', p_region));
    raise exception 'Tu perfil no incluye la simulacion de escenarios' using errcode = '42501';
  end if;
  v_region := app.resolve_region(p_region);
  with f as (
    select s.week_label, s.sale_date, s.value
    from public.sales s
    join public.products p on p.id = s.product_id
    join public.regions  r on r.id = s.region_id
    where (v_region is null or s.region_id = v_region)
      and (p_year    is null or s.year = p_year::smallint)
      and (p_segment is null or p_segment = '' or p.segment = p_segment)
      and (p_brand   is null or p_brand   = '' or p.brand   = p_brand)
      and (p_from    is null or s.sale_date >= p_from)
      and (p_to      is null or s.sale_date <= p_to)
  ),
  w as (select week_label, min(sale_date) d, sum(value) v from f group by 1 order by 2 desc limit v_w)
  select coalesce(avg(v), 0), count(*) into v_base, v_weeks from w;
  return jsonb_build_object(
    'weekly_average', round(v_base, 4), 'weeks_used', v_weeks, 'window_requested', v_w, 'horizon', v_h,
    'pct', v_p, 'base', round(v_base * v_h, 4),
    'low',  round(v_base * v_h * (1 - v_p), 4),
    'high', round(v_base * v_h * (1 + v_p), 4),
    'note', 'Analisis de sensibilidad sobre promedios observados. No es un pronostico estadisticamente validado.');
end;
$$;

create or replace function public.kriter_export_products(
  p_region text default null, p_year int default null, p_segment text default null,
  p_brand text default null, p_from date default null, p_to date default null)
returns table (area text, codigo text, producto text, marca text, segmento text, valor numeric, unidades bigint, registros bigint)
language plpgsql stable as $$
declare v_region smallint;
begin
  if not app.has_capability('export') then
    perform app.note_denial('exportacion_denegada', jsonb_build_object('area_solicitada', p_region));
    raise exception 'Tu perfil no permite exportar datos' using errcode = '42501';
  end if;
  v_region := app.resolve_region(p_region);
  return query
    select r.name, p.item_code, p.name, p.brand, p.segment,
           round(sum(s.value), 4), sum(s.units)::bigint, count(*)::bigint
    from public.sales s
    join public.products p on p.id = s.product_id
    join public.regions  r on r.id = s.region_id
    where (v_region is null or s.region_id = v_region)
      and (p_year    is null or s.year = p_year::smallint)
      and (p_segment is null or p_segment = '' or p.segment = p_segment)
      and (p_brand   is null or p_brand   = '' or p.brand   = p_brand)
      and (p_from    is null or s.sale_date >= p_from)
      and (p_to      is null or s.sale_date <= p_to)
    group by 1,2,3,4,5
    order by 6 desc, 2;
end;
$$;
