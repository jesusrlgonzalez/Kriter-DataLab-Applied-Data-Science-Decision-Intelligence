-- Busqueda y paginacion en el servidor: el navegador no descarga el catalogo
-- completo para filtrarlo despues.

drop function if exists public.kriter_dashboard(text,int,text,text,date,date,int,text);

create or replace function public.kriter_dashboard(
  p_region text default null, p_year int default null, p_segment text default null,
  p_brand text default null, p_from date default null, p_to date default null,
  p_limit int default 25, p_offset int default 0, p_sort text default 'valor',
  p_search text default null) returns jsonb
language plpgsql stable as $$
declare
  v_region smallint; v_out jsonb;
  v_limit  int := least(greatest(coalesce(p_limit, 25), 1), 350);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
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
  prod_all as (
    select item_code, product_name, brand, segment,
           round(sum(value), 4) as value, sum(units) as units, count(*) as records
    from f group by 1,2,3,4
  ),
  prod as (
    select * from prod_all
    where v_search is null
       or product_name ilike '%' || v_search || '%'
       or item_code    ilike '%' || v_search || '%'
       or brand        ilike '%' || v_search || '%'
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
                       limit v_limit offset v_offset) t),
    'products_total',   (select count(*) from prod),
    'products_catalog', (select count(*) from prod_all),
    'scope', jsonb_build_object('region', p_region, 'year', p_year, 'segment', p_segment,
                                'brand', p_brand, 'from', p_from, 'to', p_to,
                                'sort', case when p_sort = 'unidades' then 'unidades' else 'valor' end,
                                'limit', v_limit, 'offset', v_offset, 'search', v_search)
  ) into v_out;
  return v_out;
end;
$$;

revoke all on function public.kriter_dashboard(text,int,text,text,date,date,int,int,text,text) from public;
grant execute on function public.kriter_dashboard(text,int,text,text,date,date,int,int,text,text) to anon, authenticated;
