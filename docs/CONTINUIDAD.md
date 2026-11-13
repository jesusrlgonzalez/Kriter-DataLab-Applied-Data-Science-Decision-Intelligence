# Continuidad operativa

**Kriter DataLab · versión con Supabase y RLS** · Jesus R.L. Gonzalez · 2026

## 1. Qué hay que poder recuperar

| Elemento | Dónde vive | Cómo se recupera | Irrepetible |
|---|---|---|---|
| Esquema, políticas y funciones | `supabase/migrations/` (14 archivos) | Aplicar en orden en un proyecto nuevo | No |
| Dataset sintético | `data/demo_sales.csv` + `tools/generate_data.py` | Regenerar y cargar con `tools/cargar_dataset.mjs` | No |
| Catálogos de roles y áreas | Migración 03, idempotente | Reaplicar la migración | No |
| **Asignaciones de personas** | Tablas `user_roles` y `user_regions` | `supabase/respaldo/exportar_asignaciones.sql` | **Sí** |
| Identidades | Supabase Auth | Alta manual; las contraseñas no son recuperables | **Sí** |
| Bitácora de seguridad | Tabla `security_audit` | No se respalda: es un registro, no un activo | Sí (se acepta) |
| Aplicación publicada | `site-secure/` en GitHub | Reejecutar el flujo de publicación | No |

**Lo único verdaderamente crítico son las asignaciones y las identidades.** Todo
lo demás se reconstruye desde el repositorio.

## 2. Límites reales del plan gratuito

- **No hay copias de seguridad automáticas** ni recuperación a un punto en el
  tiempo. Si se pierde el proyecto, se pierde lo que no esté en el repositorio o
  en un respaldo manual.
- **Los proyectos inactivos se pausan.** Al reanudarlos, los datos siguen ahí,
  pero la aplicación muestra el error de conexión mientras tanto.
- **Límite de 8 segundos por consulta** para usuarios autenticados y 3 para
  anónimos. Medido: el tablero del administrador tarda 200 ms y la exportación
  completa 135 ms, así que el margen es amplio salvo bajo ráfagas.
- **Correo de autenticación limitado** (2 por hora), razón por la que las
  identidades de prueba se crearon en el servidor.

Estos límites son la razón de que la versión estática pública se conserve: no
depende de Supabase y sirve de reversión ante cualquier incidente de la base.

## 3. Rutina de respaldo

| Cuándo | Qué | Cómo |
|---|---|---|
| Tras cada alta o baja | Asignaciones | Ejecutar `supabase/respaldo/exportar_asignaciones.sql` y guardar el resultado con fecha, **fuera del repositorio** (contiene correos) |
| Mensual | Asignaciones + inventario de identidades | Lo anterior más la lista de `auth.users` |
| Antes de cualquier migración | Las dos cosas | Igual, y anotar la versión aplicada |

El guion generado es idempotente (`on conflict do nothing`): puede ejecutarse
varias veces sin duplicar nada.

## 4. Restauración comprobada

Probado el 13-nov-2026 sobre el proyecto real, con el perfil auditor:

| Paso | Acción | Resultado observado |
|---|---|---|
| 1 | Estado inicial | Áreas: Bajío, Centro, Norte · 10,080 registros · 22,819,019.39 |
| 2 | Revocar el área Centro | 1 fila eliminada |
| 3 | Consultar de nuevo | Áreas: Bajío, Norte · 6,720 registros · 14,996,021.66 · `Centro` **denegado (42501)** |
| 4 | Restaurar con el guion de respaldo | 1 fila insertada |
| 5 | Consultar de nuevo | Áreas: Bajío, Centro, Norte · 10,080 registros · 22,819,019.39 |

Dos conclusiones: **la revocación surte efecto en la consulta siguiente**, sin
reinicios ni caché de política; y **el guion de respaldo restaura el alcance
exacto**.

## 5. Monitoreo

Sin coste añadido, con lo que ofrece el plan gratuito:

| Qué vigilar | Dónde | Cadencia | Señal de alarma |
|---|---|---|---|
| Denegaciones de acceso | Panel → *Logs → Postgres*, buscar `kriter_seguridad` | Semanal | Un mismo usuario con denegaciones repetidas sobre áreas ajenas |
| Eventos reportados por la aplicación | Página *Bitácora de seguridad* (perfil auditor) | Semanal | Picos de `acceso_denegado` o `sesion_expirada` |
| Salud y rendimiento | Panel → *Reports* | Mensual | Consultas lentas o errores 5xx |
| Avisos de seguridad | Panel → *Advisors* | Tras cada migración | Cualquier aviso nuevo |
| Publicaciones | GitHub → *Actions* | Cada despliegue | Un flujo en rojo bloquea la publicación |
| Cuota de la base | Panel → *Settings → Usage* | Mensual | Más de 400 MB de los 500 disponibles |

No hay alertas automáticas en el plan gratuito: la vigilancia es manual y por
eso la cadencia está escrita.

## 6. Manejo de errores en la aplicación

| Situación | Qué ve la persona | Qué hace la aplicación |
|---|---|---|
| Sin conexión con el servidor | «No se pudo contactar al servidor de datos» y botón *Reintentar* | No borra la sesión |
| Sesión caducada | «Tu sesión caducó. Vuelve a iniciar sesión» | Cierra la sesión y recarga el alcance público |
| Área no autorizada | El mensaje del servidor, y el filtro vuelve a *todas mis áreas* | Reporta el evento a la bitácora |
| Exportación o escenario sin permiso | Explicación de que el perfil no lo incluye | Deshabilita el control con su motivo en el título |
| Consulta cancelada por tiempo | «El servidor tardó demasiado… reduce el periodo o filtra por un área» | Permite reintentar |
| Proyecto pausado | El error de conexión | La versión estática pública sigue disponible |

## 7. Reversión

Procedimiento completo en `docs/REVERSION.md`. Resumen: la versión pública
estática no depende de Supabase, se publica desde `site/` y puede restaurarse
en minutos reejecutando su flujo sobre el último commit válido.
