# Manual de administración

Todas las operaciones privilegiadas se realizan **en el servidor**: panel de
Supabase (editor SQL) o un proceso con la clave de servicio. Nunca desde el
navegador de la aplicación ni con la clave publicable.

## Alta de una persona

1. Panel de Supabase → **Authentication → Users → Add user** (con correo
   confirmado). El disparador `app.handle_new_user` crea su perfil.
2. Asignar rol y áreas:

   ```sql
   -- Rol
   insert into public.user_roles (user_id, role_id)
   select u.id, r.id from auth.users u, public.roles r
   where u.email = 'persona@empresa.com' and r.code = 'regional';

   -- Áreas
   insert into public.user_regions (user_id, region_id)
   select u.id, g.id from auth.users u, public.regions g
   where u.email = 'persona@empresa.com' and g.name in ('Metropolitana', 'Norte');
   ```

El administrador no necesita áreas: su rol tiene `global_scope`.

## Revocar un acceso

```sql
delete from public.user_regions
where user_id = (select id from auth.users where email = 'persona@empresa.com');

delete from public.user_roles
where user_id = (select id from auth.users where email = 'persona@empresa.com');
```

El cambio surte efecto en la siguiente consulta: no hay caché de política. Para
cortar la sesión de inmediato, elimina también al usuario en **Authentication**.

## Consultar quién tiene qué

```sql
select u.email,
       coalesce(string_agg(distinct r.code, ','), 'sin rol')        as rol,
       coalesce(string_agg(distinct g.name, ', '), 'sin areas')     as areas
from auth.users u
left join public.user_roles   ur on ur.user_id = u.id
left join public.roles        r  on r.id = ur.role_id
left join public.user_regions ug on ug.user_id = u.id
left join public.regions      g  on g.id = ug.region_id
group by u.email order by u.email;
```

## Cambiar el área pública

```sql
update public.regions set is_public = false;
update public.regions set is_public = true where name = 'Norte';
```

Con `is_public = false` en todas las áreas, un visitante anónimo no ve ningún
registro: la aplicación muestra el tablero vacío y la invitación a iniciar sesión.

## Revisar la bitácora

```sql
select occurred_at, event, origen, detail
from public.security_audit order by occurred_at desc limit 100;
```

Las denegaciones que revierten la transacción no aparecen aquí: están en
**Logs → Postgres** del panel, con el prefijo `kriter_seguridad`.

## Respaldo y restauración

- **Esquema y políticas:** están en `supabase/migrations/`. Un proyecto nuevo se
  reconstruye aplicándolas en orden.
- **Datos:** el dataset sintético se regenera con `python tools/generate_data.py`
  y se carga con `tools/cargar_dataset.mjs`.
- **Asignaciones:** respáldalas con una consulta periódica:

  ```sql
  select u.email, r.code as rol, g.name as area
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  join public.roles r on r.id = ur.role_id
  left join public.user_regions ug on ug.user_id = u.id
  left join public.regions g on g.id = ug.region_id;
  ```

- El plan gratuito **no incluye respaldos automáticos con retención larga**:
  exporta periódicamente o asume la pérdida ante un incidente.

## Rotación de credenciales

| Credencial | Dónde vive | Cuándo rotarla |
|---|---|---|
| Clave publicable | `supabase/public_config.json` y el artefacto | Solo si se compromete el proyecto |
| Clave de servicio | Nunca en el repositorio | Ante cualquier sospecha |
| `HF_TOKEN` | Secretos de GitHub Actions | Cada vez que cambie el alcance del Space |
| Contraseñas de QA | Fuera del repositorio | Antes de usar datos no sintéticos |

## Habilitar GitHub como proveedor de acceso

1. Panel de Supabase → **Authentication → Providers → GitHub**: activar y pegar
   *Client ID* y *Client secret* de una OAuth App de GitHub.
2. En la OAuth App de GitHub, *Authorization callback URL*:
   `https://<ref>.supabase.co/auth/v1/callback`.
3. En Supabase → **Authentication → URL Configuration**, añadir la URL del Space
   a *Redirect URLs*.
4. Compilar con `SUPABASE_GITHUB_OAUTH=1` o poner `"github_oauth": true` en
   `supabase/public_config.json` para mostrar el botón.
