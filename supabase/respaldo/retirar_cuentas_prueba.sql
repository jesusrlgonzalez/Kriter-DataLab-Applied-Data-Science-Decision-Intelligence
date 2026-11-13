-- Kriter DataLab - Retirada de las identidades de prueba (QA).
--
-- Ejecutar ANTES de usar el proyecto con cualquier dato que no sea sintetico.
-- Al borrar el usuario, las asignaciones y el perfil se eliminan en cascada;
-- los apuntes de la bitacora conservan el identificador, ya huerfano.

-- 1. Revisar que se va a borrar
select u.email, u.created_at, u.last_sign_in_at
from auth.users u
where u.email like 'qa-%@example.com'
order by u.email;

-- 2. Borrar (descomentar para ejecutar)
-- delete from auth.users where email like 'qa-%@example.com';

-- 3. Comprobar que no queda ningun perfil ni asignacion huerfana
-- select (select count(*) from public.profiles)     as perfiles,
--        (select count(*) from public.user_roles)   as roles_asignados,
--        (select count(*) from public.user_regions) as areas_asignadas;
