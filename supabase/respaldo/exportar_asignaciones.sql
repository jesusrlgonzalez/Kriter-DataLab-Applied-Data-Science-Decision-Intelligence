-- Kriter DataLab - Respaldo de identidades, roles y areas.
--
-- El esquema se reconstruye con supabase/migrations/ y el dataset con
-- tools/generate_data.py, de modo que lo unico irrepetible son las
-- asignaciones de personas. Esta consulta genera el guion que las restaura.
--
-- Uso: ejecutar en el editor SQL, copiar el resultado y guardarlo con fecha
-- fuera del repositorio (contiene correos). Frecuencia sugerida: mensual y
-- despues de cada alta o baja.

select string_agg(linea, E'\n' order by orden, linea) as guion_restauracion
from (
  select 1 as orden,
    format('-- Respaldo de asignaciones Kriter DataLab · %s · %s perfiles',
           to_char(now(), 'YYYY-MM-DD HH24:MI'), (select count(*) from public.profiles)) as linea
  union all
  select 2, format(
    'insert into public.user_roles (user_id, role_id) select u.id, r.id from auth.users u, public.roles r where u.email = %L and r.code = %L on conflict do nothing;',
    u.email, r.code)
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  join public.roles r on r.id = ur.role_id
  union all
  select 3, format(
    'insert into public.user_regions (user_id, region_id) select u.id, g.id from auth.users u, public.regions g where u.email = %L and g.name = %L on conflict do nothing;',
    u.email, g.name)
  from public.user_regions ug
  join auth.users u on u.id = ug.user_id
  join public.regions g on g.id = ug.region_id
) t;

-- Verificacion posterior a una restauracion:
--   select u.email,
--          coalesce(string_agg(distinct r.code, ','), 'sin rol') as rol,
--          coalesce(string_agg(distinct g.name, ', '), 'sin areas') as areas
--   from auth.users u
--   left join public.user_roles ur on ur.user_id = u.id
--   left join public.roles r on r.id = ur.role_id
--   left join public.user_regions ug on ug.user_id = u.id
--   left join public.regions g on g.id = ug.region_id
--   group by u.email order by u.email;
