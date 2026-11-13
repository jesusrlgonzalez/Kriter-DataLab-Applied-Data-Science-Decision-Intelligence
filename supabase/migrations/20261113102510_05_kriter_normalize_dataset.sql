-- Normaliza el area de preparacion hacia el modelo relacional definitivo.

insert into public.products (item_code, name, segment, brand)
select distinct s.item_code, s.producto, s.segmento, s.marca
from app.stage_sales s
on conflict (item_code) do nothing;

insert into public.sales (region_id, product_id, sale_date, week_label, year, value, units)
select r.id, p.id, s.fecha, s.semana, s.anio, s.ventas_valor, s.ventas_unidades
from app.stage_sales s
join public.regions  r on r.name = s.region
join public.products p on p.item_code = s.item_code
on conflict (region_id, product_id, sale_date) do nothing;

-- Cifras de control esperadas: 20,160 filas - 350 productos - 6 areas -
-- 80 semanas - suma de value 48,820,590.6720 - suma de units 473,632.
