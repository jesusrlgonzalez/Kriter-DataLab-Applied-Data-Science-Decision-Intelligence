# Dictamen técnico — Migración de Kriter DataLab a Supabase con RLS

**Fecha:** 13-nov-2026 · **Responsable:** Jesus R.L. Gonzalez · **Marca:** Kriter Systems
**Repositorio:** https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence
**Rama de desarrollo:** `feature/supabase-rls` · **Proyecto Supabase:** `kriter-analytics` (plan Free)

## 1. Conclusión

La nueva arquitectura **está construida, cargada y verificada con identidades
reales**: autenticación, roles, áreas y seguridad a nivel de filas funcionan y
resisten peticiones manipuladas. Las 20 pruebas adversariales pasan y la
integración continua queda en verde.

**La aplicación pública no se ha tocado.** Sigue publicada y sirviéndose desde
`site/`; la versión con control de acceso vive en `site-secure/` y su publicación
es manual y hacia un Space distinto.

Coste mensual: **0 USD**. No se contrató Hugging Face PRO, Supabase PRO ni
ningún servicio de pago.

## 2. Puertas de aceptación

| Puerta | Resultado | Evidencia |
|---|---|---|
| **G0 · Auditoría** | PASS | Paquete FastAPI y repositorio publicado inventariados; matriz de migración en `docs/ARQUITECTURA_SUPABASE.md` §2 |
| **G1 · Datos** | PASS | 20,160 filas, 350 productos, 6 áreas, 80 semanas; suma 48,820,590.6720 idéntica a la aplicación publicada |
| **G2 · Seguridad** | PASS | 20/20 casos adversariales con cinco identidades independientes (`evidence-secure/pruebas_adversariales.json`) |
| **G3 · Producto** | PASS | Las cinco páginas, filtros, orden, búsqueda, paginación, exportación y escenarios operan por perfil; móvil 375 px sin desbordamiento |
| **G4 · Reproducción** | PASS | GitHub Actions reconstruye datos y ambos artefactos y compara con lo versionado (`git diff --exit-code`) |
| **G5 · Despliegue** | PASS en GitHub · **BLOCKED** en Hugging Face | Ejecución 43413812626 en verde; falta el Space candidato y un token con alcance sobre él |
| **G6 · Entrega** | PASS | Código, SQL, pruebas, documentación, evidencias, manifiesto y paquetes |

Ninguna puerta quedó en FAIL.

## 3. Qué está bloqueado y qué hace falta exactamente

| # | Bloqueo | Acción necesaria | Quién |
|---|---|---|---|
| 1 | No existe el Space candidato | Crear un Space *Static* nuevo, por ejemplo `JesusRLGonzalez/kriter-datalab-rls`. **No reutilizar el de producción.** | Titular |
| 2 | El token actual solo alcanza al Space de producción | Crear un token *fine-grained* con escritura sobre el Space candidato y guardarlo como secreto `HF_TOKEN` (o ampliar el existente) | Titular |
| 3 | Falta la variable `HF_CANDIDATE_SPACE_ID` | GitHub → *Settings → Variables → Actions*: `HF_CANDIDATE_SPACE_ID` = `JesusRLGonzalez/kriter-datalab-rls` | Titular |
| 4 | Las pruebas adversariales no corren en CI | Guardar el secreto `KRITER_QA_USERS` (JSON con los correos y contraseñas de QA) y las variables `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` | Titular |
| 5 | La rama `main` no está protegida | GitHub → *Settings → Branches → Add rule*: exigir revisión y que la validación pase antes de fusionar | Titular |
| 6 | GitHub OAuth no está habilitado | Procedimiento en `docs/ADMINISTRACION.md` §Habilitar GitHub | Titular |
| 7 | Protección de contraseñas filtradas desactivada | Supabase → *Authentication → Policies*: activar la comprobación contra HaveIBeenPwned (gratuita) | Titular |

Mientras 1–3 no se resuelvan, el flujo `deploy-candidate-hf.yml` omite la
publicación: **no falla ni publica nada**.

## 4. Defectos encontrados y corregidos durante el desarrollo

| # | Defecto (cómo se detectó) | Gravedad | Corrección |
|---|---|---|---|
| 1 | Las denegaciones devolvían `405 / 25006 «cannot execute INSERT in a read-only transaction»` en lugar de `403 / 42501`: las funciones son STABLE y PostgREST las ejecuta en transacción de solo lectura, donde el apunte en la bitácora fallaba antes que la denegación. Detectado en las pruebas HTTP adversariales. | **Alta** | Migración 10: las rutas de denegación registran solo en el log del servidor (`raise log`), que no escribe tablas |
| 2 | Al cambiar de usuario en el mismo navegador, la pantalla conservaba las cifras del perfil anterior: dos recargas simultáneas competían y la segunda se descartaba. Detectado al encadenar inicios de sesión. | **Alta** | Número de secuencia por carga y limpieza de la vista al cambiar de sesión |
| 3 | Los controles no autorizados (bitácora, cerrar sesión) seguían visibles: el CSS base fija `display:flex` y vence al atributo `hidden`. Detectado al comparar el DOM con la captura. | Media | `[hidden]{display:none !important}` y prueba automatizada que lo exige |
| 4 | Las denegaciones nunca llegaban a `security_audit` porque la excepción revierte la transacción. Detectado en el banco de pruebas SQL (bitácora con 0 filas). | Media | Migración 08: registro en el log de PostgreSQL más canal acotado (`kriter_log_event`) con lista cerrada de eventos y límite de 50 por usuario y hora |
| 5 | La barra de sesión desbordaba la página a 375 px (381 px de ancho). Detectado en emulación móvil. | Baja | Reglas responsive específicas para la barra de sesión |
| 6 | `search_path` mutable en 8 funciones. Detectado por el analizador de seguridad de Supabase. | Baja | Migración 11: `set search_path = ''` en todas |
| 7 | El flujo de CI no se podía despachar: el contexto `secrets` no es válido en una condición `if`. Detectado al lanzarlo. | Baja | La comprobación se hace dentro del paso y registra BLOCKED si faltan credenciales |
| 8 | El primer escáner de credenciales daba un falso positivo con el propio cliente de Supabase (contiene la cadena `sb_secret_` en su detector de formatos). | Baja | El escáner busca valores reales: claves con cuerpo, JWT con rol privilegiado y claves PEM |

## 5. Resultados de aislamiento medidos

Banco SQL (`tests/sql/pruebas_rls.sql`), ejecutado con `SET ROLE` sobre el
proyecto real:

| Perfil | Filas visibles | Áreas | Escenario | Exportar | Bitácora | Escalar privilegios |
|---|---:|---|:-:|:-:|:-:|:-:|
| Visitante anónimo | 3,360 | Norte | Denegado | Denegado | Denegado | Denegado |
| Autenticado sin rol | 3,360 | Norte | Denegado | Denegado | Denegado | Denegado |
| Gerente regional | 6,720 | Metropolitana, Norte | 916,583.34 | 700 filas | Denegado | Denegado |
| Analista | 6,720 | Norte, Sureste | 893,793.74 | 700 filas | Denegado | Denegado |
| Auditor | 10,080 | Bajío, Centro, Norte | **Denegado** | 1,050 filas | Permitido | Denegado |
| Administrador | 20,160 | Las seis | 2,790,608.19 | 2,100 filas | Permitido | Denegado |

En todos los perfiles, consultar directamente una tabla filtrando por el
identificador de un área ajena devuelve **0 filas**, y la exportación suma
exactamente lo mismo que el indicador del tablero del mismo perfil.

El total del administrador (48,820,590.67) y el escenario base
(2,790,608.19) coinciden al céntimo con la aplicación pública actual: la
migración no alteró ninguna cifra.

## 6. Riesgos aceptados, con justificación

- **`kriter_log_event` es SECURITY DEFINER y la puede llamar cualquiera.** Es
  deliberado: la alternativa sería dar permiso de escritura directa sobre
  `security_audit`, lo que permitiría insertar cualquier fila. La función acepta
  una lista cerrada de seis eventos, trunca el detalle y limita a 50 apuntes por
  usuario y hora. El analizador de Supabase lo marca como aviso; se asume.
- **Un Space estático no permite cabeceras HTTP propias** (CSP, `no-store`). La
  versión FastAPI sí las tenía. Se pierde a cambio de eliminar el servidor.
- **Las cuentas de QA son reales** y deben eliminarse antes de usar el proyecto
  con datos que no sean sintéticos.
- **El plan gratuito pausa proyectos inactivos**; la versión pública estática es
  la reversión natural y no depende de Supabase.

## 7. Límites de lo verificado

- Pruebas en un navegador de motor Chromium, con móvil emulado a 375 px. No se
  probó en Firefox, Safari ni en un teléfono físico.
- La candidata se ejecutó desde el origen del propio proyecto Supabase para
  poder probarla sin publicar nada. **No se ha servido todavía desde un Space**:
  esa comprobación queda pendiente del desbloqueo 1–3.
- Accesibilidad revisada a nivel básico (etiquetas, foco, teclado, idioma); no
  es una auditoría WCAG completa.
- `huggingface/hub-sync` con `subdirectory: site-secure` no se ha ejecutado
  nunca; su configuración se revisó contra la del flujo de producción, que sí
  funciona.
- **Esto no es el RLS nativo de Microsoft Power BI**: es Row Level Security de
  PostgreSQL a través de Supabase.

## 8. Plan de 3 pasos

1. **Desbloquear la publicación (tú, ~15 min):** puntos 1 a 3 de la sección 3 y
   ejecutar *Publicar la versión candidata* escribiendo `PUBLICAR`.
2. **Verificar sobre la URL real (yo):** inicio de sesión de los cuatro perfiles,
   aislamiento, exportación y vista móvil sobre el Space candidato; cierre de G5.
3. **Decidir la sustitución:** si la candidata convence, autorizar expresamente
   el cambio del Space principal; si no, conservarla como evidencia técnica. El
   plan de reversión está en `docs/REVERSION.md`.
