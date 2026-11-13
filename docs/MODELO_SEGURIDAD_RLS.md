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

## 5. Riesgos aceptados formalmente

Un riesgo aceptado se declara, no se oculta. Cada uno lleva el motivo, la
alternativa descartada y el control compensatorio.

### 5.1 `public.kriter_log_event` con privilegios elevados

| Campo | Contenido |
|---|---|
| Aviso del analizador | *Security Definer function accessible to the `authenticated` role* |
| Decisión | **Riesgo aceptado**, con superficie reducida (migración 14) |
| Motivo | La aplicación necesita reportar las denegaciones que recibe. La bitácora `security_audit` es de solo lectura para todos los roles del cliente, así que el apunte requiere privilegios del propietario |
| Alternativa descartada | Conceder `INSERT` sobre `public.security_audit` a `authenticated`: permitiría escribir filas arbitrarias, falsear fechas, suplantar a otro usuario y saturar la tabla. Sería **más** permisivo, no menos |
| Controles compensatorios | 1) `execute` revocado a `anon`; 2) exige `auth.uid() is not null`; 3) `user_id` lo fija el servidor, no el cliente; 4) `occurred_at` lo fija el servidor; 5) lista cerrada de seis eventos; 6) detalle truncado a 500 caracteres; 7) límite de 50 apuntes por usuario y hora; 8) `set search_path = ''`; 9) columna `origen` que marca estos apuntes como *reporte del cliente*, no como prueba del servidor |
| Impacto máximo si se abusa | Una identidad válida puede insertar hasta 50 apuntes por hora con su propio identificador y uno de seis valores de evento. No puede leer, modificar ni borrar nada, ni escribir en nombre de otro |
| Evidencia no repudiable | El `raise log` de `app.log_security_event` en el log de PostgreSQL, que el cliente no puede escribir ni alterar |
| Revisión | Al retirar las identidades de prueba o al pasar a datos reales |

### 5.2 Protección contra contraseñas filtradas: **no disponible a coste cero**

| Campo | Contenido |
|---|---|
| Aviso | *Leaked Password Protection Disabled* |
| Hallazgo | El panel declara literalmente que esta comprobación, basada en la API de HaveIBeenPwned, **solo está disponible en el plan Pro y superiores**. No es un ajuste gratuito |
| Decisión | **No se activa.** La restricción de coste cero del proyecto es una condición de diseño, no una preferencia: activarla exigiría un plan de pago |
| Verificado | 13-nov-2026, en *Authentication → Providers → Email*, con la sesión real del proyecto |
| Estado del aviso | Permanecerá abierto mientras el proyecto siga en el plan gratuito. Se declara, no se oculta |

**Controles compensatorios aplicados el 13-nov-2026**, todos gratuitos y
verificados con el mensaje *Successfully updated settings*:

| Control | Antes | Ahora | Qué mitiga |
|---|---|---|---|
| Longitud mínima de contraseña | 6 caracteres | **12 caracteres** | Las contraseñas cortas son las que figuran en las listas de filtraciones |
| Requisitos de composición | Sin requisitos | **Minúsculas, mayúsculas, dígitos y símbolos** | Excluye las contraseñas de diccionario, que son el grueso de lo filtrado |
| Cambio seguro de contraseña | Desactivado | **Activado** | Una sesión robada de más de 24 h no puede cambiar la contraseña sin volver a autenticarse |
| Exigir la contraseña actual al cambiarla | Desactivado | **Activado** | Impide el secuestro de cuenta desde una sesión abierta ajena |
| Registros anónimos | Desactivado | Desactivado | Se confirma que no hay identidades sin verificar |

Una contraseña de 12 caracteres con las cuatro clases exigidas tiene una
probabilidad muy baja de aparecer en una lista de filtraciones, que es
precisamente lo que la comprobación de pago verifica. No es equivalente —la
comprobación mira la lista real— pero cubre el mismo riesgo por la vía que el
plan gratuito sí permite.

**Pendiente del titular, y es una decisión de negocio, no técnica:** si el
proyecto pasa a datos reales con identidades de personas, contratar el plan Pro
y activar la comprobación. Mientras los datos sean sintéticos, el riesgo
residual es bajo.

### 5.3 Space estático sin cabeceras HTTP

Ya declarado en el apartado 4. Pérdida deliberada: se cambia la posibilidad de
fijar CSP por la eliminación del servidor y de su coste. El control que importa
—la autorización— no depende de cabeceras: vive en las políticas de PostgreSQL.

## 6. RLS de PostgreSQL y RLS de Power BI: no son lo mismo

Esta distinción se escribe porque confundirlas sería una afirmación falsa de
cumplimiento.

| Aspecto | Este proyecto (PostgreSQL + Supabase) | Power BI Service |
|---|---|---|
| Dónde se aplica | En el motor de base de datos, en cada `select`, con `auth.uid()` | En el modelo semántico, al evaluar la consulta DAX |
| Mecanismo | Políticas `row level security` sobre tablas | Roles con filtros DAX sobre tablas del modelo |
| Identidad | JWT de Supabase Auth | Identidad de Microsoft Entra ID |
| Asignación | Tablas `user_roles` y `user_regions` | Pertenencia a roles del conjunto de datos en el servicio |
| Verificación | 21 pruebas adversariales HTTP contra el extremo real | *Test as role* en el servicio |
| Licenciamiento | Ninguno | Pro o PPU según el escenario |
| Qué se omite | No hay dinamismo por USERPRINCIPALNAME, ni seguridad a nivel de objeto, ni filtros bidireccionales | — |

**Lo que sí es equivalente:** la propiedad de fondo. En ambos casos el usuario
no puede obtener filas fuera de su alcance aunque manipule la petición, porque
el filtro lo aplica el motor y no la interfaz.

**Lo que no debe decirse:** que este proyecto *implementa RLS de Power BI*, que
*sustituye* a Power BI Service o que las pruebas aquí realizadas certifican un
modelo semántico de Power BI. No lo hacen y no se afirma.

**Por qué importa en este portafolio:** el proyecto demuestra el concepto de
seguridad a nivel de fila aplicada en el servidor, que es el mismo concepto que
se configura en Power BI, pero con una implementación distinta y verificable de
forma pública y sin coste de licencia.
