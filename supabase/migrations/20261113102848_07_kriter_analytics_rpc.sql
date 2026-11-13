-- Kriter DataLab - 07 API analitica.
-- Todas las funciones son SECURITY INVOKER: la RLS de public.sales se aplica
-- dentro de la agregacion, de modo que no existe ninguna ruta que la eluda.

grant usage on schema app to anon, authenticated;
grant execute on function app.log_security_event(text, jsonb) to anon, authenticated;

create or replace function public.kriter_session_context() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'authenticated', (select auth.uid()) is not null,
    'user_id',       (select auth.uid()),
    'display_name',  (select p.display_name from public.profiles p where p.id = (select auth.uid())),
    'email',         (select p.email        from public.profiles p where p.id = (select auth.uid())),
    'role',          (select r.code from public.user_roles ur join public.roles r on r.id = ur.role_id
                       where ur.user_id = (select auth.uid()) order by r.global_scope desc, r.code limit 1),
    'role_name',     (select r.name from public.user_roles ur join public.roles r on r.id = ur.role_id
                       where ur.user_id = (select auth.uid()) order by r.global_scope desc, r.code limit 1),
    'is_admin',           app.is_admin(),
    'can_export',         app.has_capability('export'),
    'can_view_scenarios', app.has_capability('scenarios'),
    'can_read_audit',     app.has_capability('audit'),
    'regions', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'name', name, 'is_public', is_public)
                                          order by name), '[]'::jsonb) from public.regions)
  );
$$;

create or replace function public.kriter_filter_options() returns jsonb
language sql stable as $$
  with f as (
    select s.year, s.week_label, s.sale_date, p.segment, p.brand
    from public.sales s
    join public.products p on p.id = s.product_id
    join public.regions  r on r.id = s.region_id
  )
  select jsonb_build_object(
    'years',    (select coalesce(jsonb_agg(distinct year order by year), '[]'::jsonb) from f),
    'segments', (select coalesce(jsonb_agg(distinct segment order by segment), '[]'::jsonb) from f),
    'brands',   (select coalesce(jsonb_agg(distinct brand order by brand), '[]'::jsonb) from f),
    'weeks',    (select coalesce(jsonb_agg(jsonb_build_object('label', w.week_label, 'date', w.sale_date) order by w.sale_date), '[]'::jsonb)
                 from (select distinct week_label, sale_date from f) w)
  );
$$;

create or replace function app.resolve_region(p_region text) returns smallint
language plpgsql stable as $$
declare v_id smallint;
begin
  if p_region is null or p_region = '' then return null; end if;
  select id into v_id from public.regions where name = p_region;
  if v_id is null then
    perform app.log_security_event('area_no_autorizada', jsonb_build_object('area_solicitada', p_region));
    raise exception 'El area solicitada no esta autorizada' using errcode = '42501';
  end if;
  return v_id;
end;
$$;
grant execute on function app.resolve_region(text) to anon, authenticated;

create or replace function public.kriter_dashboard(
  p_region text default null, p_year int default null, p_segment text default null,
  p_brand text default null, p_from date default null, p_to date default null,
  p_limit int default 25, p_sort text default 'valor') returns jsonb
language plpgsql stable as $$
declare v_region smallint; v_out jsonb; v_limit int := least(greatest(coalesce(p_limit, 25), 1), 350);
begin
  v_region := app.resolve_region(p_region);
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'El periodo solicitado esta invertido' using errcode = '22007';
  end if;
  with f as (
    select s.region_id, s.product_id, s.sale_date, s.week_label, s.value, s.units,
           r.name as region_name, p.item_code, p.name as product_name, p.segment, p.brand
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
  prod as (
    select item_code, product_name, brand, segment,
           round(sum(value), 4) as value, sum(units) as units, count(*) as records
    from f group by 1,2,3,4
  )
  select jsonb_build_object(
    'kpi', (select jsonb_build_object(
              'sales',   round(coalesce(sum(value),0), 4),
              'units',   coalesce(sum(units),0),
              'records', count(*),
              'products', count(distinct product_id),
              'weeks',   count(distinct week_label),
              'weekly_average', case when count(distinct week_label) = 0 then 0
                                else round(sum(value) / count(distinct week_label), 4) end,
              'first_week', min(week_label), 'last_week', max(week_label)) from f),
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'week', w, 'value', v) order by d), '[]'::jsonb)
                 from (select sale_date d, week_label w, round(sum(value),4) v from f group by 1,2) t),
    'regions',  (select coalesce(jsonb_agg(jsonb_build_object('name', n, 'value', v) order by v desc, n), '[]'::jsonb)
                 from (select region_name n, round(sum(value),4) v from f group by 1) t),
    'segments', (select coalesce(jsonb_agg(jsonb_build_object('name', n, 'value', v) order by v desc, n), '[]'::jsonb)
                 from (select segment n, round(sum(value),4) v from f group by 1) t),
    'brands',   (select coalesce(jsonb_agg(jsonb_build_object('name', n, 'value', v) order by v desc, n), '[]'::jsonb)
                 from (select brand n, round(sum(value),4) v from f group by 1) t),
    'heatmap',  (select coalesce(jsonb_agg(jsonb_build_object('region', n, 'month', m, 'value', v) order by n, m), '[]'::jsonb)
                 from (select region_name n, to_char(sale_date,'YYYY-MM') m, round(sum(value),4) v from f group by 1,2) t),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('code', item_code, 'product', product_name, 'brand', brand,
                                                              'segment', segment, 'value', value, 'units', units, 'records', records)), '[]'::jsonb)
                 from (select * from prod
                       order by case when p_sort = 'unidades' then units else value end desc, item_code
                       limit v_limit) t),
    'products_total', (select count(*) from prod),
    'scope', jsonb_build_object('region', p_region, 'year', p_year, 'segment', p_segment,
                                'brand', p_brand, 'from', p_from, 'to', p_to,
                                'sort', case when p_sort = 'unidades' then 'unidades' else 'valor' end,
                                'limit', v_limit)
  ) into v_out;
  return v_out;
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
    perform app.log_security_event('escenario_denegado', jsonb_build_object('area_solicitada', p_region));
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
    perform app.log_security_event('exportacion_denegada', jsonb_build_object('area_solicitada', p_region));
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

revoke all on function public.kriter_session_context(), public.kriter_filter_options() from public;
revoke all on function public.kriter_dashboard(text,int,text,text,date,date,int,text) from public;
revoke all on function public.kriter_scenario(text,int,text,text,date,date,int,int,numeric) from public;
revoke all on function public.kriter_export_products(text,int,text,text,date,date) from public;
grant execute on function public.kriter_session_context(), public.kriter_filter_options() to anon, authenticated;
grant execute on function public.kriter_dashboard(text,int,text,text,date,date,int,text) to anon, authenticated;
grant execute on function public.kriter_scenario(text,int,text,text,date,date,int,int,numeric) to anon, authenticated;
grant execute on function public.kriter_export_products(text,int,text,text,date,date) to anon, authenticated;
