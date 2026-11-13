-- PostgREST aplica un limite de filas (max-rows) a las funciones que devuelven
-- conjuntos, de modo que la exportacion se truncaba en silencio a 1,000 filas y
-- su suma no cuadraba con el indicador del tablero. Al devolver un unico valor
-- jsonb la respuesta no se trunca y la exportacion queda completa.

drop function if exists public.kriter_export_products(text,int,text,text,date,date);

create or replace function public.kriter_export_products(
  p_region text default null, p_year int default null, p_segment text default null,
  p_brand text default null, p_from date default null, p_to date default null)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_region smallint; v_out jsonb;
begin
  if not app.has_capability('export') then
    perform app.note_denial('exportacion_denegada', jsonb_build_object('area_solicitada', p_region));
    raise exception 'Tu perfil no permite exportar datos' using errcode = '42501';
  end if;
  v_region := app.resolve_region(p_region);
  select coalesce(jsonb_agg(t order by t.valor desc, t.codigo), '[]'::jsonb) into v_out
  from (
    select r.name as area, p.item_code as codigo, p.name as producto, p.brand as marca,
           p.segment as segmento, round(sum(s.value), 4) as valor,
           sum(s.units)::bigint as unidades, count(*)::bigint as registros
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
  ) t;
  return v_out;
end;
$$;

revoke all on function public.kriter_export_products(text,int,text,text,date,date) from public;
grant execute on function public.kriter_export_products(text,int,text,text,date,date) to anon, authenticated;
