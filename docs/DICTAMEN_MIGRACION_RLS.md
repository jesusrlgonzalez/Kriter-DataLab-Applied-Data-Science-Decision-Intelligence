# Dictamen técnico — Migración de Kriter DataLab a Supabase con RLS

**Fecha:** 13-nov-2026 · **Responsable:** Jesus R.L. Gonzalez · **Marca:** Kriter Systems
**Repositorio:** https://github.com/jesusrlgonzalez/Kriter-DataLab-Applied-Data-Science-Decision-Intelligence
**Proyecto Supabase:** `kriter-analytics` (plan Free)
**Space candidato publicado:** https://huggingface.co/spaces/JesusRLGonzalez/kriter-datalab-rls
**Aplicación:** https://jesusrlgonzalez-kriter-datalab-rls.static.hf.space/index.html

## 1. Conclusión

La nueva arquitectura está **publicada y verificada sobre su URL real**:
autenticación, roles, áreas y seguridad a nivel de filas funcionan y resisten
peticiones manipuladas. Las 21 pruebas adversariales pasan desde el navegador
contra el Space publicado, y la integración continua queda en verde.

**La aplicación pública original no se ha tocado.** Sigue sirviéndose desde
`site/` en `kriter-datalab`; la versión con control de acceso vive en
`site-secure/` y se publica, solo a mano, en `kriter-datalab-rls`.

Coste mensual: **0 USD**. No se contrató Hugging Face PRO, Supabase PRO ni
ningún servicio de pago.

## 2. Puertas de aceptación

| Puerta | Resultado | Evidencia |
|---|---|---|
| **G0 · Auditoría** | PASS | Paquete FastAPI y repositorio publicado inventariados; matriz de migración en `docs/ARQUITECTURA_SUPABASE.md` §2 |
| **G1 · Datos** | PASS | 20,160 filas, 350 productos, 6 áreas, 80 semanas; suma 48,820,590.6720 idéntica a la aplicación publicada |
| **G2 · Seguridad** | PASS | 21/21 casos adversariales con cinco identidades independientes, ejecutados desde el Space publicado (`evidence-secure/pruebas_adversariales.json`) |
| **G3 · Producto** | PASS | Las seis páginas, filtros, orden, búsqueda, paginación, exportación y escenarios operan por perfil sobre la URL pública; móvil 375 px sin desbordamiento |
| **G4 · Reproducción** | PASS | GitHub Actions reconstruye datos y ambos artefactos y compara con lo versionado (`git diff --exit-code`) |
| **G5 · Despliegue** | PASS | Flujo manual `deploy-candidate-hf.yml` en verde (ejecución 43419907739) y Space candidato sirviendo la aplicación |
| **G6 · Entrega** | PASS | Código, SQL, pruebas, documentación, evidencias, manifiesto y paquetes |

Ninguna puerta quedó en FAIL.

## 3. Qué queda pendiente

| # | Pendiente | Acción | Quién |
|---|---|---|---|
| 1 | Las pruebas adversariales no corren en la validación automática | Guardar el secreto `KRITER_QA_USERS` (el JSON está en el archivo de credenciales de QA) y las variables `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` | Titular |
| 2 | La rama `main` no está protegida | GitHub → *Settings → Branches → Add rule*: exigir que la validación pase antes de fusionar | Titular |
| 3 | GitHub OAuth no está habilitado | Procedimiento en `docs/ADMINISTRACION.md` §Habilitar GitHub | Titular |
| 4 | Protección de contraseñas filtradas desactivada | Supabase → *Authentication*: activar la comprobación contra HaveIBeenPwned (gratuita) | Titular |
| 5 | Las cuentas de QA siguen activas | Eliminarlas o rotar sus contraseñas antes de usar el proyecto con datos no sintéticos | Titular |

Ninguno impide usar la aplicación: los cinco son endurecimiento posterior.

**Estado comprobado el 13-nov-2026** (solo lectura sobre GitHub y Supabase):
los cinco siguen pendientes. Sí están configurados `HF_CANDIDATE_SPACE_ID` y
`HF_TOKEN`, como demuestran las publicaciones en verde. La validación automática
registra explícitamente `BLOCKED: faltan las variables de QA`, de modo que la
ausencia queda documentada en cada ejecución en lugar de pasar inadvertida.

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
| 9 | **La exportación CSV se truncaba en silencio a 1,000 filas** y su suma no cuadraba con el indicador del tablero: PostgREST aplica un límite de filas a las funciones que devuelven conjuntos. El auditor descargaba 1,000 de 1,050 filas creyendo tenerlas todas. Detectado al exportar desde la interfaz publicada y comparar la suma con el KPI. | **Alta** | Migración 12: la función devuelve un único valor `jsonb`, que no se trunca. Caso RLS-21 añadido para detectarlo en el futuro |
| 10 | Al iniciar sesión se lanzaban dos recargas (la llamada explícita y el evento de Supabase) y el tablero parpadeaba en blanco medio segundo. Detectado con una traza temporal sobre la URL publicada. | Media | Cada recarga lleva un motivo; dos peticiones con el mismo motivo se atienden una sola vez |
| 11 | Un tiempo de ejecución agotado mostraba el mensaje crudo de PostgreSQL (`canceling statement due to statement timeout`). Observado al saturar el proyecto con ráfagas de prueba. | Baja | Mensaje en español con sugerencia de reintento o de acotar el periodo |
| 12 | Quedó en la base una función auxiliar de medición de tiempos creada durante el diagnóstico. | Baja | Migración 13: eliminada; el analizador de Supabase ya no la reporta |

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
exactamente lo mismo que el indicador del tablero del mismo perfil: comprobado
descargando el CSV desde la aplicación publicada (auditor: 1,050 filas y
22,819,019.3933; administrador: 2,100 filas y 48,820,590.6720).

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
- Rendimiento medido en el servidor: el tablero del administrador tarda 200 ms
  y la exportación completa 135 ms. El plan gratuito aplica un límite de 8
  segundos por consulta; bajo ráfagas de prueba intensas se alcanzó ese límite y
  la aplicación lo informa con un mensaje claro y opción de reintento.
- Accesibilidad revisada a nivel básico (etiquetas, foco, teclado, idioma); no
  es una auditoría WCAG completa.
- **Esto no es el RLS nativo de Microsoft Power BI**: es Row Level Security de
  PostgreSQL a través de Supabase.

## 8. Plan de 3 pasos

1. **Usarla (tú, esta semana):** entra con los cuatro perfiles de prueba y
   comprueba que el alcance de cada uno es el que esperas para tu caso de uso.
2. **Endurecer (30 min):** los cinco pendientes de la sección 3, empezando por
   el secreto de QA y la protección de la rama `main`.
3. **Decidir:** mantener las dos versiones (una demo abierta y otra con control
   de acceso) o sustituir la pública. El plan de reversión está en
   `docs/REVERSION.md`.
