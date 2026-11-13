# Modelo de seguridad y límites de aseguramiento

**Kriter DataLab · versión con Supabase y Row Level Security** · Jesus R.L. Gonzalez · 2026

## 1. Qué se protege y qué no

Los datos publicados son **sintéticos** y están versionados en un repositorio
público: cualquiera puede descargar `data/demo_sales.csv` desde GitHub. Lo que
esta arquitectura demuestra es el **aislamiento de las consultas por identidad y
rol**, no la confidencialidad de un conjunto de demostración que ya es público.

Con datos reales, el repositorio de datos no debe ser público y la carga debe
realizarse desde el servidor; el resto del diseño se mantiene.

## 2. Amenazas consideradas

| # | Amenaza | Control |
|---|---|---|
| 1 | El cliente pide un área que no tiene asignada | `app.resolve_region()` devuelve 403 y, además, la política de `sales` nunca expone esas filas |
| 2 | El cliente llama directamente a la API REST evitando la interfaz | Las políticas se evalúan en PostgreSQL: la respuesta es idéntica |
| 3 | El cliente manipula el identificador numérico del área | `sales` filtra por `region_id = any(app.allowed_region_ids())`: devuelve 0 filas |
| 4 | El usuario intenta asignarse un rol o un área | No existen políticas de escritura; `INSERT` responde 403 |
| 5 | El usuario modifica su perfil para declararse administrador | El rol no se lee del navegador: se resuelve con `auth.uid()` contra `user_roles` |
| 6 | Token manipulado, caducado o ausente | Supabase Auth responde 401; la aplicación cierra la sesión y recarga el alcance público |
| 7 | Exportación o escenario fuera del alcance | `kriter_export_products()` y `kriter_scenario()` comprueban capacidad y área antes de agregar |
| 8 | Agregados que revelan datos fuera de alcance | Las funciones son SECURITY INVOKER: agregan sobre filas ya filtradas por RLS |
| 9 | Datos restringidos incrustados en el artefacto | `tools/security_scan.py` falla si aparecen códigos de producto o la cabecera del CSV |
| 10 | Credenciales privilegiadas en el cliente | El artefacto solo lleva la URL y la clave publicable; el escáner rechaza claves de servicio, JWT con rol privilegiado, tokens de GitHub o de Hugging Face |
| 11 | Cambio de usuario en el mismo navegador | Cada carga lleva número de secuencia y la vista se limpia: no quedan cifras del perfil anterior |
| 12 | Inundación de la bitácora desde el cliente | `kriter_log_event()` acepta una lista cerrada de eventos y limita a 50 por usuario y hora |

## 3. Controles implementados

1. **Identidad.** Supabase Auth emite un JWT firmado. `auth.uid()` es la única
   fuente de identidad; el navegador no puede declarar rol ni áreas.
2. **Autorización.** Row Level Security activa en las ocho tablas, con
   **denegación por defecto**: lo que no autoriza una política, no se lee.
3. **Sin escritura desde el navegador.** No hay políticas de `INSERT`, `UPDATE`
   ni `DELETE` para `anon` ni `authenticated`, y esos privilegios están revocados.
4. **Agregación protegida.** Los indicadores se calculan en funciones STABLE y
   SECURITY INVOKER que PostgREST ejecuta en transacción de solo lectura.
5. **Capacidades por rol.** `can_export`, `can_view_scenarios` y
   `can_read_audit` se consultan en el servidor y se reflejan en la interfaz.
6. **Bitácora.** `security_audit` registra eventos; las denegaciones que
   revierten la transacción quedan además en el log de PostgreSQL (`raise log`),
   que no se revierte.
7. **Artefacto limpio.** El HTML publicado no contiene ni un registro comercial:
   pasó de 674 KB con los datos incrustados a 287 KB sin ellos.
8. **Sin dependencias externas en ejecución.** El cliente `supabase-js` 2.119.0
   (MIT) se incorpora al repositorio y al artefacto; no se carga ningún CDN.

## 4. Límites que no deben ocultarse

- **No es el RLS nativo de Microsoft Power BI Service.** No se afirma
  cumplimiento de asignación de usuarios, licenciamiento ni *Test as role*.
- **Un Space estático no permite fijar cabeceras HTTP.** No hay CSP,
  `X-Content-Type-Options` ni `Cache-Control` propios. La versión FastAPI sí los
  tenía; es una pérdida deliberada a cambio de eliminar el servidor.
- **Las cuentas de prueba son reales.** Deben eliminarse o rotarse antes de
  usar el proyecto con datos que no sean sintéticos.
- **La bitácora de origen `cliente` es un reporte de la aplicación**, no una
  prueba del servidor. La evidencia no repudiable está en el log de PostgreSQL.
- **No hay límite de peticiones por usuario** más allá del propio de Supabase.
- **Solo lectura.** Los roles describen alcance de consulta; esta versión no
  implementa escritura de datos comerciales.
- **Sin auditoría externa.** El código no ha sido revisado por un tercero.
- **El canal de carga del dataset** existió entre dos migraciones y quedó
  eliminado; está documentado en `tools/CARGA_DATASET.md`.
